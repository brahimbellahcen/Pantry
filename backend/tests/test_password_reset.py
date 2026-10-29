"""Tests for password reset flow and admin coupon/review/slot endpoints."""
import pytest
from app.models.password_reset import PasswordResetToken
from app.models.category import Category
from app.models.product import Product, Inventory
from app.models.coupon import Coupon
from app.models.review import Review


# ── Password Reset ────────────────────────────────────────────────────────────

def test_forgot_password_returns_200_always(client, regular_user):
    """Should not leak whether the email exists."""
    resp = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.com"})
    assert resp.status_code == 200

    resp2 = client.post("/api/v1/auth/forgot-password", json={"email": "user@example.com"})
    assert resp2.status_code == 200
    assert resp2.json()["detail"] == resp.json()["detail"]


def test_reset_password_with_valid_token(client, db, regular_user):
    reset = PasswordResetToken.generate(regular_user.id)
    db.add(reset); db.commit()

    resp = client.post("/api/v1/auth/reset-password", json={
        "token": reset.token, "new_password": "newpassword99"
    })
    assert resp.status_code == 200

    # Can login with new password
    login = client.post("/api/v1/auth/login", data={
        "username": "user@example.com", "password": "newpassword99"
    })
    assert login.status_code == 200


def test_reset_password_invalid_token(client):
    resp = client.post("/api/v1/auth/reset-password", json={
        "token": "made-up-token", "new_password": "newpass99"
    })
    assert resp.status_code == 400


def test_reset_password_token_single_use(client, db, regular_user):
    reset = PasswordResetToken.generate(regular_user.id)
    db.add(reset); db.commit()

    client.post("/api/v1/auth/reset-password", json={
        "token": reset.token, "new_password": "newpassword99"
    })
    # second use should fail
    resp = client.post("/api/v1/auth/reset-password", json={
        "token": reset.token, "new_password": "anotherpass99"
    })
    assert resp.status_code == 400


# ── Admin coupon tests ────────────────────────────────────────────────────────

def test_admin_list_coupons(client, admin_token, db):
    db.add(Coupon(code="TEST1", discount_type="fixed", discount_value=5, is_active=True))
    db.commit()
    resp = client.get("/api/v1/admin/coupons", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert any(c["code"] == "TEST1" for c in resp.json())


def test_admin_deactivate_coupon(client, admin_token, db):
    c = Coupon(code="DEACT", discount_type="fixed", discount_value=3, is_active=True)
    db.add(c); db.commit(); db.refresh(c)

    resp = client.patch(
        f"/api/v1/admin/coupons/{c.id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


# ── Admin review moderation ───────────────────────────────────────────────────

@pytest.fixture
def product_for_review(db):
    cat = Category(name="Test", slug="test-cat-review")
    db.add(cat); db.flush()
    p = Product(name="TestProd", slug="test-prod-review", category_id=cat.id, price=1.99)
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=10))
    db.commit(); db.refresh(p)
    return p


def test_admin_moderate_approve(client, admin_token, db, regular_user, product_for_review):
    r = Review(product_id=product_for_review.id, user_id=regular_user.id,
               rating=4, status="pending")
    db.add(r); db.commit(); db.refresh(r)

    resp = client.patch(
        f"/api/v1/admin/reviews/{r.id}/moderate?action=approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


def test_admin_moderate_reject(client, admin_token, db, regular_user, product_for_review):
    r = Review(product_id=product_for_review.id, user_id=regular_user.id,
               rating=1, status="pending")
    db.add(r); db.commit(); db.refresh(r)

    resp = client.patch(
        f"/api/v1/admin/reviews/{r.id}/moderate?action=reject",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"
