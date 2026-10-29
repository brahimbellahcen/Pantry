import pytest
from datetime import date, timedelta
from app.models.delivery_slot import DeliverySlot
from app.models.category import Category
from app.models.product import Product, Inventory
from app.models.user import Address


@pytest.fixture
def slot(db):
    s = DeliverySlot(date=date.today() + timedelta(days=1), time_window="09:00-12:00", capacity=5)
    db.add(s); db.commit(); db.refresh(s)
    return s


@pytest.fixture
def setup(db, regular_user):
    cat = Category(name="Meat", slug="meat-slot")
    db.add(cat); db.flush()
    p = Product(name="Chicken", slug="chicken-slot", category_id=cat.id, price=8.99)
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=50))
    addr = Address(user_id=regular_user.id, line1="1 Slot St", city="Slotville",
                   postal_code="99999", country="US", is_default=True)
    db.add(addr); db.commit(); db.refresh(p)
    return p


def test_list_slots(client, slot):
    resp = client.get("/api/v1/delivery-slots")
    assert resp.status_code == 200
    assert any(s["id"] == slot.id for s in resp.json())


def test_checkout_with_slot(client, user_token, slot, setup):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items", json={"product_id": setup.id, "quantity": 1}, headers=headers)
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "cod", "delivery_slot_id": slot.id},
        headers=headers,
    )
    assert resp.status_code == 201


def test_fully_booked_slot_rejected(client, user_token, db, setup):
    s = DeliverySlot(date=date.today() + timedelta(days=2),
                     time_window="14:00-17:00", capacity=1, booked_count=1)
    db.add(s); db.commit(); db.refresh(s)
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items", json={"product_id": setup.id, "quantity": 1}, headers=headers)
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "cod", "delivery_slot_id": s.id},
        headers=headers,
    )
    assert resp.status_code == 400
    assert "fully booked" in resp.json()["detail"].lower()


def test_admin_create_slot(client, admin_token):
    resp = client.post(
        "/api/v1/admin/delivery-slots",
        json={"date": str(date.today() + timedelta(days=3)), "time_window": "16:00-19:00", "capacity": 10},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["capacity"] == 10


def test_wishlist_add_remove(client, user_token, setup):
    headers = {"Authorization": f"Bearer {user_token}"}
    # add
    resp = client.post(f"/api/v1/wishlist/{setup.id}", headers=headers)
    assert resp.status_code == 201
    # list
    resp = client.get("/api/v1/wishlist", headers=headers)
    assert resp.status_code == 200
    assert any(p["id"] == setup.id for p in resp.json())
    # remove
    resp = client.delete(f"/api/v1/wishlist/{setup.id}", headers=headers)
    assert resp.status_code == 204
    # confirm removed
    resp = client.get("/api/v1/wishlist", headers=headers)
    assert not any(p["id"] == setup.id for p in resp.json())
