"""donation pending status

Revision ID: 0003_donation_pending
Revises: 0002_otp_codes
Create Date: 2026-08-14

"""

from typing import Sequence, Union

from alembic import op

revision: str = "0003_donation_pending"
down_revision: Union[str, Sequence[str], None] = "0002_otp_codes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_donations_status", "donations", type_="check")
    op.create_check_constraint(
        "ck_donations_status",
        "donations",
        "status IN ('pending', 'held', 'paid_out', 'refunded')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_donations_status", "donations", type_="check")
    op.create_check_constraint(
        "ck_donations_status",
        "donations",
        "status IN ('held', 'paid_out', 'refunded')",
    )
