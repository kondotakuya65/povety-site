import json
import logging
import urllib.error
import urllib.request

from app.core.config import settings
from app.core.phone import phone_for_sms

logger = logging.getLogger(__name__)


class SmsError(RuntimeError):
    pass


def send_otp_sms(phone_e164: str, code: str) -> None:
    message = f"Your Prosperax login code is {code}. It expires in {settings.otp_ttl_seconds // 60} minutes."
    provider = settings.sms_provider.lower().strip()

    if provider == "console" or settings.is_dev and not settings.termii_api_key:
        logger.info("OTP for %s: %s", phone_e164, code)
        print(f"[Prosperax OTP] {phone_e164} -> {code}")
        return

    if provider == "termii":
        _send_termii(phone_e164, message)
        return

    raise SmsError(f"Unknown SMS provider: {provider}")


def _send_termii(phone_e164: str, message: str) -> None:
    if not settings.termii_api_key:
        raise SmsError("TERMII_API_KEY is not set")

    payload = json.dumps(
        {
            "api_key": settings.termii_api_key,
            "to": phone_for_sms(phone_e164),
            "from": settings.termii_sender_id,
            "sms": message,
            "type": "plain",
            "channel": "generic",
        }
    ).encode()
    req = urllib.request.Request(
        "https://api.ng.termii.com/api/sms/send",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode()
            logger.info("Termii response: %s", body)
    except urllib.error.URLError as exc:
        raise SmsError(f"Failed to send SMS: {exc}") from exc
