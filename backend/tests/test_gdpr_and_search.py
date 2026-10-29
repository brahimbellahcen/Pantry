"""GDPR account deletion, full-text search fallback, and background task smoke tests."""
import pytest
from app.models.category import Category
from app.models.product import Product, Inventory
from app.models.user import Address


@pytest.fixture
def product(db):
    cat = Category(name="GDPR Test", slug="gdpr-test")
    db.add(cat); db.flush()
    p = Product(name="Deletion Test Item", slug="deletion-test", category_id=cat.id, price=1.00)
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=10))
    db.commit(); db.refresh(p)
    return p


def test_delete_account(client, user_token, regular_user):
    """Authenticated user can delete their own account."""
    headers = {"Authorization": f"Bearer {user_token}"}
    resp = client.delete("/api/v1/users/me", headers=headers)
    assert resp.status_code == 204

    # Can no longer authenticate
    login = client.post("/api/v1/auth/login", data={"username": "user@example.com", "password": "password123"})
    assert login.status_code == 401


def test_delete_account_unauthenticated(client):
    resp = client.delete("/api/v1/users/me")
    assert resp.status_code == 401


def test_delete_account_preserves_orders(client, user_token, regular_user, db, product):
    """Orders remain (anonymised) after account deletion."""
    from app.models.user import Address
    headers = {"Authorization": f"Bearer {user_token}"}
    addr = Address(user_id=regular_user.id, line1="1 St", city="City",
                   postal_code="00001", country="US", is_default=True)
    db.add(addr); db.commit()
    client.post("/api/v1/cart/items", json={"product_id": product.id, "quantity": 1}, headers=headers)
    order_resp = client.post("/api/v1/orders/checkout", json={"payment_method": "cod"}, headers=headers)
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order"]["id"]

    resp = client.delete("/api/v1/users/me", headers=headers)
    assert resp.status_code == 204

    from app.models.order import Order
    order = db.get(Order, order_id)
    assert order is not None
    assert order.user_id is None  # anonymised, not deleted


def test_product_search_returns_results(client, product):
    """Search by product name should return results."""
    resp = client.get("/api/v1/products?q=Deletion")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


def test_product_sort_by_price(client, db):
    """Sort by price_asc returns items in ascending price order."""
    cat = Category(name="Sort Test", slug="sort-test")
    db.add(cat); db.flush()
    for price, slug in [("5.00", "sort-a"), ("1.00", "sort-b"), ("3.00", "sort-c")]:
        p = Product(name=f"Item {slug}", slug=slug, category_id=cat.id, price=price)
        db.add(p); db.flush()
        db.add(Inventory(product_id=p.id, quantity=10))
    db.commit()

    resp = client.get("/api/v1/products?sort=price_asc&category=sort-test")
    assert resp.status_code == 200
    prices = [float(item["price"]) for item in resp.json()["items"]]
    assert prices == sorted(prices)
