from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt


def role_required(*roles):
    """Decorator that restricts access to users with specified roles."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get("role", "")
            if user_role not in roles:
                return jsonify({"error": f"Access denied. Required roles: {', '.join(roles)}"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
