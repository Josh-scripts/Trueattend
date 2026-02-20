from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from datetime import datetime
from app import db
from app.models import User, Student, Professor, UserRole

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    user = User.query.filter_by(email=email, is_active=True).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    user.last_login = datetime.utcnow()
    db.session.commit()

    access_token = create_access_token(
        identity=user.id,
        additional_claims={"role": user.role.value},
    )
    refresh_token = create_refresh_token(identity=user.id)

    profile = _get_profile(user)

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": profile,
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({"error": "User not found"}), 404

    access_token = create_access_token(
        identity=user.id,
        additional_claims={"role": user.role.value},
    )
    return jsonify({"access_token": access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(_get_profile(user)), 200


@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    data = request.get_json()
    user = User.query.get(user_id)

    if not user.check_password(data.get("current_password", "")):
        return jsonify({"error": "Current password incorrect"}), 400

    new_pw = data.get("new_password", "")
    if len(new_pw) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    user.set_password(new_pw)
    db.session.commit()
    return jsonify({"message": "Password updated"}), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    # For stateless JWT, logout is handled client-side (delete tokens)
    # For token blocklist, add JWT jti to a redis set here
    return jsonify({"message": "Logged out successfully"}), 200


def _get_profile(user: User) -> dict:
    base = {"id": user.id, "email": user.email, "role": user.role.value}
    if user.role == UserRole.STUDENT and user.student:
        s = user.student
        base.update({
            "name": s.name,
            "student_id": s.student_id,
            "face_registered": s.face_registered,
        })
    elif user.role == UserRole.PROFESSOR and user.professor:
        p = user.professor
        base.update({"name": p.name, "employee_id": p.employee_id})
    elif user.role == UserRole.ADMIN:
        base["name"] = "Administrator"
    return base
