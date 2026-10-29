import pytest
from app.models.category import Category
from app.models.product import Product, Inventory


@pytest.fixture
def category(db):
    cat = Category(name="Veggies", slug="veggies")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@pytest.fixture
def product(db, category):
    p = Product(name="Carrot", slug="carrot", category_id=category.id, price=0.79)
    db.add(p)
    db.flush()
    db.add(Inventory(product_id=p.id, quantity=20))
    db.commit()
    db.refresh(p)
    return p


def test_get_empty_cart(client, user_token):
    resp = client.get("/api/v1/cart", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["items"] == []
    assert resp.json()["item_count"] == 0


def test_add_item_to_cart(client, user_token, product):
    resp = client.post(
        "/api/v1/cart/items",
        json={"product_id": product.id, "quantity": 3},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["item_count"] == 3
    assert data["items"][0]["product_id"] == product.id


def test_add_same_item_accumulates(client, user_token, product):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post("/api/v1/cart/items", json={"product_id": product.id, "quantity": 2}, headers=headers)
    client.post("/api/v1/cart/items", json={"product_id": product.id, "quantity": 3}, headers=headers)
    cart = client.get("/api/v1/cart", headers=headers).json()
    assert cart["item_count"] == 5


def test_update_cart_item(client, user_token, product):
    headers = {"Authorization": f"Bearer {user_token}"}
    cart = client.post("/api/v1/cart/items", json={"product_id": product.id, "quantity": 2}, headers=headers).json()
    item_id = cart["items"][0]["id"]
    resp = client.patch(f"/api/v1/cart/items/{item_id}", json={"quantity": 5}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["item_count"] == 5


def test_remove_cart_item(client, user_token, product):
    headers = {"Authorization": f"Bearer {user_token}"}
    cart = client.post("/api/v1/cart/items", json={"product_id": product.id, "quantity": 1}, headers=headers).json()
    item_id = cart["items"][0]["id"]
    resp = client.delete(f"/api/v1/cart/items/{item_id}", headers=headers)
    assert resp.status_code == 204
    cart2 = client.get("/api/v1/cart", headers=headers).json()
    assert cart2["items"] == []


def test_add_out_of_stock_item(client, user_token, product, db):
    product.inventory.quantity = 0
    db.commit()
    resp = client.post(
        "/api/v1/cart/items",
        json={"product_id": product.id, "quantity": 1},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 400
