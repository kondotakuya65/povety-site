from __future__ import annotations

from html import escape


def _shell(title: str, intro: str, rows: list[tuple[str, str]], cta_label: str | None, cta_url: str | None) -> tuple[str, str]:
    text_lines = [title, "", intro, ""]
    for label, value in rows:
        text_lines.append(f"{label}: {value}")
    if cta_url:
        text_lines.extend(["", f"{cta_label or 'Open'}: {cta_url}"])
    text_lines.extend(["", "— Prosperax", "Mutual aid for Nigeria"])
    text_body = "\n".join(text_lines)

    detail_html = "".join(
        f"<tr><td style='padding:6px 0;color:#3d5347;'>{escape(label)}</td>"
        f"<td style='padding:6px 0;text-align:right;color:#14201a;font-weight:600;'>{escape(value)}</td></tr>"
        for label, value in rows
    )
    cta_html = ""
    if cta_url:
        cta_html = (
            f"<p style='margin:24px 0 0;'>"
            f"<a href='{escape(cta_url)}' style='display:inline-block;background:#0f6b3d;color:#fff;"
            f"text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;'>"
            f"{escape(cta_label or 'Open Prosperax')}</a></p>"
        )

    html_body = f"""\
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f7f4;font-family:Segoe UI,Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #c5ddd0;border-radius:16px;overflow:hidden;">
    <div style="background:#0a4d2c;color:#fff;padding:20px 24px;">
      <div style="font-size:20px;font-weight:700;">Prosperax</div>
      <div style="opacity:.85;font-size:13px;margin-top:4px;">Mutual aid for Nigeria</div>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 12px;font-size:22px;color:#14201a;">{escape(title)}</h1>
      <p style="margin:0 0 18px;color:#3d5347;line-height:1.5;">{escape(intro)}</p>
      <table style="width:100%;border-collapse:collapse;">{detail_html}</table>
      {cta_html}
    </div>
  </div>
</body></html>
"""
    return text_body, html_body


def donation_received(
    *,
    donor_name: str,
    request_name: str,
    amount_label: str,
    reference: str,
    request_url: str,
) -> tuple[str, str, str]:
    subject = f"Gift received — {request_name}"
    text, html = _shell(
        "Your gift is held safely",
        f"Thank you{(' ' + donor_name) if donor_name else ''}. Your donation toward {request_name} "
        "is confirmed and held until weekly payout.",
        [
            ("Request", request_name),
            ("Amount", amount_label),
            ("Reference", reference),
        ],
        "View request",
        request_url,
    )
    return subject, text, html


def request_approved(
    *,
    full_name: str,
    goal_label: str,
    deadline_label: str,
    request_url: str,
) -> tuple[str, str, str]:
    subject = "Your Prosperax request is live"
    text, html = _shell(
        "Your request was approved",
        f"Good news, {full_name}. Your help request is now live and people can send gifts.",
        [
            ("Goal", goal_label),
            ("Deadline", deadline_label),
        ],
        "View your request",
        request_url,
    )
    return subject, text, html


def payout_sent(
    *,
    full_name: str,
    amount_label: str,
    account_name: str,
    request_url: str,
) -> tuple[str, str, str]:
    subject = "Prosperax payout sent"
    text, html = _shell(
        "Payout is on the way",
        f"Hi {full_name}, Prosperax has sent your weekly payout for a funded request.",
        [
            ("Amount", amount_label),
            ("Account name", account_name or "—"),
        ],
        "Open Prosperax",
        request_url,
    )
    return subject, text, html


def contact_received(
    *,
    name: str,
    email: str,
    phone: str,
    topic_label: str,
    body: str,
    inbox_url: str,
) -> tuple[str, str, str]:
    subject = f"Contact form — {topic_label}"
    text, html = _shell(
        "New message from the contact form",
        f"{name} sent a message through prosperax.org. Reply to them at {email}.",
        [
            ("Name", name),
            ("Email", email),
            ("Phone", phone),
            ("Topic", topic_label),
            ("Message", body),
        ],
        "Open inbox",
        inbox_url,
    )
    return subject, text, html


def refund_processed(
    *,
    amount_label: str,
    reason_label: str,
    request_name: str,
    account_url: str,
) -> tuple[str, str, str]:
    subject = "Prosperax refund processed"
    text, html = _shell(
        "Your refund was processed",
        f"A refund related to {request_name} has been processed through Paystack. "
        "It may take a few business days to appear on your statement.",
        [
            ("Amount", amount_label),
            ("Reason", reason_label),
            ("Request", request_name),
        ],
        "View account",
        account_url,
    )
    return subject, text, html
