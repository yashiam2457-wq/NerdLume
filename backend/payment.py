"""
NerdLume Razorpay Payment Gateway & Subscription Infrastructure
Supports Order Creation, HMAC SHA-256 Signature Verification, Webhook Processing,
Idempotency, and Real-Time Entitlement Synchronization.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import sqlite3
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any

from mailer import (
    send_email,
    template_payment_confirmation,
    template_subscription_activation,
    template_subscription_cancellation,
    template_payment_failure,
    template_subscription_renewal,
)

logger = logging.getLogger("nerdlume.payment")

# ── Credential Getters ─────────────────────────────────────────────────────────

def get_razorpay_key_id() -> str:
    return os.getenv("RAZORPAY_KEY_ID", "").strip()

def get_razorpay_key_secret() -> str:
    return os.getenv("RAZORPAY_KEY_SECRET", "").strip()

def get_razorpay_webhook_secret() -> str:
    return os.getenv("RAZORPAY_WEBHOOK_SECRET", "").strip()

def is_razorpay_configured() -> bool:
    kid = get_razorpay_key_id()
    ksec = get_razorpay_key_secret()
    return bool(kid and ksec and len(kid) > 5 and len(ksec) > 5 and "your_" not in kid.lower())


# ── Canonical Subscription Plans Source of Truth ───────────────────────────────

SUBSCRIPTION_PLANS: dict[str, dict[str, Any]] = {
    "free": {
        "id": "free",
        "label": "Free Scholar",
        "monthly_price": 0,
        "annual_price": 0,
        "currency": "INR",
        "weekly_limits": {"Note Making": 5, "Explain": 2, "Quick": 5},
        "description": "Standard note generation and revision tools.",
    },
    "free-premium": {
        "id": "free-premium",
        "label": "Scholar Pro",
        "monthly_price": 149,
        "annual_price": 1199,
        "currency": "INR",
        "weekly_limits": {"Note Making": 30, "Explain": 30, "Quick": 60},
        "description": "Feynman, SQ3R, timed mock tests, and 10 file uploads.",
    },
    "diamond": {
        "id": "diamond",
        "label": "Diamond Researcher",
        "monthly_price": 349,
        "annual_price": 2799,
        "currency": "INR",
        "weekly_limits": {},  # empty = uncapped compute
        "description": "4x compute allowance, advanced reasoning, and prediction engine.",
    },
}


def get_plan_price(plan_id: str, cadence: str = "monthly") -> int:
    """Returns the strict price in INR for a plan and billing cadence."""
    plan = SUBSCRIPTION_PLANS.get(plan_id)
    if not plan:
        raise ValueError(f"Unknown plan: '{plan_id}'")
    if cadence == "annual":
        return int(plan["annual_price"])
    return int(plan["monthly_price"])


# ── Database Migration & Helper ────────────────────────────────────────────────

def init_payment_tables(db_conn: sqlite3.Connection) -> None:
    """Initializes subscriptions, payments, and processed_webhooks tables."""
    db_conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            plan TEXT NOT NULL,
            cadence TEXT NOT NULL,
            status TEXT NOT NULL,
            amount INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'INR',
            razorpay_order_id TEXT,
            razorpay_payment_id TEXT,
            razorpay_subscription_id TEXT,
            current_period_start TEXT NOT NULL,
            current_period_end TEXT NOT NULL,
            cancelled_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            subscription_id TEXT,
            order_id TEXT NOT NULL,
            payment_id TEXT,
            amount INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'INR',
            status TEXT NOT NULL,
            method TEXT,
            error_code TEXT,
            error_description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS processed_webhooks (
            event_id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            created_at TEXT NOT NULL,
            processed_at TEXT NOT NULL,
            status TEXT NOT NULL
        );
        """
    )


# ── Razorpay Order Creation ────────────────────────────────────────────────────

