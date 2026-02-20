import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Handles email and in-app notifications.
    Extend with SMS (Twilio), push (Firebase), or Slack as needed.
    """

    def __init__(self):
        self._mail = None

    def _get_mail(self):
        if self._mail is None:
            from app import mail
            self._mail = mail
        return self._mail

    def send_email(self, to: str, subject: str, body: str):
        try:
            from flask_mail import Message
            mail = self._get_mail()
            msg = Message(subject=subject, recipients=[to], body=body)
            mail.send(msg)
            logger.info(f"Email sent to {to}: {subject}")
        except Exception as e:
            logger.error(f"Email failed to {to}: {e}")

    def alert_professor_unknown_face(self, professor_email: str, session_id: int, count: int):
        self.send_email(
            to=professor_email,
            subject="⚠️ TrueAttend Alert: Unknown Face Detected",
            body=(
                f"Alert: {count} unrecognised face(s) detected in session #{session_id}.\n"
                "Please check the live camera feed in your TrueAttend dashboard."
            ),
        )

    def alert_student_low_attendance(self, student_email: str, student_name: str, course_name: str, pct: float):
        self.send_email(
            to=student_email,
            subject=f"⚠️ TrueAttend: Low Attendance Warning — {course_name}",
            body=(
                f"Dear {student_name},\n\n"
                f"Your attendance in {course_name} has dropped to {pct:.1f}%.\n"
                "Minimum required: 75%. Please attend upcoming classes.\n\n"
                "— TrueAttend System"
            ),
        )

    def notify_attendance_marked(self, student_email: str, student_name: str, course_name: str, date: str):
        self.send_email(
            to=student_email,
            subject=f"✅ Attendance Marked — {course_name}",
            body=(
                f"Hi {student_name},\n\n"
                f"Your attendance for {course_name} on {date} has been recorded.\n\n"
                "— TrueAttend System"
            ),
        )
