"""
Comprehensive Automated Test Suite for NerdLume Production Integrations:
1. Integration A: AI Generation Provider Keys, Health Check, Retries, and Error Taxonomy
2. Integration B: Razorpay Checkout, Webhooks, HMAC Signature Verification, and Entitlement Sync
3. Integration C: Transactional Email Templates, Dispatcher, and Secure Password Reset
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import sys
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import ai_engine
import mailer
import payment
import server


class IntegrationTestCase(unittest.TestCase):
    def setUp(self):
        # Configure isolated test database
        self.test_db_file = backend_dir / "data" / "test_production_integrations.sqlite3"
        if self.test_db_file.exists():
            try:
                self.test_db_file.unlink()
            except Exception:
                pass

        server.DB_FILE = self.test_db_file
        server.init_db()

        # Seed clean test state
        self.db_conn = sqlite3.connect(self.test_db_file)
        self.db_conn.row_factory = sqlite3.Row
        payment.init_payment_tables(self.db_conn)

        self.test_user_id = "usr_test_12345678"
        self.test_email = "scholar@nerdlume.in"
        self.now_iso = server.utc_now()

        with self.db_conn:
            self.db_conn.execute(
                """INSERT OR REPLACE INTO users
                (id, email, username, mobile, first_name, last_name, plan, role, join_date, notes_count, sessions_count, files_count, password, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    self.test_user_id,
                    self.test_email,
                    "testscholar",
                    "9876543210",
                    "Ada",
                    "Lovelace",
                    "free",
                    "user",
                    "2026-11-11",
                    0,
                    0,
                    0,
                    json.dumps(server.password_record("SecureP@ss123")),
                    self.now_iso,
                    self.now_iso,
                ),
            )

    def tearDown(self):
        self.db_conn.close()
        if self.test_db_file.exists():
            try:
                self.test_db_file.unlink()
            except Exception:
                pass

    # ══════════════════════════════════════════════════════════════════════════
    # 1. INTEGRATION A: AI GENERATION & PROVIDERS
    # ══════════════════════════════════════════════════════════════════════════

    def test_ai_key_validation(self):
        """Verify API key validator filters empty strings, short strings, and placeholders."""
        self.assertFalse(ai_engine.is_valid_key(""))
        self.assertFalse(ai_engine.is_valid_key(None))
        self.assertFalse(ai_engine.is_valid_key("short"))
        self.assertFalse(ai_engine.is_valid_key("your_gemini_api_key_here"))
        self.assertFalse(ai_engine.is_valid_key("placeholder_key_12345"))
        self.assertTrue(ai_engine.is_valid_key("AIzaSyB_ValidGeminiKeyWithLength39Chars"))

    def test_ai_credential_sanitization(self):
        """Verify that API keys never leak in log or exception strings."""
        dirty_url = "https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyB_SecretKey12345"
        sanitized = ai_engine.sanitize_ai_text(dirty_url)
        self.assertNotIn("AIzaSyB_SecretKey12345", sanitized)
        self.assertIn("[REDACTED]", sanitized)

        bearer_header = "Authorization: Bearer sk-secretOpenAIKey1234567890123456"
        sanitized_bearer = ai_engine.sanitize_ai_text(bearer_header)
        self.assertNotIn("sk-secretOpenAIKey1234567890123456", sanitized_bearer)
        self.assertIn("[REDACTED]", sanitized_bearer)

    def test_ai_structured_error_classification(self):
        """Verify that HTTP error codes are correctly mapped to structured AIErrorTypes."""
        with patch("urllib.request.urlopen") as mock_urlopen:
            import urllib.error
            # Simulate 429 Rate Limit
            mock_urlopen.side_effect = urllib.error.HTTPError(
                url="http://api.mistral.ai", code=429, msg="Too Many Requests", hdrs={}, fp=None
            )
            with self.assertRaises(ai_engine.AIProviderException) as cm:
                ai_engine.post_ai_request("Mistral", "http://api.mistral.ai", {}, {}, max_retries=0)
            self.assertEqual(cm.exception.error_type, ai_engine.AIErrorType.RATE_LIMITED)

    def test_ai_diagnostics_health_check(self):
        """Verify check_all_providers returns comprehensive status without leaking credentials."""
        res = ai_engine.check_all_providers(test_connectivity=False)
        self.assertTrue(res["ok"])
        self.assertEqual(len(res["providers"]), 4)
        for p in res["providers"]:
            self.assertIn("provider", p)
            self.assertIn("status", p)
            self.assertIn("model", p)
            # Ensure no credentials appear in output
            self.assertNotIn("key", p)
            self.assertNotIn("secret", p)

    # ══════════════════════════════════════════════════════════════════════════
    # 2. INTEGRATION B: RAZORPAY CHECKOUT & SUBSCRIPTIONS
    # ══════════════════════════════════════════════════════════════════════════

    def test_plan_pricing_source_of_truth(self):
        """Verify single source of truth pricing for monthly and annual tiers."""
        self.assertEqual(payment.get_plan_price("free-premium", "monthly"), 149)
        self.assertEqual(payment.get_plan_price("free-premium", "annual"), 1199)
        self.assertEqual(payment.get_plan_price("diamond", "monthly"), 349)
        self.assertEqual(payment.get_plan_price("diamond", "annual"), 2799)

        with self.assertRaises(ValueError):
            payment.get_plan_price("invalid_plan_id", "monthly")

    def test_checkout_order_creation_enforces_server_pricing(self):
        """Verify server-side order creation generates correct amount in paise and records payment."""
        order = payment.create_checkout_order(
            user_id=self.test_user_id,
            user_email=self.test_email,
            plan_id="free-premium",
            cadence="monthly",
            db_conn=self.db_conn,
        )
        self.assertTrue(order["ok"])
        self.assertEqual(order["amount"], 14900)  # ₹149 in paise
        self.assertEqual(order["currency"], "INR")
        self.assertEqual(order["plan"], "free-premium")

        # Verify recorded in DB
        cur = self.db_conn.execute("SELECT * FROM payments WHERE order_id = ?", (order["orderId"],))
        pay_row = cur.fetchone()
        self.assertIsNotNone(pay_row)
        self.assertEqual(pay_row["status"], "created")
        self.assertEqual(pay_row["amount"], 14900)

    def test_payment_signature_verification_hmac_sha256(self):
        """Verify HMAC SHA-256 signature algorithm against official Razorpay spec."""
        secret = "test_razorpay_secret_9988"
        order_id = "order_K7x98Yhd123"
        payment_id = "pay_L8z76Xcb456"

        # Generate genuine signature
        expected_sig = hmac.new(
            secret.encode("utf-8"),
            f"{order_id}|{payment_id}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        with patch("payment.get_razorpay_key_secret", return_value=secret):
            # Valid signature passes
            self.assertTrue(payment.verify_payment_signature(order_id, payment_id, expected_sig))
            # Tampered signature fails
            tampered_sig = expected_sig[:-4] + "ffff"
            self.assertFalse(payment.verify_payment_signature(order_id, payment_id, tampered_sig))
            # Tampered order_id fails
            self.assertFalse(payment.verify_payment_signature("order_tampered", payment_id, expected_sig))

    def test_entitlement_synchronization(self):
        """Verify process_successful_payment activates plan, extends dates, and updates DB."""
        order_id = "order_test_entitlement_1"
        payment_id = "pay_test_entitlement_1"

        res = payment.process_successful_payment(
            user_id=self.test_user_id,
            plan_id="diamond",
            cadence="annual",
            order_id=order_id,
            payment_id=payment_id,
            db_conn=self.db_conn,
        )
        self.assertTrue(res["ok"])
        self.assertEqual(res["plan"], "diamond")
        self.assertEqual(res["cadence"], "annual")

        # Verify user record updated in database
        cur = self.db_conn.execute("SELECT plan FROM users WHERE id = ?", (self.test_user_id,))
        user_row = cur.fetchone()
        self.assertEqual(user_row["plan"], "diamond")

        # Verify subscription record created
        cur_sub = self.db_conn.execute(
            "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'",
            (self.test_user_id,),
        )
        sub_row = cur_sub.fetchone()
        self.assertIsNotNone(sub_row)
        self.assertEqual(sub_row["plan"], "diamond")
        self.assertEqual(sub_row["cadence"], "annual")
        self.assertEqual(sub_row["razorpay_payment_id"], payment_id)

    def test_webhook_signature_and_idempotency(self):
        """Verify webhook signature validation, event processing, and duplicate suppression."""
        webhook_secret = "whsec_test_secret_abc123"
        event_payload = {
            "id": "evt_test_unique_9999",
            "event": "payment.captured",
            "created_at": 1710000000,
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_wh_test_123",
                        "order_id": "order_wh_test_123",
                        "amount": 14900,
                        "notes": {
                            "user_id": self.test_user_id,
                            "plan": "free-premium",
                            "cadence": "monthly",
                        },
                    }
                }
            },
        }
        raw_body = json.dumps(event_payload).encode("utf-8")
        valid_sig = hmac.new(webhook_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()

        with patch("payment.get_razorpay_webhook_secret", return_value=webhook_secret):
            # Invalid signature rejected
            res_bad = payment.process_webhook_event(raw_body, "invalid_sig", self.db_conn)
            self.assertFalse(res_bad["ok"])
            self.assertEqual(res_bad["status"], 400)

            # Valid first delivery processed
            res_good = payment.process_webhook_event(raw_body, valid_sig, self.db_conn)
            self.assertTrue(res_good["ok"])
            self.assertFalse(res_good.get("duplicate", False))

            # Verify user entitlement was upgraded by webhook
            cur = self.db_conn.execute("SELECT plan FROM users WHERE id = ?", (self.test_user_id,))
            self.assertEqual(cur.fetchone()["plan"], "free-premium")

            # Duplicate delivery gracefully ignored
            res_dupe = payment.process_webhook_event(raw_body, valid_sig, self.db_conn)
            self.assertTrue(res_dupe["ok"])
            self.assertTrue(res_dupe.get("duplicate"))

    def test_subscription_cancellation_retains_period_access(self):
        """Verify cancelling subscription retains access until current_period_end."""
        order_id = "order_sub_cancel_test"
        payment_id = "pay_sub_cancel_test"
        payment.process_successful_payment(
            user_id=self.test_user_id,
            plan_id="free-premium",
            cadence="monthly",
            order_id=order_id,
            payment_id=payment_id,
            db_conn=self.db_conn,
        )

        cancel_res = payment.cancel_active_subscription(self.test_user_id, self.db_conn)
        self.assertTrue(cancel_res["ok"])
        self.assertIn("accessUntil", cancel_res)

        status = payment.get_user_subscription_status(self.test_user_id, self.db_conn)
        self.assertEqual(status["status"], "cancelled")
        self.assertIsNotNone(status["cancelledAt"])

    # ══════════════════════════════════════════════════════════════════════════
    # 3. INTEGRATION C: TRANSACTIONAL EMAIL & PASSWORD RESET
    # ══════════════════════════════════════════════════════════════════════════

    def test_email_template_rendering(self):
        """Verify all 9 email templates render clean HTML and non-empty subjects."""
        # 1. Password Reset
        subj1, html1 = mailer.template_password_reset("scholar@nerdlume.in", "test_tok_123")
        self.assertIn("Password Reset", subj1)
        self.assertIn("test_tok_123", html1)

        # 2. Account Verification
        subj2, html2 = mailer.template_account_verification("scholar@nerdlume.in", "verify_tok_123")
        self.assertIn("Verify", subj2)
        self.assertIn("verify_tok_123", html2)

        # 3. Welcome Email
        subj3, html3 = mailer.template_welcome("scholar@nerdlume.in", "Ada")
        self.assertIn("Welcome", subj3)
        self.assertIn("ADA", html3)

        # 4. Payment Confirmation
        subj4, html4 = mailer.template_payment_confirmation("scholar@nerdlume.in", "Scholar Pro", 149.0, "ord_1", "pay_1")
        self.assertIn("Payment Confirmed", subj4)
        self.assertIn("₹149.00", html4)

        # 5. Subscription Activation
        subj5, html5 = mailer.template_subscription_activation("scholar@nerdlume.in", "Scholar Pro", "30 Notes", "2026-12-11")
        self.assertIn("Activated", subj5)
        self.assertIn("30 Notes", html5)

        # 6. Subscription Renewal
        subj6, html6 = mailer.template_subscription_renewal("scholar@nerdlume.in", "Scholar Pro", 149.0, "2026-12-11")
        self.assertIn("Renewed", subj6)

        # 7. Subscription Cancellation
        subj7, html7 = mailer.template_subscription_cancellation("scholar@nerdlume.in", "Scholar Pro", "2026-12-11")
        self.assertIn("Cancellation", subj7)

        # 8. Payment Failure
        subj8, html8 = mailer.template_payment_failure("scholar@nerdlume.in", "Scholar Pro", 149.0)
        self.assertIn("Failure", subj8)

        # 9. Subscription Expiration
        subj9, html9 = mailer.template_subscription_expiration("scholar@nerdlume.in", "Scholar Pro")
        self.assertIn("Concluded", subj9)

    def test_secure_password_reset_flow(self):
        """Verify token generation, SHA-256 hashing, session revocation, and reuse prevention."""
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()

        # Insert reset request with token_hash (NEVER plain token)
        with self.db_conn:
            self.db_conn.execute(
                """INSERT INTO reset_requests (id, user_id, email, created_at, token, token_hash, expires_at, used)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                ("req_test_1", self.test_user_id, self.test_email, server.utc_now(), "", token_hash, expires_at, 0),
            )
            # Create active session for user
            self.db_conn.execute(
                "INSERT INTO sessions (token, user_id, created_at, last_seen_at, revoked_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
                ("session_active_123", self.test_user_id, server.utc_now(), server.utc_now(), None, expires_at),
            )

        # Simulate confirm password reset request
        class MockResetConfirmHandler:
            command = "POST"
            headers = {"Content-Length": "100"}
            def client_ip(self): return "127.0.0.1"
            def parse_body(self): return {"token": raw_token, "newPassword": "BrandNewP@ssword999"}
            def json_response(self, code, data, req_id=""):
                return {"status": code, "data": data}

        handler = MockResetConfirmHandler()
        res = server.NerdyBroHandler.handle_reset_password_confirm(handler)
        self.assertEqual(res["status"], 200)
        self.assertTrue(res["data"]["ok"])

        # Verify token was marked used
        cur_req = self.db_conn.execute("SELECT used FROM reset_requests WHERE id = 'req_test_1'")
        self.assertEqual(cur_req.fetchone()["used"], 1)

        # Verify old session was revoked
        cur_sess = self.db_conn.execute("SELECT revoked_at FROM sessions WHERE token = 'session_active_123'")
        self.assertIsNotNone(cur_sess.fetchone()["revoked_at"])

        # Verify token cannot be reused
        res_reuse = server.NerdyBroHandler.handle_reset_password_confirm(handler)
        self.assertEqual(res_reuse["status"], 400)
        self.assertIn("Invalid or expired", res_reuse["data"]["error"])

    def test_password_reset_rate_limiting(self):
        """Verify that password reset requests are capped per IP/email window."""
        key = "test_rate_scholar@nerdlume.in"
        # First 5 calls pass
        for _ in range(mailer.RESET_RATE_LIMIT_MAX):
            self.assertTrue(mailer.check_reset_rate_limit(key))
        # 6th call is rate limited
        self.assertFalse(mailer.check_reset_rate_limit(key))


if __name__ == "__main__":
    unittest.main()

