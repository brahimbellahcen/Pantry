import pytest
from datetime import datetime, timedelta, timezone
from app.models.coupon import Coupon
from app.models.category import Category
from app.models.product import Product, Inventory
from app.models.user import Address


@pytest.fixture
def category(db):
    cat = Category(name="Bakery", slug="bakery")
    db.add(cat); db.commit(); db.refresh(cat)
    return cat


@pytest.fixture
def product(db, category):
    p = Product(name="Sourdough", slug="sourdough", category_id=category.id, price=5.99)
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=50))
    db.commit(); db.refresh(p)
    return p


@pytest.fixture
def default_address(db, regular_user):
    addr = Address(user_id=regular_user.id, line1="1 Main St", city="Testville",
                   postal_code="00001", country="US", is_default=True)
    db.add(addr); db.commit(); db.refresh(addr)
    return addr


@pytest.fixture
def active_coupon(db):
    c = Coupon(code="SAVE10", discount_type="percent", discount_value=10,
               is_active=True, min_order_amount=20)
    db.add(c); db.commit(); db.refresh(c)
    return c


@pytest.fixture
def fixed_coupon(db):
    c = Coupon(code="FLAT5", discount_type="fixed", discount_value=5, is_active=True)
    db.add(c); db.commit(); db.refresh(c)
    return c


@pytest.fixture
def expired_coupon(db):
    c = Coupon(code="OLD20", discount_type="fixed", discount_value=20, is_active=True,
               expires_at=datetime.now(timezone.utc) - timedelta(days=1))
    db.add(c); db.commit(); db.refresh(c)
    return c


@pytest.fixture
def limited_coupon(db):
    c = Coupon(code="ONCE", discount_type="fixed", discount_value=3,
               is_active=True, usage_limit=1, used_count=1)
    db.add(c); db.commit(); db.refresh(c)
    return c


def test_valid_percent_coupon(client, user_token, product, active_coupon, default_address):
    """10% off an order ≥ $20."""
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items", json={"product_id": product.id, "quantity": 4}, headers=headers)
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "cod", "coupon_code": "SAVE10"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()["order"]
    assert float(data["discount_amount"]) > 0


def test_fixed_coupon(client, user_token, product, fixed_coupon, default_address):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items", json={"product_id": product.id, "quantity": 1}, headers=headers)
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "cod", "coupon_code": "FLAT5"},
        headers=headers,
    )
    assert resp.status_code == 201
    assert float(resp.json()["order"]["discount_amount"]) == pytest.approx(5.0, abs=0.01)


def test_expired_coupon_rejected(client, user_token, product, expired_coupon, default_address):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items", json={"product_id": product.id, "quantity": 1}, headers=headers)
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "cod", "coupon_code": "OLD20"},
        headers=headers,
    )
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


def test_over_limit_coupon_rejected(client, user_token, product, limited_coupon, default_address):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items", json={"product_id": product.id, "quantity": 1}, headers=headers)
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "cod", "coupon_code": "ONCE"},
        headers=headers,
    )
    assert resp.status_code == 400
    assert "limit" in resp.json()["detail"].lower()


def test_wrong_code_rejected(client, user_token, product, default_address):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items", json={"product_id": product.id, "quantity": 1}, headers=headers)
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "cod", "coupon_code": "DOESNOTEXIST"},
        headers=headers,
    )
    assert resp.status_code == 404


def test_admin_create_coupon(client, admin_token):
    resp = client.post(
        "/api/v1/admin/coupons",
        json={"code": "NEWDEAL", "discount_type": "percent", "discount_value": 15},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["code"] == "NEWDEAL"
