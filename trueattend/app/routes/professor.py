from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Professor, Course, ProfessorCourse, AttendanceSession, AttendanceRecord, AttendanceStatus, Enrollment
from app.utils.decorators import role_required

professor_bp = Blueprint("professor", __name__)


@professor_bp.route("/my-courses", methods=["GET"])
@jwt_required()
@role_required("professor")
def my_courses():
    user_id = get_jwt_identity()
    professor = Professor.query.filter_by(user_id=user_id).first_or_404()
    pcs = ProfessorCourse.query.filter_by(professor_id=professor.id).all()
    return jsonify([
        {
            "course_id": pc.course_id,
            "course_name": pc.course.name,
            "course_code": pc.course.code,
            "semester": pc.course.semester,
            "enrolled_count": pc.course.enrollments.count(),
        }
        for pc in pcs
    ]), 200


@professor_bp.route("/course/<int:course_id>/students", methods=["GET"])
@jwt_required()
@role_required("professor", "admin")
def course_students(course_id):
    enrollments = Enrollment.query.filter_by(course_id=course_id).all()
    return jsonify([
        {
            "student_id": e.student_id,
            "name": e.student.name,
            "roll": e.student.student_id,
            "face_registered": e.student.face_registered,
            "attendance_pct": e.student.attendance_percentage(course_id),
        }
        for e in enrollments
    ]), 200


@professor_bp.route("/course/<int:course_id>/sessions", methods=["GET"])
@jwt_required()
@role_required("professor", "admin")
def course_sessions(course_id):
    sessions = AttendanceSession.query.filter_by(course_id=course_id, is_completed=True)\
        .order_by(AttendanceSession.started_at.desc()).all()
    return jsonify([
        {
            "session_id": s.id,
            "date": s.started_at.strftime("%Y-%m-%d"),
            "present": s.total_present,
            "absent": s.total_enrolled - s.total_present,
            "total": s.total_enrolled,
            "unknown_faces": s.total_unknown,
        }
        for s in sessions
    ]), 200


@professor_bp.route("/attendance-summary", methods=["GET"])
@jwt_required()
@role_required("professor")
def attendance_summary():
    """Get overall attendance % for each student across all professor's courses."""
    user_id = get_jwt_identity()
    professor = Professor.query.filter_by(user_id=user_id).first_or_404()
    pcs = ProfessorCourse.query.filter_by(professor_id=professor.id).all()
    course_ids = [pc.course_id for pc in pcs]

    summary = []
    for course_id in course_ids:
        course = pcs[course_ids.index(course_id)].course
        enrollments = Enrollment.query.filter_by(course_id=course_id).all()
        for e in enrollments:
            pct = e.student.attendance_percentage(course_id)
            summary.append({
                "course": course.name,
                "student": e.student.name,
                "roll": e.student.student_id,
                "attendance_pct": pct,
                "at_risk": pct < course.min_attendance_pct,
            })

    return jsonify(summary), 200
