"""
Tests for rate limiting functionality.

Tests that rate limits are properly enforced on authentication endpoints.

Note: Rate limiting is disabled in testing mode (FLASK_ENV=testing) to avoid
interference with other tests. These tests are skipped when rate limiting is disabled.
"""

import pytest
import os
from conftest import assert_rfc7807_error

# Skip all rate limit tests when rate limiting is disabled (testing mode)
# Rate limiting is disabled when FLASK_ENV=testing
RATE_LIMITING_ENABLED = os.environ.get('FLASK_ENV', 'development') != 'testing'


@pytest.mark.skipif(not RATE_LIMITING_ENABLED, reason="Rate limiting disabled in testing mode")
class TestSessionRateLimit:
  """Tests for rate limiting on POST /api/session endpoint."""

  def test_rate_limit_allows_requests_under_limit(self, client, db):
    """Requests under the limit should succeed."""
    # Create a user
    db.users.insert_one({
      "_id": "newuser@example.com",
      "name": "New User",
      "picture": None
    })

    # Should allow first request
    response = client.post('/api/session', json={"email": "newuser@example.com"})
    assert response.status_code == 200

  def test_rate_limit_blocks_requests_over_limit(self, client, db):
    """Requests over the limit should return 429."""
    # Create a user
    db.users.insert_one({
      "_id": "ratelimit@example.com",
      "name": "Rate Limit Test",
      "picture": None
    })

    # Make 6 requests (limit is 5 per minute)
    # First 5 should succeed
    for i in range(5):
      response = client.post('/api/session', json={"email": "ratelimit@example.com"})
      assert response.status_code == 200, f"Request {i+1} should succeed"

    # 6th request should be rate limited
    response = client.post('/api/session', json={"email": "ratelimit@example.com"})
    assert response.status_code == 429

  def test_rate_limit_returns_rfc7807_error(self, client, db):
    """Rate limited response should follow RFC 7807 format."""
    # Create a user
    db.users.insert_one({
      "_id": "rfctest@example.com",
      "name": "RFC Test",
      "picture": None
    })

    # Exhaust the rate limit
    for _ in range(5):
      client.post('/api/session', json={"email": "rfctest@example.com"})

    # Next request should return RFC 7807 compliant error
    response = client.post('/api/session', json={"email": "rfctest@example.com"})
    assert_rfc7807_error(response, 'rate_limited', 429)

  def test_get_request_not_rate_limited(self, auth_client):
    """GET requests should not be affected by POST rate limit."""
    # Make multiple GET requests
    for _ in range(10):
      response = auth_client.get('/api/session')
      assert response.status_code == 200

  def test_rate_limit_independent_per_ip(self, client, db):
    """Rate limits should be tracked per IP address.

    Note: In test environment, all requests come from same IP,
    so this test verifies the key_func is properly configured.
    """
    # Create a user
    db.users.insert_one({
      "_id": "iptest@example.com",
      "name": "IP Test",
      "picture": None
    })

    # Make requests from "same IP" (test client)
    for _ in range(5):
      response = client.post('/api/session', json={"email": "iptest@example.com"})
      assert response.status_code == 200

    # Next request should be rate limited
    response = client.post('/api/session', json={"email": "iptest@example.com"})
    assert response.status_code == 429

  def test_rate_limit_error_includes_detail(self, client, db):
    """Rate limited response should include detail message."""
    # Create a user
    db.users.insert_one({
      "_id": "detailtest@example.com",
      "name": "Detail Test",
      "picture": None
    })

    # Exhaust the rate limit
    for _ in range(5):
      client.post('/api/session', json={"email": "detailtest@example.com"})

    # Check response includes detail
    response = client.post('/api/session', json={"email": "detailtest@example.com"})
    assert response.status_code == 429
    data = response.get_json()
    assert 'detail' in data


@pytest.mark.skipif(not RATE_LIMITING_ENABLED, reason="Rate limiting disabled in testing mode")
class TestDefaultRateLimits:
  """Tests for default rate limits on other endpoints."""

  def test_default_rate_limit_allows_reasonable_requests(self, auth_client):
    """Default limits (200/day, 50/hour) should allow reasonable usage."""
    # Making a reasonable number of requests should succeed
    for _ in range(10):
      response = auth_client.get('/api/session')
      assert response.status_code == 200