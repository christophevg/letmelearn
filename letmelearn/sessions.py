"""
Session tracking for quiz and training activities.

Provides RESTful endpoints for:
- POST /api/sessions - Create (start) a new session
- PATCH /api/sessions/<session_id> - Update (stop) a session
- GET /api/sessions/current - Get current active session
"""

import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from flask import abort
from flask_restful import Resource
from flask_login import current_user
from bson.objectid import ObjectId

from letmelearn.web import server
from letmelearn.data import db
from letmelearn.auth import authenticated

logger = logging.getLogger(__name__)

BELGIUM_TZ = ZoneInfo("Europe/Brussels")


class Sessions(Resource):
    """Create and manage quiz/training sessions."""

    @authenticated
    def post(self):
        """
        Create a new session (start a quiz/training).

        If user has an active session, it is auto-stopped and marked as abandoned.

        Request body:
            {
                "kind": "quiz" | "training",
                "topics": ["topic-id-1", ...]
            }

        Returns:
            {
                "session_id": "...",
                "started_at": "2026-04-06T14:00:00Z",
                "status": "active"
            }
        """
        kind = server.request.json.get("kind", "quiz")
        topics = server.request.json.get("topics", [])
        user_email = current_user.identity.email

        # Check for active session and auto-stop it
        active = db.sessions.find_one({
            "user": user_email,
            "status": "active"
        })

        if active:
            now = datetime.utcnow()
            elapsed = int((now - active["started_at"]).total_seconds())
            db.sessions.update_one(
                {"_id": active["_id"]},
                {"$set": {
                    "status": "abandoned",
                    "stopped_at": now,
                    "elapsed": elapsed
                }}
            )
            logger.info(f"Auto-stopped previous session {active['_id']} for {user_email}")

        # Create new session
        now = datetime.utcnow()
        result = db.sessions.insert_one({
            "user": user_email,
            "kind": kind,
            "topics": topics,
            "status": "active",
            "started_at": now,
            "stopped_at": None,
            "elapsed": None,
            "questions": None,
            "asked": None,
            "attempts": None,
            "correct": None
        })

        session_id = str(result.inserted_id)
        logger.info(f"Created session {session_id} for {user_email} (kind={kind})")

        return {
            "session_id": session_id,
            "started_at": now.isoformat() + "Z",
            "status": "active"
        }, 201


class SessionResource(Resource):
    """Update or retrieve a specific session."""

    @authenticated
    def patch(self, session_id):
        """
        Update a session (stop and record results).

        Request body:
            {
                "status": "completed" | "abandoned",
                "questions": 10,
                "asked": 10,
                "attempts": 12,
                "correct": 8
            }

        Returns:
            {
                "session_id": "...",
                "elapsed": 300,
                "status": "completed"
            }
        """
        user_email = current_user.identity.email

        # Validate session exists and belongs to user
        try:
            oid = ObjectId(session_id)
        except Exception:
            abort(422, "Invalid session ID")

        session = db.sessions.find_one({
            "_id": oid,
            "user": user_email
        })

        if not session:
            abort(404, "Session not found")

        if session["status"] != "active":
            # Idempotent: return existing result if already stopped
            return {
                "session_id": session_id,
                "elapsed": session.get("elapsed", 0),
                "status": session["status"]
            }, 200

        # Compute elapsed time
        now = datetime.utcnow()
        elapsed = int((now - session["started_at"]).total_seconds())

        # Get update data
        data = server.request.json
        new_status = data.get("status", "completed")

        # Update session
        update_data = {
            "status": new_status,
            "stopped_at": now,
            "elapsed": elapsed
        }

        # Add optional quiz metrics
        if "questions" in data:
            update_data["questions"] = data["questions"]
        if "asked" in data:
            update_data["asked"] = data["asked"]
        if "attempts" in data:
            update_data["attempts"] = data["attempts"]
        if "correct" in data:
            update_data["correct"] = data["correct"]

        db.sessions.update_one(
            {"_id": oid},
            {"$set": update_data}
        )

        logger.info(f"Stopped session {session_id} for {user_email} (elapsed={elapsed}s, status={new_status})")

        return {
            "session_id": session_id,
            "elapsed": elapsed,
            "status": new_status
        }, 200


class SessionCurrent(Resource):
    """Get the current active session for the user."""

    @authenticated
    def get(self):
        """
        Get current active session.

        Returns:
            {
                "_id": "...",
                "kind": "quiz",
                "topics": [...],
                "status": "active",
                "started_at": "2026-04-06T14:00:00Z"
            }
        or null if no active session.
        """
        user_email = current_user.identity.email

        session = db.sessions.find_one({
            "user": user_email,
            "status": "active"
        }, {
            "_id": 1,
            "kind": 1,
            "topics": 1,
            "status": 1,
            "started_at": 1
        })

        if session:
            session["_id"] = str(session["_id"])
            session["started_at"] = session["started_at"].isoformat() + "Z"

        return session


# Register endpoints
server.api.add_resource(Sessions, "/api/sessions", endpoint="api-sessions")
server.api.add_resource(SessionResource, "/api/sessions/<session_id>", endpoint="api-session")
server.api.add_resource(SessionCurrent, "/api/sessions/current", endpoint="api-sessions-current")