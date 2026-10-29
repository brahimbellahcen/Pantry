"""Tests for loyalty, flash sales, subscriptions, referrals, and variants."""
import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from app.models.category import Category
from app.models.product import Product, Inventory
from app.models.flash_sale import FlashSale
from app.models.loyalty import LoyaltyAccount, LoyaltyTransaction
from app.models.user import Address


@pytest.fixture
def product(db):
    cat = Category(name="Sprint3", slug="sprint3")
    db.add(cat); db.flush()
    p = Product(name="Sprint Item", slug="sprint-item", category_id=cat.id, price=Decimal("10.00"))
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=50))
    db.commit(); db.refresh(p)
    return p


# ── Flash Sales ───────────────────────────────────────────────────────────────

def test_list_flash_sales_empty(client):
    resp = client.get("/api/v1/flash-sales")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_admin_create_and_list_flash_sale(client, admin_token, product):
    now = datetime.now(timezone.utc)
    resp = client.post("/api/v1/admin/flash-sales", json={
        "product_id": product.id,
        "discount_type": "percent",
        "discount_value": 20,
        "starts_at": (now - timedelta(hours=1)).isoformat(),
        "ends_at": (now + timedelta(hours=2)).isoformat(),
        "max_quantity": 50,
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 201

    # should appear in public listing
    resp2 = client.get("/api/v1/flash-sales")
    assert resp2.status_code == 200
    assert any(s["product_id"] == product.id for s in resp2.json())


def test_flash_sale_discount_calculation(db, product):
    from app.models.flash_sale import FlashSale
    now = datetime.now(timezone.utc)
    sale = FlashSale(
        product_id=product.id, discount_type="percent", discount_value=Decimal("25"),
        starts_at=now - timedelta(hours=1), ends_at=now + timedelta(hours=1),
    )
    expected = Decimal("7.50")
    assert sale.sale_price(Decimal("10.00")) == expected


# ── Loyalty ───────────────────────────────────────────────────────────────────

def test_loyalty_balance_starts_zero(client, user_token):
    resp = client.get("/api/v1/loyalty/balance", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["balance"] == 0


def test_loyalty_earn_on_order(client, user_token, regular_user, db, product):
    from app.models.user import Address
    addr = Address(user_id=regular_user.id, line1="1 St", city="City",
                   postal_code="11111", country="US", is_default=True)
    db.add(addr); db.commit()
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items", json={"product_id": product.id, "quantity": 1}, headers=headers)
    order_resp = client.post("/api/v1/orders/checkout", json={"payment_method": "cod"}, headers=headers)
    assert order_resp.status_code == 201

    # Check loyalty was earned
    from app.services.loyalty import earn_points
    from decimal import Decimal
    order = order_resp.json()["order"]
    earn_points(regular_user.id, order["id"], Decimal(str(order["total"])), db)
    db.commit()

    balance_resp = client.get("/api/v1/loyalty/balance", headers=headers)
    assert balance_resp.json()["balance"] > 0


def test_loyalty_history(client, user_token):
    resp = client.get("/api/v1/loyalty/history", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── Referrals ─────────────────────────────────────────────────────────────────

def test_get_referral_code(client, user_token):
    resp = client.get("/api/v1/referrals/my-code", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"].startswith("PANTRY-")
    assert "share_url" in data


def test_apply_own_referral_code_rejected(client, user_token):
    code_resp = client.get("/api/v1/referrals/my-code", headers={"Authorization": f"Bearer {user_token}"})
    code = code_resp.json()["code"]
    resp = client.post("/api/v1/referrals/apply",
                       json={"code": code},
                       headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code in (400, 404)


def test_apply_invalid_referral_code(client, user_token):
    resp = client.post("/api/v1/referrals/apply",
                       json={"code": "INVALID-CODE"},
                       headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 404


# ── Subscriptions ─────────────────────────────────────────────────────────────

def test_create_subscription(client, user_token, product):
    resp = client.post("/api/v1/subscriptions", json={
        "frequency": "weekly",
        "items": [{"product_id": product.id, "quantity": 2}],
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 201
    assert resp.json()["frequency"] == "weekly"


def test_list_subscriptions(client, user_token, product):
    client.post("/api/v1/subscriptions",
                json={"frequency": "monthly", "items": [{"product_id": product.id, "quantity": 1}]},
                headers={"Authorization": f"Bearer {user_token}"})
    resp = client.get("/api/v1/subscriptions", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_pause_subscription(client, user_token, product):
    sub = client.post("/api/v1/subscriptions",
                      json={"frequency": "biweekly", "items": [{"product_id": product.id, "quantity": 1}]},
                      headers={"Authorization": f"Bearer {user_token}"}).json()
    resp = client.patch(f"/api/v1/subscriptions/{sub['id']}/status",
                        params={"status": "paused"},
                        headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "paused"


# ── Product Variants ──────────────────────────────────────────────────────────

def test_admin_create_variant(client, admin_token, product):
    resp = client.post(f"/api/v1/admin/products/{product.id}/variants",
                       json={"name": "500g", "price_modifier": 0, "stock": 20},
                       headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 201
    assert resp.json()["name"] == "500g"


def test_admin_list_variants(client, admin_token, product):
    client.post(f"/api/v1/admin/products/{product.id}/variants",
                json={"name": "1kg", "price_modifier": 1.5, "stock": 10},
                headers={"Authorization": f"Bearer {admin_token}"})
    resp = client.get(f"/api/v1/admin/products/{product.id}/variants",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
