"""
Seed the database with sample data for development/demo.
Run: python scripts/seed.py
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db
from app.models import User, Student, Professor, Department, Course, Enrollment, ProfessorCourse, UserRole

app = create_app("development")

with app.app_context():
    db.drop_all()
    db.create_all()
    print("DB reset.")

    # Admin
    admin = User(email="admin@trueattend.app", role=UserRole.ADMIN)
    admin.set_password("Admin@1234")
    db.session.add(admin)

    # Department
    dept = Department(name="Computer Science", code="CSE")
    db.session.add(dept)
    db.session.flush()

    # Professor
    prof_user = User(email="prof.smith@trueattend.app", role=UserRole.PROFESSOR)
    prof_user.set_password("Prof@1234")
    db.session.add(prof_user)
    db.session.flush()

    professor = Professor(user_id=prof_user.id, name="Dr. Alice Smith", employee_id="EMP001", phone="9999000001")
    db.session.add(professor)
    db.session.flush()

    # Course
    course = Course(
        name="Machine Learning", code="CS401",
        department_id=dept.id, semester="odd", year=2024,
        min_attendance_pct=75.0
    )
    db.session.add(course)
    db.session.flush()

    # Assign professor
    pc = ProfessorCourse(professor_id=professor.id, course_id=course.id, academic_year="2024-25")
    db.session.add(pc)

    # Students
    student_data = [
        ("student1@trueattend.app", "CS2021001", "Arjun Mehta"),
        ("student2@trueattend.app", "CS2021002", "Priya Sharma"),
        ("student3@trueattend.app", "CS2021003", "Rahul Gupta"),
        ("student4@trueattend.app", "CS2021004", "Sneha Patel"),
        ("student5@trueattend.app", "CS2021005", "Vikram Singh"),
    ]

    for email, roll, name in student_data:
        u = User(email=email, role=UserRole.STUDENT)
        u.set_password(roll)  # default password = roll number
        db.session.add(u)
        db.session.flush()

        s = Student(user_id=u.id, student_id=roll, name=name, department_id=dept.id, batch="2021-2025")
        db.session.add(s)
        db.session.flush()

        e = Enrollment(student_id=s.id, course_id=course.id)
        db.session.add(e)

    db.session.commit()
    print("✅ Seed complete!")
    print("\n── Login credentials ──────────────")
    print("Admin    : admin@trueattend.app       / Admin@1234")
    print("Professor: prof.smith@trueattend.app  / Prof@1234")
    print("Students : student1@trueattend.app    / CS2021001  (roll as password)")
    print("           (student1 through student5)")
