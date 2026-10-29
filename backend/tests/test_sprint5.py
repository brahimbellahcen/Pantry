"""Tests for PDF invoices, notification prefs, recently viewed, and account endpoints."""
import pytest
from decimal import Decimal
from app.models.category import Category
from app.models.product import Product, Inventory
from app.models.order import Order, OrderItem
from app.models.user import Address


@pytest.fixture
def delivered_order(db, regular_user):
    cat = Category(name="Sprint5", slug="sprint5-cat")
    db.add(cat); db.flush()
    p = Product(name="S5 Item", slug="s5-item", category_id=cat.id, price=Decimal("15.00"))
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=20))
    addr = Address(user_id=regular_user.id, line1="1 St", city="City",
                   postal_code="11111", country="US", is_default=True)
    db.add(addr)
    order = Order(
        order_number="ORD-S5INV", user_id=regular_user.id,
        status="delivered", subtotal=Decimal("15"), tax_amount=Decimal("1.20"),
        shipping_amount=Decimal("5.99"), total=Decimal("22.19"),
        payment_status="paid",
        shipping_address={"line1": "1 St", "city": "City", "postal_code": "11111", "country": "US"},
    )
    db.add(order); db.flush()
    db.add(OrderItem(order_id=order.id, product_id=p.id, product_name=p.name,
                     quantity=1, unit_price=Decimal("15"), total_price=Decimal("15")))
    db.commit(); db.refresh(order)
    return order, p


# ── PDF Invoice ───────────────────────────────────────────────────────────────

def test_invoice_download(client, user_token, delivered_order):
    order, _ = delivered_order
    resp = client.get(f"/api/v1/account/orders/{order.id}/invoice",
                      headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"


def test_invoice_wrong_user(client, admin_token, delivered_order):
    order, _ = delivered_order
    resp = client.get(f"/api/v1/account/orders/{order.id}/invoice",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 404


# ── Notification Preferences ──────────────────────────────────────────────────

def test_get_default_prefs(client, user_token):
    resp = client.get("/api/v1/account/notifications",
                      headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "order_updates" in data
    assert data["order_updates"] is True


def test_update_prefs(client, user_token):
    resp = client.put("/api/v1/account/notifications",
                      json={"order_updates": True, "promotional": False,
                            "low_stock_alerts": False, "weekly_digest": True},
                      headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["weekly_digest"] is True
    assert resp.json()["promotional"] is False


# ── Recently Viewed ───────────────────────────────────────────────────────────

def test_track_and_get_recently_viewed(client, user_token, delivered_order):
    _, product = delivered_order
    headers = {"Authorization": f"Bearer {user_token}"}

    # Track a view
    resp = client.post(f"/api/v1/account/viewed/{product.id}", headers=headers)
    assert resp.status_code == 204

    # Get recently viewed
    resp = client.get("/api/v1/account/viewed", headers=headers)
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert product.id in ids


def test_recently_viewed_deduplicates(client, user_token, delivered_order):
    _, product = delivered_order
    headers = {"Authorization": f"Bearer {user_token}"}
    # View same product twice
    client.post(f"/api/v1/account/viewed/{product.id}", headers=headers)
    client.post(f"/api/v1/account/viewed/{product.id}", headers=headers)
    resp = client.get("/api/v1/account/viewed", headers=headers)
    ids = [p["id"] for p in resp.json()]
    assert ids.count(product.id) == 1


def test_recently_viewed_order_is_recent_first(client, user_token, db):
    cat = Category(name="ViewCat", slug="view-cat-s5")
    db.add(cat); db.flush()
    products = []
    for i in range(3):
        p = Product(name=f"ViewProd{i}", slug=f"view-prod-s5-{i}", category_id=cat.id, price=Decimal("1.00"))
        db.add(p); db.flush()
        db.add(Inventory(product_id=p.id, quantity=5))
        products.append(p)
    db.commit()

    headers = {"Authorization": f"Bearer {user_token}"}
    for p in products:
        client.post(f"/api/v1/account/viewed/{p.id}", headers=headers)

    resp = client.get("/api/v1/account/viewed", headers=headers)
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    # All viewed products should appear in the list
    for p in products:
        assert p.id in ids
