"""
Tests for session tracking endpoints.
"""

import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from bson.objectid import ObjectId

BELGIUM_TZ = ZoneInfo("Europe/Brussels")


class TestSessionsPost:
    """Tests for POST /api/sessions endpoint."""

    def test_create_session_returns_session_id(self, auth_client):
        """Creating a session should return session_id."""
        response = auth_client.post('/api/sessions',
            json={"kind": "quiz", "topics": ["topic-1"]}
        )

        assert response.status_code == 201
        data = response.get_json()
        assert 'session_id' in data
        assert data['status'] == 'active'
        assert 'started_at' in data

    def test_create_session_stores_in_database(self, auth_client, db):
        """Creating a session should store it in the database."""
        response = auth_client.post('/api/sessions',
            json={"kind": "quiz", "topics": ["topic-1", "topic-2"]}
        )

        session_id = response.get_json()['session_id']
        session = db.sessions.find_one({"_id": ObjectId(session_id)})

        assert session is not None
        assert session['kind'] == 'quiz'
        assert session['topics'] == ['topic-1', 'topic-2']
        assert session['status'] == 'active'

    def test_create_training_session(self, auth_client, db):
        """Creating a training session should work."""
        response = auth_client.post('/api/sessions',
            json={"kind": "training", "topics": ["topic-1"]}
        )

        session_id = response.get_json()['session_id']
        session = db.sessions.find_one({"_id": ObjectId(session_id)})

        assert session['kind'] == 'training'

    def test_concurrent_session_auto_stops_previous(self, auth_client, db):
        """Starting a new session should auto-stop the previous one."""
        # Create first session
        response1 = auth_client.post('/api/sessions',
            json={"kind": "quiz", "topics": ["topic-1"]}
        )
        session1_id = response1.get_json()['session_id']

        # Create second session
        response2 = auth_client.post('/api/sessions',
            json={"kind": "quiz", "topics": ["topic-2"]}
        )

        # First session should be abandoned
        session1 = db.sessions.find_one({"_id": ObjectId(session1_id)})
        assert session1['status'] == 'abandoned'
        assert session1['stopped_at'] is not None
        assert session1['elapsed'] is not None

    def test_unauthenticated_request_rejected(self, client):
        """Unauthenticated requests should be rejected."""
        response = client.post('/api/sessions',
            json={"kind": "quiz", "topics": ["topic-1"]}
        )

        assert response.status_code == 401


class TestSessionPatch:
    """Tests for PATCH /api/sessions/<session_id> endpoint."""

    def test_stop_session_computes_elapsed_time(self, auth_client):
        """Stopping a session should compute elapsed time."""
        # Create session
        create_response = auth_client.post('/api/sessions',
            json={"kind": "quiz", "topics": ["topic-1"]}
        )
        session_id = create_response.get_json()['session_id']

        # Stop session
        stop_response = auth_client.patch(f'/api/sessions/{session_id}',
            json={"status": "completed", "questions": 10, "asked": 10, "attempts": 12, "correct": 8}
        )

        assert stop_response.status_code == 200
        data = stop_response.get_json()
        assert 'elapsed' in data
        assert data['status'] == 'completed'

    def test_stop_session_updates_database(self, auth_client, db):
        """Stopping a session should update the database."""
        # Create and stop session
        create_response = auth_client.post('/api/sessions',
            json={"kind": "quiz", "topics": ["topic-1"]}
        )
        session_id = create_response.get_json()['session_id']

        auth_client.patch(f'/api/sessions/{session_id}',
            json={"status": "completed", "questions": 10, "asked": 10, "attempts": 12, "correct": 8}
        )

        session = db.sessions.find_one({"_id": ObjectId(session_id)})
        assert session['status'] == 'completed'
        assert session['questions'] == 10
        assert session['asked'] == 10
        assert session['attempts'] == 12
        assert session['correct'] == 8

    def test_stop_nonexistent_session_returns_404(self, auth_client):
        """Stopping a non-existent session should return 404."""
        # Use a valid ObjectId that doesn't exist in the database
        response = auth_client.patch('/api/sessions/507f1f77bcf86cd799439011',
            json={"status": "completed"}
        )

        assert response.status_code == 404

    def test_stop_already_completed_session_is_idempotent(self, auth_client, db):
        """Stopping an already stopped session should be idempotent."""
        # Create and stop session
        create_response = auth_client.post('/api/sessions',
            json={"kind": "quiz", "topics": ["topic-1"]}
        )
        session_id = create_response.get_json()['session_id']

        # Stop once
        stop_response1 = auth_client.patch(f'/api/sessions/{session_id}',
            json={"status": "completed", "questions": 10}
        )

        # Stop again
        stop_response2 = auth_client.patch(f'/api/sessions/{session_id}',
            json={"status": "completed", "questions": 10}
        )

        # Both should succeed
        assert stop_response1.status_code == 200
        assert stop_response2.status_code == 200


class TestSessionCurrent:
    """Tests for GET /api/sessions/current endpoint."""

    def test_get_current_session_returns_active(self, auth_client):
        """Getting current session should return active session."""
        # Create session
        auth_client.post('/api/sessions',
            json={"kind": "quiz", "topics": ["topic-1"]}
        )

        # Get current
        current_response = auth_client.get('/api/sessions/current')

        assert current_response.status_code == 200
        data = current_response.get_json()
        assert data is not None
        assert data['status'] == 'active'

    def test_get_current_session_returns_null_when_none(self, auth_client):
        """Getting current session should return null when no active session."""
        # No session created
        response = auth_client.get('/api/sessions/current')

        # Should return null/None
        assert response.status_code == 200
        data = response.get_json()
        assert data is None

    def test_get_current_after_stop_returns_null(self, auth_client):
        """After stopping a session, current should return null."""
        # Create and stop session
        create_response = auth_client.post('/api/sessions',
            json={"kind": "quiz", "topics": ["topic-1"]}
        )
        session_id = create_response.get_json()['session_id']

        auth_client.patch(f'/api/sessions/{session_id}',
            json={"status": "completed"}
        )

        # Get current
        current_response = auth_client.get('/api/sessions/current')

        assert current_response.get_json() is None