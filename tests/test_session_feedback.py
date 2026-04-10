"""
Tests for the SessionFeedback API endpoint.

These tests verify the GET /api/sessions/{id}/feedback endpoint which provides
a processed summary of a completed session for the feedback page.
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from bson.objectid import ObjectId

from letmelearn.data import db, reset_db


class TestSessionFeedback:
  """Tests for the SessionFeedback endpoint."""

  def create_session(self, user_email, correct=10, attempts=10, elapsed=300,
                      status="completed", session_id=None):
    """Helper to create a test session."""
    if session_id is None:
      session_id = str(ObjectId())
    session = {
      "_id": ObjectId(session_id),
      "user": user_email,
      "kind": "quiz",
      "status": status,
      "correct": correct,
      "attempts": attempts,
      "elapsed": elapsed,
      "started_at": datetime.now(timezone.utc)
    }
    db.sessions.insert_one(session)
    return session_id

  def test_feedback_for_completed_session(self, client, test_user):
    """Test feedback endpoint returns correct stats for a completed session."""
    # Create a completed session
    session_id = self.create_session(
      test_user["_id"],
      correct=8,
      attempts=10,
      elapsed=120  # 2 minutes
    )

    # Login
    client.post("/api/session", json={"email": test_user["_id"]})

    # Get feedback
    response = client.get(f"/api/sessions/{session_id}/feedback")

    assert response.status_code == 200
    data = response.json

    # Verify session stats
    assert data["session"]["accuracy"] == 80.0  # 8/10 * 100
    assert data["session"]["correct"] == 8
    assert data["session"]["attempts"] == 10
    assert data["session"]["elapsed"] == 120
    assert data["session"]["avg_time"] == 12.0  # 120/10

    # Verify structure
    assert "comparisons" in data
    assert "streak" in data
    assert "message" in data

  def test_feedback_for_zero_attempts(self, client, test_user):
    """Test feedback handles session with zero attempts gracefully."""
    session_id = self.create_session(
      test_user["_id"],
      correct=0,
      attempts=0,
      elapsed=0
    )

    client.post("/api/session", json={"email": test_user["_id"]})
    response = client.get(f"/api/sessions/{session_id}/feedback")

    assert response.status_code == 200
    data = response.json

    # Should not crash, accuracy should be 0
    assert data["session"]["accuracy"] == 0.0
    assert data["session"]["avg_time"] == 0.0
    assert data["session"]["attempts"] == 0

  def test_feedback_for_nonexistent_session(self, client, test_user):
    """Test feedback returns 404 for non-existent session."""
    client.post("/api/session", json={"email": test_user["_id"]})
    # Use a valid ObjectId format that doesn't exist
    response = client.get(f"/api/sessions/{str(ObjectId())}/feedback")

    assert response.status_code == 404

  def test_feedback_for_unauthorized_user(self, client, test_user, db):
    """Test feedback returns 403 if session belongs to another user."""
    # Create another user
    other_email = "other@example.com"
    db.users.replace_one({"_id": other_email}, {"_id": other_email, "name": "Other User"}, upsert=True)

    # Create session owned by other user
    session_id = self.create_session(other_email)

    # Login as test_user
    client.post("/api/session", json={"email": test_user["_id"]})

    # Try to access other user's session
    response = client.get(f"/api/sessions/{session_id}/feedback")

    assert response.status_code == 403

  def test_feedback_personal_best_detection(self, client, test_user):
    """Test that personal best is detected correctly."""
    # Create previous session with 70% accuracy
    prev_id = str(ObjectId())
    self.create_session(
      test_user["_id"],
      correct=7,
      attempts=10,
      elapsed=100,
      session_id=prev_id
    )

    # Create current session with 90% accuracy (better than 70%)
    curr_id = str(ObjectId())
    session_id = self.create_session(
      test_user["_id"],
      correct=9,
      attempts=10,
      elapsed=100,
      session_id=curr_id
    )

    client.post("/api/session", json={"email": test_user["_id"]})
    response = client.get(f"/api/sessions/{session_id}/feedback")

    assert response.status_code == 200
    data = response.json

    # Should be personal best (90% > 70%)
    # Note: This is a simplified test - the actual PB logic checks sessions >= 5 attempts
    assert data["comparisons"]["is_personal_best"] == True

  def test_feedback_streak_information(self, client, test_user):
    """Test that streak information is included in feedback."""
    session_id = self.create_session(test_user["_id"])

    client.post("/api/session", json={"email": test_user["_id"]})
    response = client.get(f"/api/sessions/{session_id}/feedback")

    assert response.status_code == 200
    data = response.json

    # Verify streak structure
    assert "current" in data["streak"]
    assert "today_minutes" in data["streak"]
    assert "needs_more_time" in data["streak"]
    assert "minutes_remaining" in data["streak"]

    # Verify types
    assert isinstance(data["streak"]["current"], int)
    assert isinstance(data["streak"]["today_minutes"], int)
    assert isinstance(data["streak"]["needs_more_time"], bool)
    assert isinstance(data["streak"]["minutes_remaining"], int)

  def test_feedback_message_variations(self, client, test_user):
    """Test that motivational messages vary based on performance."""
    # Create a session with good accuracy improvement potential
    session_id = self.create_session(
      test_user["_id"],
      correct=9,
      attempts=10,
      elapsed=60  # Fast
    )

    client.post("/api/session", json={"email": test_user["_id"]})
    response = client.get(f"/api/sessions/{session_id}/feedback")

    assert response.status_code == 200
    data = response.json

    # Should have a message
    assert isinstance(data["message"], str)
    assert len(data["message"]) > 0

  def test_feedback_unauthenticated(self, client):
    """Test feedback requires authentication."""
    session_id = "any-session-id"
    response = client.get(f"/api/sessions/{session_id}/feedback")
    assert response.status_code == 401

  def test_feedback_includes_asked_field(self, client, test_user):
    """Test that 'asked' field is included for UI compatibility."""
    session_id = self.create_session(
      test_user["_id"],
      correct=5,
      attempts=5,
      elapsed=50
    )

    client.post("/api/session", json={"email": test_user["_id"]})
    response = client.get(f"/api/sessions/{session_id}/feedback")

    assert response.status_code == 200
    data = response.json

    # 'asked' should be present and equal to attempts
    assert "asked" in data["session"]
    assert data["session"]["asked"] == data["session"]["attempts"]


class TestPersonalBestAccuracy:
  """Tests for the get_personal_best_accuracy helper."""

  def test_personal_best_no_sessions(self):
    """Test personal best returns 0 when no sessions exist."""
    from letmelearn.api.stats import get_personal_best_accuracy

    result = get_personal_best_accuracy("new@example.com")
    assert result == 0.0

  def test_personal_best_with_sessions(self):
    """Test personal best finds highest accuracy among qualifying sessions."""
    from letmelearn.api.stats import get_personal_best_accuracy

    user_email = "test@example.com"

    # Create sessions with different accuracies (all >= 5 questions asked)
    sessions = [
      {"_id": "s1", "user": user_email, "kind": "quiz", "status": "completed",
       "correct": 7, "attempts": 10, "asked": 10, "elapsed": 100, "started_at": datetime.now(timezone.utc)},
      {"_id": "s2", "user": user_email, "kind": "quiz", "status": "completed",
       "correct": 9, "attempts": 10, "asked": 10, "elapsed": 100, "started_at": datetime.now(timezone.utc)},
      {"_id": "s3", "user": user_email, "kind": "quiz", "status": "completed",
       "correct": 8, "attempts": 10, "asked": 10, "elapsed": 100, "started_at": datetime.now(timezone.utc)},
    ]
    for s in sessions:
      db.sessions.insert_one(s)

    result = get_personal_best_accuracy(user_email)
    # 90% is the highest (9/10)
    assert result == 90.0

  def test_personal_best_ignores_small_sessions(self):
    """Test personal best ignores sessions with < 5 questions asked."""
    from letmelearn.api.stats import get_personal_best_accuracy

    user_email = "test@example.com"

    # Create session with 100% accuracy but only 1 question asked (should be ignored)
    db.sessions.insert_one({
      "_id": "s1", "user": user_email, "kind": "quiz", "status": "completed",
      "correct": 1, "attempts": 1, "asked": 1, "elapsed": 10, "started_at": datetime.now(timezone.utc)
    })

    # Create session with 80% accuracy and 10 questions asked (should be counted)
    db.sessions.insert_one({
      "_id": "s2", "user": user_email, "kind": "quiz", "status": "completed",
      "correct": 8, "attempts": 10, "asked": 10, "elapsed": 100, "started_at": datetime.now(timezone.utc)
    })

    result = get_personal_best_accuracy(user_email)
    # Should return 80%, not count the 100% from 1-question session
    assert result == 80.0