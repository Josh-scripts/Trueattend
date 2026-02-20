from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import join_room, leave_room, emit
from app import socketio
from app.utils.decorators import role_required

camera_bp = Blueprint("camera", __name__)


# ─── REST: Camera list (future: IP cameras, RTSP) ─────────────────────────────

@camera_bp.route("/list", methods=["GET"])
@jwt_required()
@role_required("admin", "professor")
def list_cameras():
    """
    In production, return list of configured IP cameras per room.
    For now, returns default local cameras.
    """
    return jsonify([
        {"id": 0, "label": "Default Webcam", "type": "local"},
    ]), 200


# ─── SocketIO Events ──────────────────────────────────────────────────────────

@socketio.on("connect")
def handle_connect():
    emit("connected", {"status": "ok"})


@socketio.on("join_admin")
def join_admin(data):
    """Admin joins global room to receive all camera feeds and alerts."""
    join_room("admin_room")
    emit("joined", {"room": "admin_room"})


@socketio.on("join_professor")
def join_professor(data):
    """Professor joins their personal room for session alerts."""
    professor_id = data.get("professor_id")
    if professor_id:
        room = f"professor_{professor_id}"
        join_room(room)
        emit("joined", {"room": room})


@socketio.on("join_student")
def join_student(data):
    """Student joins their personal room for attendance notifications."""
    student_id = data.get("student_id")
    if student_id:
        room = f"student_{student_id}"
        join_room(room)
        emit("joined", {"room": room})


@socketio.on("leave_room_event")
def handle_leave(data):
    room = data.get("room")
    if room:
        leave_room(room)


@socketio.on("disconnect")
def handle_disconnect():
    pass  # cleanup handled by flask-socketio
