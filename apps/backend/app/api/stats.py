from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Donation, DonationStatus, HelpRequest, HelpRequestStatus, Visibility

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/public")
def public_stats(db: Session = Depends(get_db)) -> dict:
    live_count = db.scalar(
        select(func.count())
        .select_from(HelpRequest)
        .where(
            HelpRequest.status == HelpRequestStatus.LIVE.value,
            HelpRequest.visibility == Visibility.PUBLIC.value,
        )
    ) or 0

    held_total = db.scalar(
        select(func.coalesce(func.sum(Donation.net_to_request), 0)).where(
            Donation.status.in_(
                [DonationStatus.HELD.value, DonationStatus.PAID_OUT.value]
            )
        )
    ) or 0

    funded_count = db.scalar(
        select(func.count())
        .select_from(HelpRequest)
        .where(HelpRequest.status == HelpRequestStatus.FUNDED.value)
    ) or 0

    gift_count = db.scalar(
        select(func.count())
        .select_from(Donation)
        .where(
            Donation.status.in_(
                [DonationStatus.HELD.value, DonationStatus.PAID_OUT.value]
            )
        )
    ) or 0

    return {
        "live_requests": int(live_count),
        "total_given_ngn": float(held_total),
        "people_helped": int(funded_count),
        "gift_count": int(gift_count),
    }
