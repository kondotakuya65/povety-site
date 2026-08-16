"""Send a test Prosperax email (console or SMTP).

Usage:
  python -m app.scripts.send_test_email you@example.com
"""

from __future__ import annotations

import sys

from app.services.email import send_email
from app.services.email_templates import donation_received


def main() -> None:
    to = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    if not to:
        print("Usage: python -m app.scripts.send_test_email you@example.com")
        raise SystemExit(1)
    subject, text, html = donation_received(
        donor_name="Friend",
        request_name="Sample request",
        amount_label="₦1,000.00",
        reference="px_test_reference",
        request_url="http://localhost:3000/requests",
    )
    send_email(to=to, subject=f"[TEST] {subject}", text_body=text, html_body=html)
    print(f"Queued/sent test email to {to}")


if __name__ == "__main__":
    main()
