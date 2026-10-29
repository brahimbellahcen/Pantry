"""Loyalty points, flash sales, product variants, subscriptions, referrals

Revision ID: 006
Revises: 005
Create Date: 2026-10-29
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── Product Variants ───────────────────────────────────────────────────
    op.create_table(
        "product_variants",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),        # e.g. "500g", "1kg", "Red"
        sa.Column("sku", sa.String(100), unique=True, nullable=True),
        sa.Column("price_modifier", sa.Numeric(10, 2), default=0),  # added to base price
        sa.Column("stock", sa.Integer, default=0),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("sort_order", sa.Integer, default=0),
    )

    # ── Flash Sales ────────────────────────────────────────────────────────
    op.create_table(
        "flash_sales",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("discount_type", sa.String(20), nullable=False),  # percent | fixed
        sa.Column("discount_value", sa.Numeric(10, 2), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_quantity", sa.Integer, nullable=True),        # cap total units sold
        sa.Column("sold_count", sa.Integer, default=0),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Loyalty Points ─────────────────────────────────────────────────────
    op.create_table(
        "loyalty_accounts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("balance", sa.Integer, default=0),  # points balance
        sa.Column("lifetime_earned", sa.Integer, default=0),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_table(
        "loyalty_transactions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="SET NULL"), nullable=True),
        sa.Column("type", sa.String(30), nullable=False),   # earn | redeem | expire | referral
        sa.Column("points", sa.Integer, nullable=False),    # positive = earn, negative = redeem
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Subscriptions ──────────────────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("frequency", sa.String(20), nullable=False),   # weekly | biweekly | monthly
        sa.Column("status", sa.String(20), default="active"),    # active | paused | cancelled
        sa.Column("shipping_address_id", sa.Integer, sa.ForeignKey("addresses.id"), nullable=True),
        sa.Column("next_order_date", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_table(
        "subscription_items",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("subscription_id", sa.Integer, sa.ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer, default=1),
    )

    # ── Referral System ────────────────────────────────────────────────────
    op.create_table(
        "referrals",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("referrer_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("referee_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("code", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("status", sa.String(20), default="pending"),  # pending | completed
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Add referral_code column to users
    op.add_column("users", sa.Column("referral_code", sa.String(20), unique=True, nullable=True))

    # Add loyalty_points_used column to orders
    op.add_column("orders", sa.Column("loyalty_points_used", sa.Integer, default=0))
    op.add_column("orders", sa.Column("loyalty_points_earned", sa.Integer, default=0))


def downgrade() -> None:
    op.drop_column("orders", "loyalty_points_earned")
    op.drop_column("orders", "loyalty_points_used")
    op.drop_column("users", "referral_code")
    for tbl in ["referrals", "subscription_items", "subscriptions",
                "loyalty_transactions", "loyalty_accounts",
                "flash_sales", "product_variants"]:
        op.drop_table(tbl)
