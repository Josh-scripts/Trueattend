"""
Attendance Session Manager
===========================
Orchestrates the lifecycle of an attendance-marking session:
  1. Professor triggers session start
  2. Camera frames are analysed continuously
  3. Identified faces are accumulated
  4. Headcount verification
  5. Session finalised → DB records written
  6. Alerts dispatched via SocketIO
"""

import cv2
import time
import threading
import logging
import os
from datetime import datetime
from typing import Dict, Optional, List, Set
from dataclasses import dataclass, field

from app import db, socketio
from app.models import (
    AttendanceSession, AttendanceRecord, AttendanceAlert, SessionLog,
    Student, Enrollment, AttendanceStatus, AlertType, Course
)
from app.ml.face_engine import FaceRecognitionEngine, FrameAnalysisResult, crop_and_save_unknown
from app.utils.notifications import NotificationService

logger = logging.getLogger(__name__)


@dataclass
class SessionState:
    session_id: int
    course_id: int
    professor_id: int
    enrolled_ids: List[int]            # all enrolled student IDs
    identified_ids: Set[int] = field(default_factory=set)
    liveness_failed_ids: Set[int] = field(default_factory=set)
    unknown_face_count: int = 0
    frame_count: int = 0
    is_active: bool = True
    started_at: datetime = field(default_factory=datetime.utcnow)


