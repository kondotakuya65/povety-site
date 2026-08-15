from __future__ import annotations

import hashlib
import hmac
import json
import urllib.error
import urllib.request
from typing import Any

from app.core.config import settings


class PaystackError(RuntimeError):
    pass


def _request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    if settings.paystack_is_mock:
        raise PaystackError("Paystack is in mock mode")
    if not settings.paystack_secret_key:
        raise PaystackError("PAYSTACK_SECRET_KEY is not set")

    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        f"https://api.paystack.co{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {settings.paystack_secret_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="ignore")
        raise PaystackError(f"Paystack HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise PaystackError(f"Paystack request failed: {exc}") from exc

    if not body.get("status"):
        raise PaystackError(body.get("message") or "Paystack request failed")
    return body


def initialize_transaction(
    *,
    email: str,
    amount_kobo: int,
    reference: str,
    callback_url: str,
    metadata: dict[str, Any],
) -> dict[str, Any]:
    if settings.paystack_is_mock:
        return {
            "authorization_url": f"{settings.frontend_url}/donate/callback?reference={reference}&mock=1",
            "access_code": "mock_access",
            "reference": reference,
        }

    body = _request(
        "POST",
        "/transaction/initialize",
        {
            "email": email,
            "amount": amount_kobo,
            "reference": reference,
            "currency": "NGN",
            "callback_url": callback_url,
            "metadata": metadata,
        },
    )
    return body["data"]


def verify_transaction(reference: str) -> dict[str, Any]:
    if settings.paystack_is_mock:
        return {
            "status": "success",
            "reference": reference,
            "amount": 0,
            "currency": "NGN",
            "gateway_response": "mock",
        }
    body = _request("GET", f"/transaction/verify/{reference}")
    return body["data"]


def create_transfer_recipient(
    *,
    name: str,
    account_number: str,
    bank_code: str,
) -> dict[str, Any]:
    if settings.paystack_is_mock:
        return {"recipient_code": f"RCP_mock_{account_number[-4:]}"}
    body = _request(
        "POST",
        "/transferrecipient",
        {
            "type": "nuban",
            "name": name,
            "account_number": account_number,
            "bank_code": bank_code,
            "currency": "NGN",
        },
    )
    return body["data"]


def initiate_transfer(
    *,
    amount_kobo: int,
    recipient_code: str,
    reference: str,
    reason: str,
) -> dict[str, Any]:
    if settings.paystack_is_mock:
        return {
            "status": "success",
            "transfer_code": f"TRF_mock_{reference[-8:]}",
            "reference": reference,
        }
    body = _request(
        "POST",
        "/transfer",
        {
            "source": "balance",
            "amount": amount_kobo,
            "recipient": recipient_code,
            "reference": reference,
            "reason": reason,
        },
    )
    return body["data"]


def create_refund(
    *,
    transaction_reference: str,
    amount_kobo: int,
) -> dict[str, Any]:
    if settings.paystack_is_mock:
        return {
            "status": "processed",
            "id": f"REF_mock_{transaction_reference[-8:]}",
            "transaction": transaction_reference,
        }
    body = _request(
        "POST",
        "/refund",
        {
            "transaction": transaction_reference,
            "amount": amount_kobo,
            "currency": "NGN",
        },
    )
    return body["data"]


def verify_webhook_signature(raw_body: bytes, signature: str | None) -> bool:
    if settings.paystack_is_mock:
        return True
    if not signature or not settings.paystack_secret_key:
        return False
    digest = hmac.new(
        settings.paystack_secret_key.encode(),
        raw_body,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(digest, signature)
