"""Tests for DB-backed account features, sitemap, global search, and CSV export."""
import pytest
from decimal import Decimal
from app.models.category import Category
from app.models.product import Product, Inventory
from app.models.user_settings import UserSettings, RecentlyViewed


@pytest.fixture
def product(db):
    cat = Category(name="Sprint6", slug="sprint6-cat")
    db.add(cat); db.flush()
    p = Product(name="S6 Item", slug="s6-item", category_id=cat.id, price=Decimal("9.99"))
    db.add(p); db.flush()
    db.add(Inventory(product_id=p.id, quantity=20))
    db.commit(); db.refresh(p)
    return p


# ── DB-backed notification prefs ─────────────────────────────────────────────

def test_default_prefs_db(client, user_token):
    resp = client.get("/api/v1/account/notifications",
                      headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["order_updates"] is True


def test_update_prefs_persists(client, user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.put("/api/v1/account/notifications",
               json={"order_updates": True, "promotional": False,
                     "low_stock_alerts": False, "weekly_digest": True},
               headers=headers)
    resp = client.get("/api/v1/account/notifications", headers=headers)
    assert resp.json()["promotional"] is False
    assert resp.json()["weekly_digest"] is True


# ── DB-backed recently viewed ─────────────────────────────────────────────────

def test_recently_viewed_db(client, user_token, product):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post(f"/api/v1/account/viewed/{product.id}", headers=headers)
    resp = client.get("/api/v1/account/viewed", headers=headers)
    assert resp.status_code == 200
    assert any(p["id"] == product.id for p in resp.json())


def test_recently_viewed_dedup_db(client, user_token, product):
    headers = {"Authorization": f"Bearer {user_token}"}
    client.post(f"/api/v1/account/viewed/{product.id}", headers=headers)
    client.post(f"/api/v1/account/viewed/{product.id}", headers=headers)
    resp = client.get("/api/v1/account/viewed", headers=headers)
    assert [p["id"] for p in resp.json()].count(product.id) == 1


# ── Sitemap ───────────────────────────────────────────────────────────────────

def test_sitemap_returns_xml(client, product):
    resp = client.get("/sitemap.xml")
    assert resp.status_code == 200
    assert "xml" in resp.headers["content-type"]
    assert "urlset" in resp.text
    assert "s6-item" in resp.text


def test_robots_txt(client):
    resp = client.get("/robots.txt")
    assert resp.status_code == 200
    assert "Disallow: /admin" in resp.text
    assert "sitemap.xml" in resp.text


# ── Global admin search ───────────────────────────────────────────────────────

def test_global_search_products(client, admin_token, product):
    resp = client.get("/api/v1/admin/search?q=S6",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    results = resp.json()
    assert isinstance(results, list)
    product_results = [r for r in results if r["type"] == "product"]
    assert any(r["id"] == product.id for r in product_results)


def test_global_search_users(client, admin_token, regular_user):
    resp = client.get("/api/v1/admin/search?q=user@example",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    user_results = [r for r in resp.json() if r["type"] == "user"]
    assert len(user_results) >= 1


def test_global_search_requires_admin(client, user_token):
    resp = client.get("/api/v1/admin/search?q=test",
                      headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 403


# ── CSV Export ────────────────────────────────────────────────────────────────

def test_export_orders_csv(client, admin_token):
    resp = client.get("/api/v1/admin/export/orders",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "order_number" in resp.text


def test_export_customers_csv(client, admin_token):
    resp = client.get("/api/v1/admin/export/customers",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "email" in resp.text
