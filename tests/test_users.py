"""
Tests for user search endpoint.

Tests user search functionality for social features.
"""

from conftest import assert_rfc7807_error


class TestUserSearch:
  """Tests for GET /api/users?email= - Search users."""

  def test_search_returns_matching_users(self, auth_client, db, test_user):
    """Search should return users matching email prefix."""
    # Create users with similar emails
    db.users.insert_one({
      "_id": "alice@example.com",
      "name": "Alice",
      "picture": None
    })
    db.users.insert_one({
      "_id": "alicia@example.com",
      "name": "Alicia",
      "picture": None
    })

    response = auth_client.get('/api/users?email=ali')

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 2
    emails = [u["email"] for u in data]
    assert "alice@example.com" in emails
    assert "alicia@example.com" in emails

  def test_search_excludes_current_user(self, auth_client, db, test_user):
    """Search should not include current user."""
    # Search with prefix that matches test user
    response = auth_client.get('/api/users?email=test')

    assert response.status_code == 200
    data = response.get_json()
    # Current user should not be in results
    emails = [u["email"] for u in data]
    assert test_user["_id"] not in emails

  def test_search_requires_min_3_chars(self, auth_client):
    """Search with <3 chars should return empty."""
    response = auth_client.get('/api/users?email=ab')

    assert response.status_code == 200
    assert response.get_json() == []

  def test_search_is_case_insensitive(self, auth_client, db):
    """Search should be case-insensitive."""
    db.users.insert_one({
      "_id": "UpperCase@example.com",
      "name": "Upper Case",
      "picture": None
    })

    response = auth_client.get('/api/users?email=uppercase')

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["email"] == "UpperCase@example.com"

  def test_search_limited_to_10_results(self, auth_client, db, test_user):
    """Search should limit to 10 results."""
    # Create 15 matching users
    for i in range(15):
      db.users.insert_one({
        "_id": f"user{i}@example.com",
        "name": f"User {i}",
        "picture": None
      })

    response = auth_client.get('/api/users?email=user')

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) <= 10  # May exclude current user

  def test_search_returns_user_info(self, auth_client, db, test_user):
    """Results should include email, name, picture."""
    db.users.insert_one({
      "_id": "info@example.com",
      "name": "Info User",
      "picture": "https://example.com/pic.jpg"
    })

    response = auth_client.get('/api/users?email=info')

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    user = data[0]
    assert "email" in user
    assert "name" in user
    assert "picture" in user
    assert user["email"] == "info@example.com"
    assert user["name"] == "Info User"
    assert user["picture"] == "https://example.com/pic.jpg"

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.get('/api/users?email=test')

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)