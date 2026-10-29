"""Tests for loyalty auto-earn, personalized recommendations, real analytics, and jobs."""
import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta, date
from app.models.category import Category
from app.models.product import Product, Inventory
from app.models.order import Order, OrderItem
from app.models.user import Address
from app.models.loyalty import LoyaltyAccount


@pytest.fixture
def setup(db, regular_user):
    cat = Category(name="Sprint4", slug="sprint4-cat")
    db.add(cat); db.flush()
    p = Product(name="S4 Item", slug="s4-item", category_id=cat.id, price=Decimal("20.00"))
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=50))
    addr = Address(user_id=regular_user.id, line1="1 St", city="City",
                   postal_code="11111", country="US", is_default=True)
    db.add(addr); db.commit(); db.refresh(p)
    return p


# ── Loyalty auto-earn ─────────────────────────────────────────────────────────

def test_loyalty_points_auto_earned_on_checkout(client, user_token, setup):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items",
                json={"product_id": setup.id, "quantity": 1}, headers=headers)
    resp = client.post("/api/v1/orders/checkout",
                       json={"payment_method": "cod"}, headers=headers)
    assert resp.status_code == 201
    order = resp.json()["order"]
    assert order["loyalty_points_earned"] > 0

    balance = client.get("/api/v1/loyalty/balance", headers=headers).json()
    assert balance["balance"] > 0


def test_loyalty_redeem_at_checkout(client, user_token, regular_user, db, setup):
    # Give user some points first
    acc = LoyaltyAccount(user_id=regular_user.id, balance=500, lifetime_earned=500)
    db.add(acc); db.commit()

    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items",
                json={"product_id": setup.id, "quantity": 1}, headers=headers)
    resp = client.post("/api/v1/orders/checkout",
                       json={"payment_method": "cod", "loyalty_points_to_redeem": 200},
                       headers=headers)
    assert resp.status_code == 201
    order = resp.json()["order"]
    assert order["loyalty_points_used"] == 200
    # $2 discount applied
    assert float(order["total"]) < 20 * 1.08 + 5.99


def test_loyalty_insufficient_points_rejected(client, user_token, setup):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items",
                json={"product_id": setup.id, "quantity": 1}, headers=headers)
    resp = client.post("/api/v1/orders/checkout",
                       json={"payment_method": "cod", "loyalty_points_to_redeem": 9999},
                       headers=headers)
    assert resp.status_code == 400


# ── Personalised recommendations ─────────────────────────────────────────────

def test_for_you_returns_list(client, user_token):
    resp = client.get("/api/v1/recommendations/for-you",
                      headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_for_you_excludes_bought_products(client, user_token, regular_user, db, setup):
    # Place an order so the user has history
    order = Order(
        order_number="ORD-HISTORY", user_id=regular_user.id,
        status="delivered", subtotal=Decimal("20"), tax_amount=Decimal("0"),
        shipping_amount=Decimal("0"), total=Decimal("20"), payment_status="paid",
    )
    db.add(order); db.flush()
    db.add(OrderItem(order_id=order.id, product_id=setup.id,
                     product_name=setup.name, quantity=1,
                     unit_price=Decimal("20"), total_price=Decimal("20")))
    db.commit()

    resp = client.get("/api/v1/recommendations/for-you",
                      headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    # Bought product should not be recommended
    ids = [p["id"] for p in resp.json()]
    assert setup.id not in ids


# ── Analytics endpoints ───────────────────────────────────────────────────────

def test_revenue_series(client, admin_token):
    resp = client.get("/api/v1/admin/stats/revenue-series",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_top_products(client, admin_token):
    resp = client.get("/api/v1/admin/stats/top-products",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_customer_growth(client, admin_token):
    resp = client.get("/api/v1/admin/stats/customer-growth",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── Jobs ──────────────────────────────────────────────────────────────────────

def test_low_stock_alert_endpoint(client, admin_token):
    resp = client.post("/api/v1/jobs/low-stock-alert",
                       headers={"Authorization": f"Bearer {admin_token}"})
    # No X-Cron-Secret required when CRON_SECRET is empty
    assert resp.status_code == 200
    assert "alerted" in resp.json()


def test_process_subscriptions_no_due(client, admin_token):
    resp = client.post("/api/v1/jobs/process-subscriptions")
    assert resp.status_code == 200
    assert resp.json()["subscriptions_processed"] == 0


def test_flash_sale_price_in_listing(client, db):
    cat = Category(name="Flash Test", slug="flash-test-s4")
    db.add(cat); db.flush()
    p = Product(name="Flash Prod", slug="flash-prod-s4", category_id=cat.id, price=Decimal("10.00"))
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=20))
    db.commit()
    from app.models.flash_sale import FlashSale
    now = datetime.now(timezone.utc)
    sale = FlashSale(
        product_id=p.id, discount_type="percent", discount_value=Decimal("20"),
        starts_at=now - timedelta(hours=1), ends_at=now + timedelta(hours=2),
    )
    db.add(sale); db.commit()

    resp = client.get("/api/v1/products?q=Flash+Prod")
    assert resp.status_code == 200
    items = resp.json()["items"]
    matching = [i for i in items if i["id"] == p.id]
    assert matching, "Product not found in listing"
    assert matching[0]["flash_sale"] is not None
    assert float(matching[0]["flash_sale"]["sale_price"]) == pytest.approx(8.00, rel=1e-2)
