from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.help_request import HelpRequest
from app.models.user import User

if TYPE_CHECKING:
    from app.models.donation import Donation


class PayoutBatch(Base):
    __tablename__ = "payout_batches"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'completed', 'failed')",
            name="ck_payout_batches_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by: Mapped[User | None] = relationship()
    payouts: Mapped[list[Payout]] = relationship(back_populates="batch")


class Payout(Base):
    __tablename__ = "payouts"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'success', 'failed')",
            name="ck_payouts_status",
        ),
        CheckConstraint("amount > 0", name="ck_payouts_amount_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payout_batches.id", ondelete="CASCADE"), index=True)
    help_request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("help_requests.id", ondelete="CASCADE"),
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    status: Mapped[str] = mapped_column(String(16), default="pending")
    paystack_transfer_code: Mapped[str | None] = mapped_column(String(128), nullable=True)
    paystack_reference: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    recipient_bank_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    recipient_account_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    recipient_account_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    batch: Mapped[PayoutBatch] = relationship(back_populates="payouts")
    help_request: Mapped[HelpRequest] = relationship()
    donations: Mapped[list[Donation]] = relationship(back_populates="payout")
