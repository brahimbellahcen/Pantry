import pytest
from app.models.category import Category
from app.models.product import Product, Inventory


@pytest.fixture
def category(db):
    cat = Category(name="Produce", slug="produce2")
    db.add(cat); db.commit(); db.refresh(cat)
    return cat


@pytest.fixture
def product(db, category):
    p = Product(name="Tomato", slug="tomato", category_id=category.id, price=1.49)
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=30))
    db.commit(); db.refresh(p)
    return p


def test_submit_review(client, user_token, product):
    headers = {"Authorization": f"Bearer {user_token}"}
    resp = client.post(
        f"/api/v1/reviews/products/{product.id}",
        json={"rating": 5, "title": "Fresh!", "body": "Loved it."},
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["rating"] == 5


def test_duplicate_review_rejected(client, user_token, product):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post(f"/api/v1/reviews/products/{product.id}", json={"rating": 4}, headers=headers)
    resp = client.post(f"/api/v1/reviews/products/{product.id}", json={"rating": 3}, headers=headers)
    assert resp.status_code == 400


def test_invalid_rating_rejected(client, user_token, product):
    resp = client.post(
        f"/api/v1/reviews/products/{product.id}",
        json={"rating": 6},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 422


def test_review_stats(client, user_token, product):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post(f"/api/v1/reviews/products/{product.id}", json={"rating": 4}, headers=headers)
    resp = client.get(f"/api/v1/reviews/products/{product.id}/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_reviews"] == 1
    assert data["average_rating"] == 4.0


def test_list_approved_reviews(client, user_token, product):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post(f"/api/v1/reviews/products/{product.id}", json={"rating": 5, "body": "Great"}, headers=headers)
    resp = client.get(f"/api/v1/reviews/products/{product.id}")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_admin_moderate_review(client, user_token, admin_token, product):
    u_headers = {"Authorization": f"Bearer {user_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}
    review = client.post(f"/api/v1/reviews/products/{product.id}", json={"rating": 2, "body": "Meh"}, headers=u_headers).json()
    resp = client.patch(
        f"/api/v1/admin/reviews/{review['id']}/moderate?action=reject",
        headers=a_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"
