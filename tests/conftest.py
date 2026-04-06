"""
Pytest configuration and fixtures for letmelearn tests.
"""

import pytest
import os
import json
from datetime import datetime
from unittest.mock import patch, MagicMock

# Set test environment before importing app
os.environ['MONGODB_URI'] = 'mongodb://localhost:27017/letmelearn_test'
os.environ['APP_SECRET_KEY'] = 'test-secret-key'
os.environ['OAUTH_PROVIDER'] = 'https://accounts.google.com'
os.environ['OAUTH_CLIENT_ID'] = 'test-client-id'

# Mock requests to prevent oatk from making network calls during module import
_mock_response = MagicMock()
_mock_response.content = json.dumps({
    'authorization_endpoint': 'https://accounts.google.com/o/oauth2/v2/auth',
    'token_endpoint': 'https://oauth2.googleapis.com/token',
    'userinfo_endpoint': 'https://openidconnect.googleapis.com/v1/userinfo',
    'jwks_uri': 'https://www.googleapis.com/oauth2/v3/certs'
}).encode()
_requests_patcher = patch('requests.get', return_value=_mock_response)
_requests_patcher.start()


@pytest.fixture(scope='session')
def app():
    """Create Flask app for testing."""
    # Import modules first - env vars are already set at module level
    from letmelearn.web import server

    # Patch oauth methods to avoid network calls
    from letmelearn import auth

    # Create mock that acts as pass-through decorator
    def mock_authenticated(func):
        """Pass-through decorator for @oauth.authenticated"""
        return func

    # Apply patches
    patcherAuthenticated = patch.object(auth.oauth, 'authenticated', side_effect=mock_authenticated)
    patcherDecode = patch.object(auth.oauth, 'decode', return_value={'email': 'test@example.com', 'name': 'Test User'})

    patcherAuthenticated.start()
    patcherDecode.start()

    server.config['TESTING'] = True
    server.config['MONGODB_URI'] = 'mongodb://localhost:27017/letmelearn_test'

    # Disable session protection for testing (makes session auth more reliable)
    auth.login_manager.session_protection = None

    yield server

    patcherAuthenticated.stop()
    patcherDecode.stop()


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