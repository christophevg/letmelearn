"""
Tests for topics endpoints.

Tests topic CRUD operations and item management.
"""

import pytest
from bson.objectid import ObjectId
from conftest import assert_rfc7807_error


class TestTopicsGet:
  """Tests for GET /api/topics - List topics."""

  def test_list_topics_empty_for_new_user(self, auth_client):
    """New user should have empty topic list."""
    response = auth_client.get('/api/topics')

    assert response.status_code == 200
    assert response.get_json() == []

  def test_list_topics_returns_user_topics(self, auth_client, db, test_user):
    """Should return only user's topics."""
    # Create topics for user
    db.topics.insert_one({
      "_id": "topic1",
      "user": test_user["_id"],
      "name": "Topic One",
      "question": {"type": "basic", "text": "Question?"},
      "items": []
    })
    db.topics.insert_one({
      "_id": "topic2",
      "user": test_user["_id"],
      "name": "Topic Two",
      "question": {"type": "basic", "text": "Question 2?"},
      "items": []
    })
    # Create topic for another user
    db.topics.insert_one({
      "_id": "other-topic",
      "user": "other@example.com",
      "name": "Other Topic",
      "question": {"type": "basic"},
      "items": []
    })

    response = auth_client.get('/api/topics')

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 2

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.get('/api/topics')

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)


class TestTopicsPost:
  """Tests for POST /api/topics - Create topic."""

  def test_create_topic_returns_topic(self, auth_client, db, test_user):
    """Create topic should return created topic."""
    response = auth_client.post('/api/topics', json={
      "name": "New Topic",
      "question": {"type": "basic", "text": "What is?"},
      "items": [{"q": "Q1", "a": "A1"}]
    })

    assert response.status_code == 200
    data = response.get_json()
    assert data["name"] == "New Topic"
    assert data["_id"] == "new-topic"  # idfy converts to lowercase with dashes

    # Verify in DB
    topic = db.topics.find_one({"_id": "new-topic"})
    assert topic is not None
    assert topic["user"] == test_user["_id"]

  def test_create_topic_with_items(self, auth_client, db):
    """Create topic with items should store items."""
    response = auth_client.post('/api/topics', json={
      "name": "Topic With Items",
      "question": {"type": "basic"},
      "items": [
        {"q": "Question 1", "a": "Answer 1"},
        {"q": "Question 2", "a": "Answer 2"}
      ]
    })

    assert response.status_code == 200
    topic = db.topics.find_one({"_id": "topic-with-items"})
    assert len(topic["items"]) == 2

  def test_create_duplicate_topic_returns_409(self, auth_client, db, test_user):
    """Creating topic with duplicate name should return 409."""
    # Create topic first
    db.topics.insert_one({
      "_id": "existing-topic",
      "user": test_user["_id"],
      "name": "Existing Topic",
      "question": {},
      "items": []
    })

    # Try to create again
    response = auth_client.post('/api/topics', json={
      "name": "Existing Topic",
      "question": {"type": "basic"}
    })

    assert response.status_code == 409
    assert_rfc7807_error(response, 'duplicate', 409)

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.post('/api/topics', json={
      "name": "Test",
      "question": {}
    })

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)


class TestTopicGet:
  """Tests for GET /api/topics/<id> - Get single topic."""

  def test_get_topic_returns_topic(self, auth_client, db, test_user):
    """Get topic should return topic details."""
    db.topics.insert_one({
      "_id": "test-topic",
      "user": test_user["_id"],
      "name": "Test Topic",
      "question": {"type": "basic"},
      "items": [{"q": "Q", "a": "A"}]
    })

    response = auth_client.get('/api/topics/test-topic')

    assert response.status_code == 200
    data = response.get_json()
    assert data["name"] == "Test Topic"

  def test_get_nonexistent_topic_returns_none(self, auth_client):
    """Non-existent topic should return None."""
    response = auth_client.get('/api/topics/nonexistent')

    assert response.status_code == 200
    assert response.get_json() is None

  def test_get_other_user_topic_returns_none(self, auth_client, db):
    """Cannot access another user's topic."""
    db.topics.insert_one({
      "_id": "other-topic",
      "user": "other@example.com",
      "name": "Other Topic",
      "question": {},
      "items": []
    })

    response = auth_client.get('/api/topics/other-topic')

    assert response.status_code == 200
    assert response.get_json() is None

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.get('/api/topics/test')

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)


class TestTopicPatch:
  """Tests for PATCH /api/topics/<id> - Update topic."""

  def test_update_topic_name(self, auth_client, db, test_user):
    """Update topic name should work."""
    db.topics.insert_one({
      "_id": "update-topic",
      "user": test_user["_id"],
      "name": "Old Name",
      "question": {},
      "items": []
    })

    response = auth_client.patch('/api/topics/update-topic', json={
      "name": "New Name"
    })

    assert response.status_code == 200
    data = response.get_json()
    assert data["topic"]["name"] == "New Name"

  def test_update_other_user_topic_fails_silently(self, auth_client, db):
    """Cannot update another user's topic."""
    db.topics.insert_one({
      "_id": "other-user-topic",
      "user": "other@example.com",
      "name": "Other",
      "question": {},
      "items": []
    })

    response = auth_client.patch('/api/topics/other-user-topic', json={
      "name": "Hacked"
    })

    # Returns None (topic not found for this user)
    assert response.status_code == 200
    assert response.get_json()["topic"] is None

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.patch('/api/topics/test', json={"name": "New"})

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)


class TestTopicDelete:
  """Tests for DELETE /api/topics/<id> - Delete topic."""

  def test_delete_topic_removes_from_db(self, auth_client, db, test_user):
    """Delete topic should remove from database."""
    db.topics.insert_one({
      "_id": "delete-me",
      "user": test_user["_id"],
      "name": "Delete Me",
      "question": {},
      "items": []
    })

    response = auth_client.delete('/api/topics/delete-me')

    assert response.status_code == 200
    # Verify deleted
    assert db.topics.find_one({"_id": "delete-me"}) is None

  def test_delete_nonexistent_topic_succeeds(self, auth_client):
    """Deleting non-existent topic should succeed (idempotent)."""
    response = auth_client.delete('/api/topics/nonexistent')

    assert response.status_code == 200

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.delete('/api/topics/test')

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)


class TestItems:
  """Tests for /api/topics/<id>/items - Item management."""

  def test_add_item_to_topic(self, auth_client, db, test_user):
    """Add item to topic should work."""
    db.topics.insert_one({
      "_id": "item-topic",
      "user": test_user["_id"],
      "name": "Item Topic",
      "question": {},
      "items": []
    })

    response = auth_client.post('/api/topics/item-topic/items', json={
      "q": "New Question",
      "a": "New Answer"
    })

    assert response.status_code == 200
    topic = db.topics.find_one({"_id": "item-topic"})
    assert len(topic["items"]) == 1
    assert topic["items"][0]["q"] == "New Question"

  def test_add_item_to_nonexistent_topic_returns_none(self, auth_client):
    """Item operations on non-existent topic should return None."""
    response = auth_client.post('/api/topics/nonexistent/items', json={"q": "Q"})

    assert response.status_code == 200
    assert response.get_json() is None

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.post('/api/topics/test/items', json={"q": "Q"})

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)