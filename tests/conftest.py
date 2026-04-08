"""
Pytest configuration and fixtures for letmelearn tests.

With TEST_MODE enabled, OAuth is bypassed and authentication
is handled via Flask-Login session only.
"""

import pytest
import os
from datetime import datetime

# Set test environment BEFORE importing app
# TEST_MODE bypasses OAuth validation for easier testing
os.environ['TEST_MODE'] = 'true'
os.environ['MONGODB_URI'] = 'mongodb://localhost:27017/letmelearn_test'
os.environ['APP_SECRET_KEY'] = 'test-secret-key'
os.environ['OAUTH_PROVIDER'] = 'https://accounts.google.com'
os.environ['OAUTH_CLIENT_ID'] = 'test-client-id'


@pytest.fixture(scope='session')
def app():
  """Create Flask app for testing."""
  from letmelearn.web import server

  server.config['TESTING'] = True
  server.config['MONGODB_URI'] = 'mongodb://localhost:27017/letmelearn_test'

  # Disable session protection for testing (makes session auth more reliable)
  from letmelearn.auth import login_manager
  login_manager.session_protection = None

  yield server


@pytest.fixture(scope='session')
def db(app):
  """Create test database connection."""
  from letmelearn.data import db
  yield db
  # Cleanup after all tests
  db.client.drop_database('letmelearn_test')


@pytest.fixture
def client(app):
  """Create test client."""
  with app.test_client() as client:
    yield client


@pytest.fixture
def test_user(db):
  """Create a test user in the database."""
  user = {
    "_id": "test@example.com",
    "name": "Test User",
    "picture": "https://example.com/picture.jpg"
  }
  db.users.replace_one({"_id": user["_id"]}, user, upsert=True)
  yield user
  db.users.delete_one({"_id": "test@example.com"})


@pytest.fixture
def auth_client(client, test_user):
  """Create authenticated client with logged-in user."""
  with client.session_transaction() as sess:
    sess['_user_id'] = test_user['_id']
  return client


@pytest.fixture
def auth_header():
  """Return empty dict - authentication is handled via session."""
  return {}


# Cleanup fixtures

@pytest.fixture(autouse=True)
def cleanup_sessions(db):
  """Clean up sessions after each test."""
  yield
  db.sessions.delete_many({})


@pytest.fixture(autouse=True)
def cleanup_feed(db):
  """Clean up feed after each test."""
  yield
  db.feed.delete_many({})


@pytest.fixture(autouse=True)
def cleanup_topics(db):
  """Clean up topics after each test."""
  yield
  db.topics.delete_many({})


@pytest.fixture(autouse=True)
def cleanup_folders(db):
  """Clean up folders after each test."""
  yield
  db.folders.delete_many({})


@pytest.fixture(autouse=True)
def cleanup_follows(db):
  """Clean up follows after each test."""
  yield
  db.follows.delete_many({})


@pytest.fixture(autouse=True)
def cleanup_users(db):
  """Clean up users after each test (except test user)."""
  yield
  db.users.delete_many({"_id": {"$ne": "test@example.com"}})


# Helper functions

def assert_rfc7807_error(response, expected_type, expected_status):
  """Validate that response follows RFC 7807 Problem Details format.

  Args:
    response: Flask test response
    expected_type: Expected error type key (e.g., 'unauthorized', 'not_found')
    expected_status: Expected HTTP status code

  Asserts:
    - Response status code matches
    - Response has 'type', 'title', 'status' fields
    - Type field contains expected error type

  Returns:
    Response JSON data for further assertions.
  """
  assert response.status_code == expected_status, \
    f"Expected status {expected_status}, got {response.status_code}"

  data = response.get_json()

  # RFC 7807 required fields
  assert 'type' in data, "Missing 'type' field"
  assert 'title' in data, "Missing 'title' field"
  assert 'status' in data, "Missing 'status' field"
  assert data['status'] == expected_status, \
    f"Status field mismatch: {data['status']} != {expected_status}"

  # Type should reference expected error
  assert expected_type in data['type'].lower(), \
    f"Type '{data['type']}' should contain '{expected_type}'"

  return data