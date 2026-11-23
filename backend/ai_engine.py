"""
NerdLume Multi-Agent AI Generation Engine & Resilient Provider Integration
Supports Google Gemini, Mistral AI, Groq, and OpenAI with exponential backoff,
structured error classification, connection health checks, and strict credential redaction.
"""

from __future__ import annotations

import json
import logging
import os
import random
import re
import socket
import time
import urllib.error
import urllib.request
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger("nerdlume.ai")

# ── Credential Getters (Dynamic runtime resolution from environment) ───────────

def get_gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()

def get_mistral_key() -> str:
    return os.getenv("MISTRAL_API_KEY", "").strip()

def get_groq_key() -> str:
    return os.getenv("GROQ_API_KEY", "").strip()

def get_openai_key() -> str:
    return os.getenv("OPENAI_API_KEY", "").strip()

def is_valid_key(key: str | None) -> bool:
    """Validate that key is non-empty and not a dummy placeholder."""
    if not key or not isinstance(key, str):
        return False
    k = key.strip()
    if len(k) < 8:
        return False
    lower = k.lower()
    if any(placeholder in lower for placeholder in ("your_", "placeholder", "xxx", "dummy", "todo")):
        return False
    return True


# ── Structured Error Taxonomy ──────────────────────────────────────────────────

class AIErrorType(str, Enum):
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    EXPIRED_CREDENTIALS = "EXPIRED_CREDENTIALS"
    RATE_LIMITED = "RATE_LIMITED"
    INSUFFICIENT_QUOTA = "INSUFFICIENT_QUOTA"
    PROVIDER_DOWNTIME = "PROVIDER_DOWNTIME"
    TIMEOUT = "TIMEOUT"
    NETWORK_ERROR = "NETWORK_ERROR"
    MALFORMED_RESPONSE = "MALFORMED_RESPONSE"
    UNKNOWN = "UNKNOWN"


class AIProviderException(Exception):
    """Structured exception carrying categorized failure mode and sanitized details."""
    def __init__(self, provider: str, error_type: AIErrorType, message: str, status_code: int | None = None):
        self.provider = provider
        self.error_type = error_type
        self.status_code = status_code
        self.sanitized_message = sanitize_ai_text(message)
        super().__init__(f"[{provider}] {error_type.value}: {self.sanitized_message}")


def sanitize_ai_text(text: str) -> str:
    """Strip all potential API keys, secrets, and auth headers from text."""
    if not text:
        return ""
    # Redact query param keys: ?key=... or &key=...
    text = re.sub(r"([?&]key=)[^&\s]+", r"\1[REDACTED]", text, flags=re.IGNORECASE)
    # Redact Bearer tokens: Bearer ...
    text = re.sub(r"(Bearer\s+)[A-Za-z0-9_\-\.]{8,}", r"\1[REDACTED]", text, flags=re.IGNORECASE)
    # Redact generic api keys: AIza..., sk-..., gsk_...
    text = re.sub(r"AIza[0-9A-Za-z-_]{35}", "[GEMINI_KEY_REDACTED]", text)
    text = re.sub(r"sk-[a-zA-Z0-9_\-]{20,}", "[OPENAI_KEY_REDACTED]", text)
    text = re.sub(r"gsk_[a-zA-Z0-9_\-]{20,}", "[GROQ_KEY_REDACTED]", text)
    return text


# ── Resilient Request Transport with Exponential Backoff ───────────────────────

AI_MAX_RETRIES = int(os.getenv("AI_MAX_RETRIES", "2"))
AI_RETRY_DELAY = float(os.getenv("AI_RETRY_DELAY", "1.0"))
AI_REQUEST_TIMEOUT = int(os.getenv("AI_REQUEST_TIMEOUT", "60"))

RETRYABLE_ERROR_TYPES = {
    AIErrorType.RATE_LIMITED,
    AIErrorType.PROVIDER_DOWNTIME,
    AIErrorType.TIMEOUT,
    AIErrorType.NETWORK_ERROR,
}


