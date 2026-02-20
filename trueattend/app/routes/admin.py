from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import (
    User, Student, Professor, Course, Department, Enrollment,
    AttendanceSession, AttendanceRecord, AttendanceAlert, UserRole, ProfessorCourse
)
from app.utils.decorators import role_required

admin_bp = Blueprint("admin", __name__)


# ──────────────────────────────────────────
#  Dashboard Stats
# ──────────────────────────────────────────

@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
@role_required("admin")
def dashboard():
    total_students = Student.query.count()
    total_professors = Professor.query.count()
    total_courses = Course.query.count()
    active_sessions = AttendanceSession.query.filter_by(is_completed=False).count()
    unresolved_alerts = AttendanceAlert.query.filter_by(is_resolved=False).count()

    # Today's sessions
    from datetime import date
    today_start = date.today()
    today_sessions = AttendanceSession.query.filter(
        AttendanceSession.started_at >= today_start
    ).count()

    return jsonify({
        "total_students": total_students,
        "total_professors": total_professors,
        "total_courses": total_courses,
        "active_sessions": active_sessions,
        "unresolved_alerts": unresolved_alerts,
        "sessions_today": today_sessions,
    }), 200


# ──────────────────────────────────────────
#  User Management
# ──────────────────────────────────────────

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@role_required("admin")
def list_users():
    role_filter = request.args.get("role")
    q = User.query
    if role_filter:
        q = q.filter_by(role=role_filter)
    users = q.all()
    return jsonify([
        {"id": u.id, "email": u.email, "role": u.role.value, "is_active": u.is_active}
        for u in users
    ]), 200


@admin_bp.route("/users/<int:user_id>/toggle-active", methods=["PUT"])
@jwt_required()
@role_required("admin")
def toggle_user_active(user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({"is_active": user.is_active}), 200


# ──────────────────────────────────────────
#  Register Student
# ──────────────────────────────────────────

@admin_bp.route("/students", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_student():
    data = request.get_json()

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(email=data["email"].lower(), role=UserRole.STUDENT)
    user.set_password(data.get("password", data["student_id"]))  # default pw = roll number
    db.session.add(user)
    db.session.flush()

    student = Student(
        user_id=user.id,
        student_id=data["student_id"],
        name=data["name"],
        department_id=data.get("department_id"),
        batch=data.get("batch"),
        phone=data.get("phone"),
    )
    db.session.add(student)
    db.session.commit()
    return jsonify({"message": "Student created", "student_id": student.id}), 201


@admin_bp.route("/students", methods=["GET"])
@jwt_required()
@role_required("admin", "professor")
def list_students():
    dept_id = request.args.get("department_id", type=int)
    q = Student.query
    if dept_id:
        q = q.filter_by(department_id=dept_id)
    students = q.all()
    return jsonify([
        {
            "id": s.id,
            "name": s.name,
            "student_id": s.student_id,
            "batch": s.batch,
            "face_registered": s.face_registered,
            "face_samples": s.face_samples_count,
        }
        for s in students
    ]), 200


# ──────────────────────────────────────────
#  Register Professor
# ──────────────────────────────────────────

@admin_bp.route("/professors", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_professor():
    data = request.get_json()

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(email=data["email"].lower(), role=UserRole.PROFESSOR)
    user.set_password(data.get("password", data["employee_id"]))
    db.session.add(user)
    db.session.flush()

    professor = Professor(
        user_id=user.id,
        name=data["name"],
        employee_id=data["employee_id"],
        phone=data.get("phone"),
    )
    db.session.add(professor)
    db.session.commit()
    return jsonify({"message": "Professor created", "id": professor.id}), 201


# ──────────────────────────────────────────
#  Courses & Departments
# ──────────────────────────────────────────

@admin_bp.route("/departments", methods=["GET", "POST"])
@jwt_required()
@role_required("admin")
def departments():
    if request.method == "POST":
        data = request.get_json()
        dept = Department(name=data["name"], code=data["code"])
        db.session.add(dept)
        db.session.commit()
        return jsonify({"id": dept.id, "name": dept.name}), 201
    depts = Department.query.all()
    return jsonify([{"id": d.id, "name": d.name, "code": d.code} for d in depts]), 200


@admin_bp.route("/courses", methods=["GET", "POST"])
@jwt_required()
@role_required("admin")
def courses():
    if request.method == "POST":
        data = request.get_json()
        course = Course(
            name=data["name"],
            code=data["code"],
            department_id=data.get("department_id"),
            semester=data.get("semester"),
            year=data.get("year"),
            min_attendance_pct=data.get("min_attendance_pct", 75.0),
        )
        db.session.add(course)
        db.session.commit()
        return jsonify({"id": course.id, "name": course.name}), 201
    cs = Course.query.all()
    return jsonify([{"id": c.id, "name": c.name, "code": c.code} for c in cs]), 200


@admin_bp.route("/courses/<int:course_id>/enroll", methods=["POST"])
@jwt_required()
@role_required("admin")
def enroll_student(course_id):
    data = request.get_json()
    student_id = data.get("student_id")
    existing = Enrollment.query.filter_by(student_id=student_id, course_id=course_id).first()
    if existing:
        return jsonify({"error": "Already enrolled"}), 409
    enrollment = Enrollment(student_id=student_id, course_id=course_id)
    db.session.add(enrollment)
    db.session.commit()
    return jsonify({"message": "Enrolled successfully"}), 201


@admin_bp.route("/courses/<int:course_id>/assign-professor", methods=["POST"])
@jwt_required()
@role_required("admin")
def assign_professor(course_id):
    data = request.get_json()
    pc = ProfessorCourse(
        professor_id=data["professor_id"],
        course_id=course_id,
        academic_year=data.get("academic_year"),
    )
    db.session.add(pc)
    db.session.commit()
    return jsonify({"message": "Professor assigned"}), 201


# ──────────────────────────────────────────
#  Alerts Overview
# ──────────────────────────────────────────

@admin_bp.route("/alerts", methods=["GET"])
@jwt_required()
@role_required("admin")
def all_alerts():
    unresolved_only = request.args.get("unresolved", "false").lower() == "true"
    q = AttendanceAlert.query
    if unresolved_only:
        q = q.filter_by(is_resolved=False)
    alerts = q.order_by(AttendanceAlert.created_at.desc()).limit(100).all()
    return jsonify([
        {
            "id": a.id,
            "session_id": a.session_id,
            "type": a.alert_type.value,
            "message": a.message,
            "created_at": a.created_at.isoformat(),
            "is_resolved": a.is_resolved,
        }
        for a in alerts
    ]), 200


# ──────────────────────────────────────────
#  Attendance Reports
# ──────────────────────────────────────────

@admin_bp.route("/reports/attendance", methods=["GET"])
@jwt_required()
@role_required("admin")
def attendance_report():
    course_id = request.args.get("course_id", type=int)
    dept_id = request.args.get("department_id", type=int)

    students_q = Student.query
    if dept_id:
        students_q = students_q.filter_by(department_id=dept_id)

    report = []
    for student in students_q.all():
        enrollments = student.enrollments.all()
        for enrollment in enrollments:
            if course_id and enrollment.course_id != course_id:
                continue
            pct = student.attendance_percentage(enrollment.course_id)
            at_risk = pct < enrollment.course.min_attendance_pct
            report.append({
                "student_name": student.name,
                "student_id": student.student_id,
                "course": enrollment.course.name,
                "attendance_pct": pct,
                "at_risk": at_risk,
                "min_required": enrollment.course.min_attendance_pct,
            })

    return jsonify(report), 200
