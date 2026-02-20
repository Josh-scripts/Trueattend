import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # Core
    SECRET_KEY = os.environ.get("SECRET_KEY", "trueattend-dev-secret-change-in-prod")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-secret-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, '..', 'trueattend.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CORS
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

    # Face Recognition
    FACE_RECOGNITION_THRESHOLD = float(os.environ.get("FACE_RECOGNITION_THRESHOLD", "0.5"))
    MAX_FACES_PER_STUDENT = int(os.environ.get("MAX_FACES_PER_STUDENT", "10"))
    ATTENDANCE_SESSION_TIMEOUT = int(os.environ.get("ATTENDANCE_SESSION_TIMEOUT", "300"))  # seconds
    KNOWN_FACES_DIR = os.path.join(BASE_DIR, "..", "known_faces")
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "..", "uploads")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB

    # Camera
    CAMERA_STREAM_RESOLUTION = (640, 480)
    FRAME_ANALYSIS_INTERVAL = 2  # seconds between face scans during session

    # Alert
    ALERT_UNKNOWN_FACE_THRESHOLD = 1  # alert after this many unknowns
    LIVENESS_DETECTION_ENABLED = True

    # Mail
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER", "noreply@trueattend.app")


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = False


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "postgresql://user:pass@localhost/trueattend")


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
