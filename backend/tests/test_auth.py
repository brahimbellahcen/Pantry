def test_register(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "new@example.com",
        "password": "secret123",
        "full_name": "New User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@example.com"
    assert "hashed_password" not in data


def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "secret123", "full_name": "Dup"}
    client.post("/api/v1/auth/register", json=payload)
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 400


def test_login_success(client, regular_user):
    resp = client.post("/api/v1/auth/login", data={
        "username": "user@example.com",
        "password": "password123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login_wrong_password(client, regular_user):
    resp = client.post("/api/v1/auth/login", data={
        "username": "user@example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


def test_get_me(client, user_token):
    resp = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "user@example.com"


def test_get_me_unauthenticated(client):
    resp = client.get("/api/v1/users/me")
    assert resp.status_code == 401


def test_refresh_token(client, regular_user):
    login = client.post("/api/v1/auth/login", data={"username": "user@example.com", "password": "password123"})
    refresh = login.json()["refresh_token"]
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_logout(client, regular_user):
    login = client.post("/api/v1/auth/login", data={"username": "user@example.com", "password": "password123"})
    refresh = login.json()["refresh_token"]
    resp = client.post("/api/v1/auth/logout", json={"refresh_token": refresh})
    assert resp.status_code == 200
    # Reusing the refresh token should fail
    resp2 = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert resp2.status_code == 401
