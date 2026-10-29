"""DB-backed notification prefs, recently viewed, user settings

Revision ID: 007
Revises: 006
Create Date: 2026-10-29
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # User settings / notification prefs (JSON blob per user)
    op.create_table(
        "user_settings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"),
                  unique=True, nullable=False),
        sa.Column("notification_prefs", sa.JSON, nullable=False,
                  server_default='{"order_updates":true,"promotional":true,"low_stock_alerts":false,"weekly_digest":false}'),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )

    # Recently viewed products (per user, ordered by view time)
    op.create_table(
        "recently_viewed",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("viewed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "product_id", name="uq_recently_viewed"),
    )
    op.create_index("ix_recently_viewed_user_id", "recently_viewed", ["user_id"])


def downgrade() -> None:
    op.drop_table("recently_viewed")
    op.drop_table("user_settings")
