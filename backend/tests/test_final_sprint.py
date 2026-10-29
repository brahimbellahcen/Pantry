"""Tests for returns, autocomplete, recommendations, and CSV export."""
import pytest
from app.models.category import Category
from app.models.product import Product, Inventory
from app.models.user import Address
from app.models.order import Order, OrderItem
from app.models.return_request import ReturnRequest
from decimal import Decimal


@pytest.fixture
def delivered_order(db, regular_user):
    cat = Category(name="Returns Test", slug="returns-test")
    db.add(cat); db.flush()
    p = Product(name="Return Item", slug="return-item", category_id=cat.id, price=Decimal("9.99"))
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=10))
    addr = Address(user_id=regular_user.id, line1="1 St", city="City",
                   postal_code="00001", country="US", is_default=True)
    db.add(addr)
    order = Order(
        order_number="ORD-TEST01", user_id=regular_user.id,
        status="delivered", subtotal=Decimal("9.99"), tax_amount=Decimal("0"),
        shipping_amount=Decimal("0"), total=Decimal("9.99"), payment_status="paid",
    )
    db.add(order); db.flush()
    db.add(OrderItem(
        order_id=order.id, product_id=p.id, product_name=p.name,
        quantity=1, unit_price=Decimal("9.99"), total_price=Decimal("9.99"),
    ))
    db.commit(); db.refresh(order)
    return order, p


def test_submit_return_request(client, user_token, delivered_order):
    order, _ = delivered_order
    resp = client.post(
        f"/api/v1/returns/orders/{order.id}",
        json={"reason": "damaged", "details": "Arrived broken"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["status"] == "pending"


def test_duplicate_return_rejected(client, user_token, delivered_order, db):
    order, _ = delivered_order
    db.add(ReturnRequest(order_id=order.id, user_id=order.user_id, reason="damaged"))
    db.commit()
    resp = client.post(
        f"/api/v1/returns/orders/{order.id}",
        json={"reason": "other"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 400


def test_return_non_delivered_order_rejected(client, user_token, db, regular_user):
    cat = Category(name="Pending Test", slug="pending-test-ret")
    db.add(cat); db.flush()
    p = Product(name="PendItem", slug="pend-item-ret", category_id=cat.id, price=Decimal("1.00"))
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=5))
    order = Order(order_number="ORD-PEND01", user_id=regular_user.id,
                  status="pending", subtotal=Decimal("1.00"), tax_amount=Decimal("0"),
                  shipping_amount=Decimal("0"), total=Decimal("1.00"), payment_status="unpaid")
    db.add(order); db.commit()
    resp = client.post(
        f"/api/v1/returns/orders/{order.id}",
        json={"reason": "other"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 400


def test_admin_resolve_return(client, admin_token, db, regular_user, delivered_order):
    order, _ = delivered_order
    req = ReturnRequest(order_id=order.id, user_id=regular_user.id, reason="damaged")
    db.add(req); db.commit(); db.refresh(req)
    resp = client.patch(
        f"/api/v1/admin/returns/{req.id}/resolve",
        json={"status": "approved", "resolution_note": "Refund issued"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"
    # Order should be refunded
    db.refresh(order)
    assert order.status == "refunded"


def test_autocomplete_returns_results(client, db):
    cat = Category(name="Autocomplete Cat", slug="autocomplete-cat")
    db.add(cat); db.flush()
    p = Product(name="Autocomplete Apple", slug="autocomplete-apple",
                category_id=cat.id, price=Decimal("1.00"))
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=10))
    db.commit()

    resp = client.get("/api/v1/autocomplete?q=auto")
    assert resp.status_code == 200
    data = resp.json()
    assert any("autocomplete" in p["name"].lower() for p in data["products"])


def test_recommendations_returns_related(client, db):
    cat = Category(name="Reco Cat", slug="reco-cat")
    db.add(cat); db.flush()
    p1 = Product(name="Reco A", slug="reco-a", category_id=cat.id, price=Decimal("1.00"))
    p2 = Product(name="Reco B", slug="reco-b", category_id=cat.id, price=Decimal("2.00"))
    db.add_all([p1, p2]); db.flush()
    db.add(Inventory(product_id=p1.id, quantity=5))
    db.add(Inventory(product_id=p2.id, quantity=5))
    db.commit(); db.refresh(p1)

    resp = client.get(f"/api/v1/recommendations/products/{p1.id}")
    assert resp.status_code == 200
    assert any(p["id"] == p2.id for p in resp.json())


def test_csv_export_requires_admin(client, user_token):
    resp = client.get("/api/v1/csv/products/export",
                      headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 403


def test_csv_export_as_admin(client, admin_token):
    resp = client.get("/api/v1/csv/products/export",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
