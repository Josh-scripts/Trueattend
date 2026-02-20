import os
from flask import current_app
from app.ml.face_engine import FaceRecognitionEngine

_face_engine = None
_session_manager = None


def get_face_engine() -> FaceRecognitionEngine:
    global _face_engine
    if _face_engine is None:
        db_path = os.path.join(current_app.config["KNOWN_FACES_DIR"], "face_db.pkl")
        liveness = current_app.config.get("LIVENESS_DETECTION_ENABLED", True)
        _face_engine = FaceRecognitionEngine(db_path=db_path, liveness_enabled=liveness)
    return _face_engine


def get_session_manager():
    global _session_manager
    if _session_manager is None:
        from app.ml.session_manager import AttendanceSessionManager
        from app.utils.notifications import NotificationService

        engine = get_face_engine()
        notifier = NotificationService()
        _session_manager = AttendanceSessionManager(
            face_engine=engine,
            notifier=notifier,
            alert_unknown_threshold=current_app.config.get("ALERT_UNKNOWN_FACE_THRESHOLD", 1),
            analysis_interval=current_app.config.get("FRAME_ANALYSIS_INTERVAL", 2.0),
            unknown_save_dir=os.path.join(current_app.config["UPLOAD_FOLDER"], "unknown_faces"),
        )
    return _session_manager


def allowed_file(filename: str) -> bool:
    allowed = {"png", "jpg", "jpeg"}
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed
