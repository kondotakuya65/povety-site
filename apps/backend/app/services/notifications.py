from __future__ import annotations

import logging
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Donation, HelpRequest, Payout, Refund, User
from app.services import email_templates
from app.services.email import safe_send_email

logger = logging.getLogger(__name__)


def _ngn(amount: Decimal | float | int | str) -> str:
    return f"₦{Decimal(str(amount)):,.2f}"


def _request_url(request_id: object) -> str:
    return f"{settings.frontend_url.rstrip('/')}/requests/{request_id}"


def _account_url() -> str:
    return f"{settings.frontend_url.rstrip('/')}/account"


def _user_email(db: Session, user_id: object | None) -> str | None:
    if user_id is None:
        return None
    user = db.scalar(select(User).where(User.id == user_id))
    if user is None or not user.email:
        return None
    return user.email.strip().lower()


def notify_donation_received(db: Session, donation: Donation) -> None:
    request = db.scalar(select(HelpRequest).where(HelpRequest.id == donation.help_request_id))
    if request is None:
        return
    to = _user_email(db, donation.donor_user_id)
    subject, text, html = email_templates.donation_received(
        donor_name="",
        request_name=request.full_name,
        amount_label=_ngn(donation.gross_amount),
        reference=donation.paystack_reference,
        request_url=_request_url(request.id),
    )
    safe_send_email(to=to, subject=subject, text_body=text, html_body=html)


def notify_request_approved(db: Session, request: HelpRequest) -> None:
    to = _user_email(db, request.user_id)
    deadline = (
        request.deadline_at.strftime("%d %b %Y")
        if request.deadline_at
        else f"{request.deadline_days} days from approval"
    )
    subject, text, html = email_templates.request_approved(
        full_name=request.full_name,
        goal_label=_ngn(request.goal_ngn),
        deadline_label=deadline,
        request_url=_request_url(request.id),
    )
    safe_send_email(to=to, subject=subject, text_body=text, html_body=html)


def notify_payout_sent(db: Session, payout: Payout) -> None:
    request = db.scalar(select(HelpRequest).where(HelpRequest.id == payout.help_request_id))
    if request is None:
        return
    to = _user_email(db, request.user_id)
    subject, text, html = email_templates.payout_sent(
        full_name=request.full_name,
        amount_label=_ngn(payout.amount),
        account_name=payout.recipient_account_name or request.account_name or "",
        request_url=_account_url(),
    )
    safe_send_email(to=to, subject=subject, text_body=text, html_body=html)


def notify_refund_processed(db: Session, refund: Refund) -> None:
    donation = db.scalar(select(Donation).where(Donation.id == refund.donation_id))
    if donation is None:
        return
    request = db.scalar(select(HelpRequest).where(HelpRequest.id == donation.help_request_id))
    request_name = request.full_name if request else "your gift"
    to = _user_email(db, donation.donor_user_id)
    subject, text, html = email_templates.refund_processed(
        amount_label=_ngn(refund.amount),
        reason_label=refund.reason.replace("_", " "),
        request_name=request_name,
        account_url=_account_url(),
    )
    safe_send_email(to=to, subject=subject, text_body=text, html_body=html)


def notify_contact_message(db: Session, row: object) -> None:
    from app.services.contact import TOPIC_LABELS, support_inbox_email

    to = support_inbox_email(db)
    subject, text, html = email_templates.contact_received(
        name=getattr(row, "name", ""),
        email=getattr(row, "email", ""),
        phone=getattr(row, "phone", None) or "—",
        topic_label=TOPIC_LABELS.get(getattr(row, "topic", ""), getattr(row, "topic", "")),
        body=getattr(row, "body", ""),
        inbox_url=f"{settings.frontend_url.rstrip('/')}/admin/messages",
    )
    safe_send_email(
        to=to,
        subject=subject,
        text_body=text,
        html_body=html,
        reply_to=getattr(row, "email", None),
    )