def post_ai_request(
    provider_name: str,
    url: str,
    headers: dict[str, str],
    payload: dict[str, Any],
    timeout: int = AI_REQUEST_TIMEOUT,
    max_retries: int = AI_MAX_RETRIES,
) -> dict[str, Any]:
    """
    Executes an HTTPS POST request to an AI provider with retry & exponential backoff.
    Never exposes API keys in raised exceptions or logs.
    """
    data = json.dumps(payload).encode("utf-8")
    req_headers = {
        "User-Agent": "NerdLume-AI-Client/2.0",
        "Content-Type": "application/json",
        **headers,
    }

    last_exception: Exception | None = None

    for attempt in range(max_retries + 1):
        req = urllib.request.Request(url, data=data, headers=req_headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw_bytes = resp.read()
                try:
                    return json.loads(raw_bytes.decode("utf-8"))
                except json.JSONDecodeError as jde:
                    raise AIProviderException(
                        provider_name,
                        AIErrorType.MALFORMED_RESPONSE,
                        f"Failed to parse provider response: {jde}",
                        resp.status,
                    )

        except urllib.error.HTTPError as exc:
            body = ""
            try:
                body = exc.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            status = exc.code
            body_lower = body.lower()

            if status in (401, 403):
                if "expired" in body_lower or "revoked" in body_lower:
                    err_type = AIErrorType.EXPIRED_CREDENTIALS
                else:
                    err_type = AIErrorType.INVALID_CREDENTIALS
            elif status == 429:
                err_type = AIErrorType.RATE_LIMITED
            elif status == 402 or "quota" in body_lower or "insufficient" in body_lower:
                err_type = AIErrorType.INSUFFICIENT_QUOTA
            elif status in (500, 502, 503, 504):
                err_type = AIErrorType.PROVIDER_DOWNTIME
            else:
                err_type = AIErrorType.UNKNOWN

            ai_exc = AIProviderException(
                provider_name,
                err_type,
                f"HTTP {status} from {sanitize_ai_text(url)}: {sanitize_ai_text(body[:200])}",
                status,
            )
            last_exception = ai_exc

            # Check if retryable
            if err_type in RETRYABLE_ERROR_TYPES and attempt < max_retries:
                sleep_time = (AI_RETRY_DELAY * (2 ** attempt)) + random.uniform(0.1, 0.4)
                logger.warning(
                    f"[AI Retry] {provider_name} returned HTTP {status} ({err_type.value}). Retrying in {sleep_time:.2f}s (attempt {attempt+1}/{max_retries})."
                )
                time.sleep(sleep_time)
                continue
            raise ai_exc

        except (urllib.error.URLError, socket.timeout, TimeoutError) as net_err:
            is_timeout = isinstance(net_err, socket.timeout) or "timed out" in str(net_err).lower()
            err_type = AIErrorType.TIMEOUT if is_timeout else AIErrorType.NETWORK_ERROR
            ai_exc = AIProviderException(
                provider_name,
                err_type,
                f"Network failure connecting to {sanitize_ai_text(url)}: {net_err}",
            )
            last_exception = ai_exc

            if attempt < max_retries:
                sleep_time = (AI_RETRY_DELAY * (2 ** attempt)) + random.uniform(0.1, 0.4)
                logger.warning(
                    f"[AI Retry] {provider_name} network error ({err_type.value}). Retrying in {sleep_time:.2f}s (attempt {attempt+1}/{max_retries})."
                )
                time.sleep(sleep_time)
                continue
            raise ai_exc

        except AIProviderException:
            raise
        except Exception as generic_exc:
            ai_exc = AIProviderException(
                provider_name,
                AIErrorType.UNKNOWN,
                f"Unexpected exception: {generic_exc}",
            )
            raise ai_exc

    if last_exception:
        raise last_exception
    raise AIProviderException(provider_name, AIErrorType.UNKNOWN, "Failed after max retries")


# ── Provider Specific Execution Methods ────────────────────────────────────────

def execute_gemini(
    prompt: str,
    files_b64: list[dict[str, Any]] | None = None,
    model: str = "gemini-1.5-flash",
) -> str:
    """Call Google AI Studio / Gemini API."""
    key = get_gemini_key()
    if not is_valid_key(key):
        raise AIProviderException("Gemini", AIErrorType.INVALID_CREDENTIALS, "GEMINI_API_KEY is not configured")

    parts: list[dict[str, Any]] = []
    if files_b64:
        for f in files_b64:
            parts.append({
                "inline_data": {
                    "mime_type": f.get("mimeType", "application/octet-stream"),
                    "data": f["data"],
                }
            })
    parts.append({"text": prompt})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 4096},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

    res = post_ai_request("Gemini", url, {}, payload)
    try:
        return res["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as ke:
        raise AIProviderException("Gemini", AIErrorType.MALFORMED_RESPONSE, f"Invalid Gemini response structure: {ke}")


def execute_mistral(
    prompt: str,
    system: str = "You are Mistral AI, an expert academic reasoning assistant.",
    model: str = "mistral-small-latest",
) -> str:
    """Call Mistral AI chat completions endpoint."""
    key = get_mistral_key()
    if not is_valid_key(key):
        raise AIProviderException("Mistral", AIErrorType.INVALID_CREDENTIALS, "MISTRAL_API_KEY is not configured")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 4096,
    }
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {key}"}

    res = post_ai_request("Mistral", url, headers, payload)
    try:
        return res["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as ke:
        raise AIProviderException("Mistral", AIErrorType.MALFORMED_RESPONSE, f"Invalid Mistral response structure: {ke}")


def execute_groq(
    prompt: str,
    system: str = "You are Groq AI, an expert exam question and practice set generator.",
    model: str = "llama-3.3-70b-versatile",
) -> str:
    """Call Groq API for high-speed Q&A inference."""
    key = get_groq_key()
    if not is_valid_key(key):
        raise AIProviderException("Groq", AIErrorType.INVALID_CREDENTIALS, "GROQ_API_KEY is not configured")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 4096,
    }
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {key}"}

    res = post_ai_request("Groq", url, headers, payload)
    try:
        return res["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as ke:
        raise AIProviderException("Groq", AIErrorType.MALFORMED_RESPONSE, f"Invalid Groq response structure: {ke}")


def execute_openai(
    prompt: str,
    system: str = "You are NerdLume, an expert academic assistant.",
    model: str = "gpt-4o-mini",
) -> str:
    """Call OpenAI chat completions endpoint."""
    key = get_openai_key()
    if not is_valid_key(key):
        raise AIProviderException("OpenAI", AIErrorType.INVALID_CREDENTIALS, "OPENAI_API_KEY is not configured")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 4096,
    }
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {key}"}

    res = post_ai_request("OpenAI", url, headers, payload)
    try:
        return res["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as ke:
        raise AIProviderException("OpenAI", AIErrorType.MALFORMED_RESPONSE, f"Invalid OpenAI response structure: {ke}")


# ── Diagnostics & Provider Connection Validation ───────────────────────────────

def check_provider_health(provider_name: str, test_connectivity: bool = False) -> dict[str, Any]:
    """
    Validates configuration and optionally probes connectivity for an AI provider.
    Returns status: 'healthy', 'unconfigured', 'degraded', or 'error'.
    """
    name = provider_name.lower()
    start_time = time.monotonic()

    if name in ("gemini", "google"):
        key = get_gemini_key()
        configured = is_valid_key(key)
        model = "gemini-1.5-flash"
        if not configured:
            return {"provider": "Gemini", "configured": False, "status": "unconfigured", "model": model}
        if test_connectivity:
            try:
                execute_gemini("Ping test. Answer with 'PONG'.", model=model)
                latency = round((time.monotonic() - start_time) * 1000, 2)
                return {"provider": "Gemini", "configured": True, "status": "healthy", "model": model, "latencyMs": latency}
            except Exception as e:
                return {"provider": "Gemini", "configured": True, "status": "error", "model": model, "error": sanitize_ai_text(str(e))}
        return {"provider": "Gemini", "configured": True, "status": "available", "model": model}

    elif name in ("mistral", "mistralai"):
        key = get_mistral_key()
        configured = is_valid_key(key)
        model = "mistral-small-latest"
        if not configured:
            return {"provider": "Mistral", "configured": False, "status": "unconfigured", "model": model}
        if test_connectivity:
            try:
                execute_mistral("Ping test. Answer with 'PONG'.", model=model)
                latency = round((time.monotonic() - start_time) * 1000, 2)
                return {"provider": "Mistral", "configured": True, "status": "healthy", "model": model, "latencyMs": latency}
            except Exception as e:
                return {"provider": "Mistral", "configured": True, "status": "error", "model": model, "error": sanitize_ai_text(str(e))}
        return {"provider": "Mistral", "configured": True, "status": "available", "model": model}

    elif name in ("groq", "groqai"):
        key = get_groq_key()
        configured = is_valid_key(key)
        model = "llama-3.3-70b-versatile"
        if not configured:
            return {"provider": "Groq", "configured": False, "status": "unconfigured", "model": model}
        if test_connectivity:
            try:
                execute_groq("Ping test. Answer with 'PONG'.", model=model)
                latency = round((time.monotonic() - start_time) * 1000, 2)
                return {"provider": "Groq", "configured": True, "status": "healthy", "model": model, "latencyMs": latency}
            except Exception as e:
                return {"provider": "Groq", "configured": True, "status": "error", "model": model, "error": sanitize_ai_text(str(e))}
        return {"provider": "Groq", "configured": True, "status": "available", "model": model}

    elif name in ("openai", "chatgpt"):
        key = get_openai_key()
        configured = is_valid_key(key)
        model = "gpt-4o-mini"
        if not configured:
            return {"provider": "OpenAI", "configured": False, "status": "unconfigured", "model": model}
        if test_connectivity:
            try:
                execute_openai("Ping test. Answer with 'PONG'.", model=model)
                latency = round((time.monotonic() - start_time) * 1000, 2)
                return {"provider": "OpenAI", "configured": True, "status": "healthy", "model": model, "latencyMs": latency}
            except Exception as e:
                return {"provider": "OpenAI", "configured": True, "status": "error", "model": model, "error": sanitize_ai_text(str(e))}
        return {"provider": "OpenAI", "configured": True, "status": "available", "model": model}

    return {"provider": provider_name, "configured": False, "status": "unsupported"}


def check_all_providers(test_connectivity: bool = False) -> dict[str, Any]:
    """Diagnose status across all supported AI providers."""
    providers = ["gemini", "mistral", "groq", "openai"]
    results = [check_provider_health(p, test_connectivity=test_connectivity) for p in providers]
    configured_count = sum(1 for r in results if r.get("configured"))
    healthy_count = sum(1 for r in results if r.get("status") in ("healthy", "available"))
    return {
        "ok": True,
        "configuredCount": configured_count,
        "healthyCount": healthy_count,
        "providers": results,
    }

