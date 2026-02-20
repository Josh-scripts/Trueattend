import os
import base64
import cv2
import numpy as np
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime

from app import db
from app.models import (
    AttendanceSession, AttendanceRecord, AttendanceAlert, Course,
    Professor, Student, Enrollment, AttendanceStatus, AlertType, SessionLog
)
from app.utils.decorators import role_required
from app.utils.helpers import get_session_manager

attendance_bp = Blueprint("attendance", __name__)


# ─── Start Session ────────────────────────────────────────────────────────────

@attendance_bp.route("/session/start", methods=["POST"])
@jwt_required()
@role_required("professor", "admin")
def start_session():
    data = request.get_json()
    course_id = data.get("course_id")
    camera_index = data.get("camera_index", 0)
    room = data.get("room", "")

    user_id = get_jwt_identity()
    professor = Professor.query.filter_by(user_id=user_id).first()
    if not professor:
        return jsonify({"error": "Professor profile not found"}), 404

    course = Course.query.get(course_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    # Check no active session for this course
    active = AttendanceSession.query.filter_by(
        course_id=course_id, is_completed=False
    ).first()
    if active:
        return jsonify({"error": "Session already active", "session_id": active.id}), 409

    # Create DB session record
    session = AttendanceSession(
        course_id=course_id,
        professor_id=professor.id,
        room=room,
        total_enrolled=Enrollment.query.filter_by(course_id=course_id).count(),
    )
    db.session.add(session)
    db.session.commit()

    # Start ML session
    manager = get_session_manager()
    ok = manager.start_session(session.id, course_id, professor.id, camera_index)
    if not ok:
        db.session.delete(session)
        db.session.commit()
        return jsonify({"error": "Failed to open camera"}), 500

    return jsonify({
        "message": "Session started",
        "session_id": session.id,
        "course": course.name,
        "enrolled": session.total_enrolled,
    }), 201


# ─── Stop Session ─────────────────────────────────────────────────────────────

@attendance_bp.route("/session/<int:session_id>/stop", methods=["POST"])
@jwt_required()
@role_required("professor", "admin")
def stop_session(session_id):
    session = AttendanceSession.query.get_or_404(session_id)

    manager = get_session_manager()
    sid = manager.stop_session(session.course_id, current_app._get_current_object())
    if sid is None:
        return jsonify({"error": "No active session found"}), 404

    # Reload updated session
    db.session.refresh(session)
    return jsonify({
        "message": "Session completed",
        "session_id": session.id,
        "present": session.total_present,
        "absent": session.total_enrolled - session.total_present,
        "unknown_faces": session.total_unknown,
        "headcount_ok": session.headcount_verified,
    }), 200


# ─── Live Status ──────────────────────────────────────────────────────────────

@attendance_bp.route("/session/<int:session_id>/status", methods=["GET"])
@jwt_required()
def session_status(session_id):
    session = AttendanceSession.query.get_or_404(session_id)
    manager = get_session_manager()
    live = manager.get_live_status(session.course_id)

    return jsonify({
        "session_id": session.id,
        "is_active": not session.is_completed,
        "live": live,
        "started_at": session.started_at.isoformat(),
        "enrolled": session.total_enrolled,
    }), 200


# ─── Get Session Records ──────────────────────────────────────────────────────

@attendance_bp.route("/session/<int:session_id>/records", methods=["GET"])
@jwt_required()
def session_records(session_id):
    session = AttendanceSession.query.get_or_404(session_id)
    records = AttendanceRecord.query.filter_by(session_id=session_id).all()

    return jsonify({
        "session_id": session_id,
        "course": session.course.name,
        "date": session.started_at.strftime("%Y-%m-%d"),
        "records": [
            {
                "student_id": r.student_id,
                "name": r.student.name,
                "roll": r.student.student_id,
                "status": r.status.value,
                "confidence": r.confidence,
                "is_manual_override": r.is_manual_override,
            }
            for r in records
        ],
        "summary": {
            "present": sum(1 for r in records if r.status == AttendanceStatus.PRESENT),
            "absent": sum(1 for r in records if r.status == AttendanceStatus.ABSENT),
            "total": len(records),
        },
    }), 200


# ─── Manual Override ─────────────────────────────────────────────────────────

@attendance_bp.route("/record/<int:record_id>/override", methods=["PUT"])
@jwt_required()
@role_required("professor", "admin")
def override_attendance(record_id):
    data = request.get_json()
    record = AttendanceRecord.query.get_or_404(record_id)
    user_id = get_jwt_identity()

    new_status = data.get("status")
    if new_status not in [s.value for s in AttendanceStatus]:
        return jsonify({"error": "Invalid status"}), 400

    record.status = AttendanceStatus(new_status)
    record.is_manual_override = True
    record.override_by = user_id
    record.override_reason = data.get("reason", "Manual override by staff")
    db.session.commit()

    return jsonify({"message": "Record updated", "status": record.status.value}), 200


# ─── Alerts ──────────────────────────────────────────────────────────────────

@attendance_bp.route("/session/<int:session_id>/alerts", methods=["GET"])
@jwt_required()
def session_alerts(session_id):
    alerts = AttendanceAlert.query.filter_by(session_id=session_id).all()
    return jsonify([
        {
            "id": a.id,
            "type": a.alert_type.value,
            "message": a.message,
            "created_at": a.created_at.isoformat(),
            "is_resolved": a.is_resolved,
            "snapshot": a.snapshot_path,
        }
        for a in alerts
    ]), 200


@attendance_bp.route("/alert/<int:alert_id>/resolve", methods=["PUT"])
@jwt_required()
@role_required("professor", "admin")
def resolve_alert(alert_id):
    alert = AttendanceAlert.query.get_or_404(alert_id)
    alert.is_resolved = True
    alert.resolved_by = get_jwt_identity()
    alert.resolved_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Alert resolved"}), 200


# ─── Analyse Single Frame (REST, no camera) ───────────────────────────────────

@attendance_bp.route("/analyse-frame", methods=["POST"])
@jwt_required()
@role_required("professor", "admin")
def analyse_frame():
    """
    Accepts a base64 JPEG frame + course_id.
    Returns face recognition results without persisting.
    Useful for one-shot check or testing.
    """
    data = request.get_json()
    b64 = data.get("frame_b64")
    course_id = data.get("course_id")

    if not b64:
        return jsonify({"error": "frame_b64 required"}), 400

    img_bytes = base64.b64decode(b64)
    nparr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    enrolled_ids = [
        e.student_id for e in Enrollment.query.filter_by(course_id=course_id).all()
    ]

    from app.utils.helpers import get_face_engine
    engine = get_face_engine()
    result = engine.analyse_frame(frame, enrolled_ids)

    return jsonify({
        "faces_detected": result.total_faces_detected,
        "identified": [
            {"student_id": m.student_id, "name": m.student_name, "confidence": m.confidence}
            for m in result.matches
        ],
        "unknown_count": result.unknown_face_count,
    }), 200


# ─── Attendance History for a Course ─────────────────────────────────────────

@attendance_bp.route("/course/<int:course_id>/history", methods=["GET"])
@jwt_required()
def course_history(course_id):
    sessions = AttendanceSession.query.filter_by(
        course_id=course_id, is_completed=True
    ).order_by(AttendanceSession.started_at.desc()).all()

    return jsonify([
        {
            "session_id": s.id,
            "date": s.started_at.strftime("%Y-%m-%d"),
            "time": s.started_at.strftime("%H:%M"),
            "present": s.total_present,
            "absent": s.total_enrolled - s.total_present,
            "total": s.total_enrolled,
            "unknown_faces": s.total_unknown,
            "headcount_ok": s.headcount_verified,
        }
        for s in sessions
    ]), 200
