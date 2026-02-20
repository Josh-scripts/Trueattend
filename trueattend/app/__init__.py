from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_mail import Mail
import os

db = SQLAlchemy()
jwt = JWTManager()
socketio = SocketIO()
mail = Mail()


def create_app(config_name=None):
    app = Flask(__name__)

    # Load config
    from app.config import config
    app.config.from_object(config[config_name or os.getenv("FLASK_ENV", "development")])

    # Init extensions
    db.init_app(app)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*", async_mode="threading")
    mail.init_app(app)
    CORS(app, origins=app.config["CORS_ORIGINS"])

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.attendance import attendance_bp
    from app.routes.admin import admin_bp
    from app.routes.professor import professor_bp
    from app.routes.student import student_bp
    from app.routes.camera import camera_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(professor_bp, url_prefix="/api/professor")
    app.register_blueprint(student_bp, url_prefix="/api/student")
    app.register_blueprint(camera_bp, url_prefix="/api/camera")

    with app.app_context():
        db.create_all()

    return app
