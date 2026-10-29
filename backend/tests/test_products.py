import pytest
from app.models.category import Category
from app.models.product import Product, Inventory


@pytest.fixture
def sample_category(db):
    cat = Category(name="Fruits", slug="fruits")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@pytest.fixture
def sample_product(db, sample_category):
    p = Product(name="Apple", slug="apple", category_id=sample_category.id, price=1.99)
    db.add(p)
    db.flush()
    db.add(Inventory(product_id=p.id, quantity=50))
    db.commit()
    db.refresh(p)
    return p


def test_list_products(client, sample_product):
    resp = client.get("/api/v1/products")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert any(p["slug"] == "apple" for p in data["items"])


def test_get_product(client, sample_product):
    resp = client.get("/api/v1/products/apple")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Apple"


def test_get_product_not_found(client):
    resp = client.get("/api/v1/products/nonexistent-slug")
    assert resp.status_code == 404


def test_search_products(client, sample_product):
    resp = client.get("/api/v1/products?q=apple")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


def test_filter_by_category(client, sample_product):
    resp = client.get("/api/v1/products?category=fruits")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


def test_list_categories(client, sample_category):
    resp = client.get("/api/v1/categories")
    assert resp.status_code == 200
    assert any(c["slug"] == "fruits" for c in resp.json())


def test_admin_create_product(client, admin_token, sample_category):
    resp = client.post(
        "/api/v1/admin/products",
        json={
            "name": "Banana",
            "category_id": sample_category.id,
            "price": 0.99,
            "initial_stock": 100,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["slug"] == "banana"


def test_admin_create_product_non_admin(client, user_token, sample_category):
    resp = client.post(
        "/api/v1/admin/products",
        json={"name": "Grape", "category_id": sample_category.id, "price": 2.49, "initial_stock": 0},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403