def create_checkout_order(
    user_id: str,
    user_email: str,
    plan_id: str,
    cadence: str,
    db_conn: sqlite3.Connection,
) -> dict[str, Any]:
    """
    Creates a server-side order with Razorpay and records pending transaction.
    Prices are enforced strictly server-side.
    """
    if plan_id not in ("free-premium", "diamond"):
        raise ValueError("Only Scholar Pro and Diamond tiers require payment.")
    if cadence not in ("monthly", "annual"):
        cadence = "monthly"

    price_inr = get_plan_price(plan_id, cadence)
    amount_paise = price_inr * 100
    plan_data = SUBSCRIPTION_PLANS[plan_id]
    receipt_id = f"rcpt_{user_id[:8]}_{int(time.time())}"

    key_id = get_razorpay_key_id()
    key_secret = get_razorpay_key_secret()

    order_id = ""
    # Call real Razorpay API if configured
    if is_razorpay_configured():
        auth_bytes = f"{key_id}:{key_secret}".encode("ascii")
        auth_header = f"Basic {base64.b64encode(auth_bytes).decode('ascii')}"

        payload = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt_id,
            "notes": {
                "user_id": user_id,
                "user_email": user_email,
                "plan": plan_id,
                "cadence": cadence,
            },
        }

        req = urllib.request.Request(
            "https://api.razorpay.com/v1/orders",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": auth_header,
                "Content-Type": "application/json",
                "User-Agent": "NerdLume-Payment/2.0",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                order_res = json.loads(resp.read().decode("utf-8"))
                order_id = order_res.get("id")
        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="replace")
            logger.error(f"[Razorpay Order Error] HTTP {exc.code}: {err_body}")
            raise RuntimeError(f"Razorpay order creation failed: {err_body[:200]}")
    else:
        # Development / Sandbox mock order
        order_id = f"order_mock_{secrets.token_hex(10)}"
        logger.warning(f"[Razorpay Mock] Generated sandbox order {order_id} (Razorpay credentials unconfigured).")

    # Record order in payments table
    now_iso = datetime.now(timezone.utc).isoformat()
    payment_record_id = f"payrec_{secrets.token_hex(12)}"
    with db_conn:
        db_conn.execute(
            """INSERT INTO payments
            (id, user_id, subscription_id, order_id, payment_id, amount, currency, status, method, error_code, error_description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payment_record_id,
                user_id,
                None,
                order_id,
                None,
                amount_paise,
                "INR",
                "created",
                None,
                None,
                None,
                now_iso,
                now_iso,
            ),
        )

    return {
        "ok": True,
        "orderId": order_id,
        "amount": amount_paise,
        "currency": "INR",
        "keyId": key_id if is_razorpay_configured() else "rzp_test_mockkey",
        "plan": plan_id,
        "planName": plan_data["label"],
        "cadence": cadence,
        "priceInr": price_inr,
    }


# ── Payment Signature Verification ─────────────────────────────────────────────

def verify_payment_signature(order_id: str, payment_id: str, razorpay_signature: str) -> bool:
    """Verifies Razorpay payment signature using HMAC SHA-256."""
    key_secret = get_razorpay_key_secret()
    if not key_secret:
        # If in mock mode and using mock order, allow signature match
        if order_id.startswith("order_mock_"):
            return True
        return False

    message = f"{order_id}|{payment_id}".encode("utf-8")
    generated_sig = hmac.new(key_secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(generated_sig, razorpay_signature)


# ── Entitlement Synchronization & Activation ───────────────────────────────────

def process_successful_payment(
    user_id: str,
    plan_id: str,
    cadence: str,
    order_id: str,
    payment_id: str,
    db_conn: sqlite3.Connection,
) -> dict[str, Any]:
    """
    Activates user subscription, updates plan permissions, records transaction,
    and dispatches confirmation emails.
    """
    if plan_id not in SUBSCRIPTION_PLANS:
        raise ValueError(f"Invalid plan {plan_id}")

    plan_info = SUBSCRIPTION_PLANS[plan_id]
    price_inr = get_plan_price(plan_id, cadence)
    amount_paise = price_inr * 100

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    period_days = 365 if cadence == "annual" else 30
    period_end = (now + timedelta(days=period_days)).isoformat()

    sub_id = f"sub_{secrets.token_hex(12)}"

    with db_conn:
        # 1. Update user plan
        db_conn.execute(
            "UPDATE users SET plan = ?, updated_at = ? WHERE id = ?",
            (plan_id, now_iso, user_id),
        )

        # 2. Deactivate any existing active subscriptions for this user
        db_conn.execute(
            "UPDATE subscriptions SET status = 'superseded', updated_at = ? WHERE user_id = ? AND status = 'active'",
            (now_iso, user_id),
        )

        # 3. Create active subscription record
        db_conn.execute(
            """INSERT INTO subscriptions
            (id, user_id, plan, cadence, status, amount, currency, razorpay_order_id, razorpay_payment_id,
             razorpay_subscription_id, current_period_start, current_period_end, cancelled_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sub_id,
                user_id,
                plan_id,
                cadence,
                "active",
                amount_paise,
                "INR",
                order_id,
                payment_id,
                None,
                now_iso,
                period_end,
                None,
                now_iso,
                now_iso,
            ),
        )

        # 4. Update or insert payment record
        cur = db_conn.execute("SELECT id FROM payments WHERE order_id = ?", (order_id,))
        existing_pay = cur.fetchone()
        if existing_pay:
            db_conn.execute(
                "UPDATE payments SET payment_id = ?, subscription_id = ?, status = 'captured', updated_at = ? WHERE order_id = ?",
                (payment_id, sub_id, now_iso, order_id),
            )
        else:
            db_conn.execute(
                """INSERT INTO payments
                (id, user_id, subscription_id, order_id, payment_id, amount, currency, status, method, error_code, error_description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    f"payrec_{secrets.token_hex(12)}",
                    user_id,
                    sub_id,
                    order_id,
                    payment_id,
                    amount_paise,
                    "INR",
                    "captured",
                    None,
                    None,
                    None,
                    now_iso,
                    now_iso,
                ),
            )

        # Retrieve user email for transactional dispatch
        user_row = db_conn.execute("SELECT email, first_name FROM users WHERE id = ?", (user_id,)).fetchone()

    if user_row and user_row[0]:
        user_email = user_row[0]
        # Dispatch Payment Confirmation
        sub_pc, html_pc = template_payment_confirmation(
            recipient=user_email,
            plan_name=plan_info["label"],
            amount_inr=price_inr,
            order_id=order_id,
            payment_id=payment_id,
            cadence=cadence,
        )
        send_email(user_email, sub_pc, html_pc)

        # Dispatch Subscription Activation
        limits_desc = f"{plan_info['weekly_limits'].get('Note Making', 'Uncapped')} Notes • {plan_info['weekly_limits'].get('Explain', 'Uncapped')} Explain • {plan_info['weekly_limits'].get('Quick', 'Uncapped')} Quick"
        sub_act, html_act = template_subscription_activation(
            recipient=user_email,
            plan_name=plan_info["label"],
            limits_summary=limits_desc,
            expires_at=period_end[:10],
        )
        send_email(user_email, sub_act, html_act)

    logger.info(f"[Entitlement Sync] Activated {plan_id} for user {user_id} until {period_end}")

    return {
        "ok": True,
        "subscriptionId": sub_id,
        "plan": plan_id,
        "planName": plan_info["label"],
        "cadence": cadence,
        "status": "active",
        "currentPeriodEnd": period_end,
    }


# ── Webhook Signature & Idempotent Processing ──────────────────────────────────

def verify_webhook_signature(raw_body: bytes, signature_header: str) -> bool:
    """Verifies Razorpay webhook signature using HMAC SHA-256 against raw body."""
    webhook_secret = get_razorpay_webhook_secret()
    if not webhook_secret or not signature_header:
        return False
    expected = hmac.new(webhook_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)


def process_webhook_event(raw_body: bytes, signature: str, db_conn: sqlite3.Connection) -> dict[str, Any]:
    """
    Safely and idempotently handles Razorpay webhook events.
    Rejects invalid signatures, deduplicates processed events, and synchronizes state.
    """
    if not verify_webhook_signature(raw_body, signature):
        logger.warning("[Webhook Security] Invalid webhook signature rejected.")
        return {"ok": False, "error": "Invalid webhook signature", "status": 400}

    try:
        event = json.loads(raw_body.decode("utf-8"))
    except Exception as exc:
        return {"ok": False, "error": f"Invalid JSON payload: {exc}", "status": 400}

    event_id = event.get("id") or event.get("event_id")
    event_type = event.get("event")

    if not event_id or not event_type:
        return {"ok": False, "error": "Missing event ID or event type", "status": 400}

    now_iso = datetime.now(timezone.utc).isoformat()

    # Idempotency Check
    with db_conn:
        cur = db_conn.execute("SELECT status FROM processed_webhooks WHERE event_id = ?", (event_id,))
        row = cur.fetchone()
        if row:
            logger.info(f"[Webhook Idempotency] Skipping already processed event {event_id} ({event_type})")
            return {"ok": True, "duplicate": True, "status": 200}

        # Record event in processed_webhooks
        db_conn.execute(
            "INSERT INTO processed_webhooks (event_id, event_type, created_at, processed_at, status) VALUES (?, ?, ?, ?, ?)",
            (event_id, event_type, now_iso, now_iso, "processing"),
        )

    # Dispatch Event Handlers
    payload = event.get("payload", {})
    payment_entity = payload.get("payment", {}).get("entity", {})
    order_entity = payload.get("order", {}).get("entity", {})
    sub_entity = payload.get("subscription", {}).get("entity", {})

    try:
        if event_type in ("payment.captured", "payment.authorized"):
            order_id = payment_entity.get("order_id")
            pay_id = payment_entity.get("id")
            notes = payment_entity.get("notes") or order_entity.get("notes") or {}
            user_id = notes.get("user_id")
            plan = notes.get("plan")
            cadence = notes.get("cadence", "monthly")

            if user_id and plan:
                # Check if already processed
                with db_conn:
                    existing = db_conn.execute(
                        "SELECT id FROM subscriptions WHERE razorpay_payment_id = ? AND status = 'active'",
                        (pay_id,),
                    ).fetchone()
                if not existing:
                    process_successful_payment(user_id, plan, cadence, order_id, pay_id, db_conn)

        elif event_type == "payment.failed":
            pay_id = payment_entity.get("id")
            order_id = payment_entity.get("order_id")
            notes = payment_entity.get("notes") or {}
            user_id = notes.get("user_id")
            error_code = payment_entity.get("error_code")
            error_desc = payment_entity.get("error_description")

            with db_conn:
                db_conn.execute(
                    "UPDATE payments SET status = 'failed', error_code = ?, error_description = ?, updated_at = ? WHERE order_id = ?",
                    (error_code, error_desc, now_iso, order_id),
                )
                if user_id:
                    user_row = db_conn.execute("SELECT email FROM users WHERE id = ?", (user_id,)).fetchone()
                    if user_row and user_row[0]:
                        sub_f, html_f = template_payment_failure(
                            recipient=user_row[0],
                            plan_name=notes.get("plan", "Scholar Pro"),
                            amount_inr=(payment_entity.get("amount", 0) / 100),
                        )
                        send_email(user_row[0], sub_f, html_f)

        elif event_type in ("subscription.cancelled", "subscription.completed"):
            sub_id = sub_entity.get("id")
            with db_conn:
                db_conn.execute(
                    "UPDATE subscriptions SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE razorpay_subscription_id = ?",
                    (now_iso, now_iso, sub_id),
                )

        # Mark processed
        with db_conn:
            db_conn.execute(
                "UPDATE processed_webhooks SET status = 'completed', processed_at = ? WHERE event_id = ?",
                (now_iso, event_id),
            )

        logger.info(f"[Webhook Success] Handled {event_type} ({event_id})")
        return {"ok": True, "status": 200}

    except Exception as exc:
        logger.error(f"[Webhook Error] Processing {event_type} failed: {exc}", exc_info=True)
        with db_conn:
            db_conn.execute(
                "UPDATE processed_webhooks SET status = 'failed', processed_at = ? WHERE event_id = ?",
                (now_iso, event_id),
            )
        return {"ok": False, "error": str(exc), "status": 500}


# ── Subscription Status Queries & Cancellation ────────────────────────────────

def get_user_subscription_status(user_id: str, db_conn: sqlite3.Connection) -> dict[str, Any]:
    """Fetches user active subscription and recent payment records."""
    with db_conn:
        db_conn.row_factory = sqlite3.Row
        cur = db_conn.execute(
            "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (user_id,),
        )
        sub_row = cur.fetchone()

        cur_pays = db_conn.execute(
            "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
            (user_id,),
        )
        payments = [dict(r) for r in cur_pays.fetchall()]

    if not sub_row:
        return {
            "ok": True,
            "hasSubscription": False,
            "plan": "free",
            "status": "none",
            "payments": payments,
        }

    sub = dict(sub_row)
    now_iso = datetime.now(timezone.utc).isoformat()
    is_expired = sub["status"] == "active" and sub["current_period_end"] <= now_iso

    return {
        "ok": True,
        "hasSubscription": True,
        "subscriptionId": sub["id"],
        "plan": sub["plan"],
        "cadence": sub["cadence"],
        "status": "expired" if is_expired else sub["status"],
        "currentPeriodEnd": sub["current_period_end"],
        "cancelledAt": sub.get("cancelled_at"),
        "payments": payments,
    }


def cancel_active_subscription(user_id: str, db_conn: sqlite3.Connection) -> dict[str, Any]:
    """
    Cancels the user's active subscription. Access remains active until current_period_end.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    with db_conn:
        db_conn.row_factory = sqlite3.Row
        sub = db_conn.execute(
            "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'",
            (user_id,),
        ).fetchone()

        if not sub:
            return {"ok": False, "error": "No active paid subscription found."}

        db_conn.execute(
            "UPDATE subscriptions SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?",
            (now_iso, now_iso, sub["id"]),
        )
        user_row = db_conn.execute("SELECT email FROM users WHERE id = ?", (user_id,)).fetchone()

    if user_row and user_row["email"]:
        sub_c, html_c = template_subscription_cancellation(
            recipient=user_row["email"],
            plan_name=SUBSCRIPTION_PLANS.get(sub["plan"], {}).get("label", sub["plan"]),
            access_until=sub["current_period_end"][:10],
        )
        send_email(user_row["email"], sub_c, html_c)

    return {
        "ok": True,
        "message": f"Subscription cancelled. Access retained until {sub['current_period_end'][:10]}.",
        "accessUntil": sub["current_period_end"],
    }
