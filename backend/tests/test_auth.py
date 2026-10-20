from fastapi.testclient import TestClient

from app.services import auth_service, email
from tests.conftest import CSRF, make_client, register, upload


def test_register_sets_session_cookie_and_returns_user(anon_client: TestClient) -> None:
    user = register(anon_client, "New@Example.com")
    assert user["email"] == "new@example.com"
    assert "password_hash" not in user
    assert anon_client.get("/api/v1/auth/me").json()["email"] == "new@example.com"


def test_session_cookie_is_httponly(anon_client: TestClient) -> None:
    response = anon_client.post(
        "/api/v1/auth/register", json={"email": "a@example.com", "password": "Password123", "full_name": "A"}
    )
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie


def test_duplicate_email_is_rejected(anon_client: TestClient) -> None:
    register(anon_client, "dup@example.com")
    response = make_client().post(
        "/api/v1/auth/register", json={"email": "DUP@example.com", "password": "Password123", "full_name": "B"}
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_taken"


def test_weak_password_is_rejected_without_echoing_input(anon_client: TestClient) -> None:
    response = anon_client.post(
        "/api/v1/auth/register", json={"email": "w@example.com", "password": "short", "full_name": "W"}
    )
    assert response.status_code == 422
    assert "short" not in response.text
    assert (
        anon_client.post(
            "/api/v1/auth/register", json={"email": "w@example.com", "password": "lettersonly", "full_name": "W"}
        ).status_code
        == 422
    )


def test_login_logout_flow(anon_client: TestClient) -> None:
    register(anon_client, "login@example.com")
    anon_client.post("/api/v1/auth/logout")
    assert anon_client.get("/api/v1/auth/me").status_code == 401
    bad = anon_client.post("/api/v1/auth/login", json={"email": "login@example.com", "password": "Wrong1234"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "invalid_credentials"
    ok = anon_client.post("/api/v1/auth/login", json={"email": "login@example.com", "password": "Password123"})
    assert ok.status_code == 200
    assert anon_client.get("/api/v1/auth/me").status_code == 200


def test_unknown_email_gets_same_error_as_wrong_password(anon_client: TestClient) -> None:
    response = anon_client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "Password123"})
    assert response.status_code == 401 and response.json()["error"]["code"] == "invalid_credentials"


def test_protected_routes_require_authentication(anon_client: TestClient) -> None:
    for path in ("/api/v1/resumes", "/api/v1/jobs", "/api/v1/analyses", "/api/v1/dashboard"):
        assert anon_client.get(path).status_code == 401


def test_cookie_writes_require_csrf_header(client: TestClient) -> None:
    no_header = TestClient(client.app, cookies=client.cookies)
    response = no_header.post("/api/v1/jobs", json={"title": "x", "description": "y" * 100})
    assert response.status_code == 403 and response.json()["error"]["code"] == "csrf_failed"


def test_bearer_token_flow_for_api_clients(anon_client: TestClient) -> None:
    register(anon_client, "api@example.com")
    token = (
        make_client()
        .post("/api/v1/auth/token", data={"username": "api@example.com", "password": "Password123"})
        .json()["access_token"]
    )
    bare = TestClient(anon_client.app)
    assert bare.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200
    assert bare.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-token"}).status_code == 401


def test_password_change_invalidates_other_sessions(client: TestClient) -> None:
    other = make_client()
    other.post("/api/v1/auth/login", json={"email": "user@example.com", "password": "Password123"})
    response = client.post(
        "/api/v1/users/me/password", json={"current_password": "Password123", "new_password": "NewPassword456"}
    )
    assert response.status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 200  # current session re-issued
    assert other.get("/api/v1/auth/me").status_code == 401


def test_password_reset_flow(anon_client: TestClient, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    register(anon_client, "reset@example.com")
    sent: list[str] = []
    monkeypatch.setattr(email, "send_password_reset", lambda to, link: sent.append(link))
    monkeypatch.setattr(auth_service.email, "send_password_reset", lambda to, link: sent.append(link))

    assert (
        anon_client.post("/api/v1/auth/password-reset/request", json={"email": "unknown@example.com"}).status_code
        == 202
    )
    assert sent == []
    assert (
        anon_client.post("/api/v1/auth/password-reset/request", json={"email": "reset@example.com"}).status_code == 202
    )
    token = sent[0].split("token=")[1]

    ok = anon_client.post("/api/v1/auth/password-reset/confirm", json={"token": token, "new_password": "Changed789"})
    assert ok.status_code == 200
    reused = anon_client.post("/api/v1/auth/password-reset/confirm", json={"token": token, "new_password": "Again789x"})
    assert reused.status_code == 400 and reused.json()["error"]["code"] == "invalid_reset_token"
    assert anon_client.get("/api/v1/auth/me").status_code == 401  # old session invalidated
    login = anon_client.post("/api/v1/auth/login", json={"email": "reset@example.com", "password": "Changed789"})
    assert login.status_code == 200


def test_login_is_rate_limited(anon_client: TestClient) -> None:
    codes = [
        anon_client.post("/api/v1/auth/login", json={"email": "rl@example.com", "password": "Wrong123"}).status_code
        for _ in range(12)
    ]
    assert codes[-1] == 429


def test_delete_account_removes_data_and_files(client: TestClient, sample_pdf: bytes) -> None:
    from app.services import storage

    me = client.get("/api/v1/auth/me").json()
    upload(client, sample_pdf)
    import uuid

    user_dir = storage.path_for(uuid.UUID(me["id"]), "x").parent
    assert any(user_dir.iterdir())
    wrong = client.request("DELETE", "/api/v1/users/me", json={"password": "nope"}, headers=CSRF)
    assert wrong.status_code == 401
    response = client.request("DELETE", "/api/v1/users/me", json={"password": "Password123"}, headers=CSRF)
    assert response.status_code == 204
    assert not user_dir.exists()
    login = make_client().post("/api/v1/auth/login", json={"email": "user@example.com", "password": "Password123"})
    assert login.status_code == 401
