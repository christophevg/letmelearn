"""
Pytest configuration and fixtures for letmelearn tests.
"""

import pytest
import os
from datetime import datetime
from unittest.mock import patch, MagicMock

# Set test environment before importing app
os.environ['MONGODB_URI'] = 'mongodb://localhost:27017/letmelearn_test'
os.environ['APP_SECRET_KEY'] = 'test-secret-key'
os.environ['OAUTH_PROVIDER'] = 'https://accounts.google.com'
os.environ['OAUTH_CLIENT_ID'] = 'test-client-id'


@pytest.fixture(scope='session')
def app():
    """Create Flask app for testing."""
    # Mock oatk to avoid network calls during tests
    with patch('letmelearn.auth.oauth') as mock_oauth:
        mock_oauth.authenticated = lambda f: f  # Pass-through decorator
        mock_oauth.decode = lambda token: {'email': 'test@example.com', 'name': 'Test User'}

        from letmelearn.web import server
        server.config['TESTING'] = True
        server.config['MONGODB_URI'] = 'mongodb://localhost:27017/letmelearn_test'
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