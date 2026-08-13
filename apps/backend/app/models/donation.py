from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.help_request import HelpRequest
from app.models.user import User

if TYPE_CHECKING:
    from app.models.payout import Payout
    from app.models.refund import Refund


class Donation(Base):
    __tablename__ = "donations"
    __table_args__ = (
        CheckConstraint(
            "status IN ('held', 'paid_out', 'refunded')",
            name="ck_donations_status",
        ),
        CheckConstraint("gross_amount > 0", name="ck_donations_gross_positive"),
        CheckConstraint("platform_fee_amount >= 0", name="ck_donations_fee_non_negative"),
        CheckConstraint("net_to_request >= 0", name="ck_donations_net_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    help_request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("help_requests.id", ondelete="CASCADE"),
        index=True,
    )
    donor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    platform_fee_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    net_to_request: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    fee_percent_snapshot: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"))
    status: Mapped[str] = mapped_column(String(16), default="held", index=True)
    paystack_reference: Mapped[str] = mapped_column(String(128), unique=True)
    payout_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("payouts.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    help_request: Mapped[HelpRequest] = relationship(back_populates="donations")
    donor: Mapped[User | None] = relationship()
    payout: Mapped[Payout | None] = relationship(back_populates="donations")
    refund: Mapped[Refund | None] = relationship(back_populates="donation")
