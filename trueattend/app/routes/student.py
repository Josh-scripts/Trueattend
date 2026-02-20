import os
import base64
import cv2
import numpy as np
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Student, Enrollment, AttendanceRecord, AttendanceStatus, StudentFaceImage, LeaveRequest
from app.utils.decorators import role_required
from app.utils.helpers import get_face_engine, allowed_file
from werkzeug.utils import secure_filename

student_bp = Blueprint("student", __name__)


@student_bp.route("/my-attendance", methods=["GET"])
@jwt_required()
@role_required("student")
def my_attendance():
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=user_id).first_or_404()

    enrollments = Enrollment.query.filter_by(student_id=student.id).all()
    result = []
    for e in enrollments:
        course = e.course
        pct = student.attendance_percentage(course.id)
        records = AttendanceRecord.query.filter_by(
            student_id=student.id, course_id=course.id
        ).order_by(AttendanceRecord.marked_at.desc()).all()
        result.append({
            "course_id": course.id,
            "course_name": course.name,
            "course_code": course.code,
            "attendance_pct": pct,
            "at_risk": pct < course.min_attendance_pct,
            "min_required": course.min_attendance_pct,
            "sessions": [
                {
                    "date": r.session.started_at.strftime("%Y-%m-%d") if r.session else None,
                    "status": r.status.value,
                    "confidence": r.confidence,
                    "manual_override": r.is_manual_override,
                }
                for r in records
            ],
        })
    return jsonify(result), 200


# ─── Face Registration ────────────────────────────────────────────────────────

@student_bp.route("/register-face", methods=["POST"])
@jwt_required()
def register_face():
    """
    Accept multiple image uploads OR base64 frames for face registration.
    Supports: multipart file upload OR JSON with frames_b64 list.
    """
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=user_id).first_or_404()
    engine = get_face_engine()

    upload_dir = os.path.join(current_app.config["KNOWN_FACES_DIR"], str(student.id))
    os.makedirs(upload_dir, exist_ok=True)
    image_paths = []

    # ── Multipart file upload ──
    if request.files:
        files = request.files.getlist("images")
        for f in files:
            if f and allowed_file(f.filename):
                fname = secure_filename(f"{student.student_id}_{len(image_paths)}.jpg")
                path = os.path.join(upload_dir, fname)
                f.save(path)
                image_paths.append(path)

    # ── Base64 frames ──
    elif request.is_json:
        data = request.get_json()
        frames_b64 = data.get("frames_b64", [])
        frames = []
        for i, b64 in enumerate(frames_b64):
            img_bytes = base64.b64decode(b64)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is not None:
                path = os.path.join(upload_dir, f"{student.student_id}_{i}.jpg")
                cv2.imwrite(path, frame)
                image_paths.append(path)
                frames.append(frame)

    if not image_paths:
        return jsonify({"error": "No valid images provided"}), 400

    ok, msg = engine.register_student_from_images(student.id, student.name, image_paths)
    if not ok:
        return jsonify({"error": msg}), 422

    # Record images in DB
    for path in image_paths:
        img_rec = StudentFaceImage(student_id=student.id, image_path=path, source="registration")
        db.session.add(img_rec)

    student.face_registered = True
    student.face_samples_count = len(image_paths)
    db.session.commit()

    return jsonify({"message": msg, "samples": len(image_paths)}), 200


# ─── Leave Request ────────────────────────────────────────────────────────────

@student_bp.route("/leave-request", methods=["POST"])
@jwt_required()
@role_required("student")
def submit_leave():
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=user_id).first_or_404()
    data = request.get_json()

    leave = LeaveRequest(
        student_id=student.id,
        course_id=data["course_id"],
        session_id=data.get("session_id"),
        reason=data["reason"],
    )
    db.session.add(leave)
    db.session.commit()
    return jsonify({"message": "Leave request submitted", "id": leave.id}), 201


@student_bp.route("/leave-requests", methods=["GET"])
@jwt_required()
@role_required("student")
def my_leaves():
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=user_id).first_or_404()
    leaves = LeaveRequest.query.filter_by(student_id=student.id)\
        .order_by(LeaveRequest.created_at.desc()).all()
    return jsonify([
        {
            "id": l.id,
            "course": l.course.name,
            "reason": l.reason,
            "status": l.status,
            "created_at": l.created_at.isoformat(),
        }
        for l in leaves
    ]), 200
