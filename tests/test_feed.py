"""
Tests for feed endpoints.

Tests activity feed with mode parameter (my, following, all).
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from bson.objectid import ObjectId
from conftest import assert_rfc7807_error

BELGIUM_TZ = ZoneInfo("Europe/Brussels")


class TestFeedGet:
  """Tests for GET /api/feed - Get activity feed."""

  def test_get_my_feed_empty_for_new_user(self, auth_client):
    """New user should have empty feed."""
    response = auth_client.get('/api/feed')

    assert response.status_code == 200
    assert response.get_json() == []

  def test_get_my_feed_returns_sessions(self, auth_client, db, test_user):
    """My feed should include my sessions."""
    # Create a completed session
    now = datetime.utcnow()
    db.sessions.insert_one({
      "_id": str(ObjectId()),
      "user": test_user["_id"],
      "kind": "quiz",
      "status": "completed",
      "started_at": now - timedelta(minutes=10),
      "stopped_at": now,
      "elapsed": 600,
      "topics": [],
      "questions": 10,
      "asked": 10,
      "attempts": 12,
      "correct": 8
    })

    response = auth_client.get('/api/feed')

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["kind"] == "quiz result"

  def test_get_my_feed_includes_new_topic_events(self, auth_client, db, test_user):
    """My feed should include 'new topic' events."""
    # Create topic
    db.topics.insert_one({
      "_id": "new-topic",
      "user": test_user["_id"],
      "name": "New Topic",
      "question": {},
      "items": []
    })
    # Create feed item
    db.feed.insert_one({
      "kind": "new topic",
      "user": [test_user["_id"]],
      "when": datetime.utcnow().isoformat(),
      "topic": "new-topic"
    })

    response = auth_client.get('/api/feed')

    assert response.status_code == 200
    data = response.get_json()
    # Should have at least the feed item
    topic_events = [item for item in data if item.get("kind") == "new topic"]
    assert len(topic_events) >= 1

  def test_get_following_feed_returns_followed_users(self, auth_client, db, test_user):
    """Following feed should include followed users' activity."""
    # Create followed user
    db.users.insert_one({
      "_id": "followed@example.com",
      "name": "Followed User",
      "picture": None
    })
    db.follows.insert_one({
      "follower": test_user["_id"],
      "following": "followed@example.com",
      "created_at": datetime.utcnow()
    })
    # Create session for followed user
    now = datetime.utcnow()
    db.sessions.insert_one({
      "_id": str(ObjectId()),
      "user": "followed@example.com",
      "kind": "quiz",
      "status": "completed",
      "started_at": now - timedelta(minutes=5),
      "stopped_at": now,
      "elapsed": 300,
      "topics": []
    })

    response = auth_client.get('/api/feed?mode=following')

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["user"][0]["email"] == "followed@example.com"

  def test_get_following_feed_empty_when_no_follows(self, auth_client):
    """Following feed should be empty when not following anyone."""
    response = auth_client.get('/api/feed?mode=following')

    assert response.status_code == 200
    assert response.get_json() == []

  def test_get_all_feed_combines_my_and_following(self, auth_client, db, test_user):
    """All mode should combine user and followed users."""
    # Create followed user
    db.users.insert_one({
      "_id": "followed2@example.com",
      "name": "Followed 2",
      "picture": None
    })
    db.follows.insert_one({
      "follower": test_user["_id"],
      "following": "followed2@example.com",
      "created_at": datetime.utcnow()
    })
    # Create session for both users
    now = datetime.utcnow()
    db.sessions.insert_one({
      "_id": str(ObjectId()),
      "user": test_user["_id"],
      "kind": "quiz",
      "status": "completed",
      "started_at": now - timedelta(minutes=5),
      "stopped_at": now,
      "elapsed": 300,
      "topics": []
    })
    db.sessions.insert_one({
      "_id": str(ObjectId()),
      "user": "followed2@example.com",
      "kind": "quiz",
      "status": "completed",
      "started_at": now - timedelta(minutes=3),
      "stopped_at": now,
      "elapsed": 180,
      "topics": []
    })

    response = auth_client.get('/api/feed?mode=all')

    assert response.status_code == 200
    data = response.get_json()
    # Should have 2 items (one from each user)
    assert len(data) == 2

  def test_feed_sorted_by_when_descending(self, auth_client, db, test_user):
    """Feed should be sorted by when field descending."""
    # Create multiple sessions
    now = datetime.utcnow()
    for i in range(3):
      db.sessions.insert_one({
        "_id": str(ObjectId()),
        "user": test_user["_id"],
        "kind": "quiz",
        "status": "completed",
        "started_at": now - timedelta(minutes=(i+1)*5),
        "stopped_at": now - timedelta(minutes=i*5),
        "elapsed": 300,
        "topics": []
      })

    response = auth_client.get('/api/feed')

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 3
    # Check ordering (most recent first)
    if len(data) >= 2:
      # Items should be in descending order by when
      assert data[0]["when"] >= data[1]["when"]

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.get('/api/feed')

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)


class TestFeedPost:
  """Tests for POST /api/feed - Create feed item."""

  def test_create_new_topic_feed_item(self, auth_client, db, test_user):
    """Create 'new topic' event should work."""
    # Create topic first
    db.topics.insert_one({
      "_id": "feed-topic",
      "user": test_user["_id"],
      "name": "Feed Topic",
      "question": {},
      "items": []
    })

    response = auth_client.post('/api/feed', json={
      "kind": "new topic",
      "topic": "feed-topic",
      "topics": ["feed-topic"]
    })

    assert response.status_code == 200
    data = response.get_json()
    assert data["kind"] == "new topic"
    # User info should be populated
    assert "user" in data
    assert len(data["user"]) == 1
    assert data["user"][0]["email"] == test_user["_id"]

  def test_create_feed_item_includes_user(self, auth_client, db, test_user):
    """Feed item should include user info."""
    response = auth_client.post('/api/feed', json={
      "kind": "new topic",
      "topics": []
    })

    assert response.status_code == 200
    data = response.get_json()
    assert "user" in data
    assert data["user"][0]["email"] == test_user["_id"]
    assert data["user"][0]["name"] == test_user["name"]

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.post('/api/feed', json={"kind": "test"})

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)