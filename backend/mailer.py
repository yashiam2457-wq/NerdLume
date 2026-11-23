"""
NerdLume Transactional Email Dispatcher & Professional Cybernetic Templates
Supports SMTP (via Python standard smtplib) and Resend API.
Provides robust delivery error handling, rate limiting, and zero-emoji cybernetic templates.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import secrets
import smtplib
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

logger = logging.getLogger("nerdlume.mailer")

# ── Configuration Getters ──────────────────────────────────────────────────────

def get_email_provider() -> str:
    return os.getenv("EMAIL_PROVIDER", "smtp").lower().strip()

def get_app_url() -> str:
    return os.getenv("NEXT_PUBLIC_APP_URL", os.getenv("NERDYBRO_CORS_ORIGIN", "http://localhost:3000")).rstrip("/")

# ── Rate Limiting for Email Requests (Per-IP / Per-Email) ─────────────────────

_reset_rate_lock = defaultdict(list)
RESET_RATE_LIMIT_MAX = int(os.getenv("EMAIL_RESET_RATE_LIMIT", "5"))  # max 5 requests per 15 minutes
RESET_RATE_WINDOW = 15 * 60  # 15 minutes in seconds

def check_reset_rate_limit(identifier: str) -> bool:
    """Returns True if within rate limit, False if limit exceeded."""
    now = time.monotonic()
    key = identifier.lower().strip()
    history = _reset_rate_lock[key]
    # Prune timestamps outside window
    _reset_rate_lock[key] = [t for t in history if now - t < RESET_RATE_WINDOW]
    if len(_reset_rate_lock[key]) >= RESET_RATE_LIMIT_MAX:
        return False
    _reset_rate_lock[key].append(now)
    return True


# ── Delivery Core: SMTP & Resend ───────────────────────────────────────────────

def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> dict[str, Any]:
    """
    Dispatches a transactional email via the configured provider (SMTP or Resend).
    If credentials are unconfigured, logs to email audit log without failing the app.
    """
    provider = get_email_provider()
    recipient = to_email.strip()
    if not recipient or "@" not in recipient:
        logger.error(f"[Mailer Error] Invalid recipient email: {recipient}")
        return {"ok": False, "error": "Invalid recipient address", "provider": provider}

    if not text_body:
        # Strip basic HTML tags for fallback plain text
        import re
        text_body = re.sub(r"<[^>]+>", "", html_body)

    # 1. Resend API
    if provider == "resend":
        api_key = os.getenv("RESEND_API_KEY", "").strip()
        from_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev").strip()
        if not api_key:
            logger.warning(f"[Mailer Mock/Audit] Resend not configured. Message to {recipient} logged.")
            return {"ok": True, "provider": "mock", "logged": True, "recipient": recipient, "subject": subject}

        payload = {
            "from": from_email,
            "to": [recipient],
            "subject": subject,
            "html": html_body,
            "text": text_body,
        }
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "NerdLume-Mailer/2.0",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                logger.info(f"[Mailer Resend] Dispatched email to {recipient} (id: {res_data.get('id')})")
                return {"ok": True, "provider": "resend", "id": res_data.get("id")}
        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="replace")
            logger.error(f"[Mailer Resend Error] HTTP {exc.code}: {err_body}")
            return {"ok": False, "provider": "resend", "error": f"HTTP {exc.code}: {err_body}"}
        except Exception as exc:
            logger.error(f"[Mailer Resend Error] Connection failed: {exc}")
            return {"ok": False, "provider": "resend", "error": str(exc)}

    # 2. SMTP Delivery (Default)
    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", "noreply@nerdlume.in").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "NerdLume").strip()

    if not host or not user or not password:
        logger.warning(
            f"[Mailer Mock/Audit] SMTP credentials not set (host={host or 'none'}). Simulating delivery to {recipient}: '{subject}'"
        )
        return {"ok": True, "provider": "mock", "logged": True, "recipient": recipient, "subject": subject}

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = recipient

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=20)
        else:
            server = smtplib.SMTP(host, port, timeout=20)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(user, password)
        server.sendmail(from_email, [recipient], msg.as_string())
        server.quit()
        logger.info(f"[Mailer SMTP] Dispatched email to {recipient}")
        return {"ok": True, "provider": "smtp"}
    except Exception as exc:
        logger.error(f"[Mailer SMTP Error] Failed to send email to {recipient}: {exc}")
        return {"ok": False, "provider": "smtp", "error": str(exc)}


# ── Cybernetic HTML Template Base ──────────────────────────────────────────────

def _wrap_cybernetic_template(title: str, preheader: str, body_html: str) -> str:
    """Wraps body content in a clean, futuristic cybernetic container."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }}
    .email-container {{
      max-width: 600px;
      margin: 30px auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
    }}
    .header {{
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 28px 32px;
      border-bottom: 1px solid #334155;
      text-align: left;
    }}
    .logo-text {{
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #3b82f6;
      text-transform: uppercase;
      margin: 0;
    }}
    .badge {{
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 9999px;
      background-color: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.35);
      color: #60a5fa;
      margin-top: 8px;
    }}
    .content {{
      padding: 32px;
      line-height: 1.6;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 700;
      color: #f8fafc;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.3px;
    }}
    p {{
      color: #94a3b8;
      font-size: 14px;
      margin-top: 0;
      margin-bottom: 16px;
    }}
    .btn {{
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 28px;
      border-radius: 10px;
      margin: 20px 0;
      text-align: center;
      letter-spacing: 0.5px;
    }}
    .panel {{
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }}
    .row {{
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #1e293b;
      font-size: 13px;
    }}
    .row:last-child {{
      border-bottom: none;
    }}
    .row-label {{
      color: #64748b;
    }}
    .row-value {{
      color: #f1f5f9;
      font-weight: 600;
      font-family: monospace;
    }}
    .footer {{
      background-color: #0b0f19;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #1f2937;
      font-size: 12px;
      color: #475569;
    }}
    .footer a {{
      color: #3b82f6;
      text-decoration: none;
    }}
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    {preheader}
  </div>
  <div class="email-container">
    <div class="header">
      <div class="logo-text">NERDLUME • ACADEMIC AI CORE</div>
      <div class="badge">SECURE DISPATCH TELEMETRY</div>
    </div>
    <div class="content">
      {body_html}
    </div>
    <div class="footer">
      <p>NerdLume Automated System Communication • Direct cryptographic verification</p>
      <p>If you did not request this communication, please contact security@nerdlume.in</p>
      <p>&copy; 2026 NerdLume Technologies Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>"""


# ── Specific Transactional Templates ──────────────────────────────────────────

def template_password_reset(recipient: str, reset_token: str, app_url: str | None = None) -> tuple[str, str]:
    """1. Password Reset Email."""
    base = (app_url or get_app_url()).rstrip("/")
    reset_link = f"{base}/login?resetToken={reset_token}&email={recipient}"
    subject = "NerdLume: Account Password Reset Request"
    body = f"""
      <h1>PASSWORD RECOVERY DIRECTIVE</h1>
      <p>A request was received to reset the authentication credentials associated with <strong>{recipient}</strong>.</p>
      <p>To establish a new master password, initialize the cryptographic handshake using the button below:</p>
      
      <div style="text-align:center;">
        <a href="{reset_link}" class="btn">RESET CREDENTIALS</a>
      </div>

      <div class="panel">
        <div class="row">
          <span class="row-label">Security Protocol:</span>
          <span class="row-value">One-Time Hashed Nonce</span>
        </div>
        <div class="row">
          <span class="row-label">Time-To-Live:</span>
          <span class="row-value">15 Minutes from Dispatch</span>
        </div>
        <div class="row">
          <span class="row-label">Single-Use:</span>
          <span class="row-value">Invalidates immediately upon use</span>
        </div>
      </div>

      <p style="font-size:12px;color:#64748b;">
        If you did not initiate this request, your account remains secure. No action is required and existing active sessions remain valid unless updated.
      </p>
    """
    html = _wrap_cybernetic_template(subject, "Password reset authorization link", body)
    return subject, html


def template_account_verification(recipient: str, verify_token: str, app_url: str | None = None) -> tuple[str, str]:
    """2. Account Verification Email."""
    base = (app_url or get_app_url()).rstrip("/")
    verify_link = f"{base}/login?verifyToken={verify_token}&email={recipient}"
    subject = "NerdLume: Verify Your Scholar Account"
    body = f"""
      <h1>SCHOLAR IDENTITY VERIFICATION</h1>
      <p>Thank you for registering with NerdLume. Please verify your email identity to unlock standard generation allowances.</p>
      
      <div style="text-align:center;">
        <a href="{verify_link}" class="btn">CONFIRM ACCOUNT</a>
      </div>

      <p>Verification Link: <br><code style="font-size:11px;color:#60a5fa;word-break:break-all;">{verify_link}</code></p>
    """
    html = _wrap_cybernetic_template(subject, "Confirm your scholar identity", body)
    return subject, html


def template_welcome(recipient: str, name: str) -> tuple[str, str]:
    """3. Welcome Email."""
    subject = "Welcome to NerdLume: Advanced Academic Synthesis"
    body = f"""
      <h1>WELCOME TO NERDLUME, {name.upper()}</h1>
      <p>Your academic workspace has been successfully provisioned on the Free Scholar plan.</p>
      <div class="panel">
        <div class="row">
          <span class="row-label">Note Making Allowance:</span>
          <span class="row-value">5 Generations / Week</span>
        </div>
        <div class="row">
          <span class="row-label">Explain Sessions:</span>
          <span class="row-value">2 Sessions / Week</span>
        </div>
        <div class="row">
          <span class="row-label">Quick Assignment Modes:</span>
          <span class="row-value">5 Practical Files / Week</span>
        </div>
      </div>
      <p>Access your synthesis console anytime to begin generating Cornell notes, syllabus extractions, and exam practice modules.</p>
    """
    html = _wrap_cybernetic_template(subject, "Your academic AI workspace is ready", body)
    return subject, html


def template_payment_confirmation(
    recipient: str,
    plan_name: str,
    amount_inr: float,
    order_id: str,
    payment_id: str,
    cadence: str = "monthly",
) -> tuple[str, str]:
    """4. Payment Confirmation Email."""
    subject = f"NerdLume: Payment Confirmed for {plan_name}"
    body = f"""
      <h1>PAYMENT RECEIPT & TRANSACTION TELEMETRY</h1>
      <p>We have successfully received and verified your payment via Razorpay.</p>
      <div class="panel">
        <div class="row">
          <span class="row-label">Purchased Plan:</span>
          <span class="row-value">{plan_name} ({cadence.capitalize()})</span>
        </div>
        <div class="row">
          <span class="row-label">Amount Paid:</span>
          <span class="row-value">₹{amount_inr:,.2f} INR</span>
        </div>
        <div class="row">
          <span class="row-label">Razorpay Order ID:</span>
          <span class="row-value">{order_id}</span>
        </div>
        <div class="row">
          <span class="row-label">Razorpay Payment ID:</span>
          <span class="row-value">{payment_id}</span>
        </div>
        <div class="row">
          <span class="row-label">Transaction Date:</span>
          <span class="row-value">{datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}</span>
        </div>
      </div>
      <p>Your subscription privileges and compute allowances have been activated immediately.</p>
    """
    html = _wrap_cybernetic_template(subject, f"Receipt for {plan_name}", body)
    return subject, html


def template_subscription_activation(
    recipient: str,
    plan_name: str,
    limits_summary: str,
    expires_at: str,
) -> tuple[str, str]:
    """5. Subscription Activation Email."""
    subject = f"NerdLume: {plan_name} Activated"
    body = f"""
      <h1>SUBSCRIPTION ACTIVATED</h1>
      <p>Your account has been upgraded to <strong>{plan_name}</strong>.</p>
      <div class="panel">
        <div class="row">
          <span class="row-label">Active Tier:</span>
          <span class="row-value">{plan_name}</span>
        </div>
        <div class="row">
          <span class="row-label">Compute Limits:</span>
          <span class="row-value">{limits_summary}</span>
        </div>
        <div class="row">
          <span class="row-label">Billing Cycle End:</span>
          <span class="row-value">{expires_at}</span>
        </div>
      </div>
      <p>High-priority GPU reasoning pipelines and expanded multi-document file analysis are now accessible.</p>
    """
    html = _wrap_cybernetic_template(subject, f"{plan_name} is now live", body)
    return subject, html


def template_subscription_renewal(
    recipient: str,
    plan_name: str,
    amount_inr: float,
    next_billing_date: str,
) -> tuple[str, str]:
    """6. Subscription Renewal Email."""
    subject = f"NerdLume: Subscription Renewed: {plan_name}"
    body = f"""
      <h1>SUBSCRIPTION CYCLE RENEWED</h1>
      <p>Your recurring subscription for <strong>{plan_name}</strong> was successfully renewed.</p>
      <div class="panel">
        <div class="row">
          <span class="row-label">Tier:</span>
          <span class="row-value">{plan_name}</span>
        </div>
        <div class="row">
          <span class="row-label">Charged Amount:</span>
          <span class="row-value">₹{amount_inr:,.2f} INR</span>
        </div>
        <div class="row">
          <span class="row-label">Next Renewal Date:</span>
          <span class="row-value">{next_billing_date}</span>
        </div>
      </div>
      <p>Thank you for continuing to accelerate your academic research with NerdLume.</p>
    """
    html = _wrap_cybernetic_template(subject, f"Renewal confirmed for {plan_name}", body)
    return subject, html


def template_subscription_cancellation(
    recipient: str,
    plan_name: str,
    access_until: str,
) -> tuple[str, str]:
    """7. Subscription Cancellation Email."""
    subject = "NerdLume: Subscription Cancellation Confirmed"
    body = f"""
      <h1>SUBSCRIPTION CANCELLATION</h1>
      <p>We have processed your cancellation request for <strong>{plan_name}</strong>.</p>
      <div class="panel">
        <div class="row">
          <span class="row-label">Cancelled Plan:</span>
          <span class="row-value">{plan_name}</span>
        </div>
        <div class="row">
          <span class="row-label">Entitlement Retained Until:</span>
          <span class="row-value">{access_until}</span>
        </div>
      </div>
      <p>You will retain full access to all tier features until the date listed above. No subsequent charges will occur.</p>
    """
    html = _wrap_cybernetic_template(subject, "Cancellation confirmation", body)
    return subject, html


def template_payment_failure(
    recipient: str,
    plan_name: str,
    amount_inr: float,
    retry_url: str | None = None,
) -> tuple[str, str]:
    """8. Payment Failure Email."""
    base = retry_url or f"{get_app_url()}/dashboard"
    subject = "NerdLume Notice: Payment Processing Failure"
    body = f"""
      <h1>PAYMENT TRANSACTION FAILED</h1>
      <p>An attempt to charge your payment method for <strong>{plan_name}</strong> (₹{amount_inr:,.2f} INR) could not be completed.</p>
      <div class="panel">
        <div class="row">
          <span class="row-label">Status:</span>
          <span class="row-value">Billing Decline</span>
        </div>
        <div class="row">
          <span class="row-label">Grace Period:</span>
          <span class="row-value">3 Business Days</span>
        </div>
      </div>
      <div style="text-align:center;">
        <a href="{base}" class="btn">UPDATE PAYMENT DETAILS</a>
      </div>
      <p>Please update your billing details to maintain uninterrupted access to high-compute study models.</p>
    """
    html = _wrap_cybernetic_template(subject, "Action required: Payment failed", body)
    return subject, html


def template_subscription_expiration(recipient: str, former_plan: str) -> tuple[str, str]:
    """9. Subscription Expiration Email."""
    subject = "NerdLume: Subscription Concluded"
    body = f"""
      <h1>SUBSCRIPTION PERIOD CONCLUDED</h1>
      <p>Your billing term for <strong>{former_plan}</strong> has concluded.</p>
      <p>Your account has automatically transitioned to the Free Scholar tier. All your saved documents and history remain safely accessible in your account.</p>
      <div style="text-align:center;">
        <a href="{get_app_url()}/#pricing" class="btn">RENEW SUBSCRIPTION</a>
      </div>
    """
    html = _wrap_cybernetic_template(subject, "Subscription concluded", body)
    return subject, html

