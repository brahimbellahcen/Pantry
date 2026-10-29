"""Performance indexes and full-text search column

Revision ID: 004
Revises: 003
Create Date: 2026-10-29
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Performance indexes ────────────────────────────────────────────────
    # Orders: user lookup + status filter are the hottest queries
    op.create_index("ix_orders_user_id", "orders", ["user_id"])
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_orders_created_at", "orders", ["created_at"])

    # Order items: joining to orders
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])

    # Cart items: joining to carts
    op.create_index("ix_cart_items_cart_id", "cart_items", ["cart_id"])

    # Reviews: product listing
    op.create_index("ix_reviews_product_id_status", "reviews", ["product_id", "status"])

    # Wishlist: user lookup
    op.create_index("ix_wishlist_user_id", "wishlist_items", ["user_id"])

    # Delivery slots: date range queries
    op.create_index("ix_delivery_slots_date", "delivery_slots", ["date"])

    # Coupons: code lookup is already unique-indexed; add active filter index
    op.create_index("ix_coupons_is_active", "coupons", ["is_active"])

    # ── Full-text search on products (PostgreSQL tsvector) ─────────────────
    # Add a generated tsvector column for fast full-text search
    op.execute("""
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(description, '')), 'B')
        ) STORED
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_products_search_vector
        ON products USING gin(search_vector)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_products_search_vector")
    op.execute("ALTER TABLE products DROP COLUMN IF EXISTS search_vector")

    for idx in [
        "ix_coupons_is_active", "ix_delivery_slots_date",
        "ix_wishlist_user_id", "ix_reviews_product_id_status",
        "ix_cart_items_cart_id", "ix_order_items_order_id",
        "ix_orders_created_at", "ix_orders_status", "ix_orders_user_id",
    ]:
        op.execute(f"DROP INDEX IF EXISTS {idx}")
