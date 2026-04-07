"""
RFC 7807 Problem Details for APIs.

Provides standardized error responses across all API endpoints.

Example response:
{
    "type": "https://api.letmelearn.com/errors/validation",
    "title": "Validation Error",
    "status": 422,
    "detail": "Cannot follow yourself"
}
"""

import logging
from flask import jsonify, request
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)

# Base URL for error type URIs
ERROR_BASE_URL = "https://api.letmelearn.com/errors"


# Problem type definitions
PROBLEM_TYPES = {
    # 4xx Client Errors
    "bad_request": {
        "type": f"{ERROR_BASE_URL}/bad-request",
        "title": "Bad Request",
        "status": 400
    },
    "unauthorized": {
        "type": f"{ERROR_BASE_URL}/unauthorized",
        "title": "Unauthorized",
        "status": 401
    },
    "forbidden": {
        "type": f"{ERROR_BASE_URL}/forbidden",
        "title": "Forbidden",
        "status": 403
    },
    "not_found": {
        "type": f"{ERROR_BASE_URL}/not-found",
        "title": "Not Found",
        "status": 404
    },
    "method_not_allowed": {
        "type": f"{ERROR_BASE_URL}/method-not-allowed",
        "title": "Method Not Allowed",
        "status": 405
    },
    "conflict": {
        "type": f"{ERROR_BASE_URL}/conflict",
        "title": "Conflict",
        "status": 409
    },
    "unprocessable_entity": {
        "type": f"{ERROR_BASE_URL}/unprocessable-entity",
        "title": "Unprocessable Entity",
        "status": 422
    },

    # Business Rule Errors
    "self_follow": {
        "type": f"{ERROR_BASE_URL}/self-follow",
        "title": "Cannot Follow Self",
        "status": 422
    },
    "user_not_found": {
        "type": f"{ERROR_BASE_URL}/user-not-found",
        "title": "User Not Found",
        "status": 404
    },
    "session_not_found": {
        "type": f"{ERROR_BASE_URL}/session-not-found",
        "title": "Session Not Found",
        "status": 404
    },
    "invalid_session": {
        "type": f"{ERROR_BASE_URL}/invalid-session",
        "title": "Invalid Session",
        "status": 422
    },
    "duplicate_name": {
        "type": f"{ERROR_BASE_URL}/duplicate-name",
        "title": "Duplicate Name",
        "status": 409
    },

    # 5xx Server Errors
    "internal_error": {
        "type": f"{ERROR_BASE_URL}/internal-error",
        "title": "Internal Server Error",
        "status": 500
    }
}


def problem(problem_type, detail=None, instance=None, **kwargs):
    """
    Create an RFC 7807 Problem Details response.

    Args:
        problem_type: Key from PROBLEM_TYPES or a dict with type, title, status
        detail: Human-readable explanation specific to this occurrence
        instance: URI reference identifying the specific occurrence
        **kwargs: Additional problem-specific fields

    Returns:
        Tuple of (response_dict, status_code)

    Example:
        return problem("self_follow", detail="Users cannot follow themselves")
    """
    # Get problem type definition
    if isinstance(problem_type, str):
        if problem_type not in PROBLEM_TYPES:
            logger.warning(f"Unknown problem type: {problem_type}, using internal_error")
            problem_type = PROBLEM_TYPES["internal_error"]
        else:
            problem_type = PROBLEM_TYPES[problem_type]

    # Build problem details response
    problem = {
        "type": problem_type["type"],
        "title": problem_type["title"],
        "status": problem_type["status"]
    }

    if detail:
        problem["detail"] = detail

    if instance:
        problem["instance"] = instance

    # Add any additional fields
    for key, value in kwargs.items():
        if key not in problem:
            problem[key] = value

    return problem, problem["status"]


def problem_response(problem_type, detail=None, instance=None, **kwargs):
    """
    Create a Flask response for a problem.

    Args:
        problem_type: Key from PROBLEM_TYPES or a dict with type, title, status
        detail: Human-readable explanation specific to this occurrence
        instance: URI reference identifying the specific occurrence
        **kwargs: Additional problem-specific fields

    Returns:
        Flask response object

    Example:
        return problem_response("self_follow", detail="Users cannot follow themselves")
    """
    problem, status = problem(problem_type, detail, instance, **kwargs)
    return jsonify(problem), status


def register_error_handlers(app):
    """
    Register error handlers for Flask application.

    Converts all errors to RFC 7807 Problem Details format.

    Args:
        app: Flask application instance
    """

    @app.errorhandler(400)
    def handle_bad_request(e):
        return problem_response("bad_request", detail=str(e.description) if hasattr(e, 'description') else None)

    @app.errorhandler(401)
    def handle_unauthorized(e):
        return problem_response("unauthorized", detail=str(e.description) if hasattr(e, 'description') else None)

    @app.errorhandler(403)
    def handle_forbidden(e):
        return problem_response("forbidden", detail=str(e.description) if hasattr(e, 'description') else None)

    @app.errorhandler(404)
    def handle_not_found(e):
        return problem_response("not_found", detail=str(e.description) if hasattr(e, 'description') else None)

    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        return problem_response("method_not_allowed", detail=str(e.description) if hasattr(e, 'description') else None)

    @app.errorhandler(409)
    def handle_conflict(e):
        return problem_response("conflict", detail=str(e.description) if hasattr(e, 'description') else None)

    @app.errorhandler(422)
    def handle_unprocessable_entity(e):
        return problem_response("unprocessable_entity", detail=str(e.description) if hasattr(e, 'description') else None)

    @app.errorhandler(500)
    def handle_internal_error(e):
        logger.error(f"Internal server error: {e}")
        return problem_response("internal_error", detail="An unexpected error occurred")

    @app.errorhandler(Exception)
    def handle_exception(e):
        # Check if it's an HTTP exception
        if isinstance(e, HTTPException):
            # Use the appropriate handler based on status code
            handlers = {
                400: handle_bad_request,
                401: handle_unauthorized,
                403: handle_forbidden,
                404: handle_not_found,
                405: handle_method_not_allowed,
                409: handle_conflict,
                422: handle_unprocessable_entity,
                500: handle_internal_error
            }
            handler = handlers.get(e.code, handle_internal_error)
            return handler(e)

        # Log unexpected exceptions
        logger.exception(f"Unexpected error: {e}")
        return problem_response("internal_error", detail="An unexpected error occurred")