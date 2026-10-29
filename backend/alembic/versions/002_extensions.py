"""Add coupons, reviews, delivery slots, wishlists

Revision ID: 002
Revises: 001
Create Date: 2026-10-29
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Coupons ────────────────────────────────────────────────────────────
    op.create_table(
        "coupons",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("code", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("discount_type", sa.String(20), nullable=False),   # percent | fixed
        sa.Column("discount_value", sa.Numeric(10, 2), nullable=False),
        sa.Column("min_order_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("max_discount_amount", sa.Numeric(10, 2), nullable=True),  # cap for percent
        sa.Column("usage_limit", sa.Integer, nullable=True),          # None = unlimited
        sa.Column("used_count", sa.Integer, nullable=False, default=0),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Reviews ────────────────────────────────────────────────────────────
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rating", sa.Integer, nullable=False),              # 1–5
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("is_verified_purchase", sa.Boolean, default=False),
        sa.Column("status", sa.String(20), nullable=False, default="pending"),  # pending|approved|rejected
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("product_id", "user_id", name="uq_review_product_user"),
    )

    # ── Delivery slots ─────────────────────────────────────────────────────
    op.create_table(
        "delivery_slots",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("time_window", sa.String(50), nullable=False),      # e.g. "09:00–12:00"
        sa.Column("capacity", sa.Integer, nullable=False, default=20),
        sa.Column("booked_count", sa.Integer, nullable=False, default=0),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.UniqueConstraint("date", "time_window", name="uq_slot_date_window"),
    )

    # Add slot FK to orders
    op.add_column("orders", sa.Column("delivery_slot_id", sa.Integer,
        sa.ForeignKey("delivery_slots.id"), nullable=True))

    # ── Wishlists ──────────────────────────────────────────────────────────
    op.create_table(
        "wishlist_items",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "product_id", name="uq_wishlist_user_product"),
    )


def downgrade() -> None:
    op.drop_column("orders", "delivery_slot_id")
    for tbl in ["wishlist_items", "delivery_slots", "reviews", "coupons"]:
        op.drop_table(tbl)
