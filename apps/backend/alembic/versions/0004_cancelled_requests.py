"""cancelled help requests + request_cancelled refunds

Revision ID: 0004_cancelled_requests
Revises: 0003_donation_pending
Create Date: 2026-08-19

"""

from typing import Sequence, Union

from alembic import op

revision: str = "0004_cancelled_requests"
down_revision: Union[str, Sequence[str], None] = "0003_donation_pending"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_help_requests_status", "help_requests", type_="check")
    op.create_check_constraint(
        "ck_help_requests_status",
        "help_requests",
        "status IN ('draft', 'pending_review', 'live', 'funded', 'closed_refunded', 'rejected', 'cancelled')",
    )
    op.drop_constraint("ck_refunds_reason", "refunds", type_="check")
    op.create_check_constraint(
        "ck_refunds_reason",
        "refunds",
        "reason IN ('unmet_goal', 'donor_requested', 'failed_charge', 'duplicate', 'request_cancelled')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_refunds_reason", "refunds", type_="check")
    op.create_check_constraint(
        "ck_refunds_reason",
        "refunds",
        "reason IN ('unmet_goal', 'donor_requested', 'failed_charge', 'duplicate')",
    )
    op.drop_constraint("ck_help_requests_status", "help_requests", type_="check")
    op.create_check_constraint(
        "ck_help_requests_status",
        "help_requests",
        "status IN ('draft', 'pending_review', 'live', 'funded', 'closed_refunded', 'rejected')",
    )
