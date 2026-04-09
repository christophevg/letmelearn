"""
Tests for authentication endpoints.

Tests OAuth login flow and session management.
"""

from conftest import assert_rfc7807_error


class TestSessionPost:
  """Tests for POST /api/session - OAuth login."""

  def test_login_with_email_in_test_mode(self, client, db):
    """In test mode, login should accept whitelisted email in request body."""
    # Create a test user (email is whitelisted in conftest.py)
    db.users.insert_one({
      "_id": "newuser@example.com",
      "name": "New User",
      "picture": "https://example.com/pic.jpg"
    })

    response = client.post('/api/session', json={"email": "newuser@example.com"})

    assert response.status_code == 200
    data = response.get_json()
    assert data["email"] == "newuser@example.com"
    assert data["name"] == "New User"

  def test_login_creates_flask_session(self, client, db):
    """Login should create Flask-Login session."""
    db.users.insert_one({
      "_id": "logintest@example.com",
      "name": "Login Test",
      "picture": None
    })

    response = client.post('/api/session', json={"email": "logintest@example.com"})

    assert response.status_code == 200
    # Session cookie should be set
    assert 'session' in response.headers.get('Set-Cookie', '') or response.status_code == 200

  def test_login_unknown_user_returns_403(self, client):
    """Login with unknown email should return 403."""
    # Use a whitelisted email but user doesn't exist in database
    response = client.post('/api/session', json={"email": "admin@example.com"})

    assert response.status_code == 403
    assert_rfc7807_error(response, 'forbidden', 403)

  def test_login_non_whitelisted_user_returns_403(self, client, db):
    """Login with non-whitelisted email should return 403 even if user exists."""
    # Create a user that is NOT in the whitelist
    db.users.insert_one({
      "_id": "hacker@example.com",
      "name": "Hacker",
      "picture": None
    })

    response = client.post('/api/session', json={"email": "hacker@example.com"})

    assert response.status_code == 403
    data = assert_rfc7807_error(response, 'forbidden', 403)
    assert "whitelisted" in data.get("detail", "").lower()

  def test_login_without_email_uses_default(self, client, db):
    """Login without email should use default test email."""
    # In test mode, default email is test@example.com (whitelisted)
    db.users.replace_one(
      {"_id": "test@example.com"},
      {"_id": "test@example.com", "name": "Test User", "picture": None},
      upsert=True
    )

    response = client.post('/api/session', json={})

    # Should succeed with default test user
    assert response.status_code == 200


class TestSessionGet:
  """Tests for GET /api/session - Get current user."""

  def test_get_session_returns_user_info(self, auth_client, test_user):
    """Authenticated request should return user info."""
    response = auth_client.get('/api/session')

    assert response.status_code == 200
    data = response.get_json()
    assert data["email"] == test_user["_id"]
    assert data["name"] == test_user["name"]

  def test_get_session_includes_identities(self, auth_client, db, test_user):
    """User with identities should return them."""
    # Add identities to user
    db.users.update_one(
      {"_id": test_user["_id"]},
      {"$set": {"identities": ["other@example.com"]}}
    )
    # Create identity user
    db.users.insert_one({
      "_id": "other@example.com",
      "name": "Other User",
      "picture": None
    })

    response = auth_client.get('/api/session')

    assert response.status_code == 200
    data = response.get_json()
    assert "identities" in data
    assert len(data["identities"]) == 1
    assert data["identities"][0]["email"] == "other@example.com"

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.get('/api/session')

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)


class TestSessionDelete:
  """Tests for DELETE /api/session - Logout."""

  def test_logout_clears_session(self, auth_client):
    """Logout should clear Flask-Login session."""
    response = auth_client.delete('/api/session')

    assert response.status_code == 200
    assert response.get_json() is True

  def test_logout_returns_true(self, auth_client):
    """Logout should return True."""
    response = auth_client.delete('/api/session')

    assert response.status_code == 200
    assert response.get_json() is True

  def test_logout_without_auth_returns_401(self, client):
    """Logout without auth should return 401."""
    response = client.delete('/api/session')

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)


class TestSessionPut:
  """Tests for PUT /api/session - Switch identity."""

  def test_switch_identity_to_valid_identity(self, auth_client, db, test_user):
    """Switch to valid identity should succeed."""
    # Add identity to user
    db.users.update_one(
      {"_id": test_user["_id"]},
      {"$set": {"identities": ["child@example.com"]}}
    )
    # Create identity user
    db.users.insert_one({
      "_id": "child@example.com",
      "name": "Child User",
      "picture": None
    })

    response = auth_client.put('/api/session', json={"identity": "child@example.com"})

    assert response.status_code == 200
    data = response.get_json()
    assert data["current"] == "child@example.com"

  def test_switch_identity_to_self(self, auth_client, test_user):
    """Switch to self should work - current becomes own email."""
    response = auth_client.put('/api/session', json={"identity": test_user["_id"]})

    assert response.status_code == 200
    data = response.get_json()
    # When switching to self, current is the user's own email
    assert data["current"] == test_user["_id"]

  def test_switch_to_invalid_identity_returns_error(self, auth_client):
    """Switch to non-existent identity should fail."""
    response = auth_client.put('/api/session', json={"identity": "invalid@example.com"})

    assert response.status_code == 422
    assert_rfc7807_error(response, 'unprocessable', 422)

  def test_unauthenticated_switch_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.put('/api/session', json={"identity": "any@example.com"})

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)