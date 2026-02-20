import pytest
import json
from app import create_app, db


@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def seed_admin(app):
    from app.models import User, UserRole
    with app.app_context():
        user = User(email="admin@test.com", role=UserRole.ADMIN)
        user.set_password("Test@1234")
        db.session.add(user)
        db.session.commit()


def get_token(client, email, password):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    return resp.get_json().get("access_token")


class TestAuth:
    def test_login_success(self, client, app):
        seed_admin(app)
        resp = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "Test@1234"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"

    def test_login_wrong_password(self, client, app):
        seed_admin(app)
        resp = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "wrong"})
        assert resp.status_code == 401

    def test_me_endpoint(self, client, app):
        seed_admin(app)
        token = get_token(client, "admin@test.com", "Test@1234")
        resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200


class TestAdmin:
    def test_dashboard(self, client, app):
        seed_admin(app)
        token = get_token(client, "admin@test.com", "Test@1234")
        resp = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert "total_students" in data

    def test_create_student(self, client, app):
        seed_admin(app)
        token = get_token(client, "admin@test.com", "Test@1234")

        # Create department first
        resp = client.post("/api/admin/departments",
            json={"name": "CSE", "code": "CSE"},
            headers={"Authorization": f"Bearer {token}"}
        )
        dept_id = resp.get_json()["id"]

        resp = client.post("/api/admin/students",
            json={
                "email": "student@test.com",
                "name": "Test Student",
                "student_id": "CS001",
                "department_id": dept_id,
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 201

    def test_role_protection(self, client, app):
        """Non-admin should not access admin endpoints."""
        seed_admin(app)
        # Register a student user directly
        from app.models import User, Student, UserRole
        with app.app_context():
            u = User(email="s@test.com", role=UserRole.STUDENT)
            u.set_password("pass")
            db.session.add(u)
            db.session.commit()

        token = get_token(client, "s@test.com", "pass")
        resp = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403
