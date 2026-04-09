"""
RFC 7807 Problem Details for APIs.

Provides standardized error responses across all API endpoints.

Example response:
{
    "type": "/errors#bad-request",
    "title": "Bad Request",
    "status": 400,
    "detail": "Cannot follow yourself"
}
"""

import logging
from flask import jsonify
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)

# Base URL for error type URIs (fragment-based for in-page documentation)
ERROR_BASE_URL = "/errors"


# Problem type definitions
PROBLEM_TYPES = {
    # 4xx Client Errors
    "bad_request": {
        "type": f"{ERROR_BASE_URL}#bad-request",
        "title": "Bad Request",
        "status": 400,
        "description": "The request could not be understood by the server due to malformed syntax."
    },
    "unauthorized": {
        "type": f"{ERROR_BASE_URL}#unauthorized",
        "title": "Unauthorized",
        "status": 401,
        "description": "Authentication is required to access this resource."
    },
    "forbidden": {
        "type": f"{ERROR_BASE_URL}#forbidden",
        "title": "Forbidden",
        "status": 403,
        "description": "You do not have permission to access this resource."
    },
    "not_found": {
        "type": f"{ERROR_BASE_URL}#not-found",
        "title": "Not Found",
        "status": 404,
        "description": "The requested resource could not be found."
    },
    "method_not_allowed": {
        "type": f"{ERROR_BASE_URL}#method-not-allowed",
        "title": "Method Not Allowed",
        "status": 405,
        "description": "The HTTP method is not allowed for this resource."
    },
    "conflict": {
        "type": f"{ERROR_BASE_URL}#conflict",
        "title": "Conflict",
        "status": 409,
        "description": "The request conflicts with the current state of the resource."
    },
    "unprocessable_entity": {
        "type": f"{ERROR_BASE_URL}#unprocessable-entity",
        "title": "Unprocessable Entity",
        "status": 422,
        "description": "The request was well-formed but could not be processed due to semantic errors."
    },
    "rate_limited": {
        "type": f"{ERROR_BASE_URL}#rate-limited",
        "title": "Too Many Requests",
        "status": 429,
        "description": "You have exceeded the rate limit. Please try again later."
    },

    # Business Rule Errors
    "self_follow": {
        "type": f"{ERROR_BASE_URL}#self-follow",
        "title": "Cannot Follow Self",
        "status": 422,
        "description": "You cannot follow yourself. This operation is not allowed."
    },
    "user_not_found": {
        "type": f"{ERROR_BASE_URL}#user-not-found",
        "title": "User Not Found",
        "status": 404,
        "description": "The specified user could not be found in the system."
    },
    "session_not_found": {
        "type": f"{ERROR_BASE_URL}#session-not-found",
        "title": "Session Not Found",
        "status": 404,
        "description": "The specified session could not be found or does not belong to you."
    },
    "invalid_session": {
        "type": f"{ERROR_BASE_URL}#invalid-session",
        "title": "Invalid Session",
        "status": 422,
        "description": "The session ID format is invalid."
    },
    "duplicate_name": {
        "type": f"{ERROR_BASE_URL}#duplicate-name",
        "title": "Duplicate Name",
        "status": 409,
        "description": "A resource with this name already exists. Please choose a different name."
    },

    # 5xx Server Errors
    "internal_error": {
        "type": f"{ERROR_BASE_URL}#internal-error",
        "title": "Internal Server Error",
        "status": 500,
        "description": "An unexpected error occurred on the server. Please try again later."
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
        Tuple of (problem_dict, status_code) for use in Flask-RESTful resources

    Example:
        return problem_response("self_follow", detail="Users cannot follow themselves")
    """
    return problem(problem_type, detail, instance, **kwargs)


def register_error_handlers(app):
    """
    Register error handlers for Flask application.

    Converts all errors to RFC 7807 Problem Details format.

    Args:
        app: Flask application instance
    """

    @app.errorhandler(400)
    def handle_bad_request(e):
        problem_data, status = problem("bad_request", detail=str(e.description) if hasattr(e, 'description') else None)
        return jsonify(problem_data), status

    @app.errorhandler(401)
    def handle_unauthorized(e):
        problem_data, status = problem("unauthorized", detail=str(e.description) if hasattr(e, 'description') else None)
        return jsonify(problem_data), status

    @app.errorhandler(403)
    def handle_forbidden(e):
        problem_data, status = problem("forbidden", detail=str(e.description) if hasattr(e, 'description') else None)
        return jsonify(problem_data), status

    @app.errorhandler(404)
    def handle_not_found(e):
        problem_data, status = problem("not_found", detail=str(e.description) if hasattr(e, 'description') else None)
        return jsonify(problem_data), status

    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        problem_data, status = problem("method_not_allowed", detail=str(e.description) if hasattr(e, 'description') else None)
        return jsonify(problem_data), status

    @app.errorhandler(409)
    def handle_conflict(e):
        problem_data, status = problem("conflict", detail=str(e.description) if hasattr(e, 'description') else None)
        return jsonify(problem_data), status

    @app.errorhandler(422)
    def handle_unprocessable_entity(e):
        problem_data, status = problem("unprocessable_entity", detail=str(e.description) if hasattr(e, 'description') else None)
        return jsonify(problem_data), status

    @app.errorhandler(429)
    def handle_rate_limited(e):
        problem_data, status = problem("rate_limited", detail=str(e.description) if hasattr(e, 'description') else None)
        return jsonify(problem_data), status

    @app.errorhandler(500)
    def handle_internal_error(e):
        logger.error(f"Internal server error: {e}")
        problem_data, status = problem("internal_error", detail="An unexpected error occurred")
        return jsonify(problem_data), status

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
                429: handle_rate_limited,
                500: handle_internal_error
            }
            handler = handlers.get(e.code, handle_internal_error)
            return handler(e)

        # Log unexpected exceptions
        logger.exception(f"Unexpected error: {e}")
        problem_data, status = problem("internal_error", detail="An unexpected error occurred")
        return jsonify(problem_data), status

    logger.info("✅ errors handlers registered")