class AttendanceSessionManager:
    """
    Thread-safe manager for active attendance sessions.
    One session per course at a time.
    """

    def __init__(
        self,
        face_engine: FaceRecognitionEngine,
        notifier: NotificationService,
        alert_unknown_threshold: int = 1,
        analysis_interval: float = 2.0,
        unknown_save_dir: str = "uploads/unknown_faces",
    ):
        self.engine = face_engine
        self.notifier = notifier
        self.alert_threshold = alert_unknown_threshold
        self.interval = analysis_interval
        self.unknown_save_dir = unknown_save_dir

        self._sessions: Dict[int, SessionState] = {}   # course_id → state
        self._threads: Dict[int, threading.Thread] = {}
        self._cameras: Dict[int, cv2.VideoCapture] = {}
        self._lock = threading.Lock()

    # ────────────── Start / Stop ──────────────

    def start_session(self, session_id: int, course_id: int, professor_id: int, camera_index: int = 0) -> bool:
        with self._lock:
            if course_id in self._sessions:
                logger.warning(f"Session already active for course {course_id}")
                return False

            # Load enrolled students
            enrollments = Enrollment.query.filter_by(course_id=course_id).all()
            enrolled_ids = [e.student_id for e in enrollments]

            state = SessionState(
                session_id=session_id,
                course_id=course_id,
                professor_id=professor_id,
                enrolled_ids=enrolled_ids,
            )
            self._sessions[course_id] = state

            # Open camera
            cap = cv2.VideoCapture(camera_index)
            if not cap.isOpened():
                logger.error(f"Cannot open camera {camera_index}")
                del self._sessions[course_id]
                return False
            self._cameras[course_id] = cap

        # Start analysis thread
        thread = threading.Thread(
            target=self._analysis_loop,
            args=(course_id,),
            daemon=True,
            name=f"session-{session_id}",
        )
        thread.start()
        self._threads[course_id] = thread

        self._log(session_id, "SESSION_STARTED", f"Camera {camera_index}, {len(enrolled_ids)} enrolled")
        return True

    def stop_session(self, course_id: int, flask_app) -> Optional[int]:
        """Stop session and finalise attendance records. Returns session_id."""
        with self._lock:
            state = self._sessions.get(course_id)
            if not state:
                return None
            state.is_active = False

        # Wait for thread to finish
        thread = self._threads.pop(course_id, None)
        if thread:
            thread.join(timeout=5)

        cap = self._cameras.pop(course_id, None)
        if cap:
            cap.release()

        # Finalise in app context
        with flask_app.app_context():
            self._finalise_session(state)

        with self._lock:
            self._sessions.pop(course_id, None)

        return state.session_id

    # ────────────── Core Analysis Loop ──────────────

    def _analysis_loop(self, course_id: int):
        """Runs in a dedicated thread; reads frames and analyses faces."""
        from app import create_app
        # We need an app context for DB access inside the thread
        # This is injected via the factory; callers should ensure this
        while True:
            with self._lock:
                state = self._sessions.get(course_id)
                cap = self._cameras.get(course_id)

            if not state or not state.is_active or cap is None:
                break

            ret, frame = cap.read()
            if not ret:
                logger.warning(f"Camera read failed for course {course_id}")
                time.sleep(0.5)
                continue

            result = self.engine.analyse_frame(frame, state.enrolled_ids)
            state.frame_count += 1

            # Update identified set
            for match in result.matches:
                if match.is_liveness_pass:
                    state.identified_ids.add(match.student_id)
                else:
                    state.liveness_failed_ids.add(match.student_id)

            state.unknown_face_count = max(state.unknown_face_count, result.unknown_face_count)

            # Emit annotated frame to admin/professor via SocketIO
            annotated = self.engine.draw_results(frame, result)
            self._emit_frame(course_id, annotated, result)

            # Trigger alerts
            self._check_alerts(state, result, frame)

            time.sleep(self.interval)

    # ────────────── Finalise ──────────────

    def _finalise_session(self, state: SessionState):
        session = AttendanceSession.query.get(state.session_id)
        if not session:
            return

        enrolled_ids = set(state.enrolled_ids)
        identified_ids = state.identified_ids

        # Headcount check
        headcount_ok = len(identified_ids) <= len(enrolled_ids)
        excess = max(0, state.unknown_face_count)

        # Write attendance records
        for student_id in enrolled_ids:
            student_status = (
                AttendanceStatus.PRESENT
                if student_id in identified_ids
                else AttendanceStatus.ABSENT
            )
            existing = AttendanceRecord.query.filter_by(
                session_id=state.session_id, student_id=student_id
            ).first()

            if existing:
                existing.status = student_status
            else:
                record = AttendanceRecord(
                    session_id=state.session_id,
                    student_id=student_id,
                    course_id=state.course_id,
                    status=student_status,
                    detected_at=state.started_at if student_id in identified_ids else None,
                )
                db.session.add(record)

        # Mark liveness-failed as absent with reason
        for sid in state.liveness_failed_ids:
            rec = AttendanceRecord.query.filter_by(
                session_id=state.session_id, student_id=sid
            ).first()
            if rec:
                rec.status = AttendanceStatus.ABSENT
                rec.override_reason = "Liveness detection failed (possible photo spoof)"

        # Finalise session
        session.ended_at = datetime.utcnow()
        session.is_completed = True
        session.total_enrolled = len(enrolled_ids)
        session.total_present = len(identified_ids)
        session.total_unknown = excess
        session.headcount_verified = headcount_ok

        db.session.commit()

        # Alert if headcount mismatch
        if not headcount_ok or excess > 0:
            alert = AttendanceAlert(
                session_id=state.session_id,
                alert_type=AlertType.HEADCOUNT_MISMATCH,
                message=f"Headcount mismatch: {state.unknown_face_count} unrecognised face(s) detected during session.",
            )
            db.session.add(alert)
            db.session.commit()

        self._log(state.session_id, "SESSION_FINALISED",
                  f"Present: {len(identified_ids)}/{len(enrolled_ids)}, Unknown faces: {excess}")

        # Notify professor via SocketIO
        socketio.emit("session_complete", {
            "session_id": state.session_id,
            "present": len(identified_ids),
            "absent": len(enrolled_ids) - len(identified_ids),
            "unknown": excess,
            "headcount_ok": headcount_ok,
        }, room=f"professor_{state.professor_id}")

    # ────────────── Alerts ──────────────

    def _check_alerts(self, state: SessionState, result: FrameAnalysisResult, frame):
        """Check if alerts need to be triggered and emit them."""
        if result.unknown_face_count >= self.alert_threshold:
            # Save crops for audit
            crops_paths = []
            for crop in result.unknown_face_crops:
                path = crop_and_save_unknown(crop, self.unknown_save_dir, state.session_id)
                crops_paths.append(path)

            alert_data = {
                "session_id": state.session_id,
                "type": AlertType.UNKNOWN_FACE.value,
                "message": f"{result.unknown_face_count} unknown face(s) detected",
                "timestamp": result.timestamp.isoformat(),
                "snapshot_paths": crops_paths,
            }
            socketio.emit("attendance_alert", alert_data, room=f"professor_{state.professor_id}")
            socketio.emit("attendance_alert", alert_data, room="admin_room")

        if result.unknown_face_count > len(state.enrolled_ids):
            socketio.emit("attendance_alert", {
                "session_id": state.session_id,
                "type": AlertType.EXCESS_PERSON.value,
                "message": "More faces detected than enrolled students!",
                "timestamp": result.timestamp.isoformat(),
            }, room=f"professor_{state.professor_id}")

    # ────────────── Frame Streaming ──────────────

    def _emit_frame(self, course_id: int, frame, result: FrameAnalysisResult):
        """Encode frame as JPEG and emit via SocketIO for live preview."""
        import base64
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
        b64 = base64.b64encode(buffer).decode("utf-8")
        socketio.emit("camera_frame", {
            "course_id": course_id,
            "frame": b64,
            "stats": {
                "faces": result.total_faces_detected,
                "identified": result.identified_count,
                "unknown": result.unknown_face_count,
                "timestamp": result.timestamp.isoformat(),
            },
        }, room="admin_room")

    # ────────────── Helpers ──────────────

    def _log(self, session_id: int, event: str, detail: str = ""):
        try:
            log = SessionLog(session_id=session_id, event=event, detail=detail)
            db.session.add(log)
            db.session.commit()
        except Exception as e:
            logger.error(f"Session log write failed: {e}")

    def get_live_status(self, course_id: int) -> Optional[dict]:
        state = self._sessions.get(course_id)
        if not state:
            return None
        return {
            "session_id": state.session_id,
            "is_active": state.is_active,
            "identified": list(state.identified_ids),
            "unknown_faces": state.unknown_face_count,
            "frames_analysed": state.frame_count,
            "enrolled_count": len(state.enrolled_ids),
        }
