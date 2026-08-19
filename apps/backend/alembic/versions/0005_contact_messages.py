"""contact inbox

Revision ID: 0005_contact_messages
Revises: 0004_cancelled_requests
Create Date: 2026-08-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_contact_messages"
down_revision: Union[str, Sequence[str], None] = "0004_cancelled_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contact_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("topic", sa.String(length=32), nullable=False, server_default="general"),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="new"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "topic IN ('general', 'request', 'donation', 'account', 'other')",
            name="ck_contact_messages_topic",
        ),
        sa.CheckConstraint("status IN ('new', 'read')", name="ck_contact_messages_status"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contact_messages_email", "contact_messages", ["email"])
    op.create_index("ix_contact_messages_status", "contact_messages", ["status"])
    op.create_index("ix_contact_messages_created_at", "contact_messages", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_contact_messages_created_at", table_name="contact_messages")
    op.drop_index("ix_contact_messages_status", table_name="contact_messages")
    op.drop_index("ix_contact_messages_email", table_name="contact_messages")
    op.drop_table("contact_messages")
