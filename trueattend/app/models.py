from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    PROFESSOR = "professor"
    STUDENT = "student"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class AlertType(str, enum.Enum):
    UNKNOWN_FACE = "unknown_face"
    PROXY_ATTEMPT = "proxy_attempt"
    HEADCOUNT_MISMATCH = "headcount_mismatch"
    LIVENESS_FAIL = "liveness_fail"
    EXCESS_PERSON = "excess_person"


# ─────────────────────────────
#  User
# ─────────────────────────────
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # Relationships
    student = db.relationship("Student", back_populates="user", uselist=False)
    professor = db.relationship("Professor", back_populates="user", uselist=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"


# ─────────────────────────────
#  Department & Course
# ─────────────────────────────
class Department(db.Model):
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    code = db.Column(db.String(20), nullable=False, unique=True)
    courses = db.relationship("Course", back_populates="department", lazy="dynamic")
    students = db.relationship("Student", back_populates="department", lazy="dynamic")


class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(30), nullable=False, unique=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"))
    semester = db.Column(db.String(20))
    year = db.Column(db.Integer)
    total_classes = db.Column(db.Integer, default=0)
    min_attendance_pct = db.Column(db.Float, default=75.0)

    department = db.relationship("Department", back_populates="courses")
    sessions = db.relationship("AttendanceSession", back_populates="course", lazy="dynamic")
    enrollments = db.relationship("Enrollment", back_populates="course", lazy="dynamic")
    professor_courses = db.relationship("ProfessorCourse", back_populates="course", lazy="dynamic")


# ─────────────────────────────
#  Student
# ─────────────────────────────
class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    student_id = db.Column(db.String(30), unique=True, nullable=False)  # college roll number
    name = db.Column(db.String(120), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"))
    batch = db.Column(db.String(10))  # e.g. "2021-2025"
    phone = db.Column(db.String(20))
    face_registered = db.Column(db.Boolean, default=False)
    face_samples_count = db.Column(db.Integer, default=0)
    face_encoding_path = db.Column(db.String(255))  # path to .npy file

    user = db.relationship("User", back_populates="student")
    department = db.relationship("Department", back_populates="students")
    enrollments = db.relationship("Enrollment", back_populates="student", lazy="dynamic")
    attendance_records = db.relationship("AttendanceRecord", back_populates="student", lazy="dynamic")
    face_images = db.relationship("StudentFaceImage", back_populates="student", lazy="dynamic")

    def attendance_percentage(self, course_id):
        total = AttendanceSession.query.filter_by(course_id=course_id, is_completed=True).count()
        if total == 0:
            return 100.0
        present = AttendanceRecord.query.filter_by(
            student_id=self.id, course_id=course_id, status=AttendanceStatus.PRESENT
        ).count()
        return round((present / total) * 100, 2)


class StudentFaceImage(db.Model):
    __tablename__ = "student_face_images"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    image_path = db.Column(db.String(255), nullable=False)
    captured_at = db.Column(db.DateTime, default=datetime.utcnow)
    source = db.Column(db.String(30), default="registration")  # registration | session_update

    student = db.relationship("Student", back_populates="face_images")


# ─────────────────────────────
#  Professor
# ─────────────────────────────
class Professor(db.Model):
    __tablename__ = "professors"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    employee_id = db.Column(db.String(30), unique=True, nullable=False)
    phone = db.Column(db.String(20))

    user = db.relationship("User", back_populates="professor")
    courses = db.relationship("ProfessorCourse", back_populates="professor", lazy="dynamic")
    attendance_sessions = db.relationship("AttendanceSession", back_populates="professor", lazy="dynamic")


class ProfessorCourse(db.Model):
    __tablename__ = "professor_courses"

    id = db.Column(db.Integer, primary_key=True)
    professor_id = db.Column(db.Integer, db.ForeignKey("professors.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    academic_year = db.Column(db.String(10))

    professor = db.relationship("Professor", back_populates="courses")
    course = db.relationship("Course", back_populates="professor_courses")


# ─────────────────────────────
#  Enrollment
# ─────────────────────────────
class Enrollment(db.Model):
    __tablename__ = "enrollments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student", back_populates="enrollments")
    course = db.relationship("Course", back_populates="enrollments")

    __table_args__ = (db.UniqueConstraint("student_id", "course_id"),)


# ─────────────────────────────
#  Attendance Session
# ─────────────────────────────
class AttendanceSession(db.Model):
    __tablename__ = "attendance_sessions"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    professor_id = db.Column(db.Integer, db.ForeignKey("professors.id"), nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime)
    is_completed = db.Column(db.Boolean, default=False)
    total_enrolled = db.Column(db.Integer, default=0)
    total_present = db.Column(db.Integer, default=0)
    total_unknown = db.Column(db.Integer, default=0)
    headcount_verified = db.Column(db.Boolean, default=False)
    room = db.Column(db.String(50))
    notes = db.Column(db.Text)
    snapshot_path = db.Column(db.String(255))  # classroom snapshot at session end

    course = db.relationship("Course", back_populates="sessions")
    professor = db.relationship("Professor", back_populates="attendance_sessions")
    records = db.relationship("AttendanceRecord", back_populates="session", lazy="dynamic")
    alerts = db.relationship("AttendanceAlert", back_populates="session", lazy="dynamic")
    logs = db.relationship("SessionLog", back_populates="session", lazy="dynamic")


# ─────────────────────────────
#  Attendance Record
# ─────────────────────────────
class AttendanceRecord(db.Model):
    __tablename__ = "attendance_records"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("attendance_sessions.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    status = db.Column(db.Enum(AttendanceStatus), default=AttendanceStatus.ABSENT)
    confidence = db.Column(db.Float)  # face recognition confidence
    detected_at = db.Column(db.DateTime)
    marked_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_manual_override = db.Column(db.Boolean, default=False)
    override_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    override_reason = db.Column(db.String(255))

    session = db.relationship("AttendanceSession", back_populates="records")
    student = db.relationship("Student", back_populates="attendance_records")

    __table_args__ = (db.UniqueConstraint("session_id", "student_id"),)


# ─────────────────────────────
#  Alert
# ─────────────────────────────
class AttendanceAlert(db.Model):
    __tablename__ = "attendance_alerts"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("attendance_sessions.id"), nullable=False)
    alert_type = db.Column(db.Enum(AlertType), nullable=False)
    message = db.Column(db.Text, nullable=False)
    snapshot_path = db.Column(db.String(255))  # face crop or frame snapshot
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    resolved_at = db.Column(db.DateTime)

    session = db.relationship("AttendanceSession", back_populates="alerts")


# ─────────────────────────────
#  Session Log (audit trail)
# ─────────────────────────────
class SessionLog(db.Model):
    __tablename__ = "session_logs"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("attendance_sessions.id"), nullable=False)
    event = db.Column(db.String(80), nullable=False)
    detail = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    session = db.relationship("AttendanceSession", back_populates="logs")


# ─────────────────────────────
#  Leave Request
# ─────────────────────────────
class LeaveRequest(db.Model):
    __tablename__ = "leave_requests"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey("attendance_sessions.id"))
    reason = db.Column(db.Text, nullable=False)
    document_path = db.Column(db.String(255))
    status = db.Column(db.String(20), default="pending")  # pending | approved | rejected
    reviewed_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
