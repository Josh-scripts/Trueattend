from app import create_app, socketio
import os

app = create_app(os.getenv("FLASK_ENV", "development"))

if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=app.config.get("DEBUG", False),
        use_reloader=False,   # disable reloader when using background threads
    )
