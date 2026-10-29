"""Returns table + name prefix index for autocomplete

Revision ID: 005
Revises: 004
Create Date: 2026-10-29
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Return requests ────────────────────────────────────────────────────
    op.create_table(
        "return_requests",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reason", sa.String(100), nullable=False),
        sa.Column("details", sa.Text, nullable=True),
        sa.Column("status", sa.String(30), nullable=False, default="pending"),
        sa.Column("resolution_note", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── Autocomplete prefix index (PostgreSQL only — no-op on SQLite) ──────
    # CREATE INDEX CONCURRENTLY would be better for live DBs; omit here for simplicity
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'lower') THEN
                CREATE INDEX IF NOT EXISTS ix_products_name_lower
                ON products (lower(name) text_pattern_ops);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_products_name_lower")
    op.drop_table("return_requests")
