# Testing Infrastructure

This document captures the testing setup, challenges encountered, and lessons learned.

## Overview

The project uses pytest for testing with the following test files:
- `tests/test_sessions.py` - Session tracking endpoint tests
- `tests/test_stats.py` - Statistics endpoint tests
- `tests/test_treeitems.py` - TreeItems dataclass tests

## Current Setup

### Test Configuration (`tests/conftest.py`)

```python
# Environment setup (must happen before any imports)
os.environ['MONGODB_URI'] = 'mongodb://localhost:27017/letmelearn_test'
os.environ['APP_SECRET_KEY'] = 'test-secret-key'
os.environ['OAUTH_PROVIDER'] = 'https://accounts.google.com'
os.environ['OAUTH_CLIENT_ID'] = 'test-client-id'

# Mock requests before importing oatk
_requests_patcher = patch('requests.get', return_value=mock_oid_response)
```

### Key Fixtures

| Fixture | Scope | Purpose |
|---------|-------|---------|
| `app` | session | Flask app with OAuth mocked and session protection disabled |
| `db` | session | MongoDB test database connection |
| `client` | function | Flask test client |
| `test_user` | function | Creates test user in database |
| `auth_client` | function | Authenticated client with logged-in user session |

## Challenges Encountered

### 1. OAuth Library Network Calls at Import Time

**Problem**: The `oatk` library makes network requests during module initialization to fetch OpenID configuration:
```python
# In auth.py - runs at import time
oauth = OAuthToolkit()
oauth.using_provider(os.environ["OAUTH_PROVIDER"])  # Makes HTTP request!
```

**Workaround**: Mock `requests.get` at module level in `conftest.py` before any app imports.

**Impact**: Requires test-specific mock setup before importing the application.

### 2. Flask-Login Session Protection

**Problem**: `login_manager.session_protection = "strong"` adds additional session validation that interferes with test client session handling.

**Workaround**: Disable session protection in test configuration:
```python
auth.login_manager.session_protection = None
```

### 3. Circular Import Chain

**Problem**: Complex circular imports between modules:
```
web.py → auth.py → web.py → api.py → auth.py
```

This makes it difficult to mock components before they're imported.

**Workaround**: Import modules first, then apply patches to already-imported objects.

### 4. MongoDB ObjectId Type Mismatch

**Problem**: Session IDs from API responses are strings, but MongoDB requires `ObjectId` for `_id` queries:
```python
session_id = response.get_json()['session_id']  # String
session = db.sessions.find_one({"_id": session_id})  # Returns None!
```

**Fix**: Convert to ObjectId:
```python
from bson.objectid import ObjectId
session = db.sessions.find_one({"_id": ObjectId(session_id)})
```

### 5. Test User Session Authentication

**Problem**: Setting `_user_id` in Flask session wasn't persisting across requests.

**Fix**: The combination of:
1. Disabling session protection
2. Using `client.session_transaction()` context manager
3. Ensuring test user exists in database before authentication

```python
@pytest.fixture
def auth_client(client, test_user):
    with client.session_transaction() as sess:
        sess['_user_id'] = test_user['_id']
    return client
```

## Recommendations for Codebase Improvements

### 1. Defer OAuth Initialization

**Current**: OAuth initialized at module import time
```python
# auth.py
oauth = OAuthToolkit()
oauth.using_provider(os.environ["OAUTH_PROVIDER"])
```

**Proposed**: Lazy initialization or factory pattern
```python
_oauth = None

def get_oauth():
    global _oauth
    if _oauth is None:
        _oauth = OAuthToolkit()
        _oauth.using_provider(os.environ["OAUTH_PROVIDER"])
    return _oauth
```

**Benefits**:
- Tests can mock before initialization
- Environment variables can be set after import
- Clearer separation of concerns

### 2. Add Test-Specific Configuration

**Proposed**: Create a test configuration module
```python
# tests/test_config.py
class TestConfig:
    MONGODB_URI = 'mongodb://localhost:27017/letmelearn_test'
    SECRET_KEY = 'test-secret-key'
    OAUTH_PROVIDER = 'test'
    OAUTH_CLIENT_ID = 'test-client-id'
    SESSION_PROTECTION = None
```

### 3. Dependency Injection for OAuth

**Current**: OAuth decorator applied at module level
```python
class Session(Resource):
    @oauth.authenticated
    def post(self): ...
```

**Proposed**: Allow injection of authentication provider
```python
class Session(Resource):
    def __init__(self, auth_provider=None):
        self.auth_provider = auth_provider or oauth

    @property
    def authenticated(self):
        return self.auth_provider.authenticated
```

### 4. Session ID Response Type

**Consideration**: Should API responses return ObjectId as strings?

**Current**: Returns string
```json
{"session_id": "6801a2b3c4d5e6f7a8b9c0d1"}
```

**Alternative**: Could use a custom encoder or return in a consistent format.

### 5. Break Circular Imports

**Current Import Chain**:
- `web.py` imports `auth`, `api`, `sessions`, `stats`
- `auth.py` imports from `web`
- `api.py` imports from `auth`

**Proposed**: Move shared utilities to separate module:
```
letmelearn/
├── core/
│   ├── server.py      # Baseweb instance
│   └── decorators.py  # @authenticated
├── auth.py
├── api.py
└── ...
```

### 6. Add pytest.ini Configuration

**Proposed**: Explicit test configuration
```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
python_classes = Test*
filterwarnings =
    ignore::DeprecationWarning
```

## Running Tests

```bash
# Run all tests
make test
# or
tox

# Run specific test file
pytest tests/test_sessions.py -v

# Run with coverage
make coverage
```

## Database Requirements

Tests require a running MongoDB instance:
- Default: `mongodb://localhost:27017`
- Test database: `letmelearn_test`
- Database is cleaned up after all tests complete

## Lessons Learned

1. **Module-level initialization is testing-hostile**: Code that runs at import time makes testing difficult. Defer initialization until needed.

2. **Mock early, mock often**: External dependencies (network, file system) should be mocked at the earliest possible point in the import chain.

3. **Test fixtures should be self-contained**: Each test should work independently without relying on state from previous tests.

4. **Type consistency matters**: Be aware of type conversions (string vs ObjectId) when working with databases.

5. **Session handling in Flask tests**: Flask's test client session handling has quirks that require specific patterns to work correctly.