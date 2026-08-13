"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-13

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=16), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)

    op.create_table(
        "media_assets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), nullable=False),
        sa.Column("path", sa.String(length=512), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False, server_default="application/octet-stream"),
        sa.Column("kind", sa.String(length=16), nullable=False, server_default="photo"),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "help_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("story", sa.Text(), nullable=False),
        sa.Column("goal_ngn", sa.Numeric(14, 2), nullable=False),
        sa.Column("raised_ngn", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("deadline_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending_review"),
        sa.Column("visibility", sa.String(length=16), nullable=False, server_default="private"),
        sa.Column("verification_type", sa.String(length=16), nullable=False),
        sa.Column("verification_nin", sa.String(length=32), nullable=True),
        sa.Column("verification_phone", sa.String(length=32), nullable=True),
        sa.Column("photo_asset_id", sa.Uuid(), nullable=True),
        sa.Column("bank_code", sa.String(length=16), nullable=True),
        sa.Column("account_number", sa.String(length=32), nullable=True),
        sa.Column("account_name", sa.String(length=200), nullable=True),
        sa.Column("reviewed_by_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('draft', 'pending_review', 'live', 'funded', 'closed_refunded', 'rejected')",
            name="ck_help_requests_status",
        ),
        sa.CheckConstraint("visibility IN ('public', 'private')", name="ck_help_requests_visibility"),
        sa.CheckConstraint(
            "(status = 'live' AND visibility = 'public') OR (status <> 'live' AND visibility = 'private')",
            name="ck_help_requests_visibility_matches_status",
        ),
        sa.CheckConstraint("verification_type IN ('nin', 'phone')", name="ck_help_requests_verification_type"),
        sa.CheckConstraint("deadline_days IN (14, 30, 60)", name="ck_help_requests_deadline_days"),
        sa.CheckConstraint("goal_ngn > 0", name="ck_help_requests_goal_positive"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["photo_asset_id"], ["media_assets.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_help_requests_user_id", "help_requests", ["user_id"])
    op.create_index("ix_help_requests_status", "help_requests", ["status"])
    op.create_index("ix_help_requests_public_live", "help_requests", ["status", "visibility"])
    op.create_index(
        "uq_help_requests_one_open_per_user",
        "help_requests",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('draft', 'pending_review', 'live')"),
    )

    op.create_table(
        "payout_batches",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("created_by_id", sa.Uuid(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('pending', 'completed', 'failed')", name="ck_payout_batches_status"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "payouts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("batch_id", sa.Uuid(), nullable=False),
        sa.Column("help_request_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("paystack_transfer_code", sa.String(length=128), nullable=True),
        sa.Column("paystack_reference", sa.String(length=128), nullable=True),
        sa.Column("recipient_bank_code", sa.String(length=16), nullable=True),
        sa.Column("recipient_account_number", sa.String(length=32), nullable=True),
        sa.Column("recipient_account_name", sa.String(length=200), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'success', 'failed')", name="ck_payouts_status"),
        sa.CheckConstraint("amount > 0", name="ck_payouts_amount_positive"),
        sa.ForeignKeyConstraint(["batch_id"], ["payout_batches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["help_request_id"], ["help_requests.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("paystack_reference"),
    )
    op.create_index("ix_payouts_batch_id", "payouts", ["batch_id"])
    op.create_index("ix_payouts_help_request_id", "payouts", ["help_request_id"])

    op.create_table(
        "donations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("help_request_id", sa.Uuid(), nullable=False),
        sa.Column("donor_user_id", sa.Uuid(), nullable=True),
        sa.Column("gross_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("platform_fee_amount", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("net_to_request", sa.Numeric(14, 2), nullable=False),
        sa.Column("fee_percent_snapshot", sa.Numeric(5, 2), nullable=False, server_default="0.00"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="held"),
        sa.Column("paystack_reference", sa.String(length=128), nullable=False),
        sa.Column("payout_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('held', 'paid_out', 'refunded')", name="ck_donations_status"),
        sa.CheckConstraint("gross_amount > 0", name="ck_donations_gross_positive"),
        sa.CheckConstraint("platform_fee_amount >= 0", name="ck_donations_fee_non_negative"),
        sa.CheckConstraint("net_to_request >= 0", name="ck_donations_net_non_negative"),
        sa.ForeignKeyConstraint(["help_request_id"], ["help_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["donor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["payout_id"], ["payouts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("paystack_reference"),
    )
    op.create_index("ix_donations_help_request_id", "donations", ["help_request_id"])
    op.create_index("ix_donations_donor_user_id", "donations", ["donor_user_id"])
    op.create_index("ix_donations_status", "donations", ["status"])

    op.create_table(
        "refunds",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("donation_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("reason", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("paystack_refund_reference", sa.String(length=128), nullable=True),
        sa.Column("requested_by_id", sa.Uuid(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'success', 'failed')", name="ck_refunds_status"),
        sa.CheckConstraint(
            "reason IN ('unmet_goal', 'donor_requested', 'failed_charge', 'duplicate')",
            name="ck_refunds_reason",
        ),
        sa.CheckConstraint("amount > 0", name="ck_refunds_amount_positive"),
        sa.ForeignKeyConstraint(["donation_id"], ["donations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("donation_id"),
        sa.UniqueConstraint("paystack_refund_reference"),
    )

    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("value", sa.Text(), nullable=False, server_default=""),
        sa.Column("value_type", sa.String(length=16), nullable=False, server_default="string"),
        sa.Column("updated_by_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("key"),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_actor_user_id", "audit_logs", ["actor_user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor_user_id", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_table("app_settings")
    op.drop_table("refunds")
    op.drop_index("ix_donations_status", table_name="donations")
    op.drop_index("ix_donations_donor_user_id", table_name="donations")
    op.drop_index("ix_donations_help_request_id", table_name="donations")
    op.drop_table("donations")
    op.drop_index("ix_payouts_help_request_id", table_name="payouts")
    op.drop_index("ix_payouts_batch_id", table_name="payouts")
    op.drop_table("payouts")
    op.drop_table("payout_batches")
    op.drop_index("uq_help_requests_one_open_per_user", table_name="help_requests")
    op.drop_index("ix_help_requests_public_live", table_name="help_requests")
    op.drop_index("ix_help_requests_status", table_name="help_requests")
    op.drop_index("ix_help_requests_user_id", table_name="help_requests")
    op.drop_table("help_requests")
    op.drop_table("media_assets")
    op.drop_index("ix_users_phone", table_name="users")
    op.drop_table("users")
