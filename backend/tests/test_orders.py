import pytest
from app.models.category import Category
from app.models.product import Product, Inventory
from app.models.user import Address


@pytest.fixture
def setup_product(db):
    cat = Category(name="Dairy", slug="dairy")
    db.add(cat)
    db.flush()
    p = Product(name="Milk", slug="milk", category_id=cat.id, price=2.49)
    db.add(p)
    db.flush()
    db.add(Inventory(product_id=p.id, quantity=100))
    db.commit()
    db.refresh(p)
    return p


@pytest.fixture
def address(db, regular_user):
    addr = Address(
        user_id=regular_user.id,
        line1="123 Main St",
        city="Springfield",
        postal_code="12345",
        country="US",
        is_default=True,
    )
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


def test_checkout_creates_order(client, user_token, setup_product, address):
    headers = {"Authorization": f"Bearer {user_token}"}
    # Add item to cart
    client.post("/api/v1/cart/items", json={"product_id": setup_product.id, "quantity": 2}, headers=headers)
    # Checkout
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "cod"},  # no Stripe in test
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["order"]["status"] == "pending"
    assert float(data["order"]["subtotal"]) == pytest.approx(4.98, rel=1e-2)
    assert data["order"]["order_number"].startswith("ORD-")


def test_checkout_clears_cart(client, user_token, setup_product, address):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items", json={"product_id": setup_product.id, "quantity": 1}, headers=headers)
    client.post("/api/v1/orders/checkout", json={"payment_method": "cod"}, headers=headers)
    cart = client.get("/api/v1/cart", headers=headers).json()
    assert cart["items"] == []


def test_checkout_empty_cart_fails(client, user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    resp = client.post("/api/v1/orders/checkout", json={"payment_method": "cod"}, headers=headers)
    assert resp.status_code == 400


def test_list_orders(client, user_token, setup_product, address):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items", json={"product_id": setup_product.id, "quantity": 1}, headers=headers)
    client.post("/api/v1/orders/checkout", json={"payment_method": "cod"}, headers=headers)
    resp = client.get("/api/v1/orders", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


def test_admin_update_order_status(client, admin_token, user_token, setup_product, address):
    u_headers = {"Authorization": f"Bearer {user_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}
    client.post("/api/v1/cart/items", json={"product_id": setup_product.id, "quantity": 1}, headers=u_headers)
    order = client.post("/api/v1/orders/checkout", json={"payment_method": "cod"}, headers=u_headers).json()["order"]
    resp = client.patch(
        f"/api/v1/admin/orders/{order['id']}/status",
        json={"status": "confirmed"},
        headers=a_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "confirmed"
