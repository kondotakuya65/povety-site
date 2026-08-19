from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.media_asset import MediaAsset
from app.models.user import User

if TYPE_CHECKING:
    from app.models.donation import Donation


class HelpRequest(Base):
    __tablename__ = "help_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'pending_review', 'live', 'funded', 'closed_refunded', 'rejected', 'cancelled')",
            name="ck_help_requests_status",
        ),
        CheckConstraint(
            "visibility IN ('public', 'private')",
            name="ck_help_requests_visibility",
        ),
        CheckConstraint(
            "(status = 'live' AND visibility = 'public') OR (status <> 'live' AND visibility = 'private')",
            name="ck_help_requests_visibility_matches_status",
        ),
        CheckConstraint(
            "verification_type IN ('nin', 'phone')",
            name="ck_help_requests_verification_type",
        ),
        CheckConstraint(
            "deadline_days IN (14, 30, 60)",
            name="ck_help_requests_deadline_days",
        ),
        CheckConstraint("goal_ngn > 0", name="ck_help_requests_goal_positive"),
        Index(
            "uq_help_requests_one_open_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("status IN ('draft', 'pending_review', 'live')"),
        ),
        Index("ix_help_requests_public_live", "status", "visibility"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    story: Mapped[str] = mapped_column(Text)
    goal_ngn: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    raised_ngn: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    deadline_days: Mapped[int] = mapped_column(default=30)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending_review", index=True)
    visibility: Mapped[str] = mapped_column(String(16), default="private")
    verification_type: Mapped[str] = mapped_column(String(16))
    verification_nin: Mapped[str | None] = mapped_column(String(32), nullable=True)
    verification_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    photo_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("media_assets.id", ondelete="SET NULL"),
        nullable=True,
    )
    bank_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    account_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    account_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped[User] = relationship(back_populates="help_requests", foreign_keys=[user_id])
    photo: Mapped[MediaAsset | None] = relationship(foreign_keys=[photo_asset_id])
    donations: Mapped[list[Donation]] = relationship(back_populates="help_request")
