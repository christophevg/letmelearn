"""
Tests for RFC 7807 Problem Details error format compliance.
"""

from conftest import assert_rfc7807_error


class TestRFC7807Errors:
  """Test that all errors follow RFC 7807 format."""

  def test_401_unauthenticated_returns_rfc7807(self, client):
    """Unauthenticated requests should return RFC 7807 error."""
    endpoints = [
      '/api/session',
      '/api/folders',
      '/api/topics',
      '/api/feed',
      '/api/following',
      '/api/stats/streak',
      '/api/stats/weekly',
      '/api/sessions/current'
    ]
    for endpoint in endpoints:
      response = client.get(endpoint)
      assert response.status_code == 401, f"Expected 401 for {endpoint}"
      assert_rfc7807_error(response, 'unauthorized', 401)

  def test_404_not_found_returns_rfc7807(self, auth_client):
    """Not found errors should return RFC 7807 format."""
    # Test folder not found
    response = auth_client.post('/api/folders/nonexistent', json={"name": "test"})
    assert_rfc7807_error(response, 'not_found', 404)

    # Test folder delete not found
    response = auth_client.delete('/api/folders/nonexistent')
    assert_rfc7807_error(response, 'not_found', 404)

  def test_409_conflict_returns_rfc7807(self, auth_client, db, test_user):
    """Conflict errors should return RFC 7807 format."""
    # Create topic
    auth_client.post('/api/topics', json={"name": "Test Topic", "question": {}})

    # Try to create duplicate
    response = auth_client.post('/api/topics', json={"name": "Test Topic", "question": {}})
    assert_rfc7807_error(response, 'duplicate', 409)

  def test_422_self_follow_returns_rfc7807(self, auth_client, test_user):
    """Self follow should return RFC 7807 format."""
    response = auth_client.post(f'/api/following/{test_user["_id"]}')
    assert_rfc7807_error(response, 'self_follow', 422)

  def test_404_user_not_found_returns_rfc7807(self, auth_client):
    """User not found should return RFC 7807 format."""
    response = auth_client.post('/api/following/nonexistent@example.com')
    assert_rfc7807_error(response, 'user_not_found', 404)

  def test_404_session_not_found_returns_rfc7807(self, auth_client):
    """Session not found should return RFC 7807 format."""
    from bson.objectid import ObjectId
    fake_id = str(ObjectId())
    response = auth_client.patch(f'/api/sessions/{fake_id}', json={"status": "completed"})
    assert_rfc7807_error(response, 'session_not_found', 404)

  def test_error_response_schema(self, client):
    """Verify error response matches RFC 7807 schema."""
    response = client.get('/api/topics')  # No auth
    assert response.status_code == 401

    data = response.get_json()

    # Required fields
    assert 'type' in data, "Missing 'type' field"
    assert 'title' in data, "Missing 'title' field"
    assert 'status' in data, "Missing 'status' field"

    # Type should be URI fragment
    assert data['type'].startswith('/errors#'), "Type should start with /errors#"

    # Status should match HTTP status
    assert data['status'] == 401, "Status should match HTTP status"