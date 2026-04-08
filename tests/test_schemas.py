"""
Tests for OpenAPI schema validation.

These tests verify that API responses match the schemas defined in docs/openapi.yaml.
Uses the schema_validator helper for clean, maintainable schema validation.
"""

import pytest
import sys
from pathlib import Path

# Add helpers to path
sys.path.insert(0, str(Path(__file__).parent))

from helpers.schema_validator import (
  validate_user_schema,
  validate_treeitem_array,
  validate_topic_array,
  validate_feeditem_array,
  validate_streakstats,
  validate_weeklystats,
  validate_followeduser_array,
  validate_followeruser_array,
  validate_error_response,
  assert_valid_response,
  get_response_schema,
)


class TestSchemaValidation:
  """Schema validation tests for key endpoints."""

  def test_get_session_user_schema(self, auth_client, test_user):
    """GET /api/session returns valid User schema."""
    response = auth_client.get('/api/session')
    assert response.status_code == 200
    validate_user_schema(response.get_json())

  def test_get_folders_treeitem_schema(self, auth_client, test_user):
    """GET /api/folders returns valid TreeItem array."""
    response = auth_client.get('/api/folders')
    assert response.status_code == 200
    validate_treeitem_array(response.get_json())

  def test_get_topics_topic_schema(self, auth_client, test_user):
    """GET /api/topics returns valid Topic array."""
    response = auth_client.get('/api/topics')
    assert response.status_code == 200
    validate_topic_array(response.get_json())

  def test_get_feed_feeditem_schema(self, auth_client, test_user):
    """GET /api/feed returns valid FeedItem array."""
    response = auth_client.get('/api/feed')
    assert response.status_code == 200
    validate_feeditem_array(response.get_json())

  def test_get_streak_streakstats_schema(self, auth_client, test_user):
    """GET /api/stats/streak returns valid StreakStats."""
    response = auth_client.get('/api/stats/streak')
    assert response.status_code == 200
    validate_streakstats(response.get_json())

  def test_get_weekly_weeklystats_schema(self, auth_client, test_user):
    """GET /api/stats/weekly returns valid WeeklyStats."""
    response = auth_client.get('/api/stats/weekly')
    assert response.status_code == 200
    validate_weeklystats(response.get_json())

  def test_get_following_followeduser_schema(self, auth_client, test_user):
    """GET /api/following returns valid FollowedUser array."""
    response = auth_client.get('/api/following')
    assert response.status_code == 200
    validate_followeduser_array(response.get_json())

  def test_get_followers_followeruser_schema(self, auth_client, test_user):
    """GET /api/followers returns valid FollowerUser array."""
    response = auth_client.get('/api/followers')
    assert response.status_code == 200
    validate_followeruser_array(response.get_json())

  def test_unauthenticated_error_schema(self, client):
    """Unauthenticated requests return valid Error schema."""
    response = client.get('/api/folders')
    assert response.status_code == 401
    validate_error_response(response.get_json())


class TestConvenienceFunction:
  """Tests for the assert_valid_response convenience function."""

  def test_assert_valid_response_default_status(self, auth_client, test_user):
    """assert_valid_response validates response against schema."""
    response = auth_client.get('/api/folders')
    # This should not raise - validates schema and status
    assert_valid_response(response, '/folders')

  def test_assert_valid_response_explicit_status(self, auth_client, test_user):
    """assert_valid_response with explicit status code."""
    response = auth_client.get('/api/folders')
    assert_valid_response(response, '/folders', 'GET', 200)


class TestSchemaValidatorUtilities:
  """Tests for schema validator utility functions."""

  def test_get_response_schema_found(self):
    """get_response_schema returns schema for defined endpoints."""
    schema = get_response_schema('/folders', 'GET', 200)
    assert schema is not None
    assert 'type' in schema

  def test_get_response_schema_not_found(self):
    """get_response_schema returns None for undefined status codes."""
    schema = get_response_schema('/folders', 'GET', 418)  # I'm a teapot
    assert schema is None

  def test_get_response_schema_invalid_endpoint(self):
    """get_response_schema raises for unknown endpoints."""
    with pytest.raises(ValueError, match="not found"):
      get_response_schema('/nonexistent', 'GET', 200)

  def test_get_response_schema_invalid_method(self):
    """get_response_schema raises for unknown methods."""
    with pytest.raises(ValueError, match="not found"):
      get_response_schema('/folders', 'PATCH', 200)

  def test_endpoint_normalization(self, auth_client, test_user):
    """assert_valid_response normalizes /api prefix."""
    response = auth_client.get('/api/folders')
    # Should work with or without /api prefix
    assert_valid_response(response, '/api/folders')
    assert_valid_response(response, '/folders')