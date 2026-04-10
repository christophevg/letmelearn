# API Review: MongoDB-less Tests Implementation

**Date**: 2026-04-10
**Reviewer**: API Architect Agent
**Task**: Review functional analysis for test infrastructure changes (mongomock adoption)
**Context**: Enable tests to run on GitHub Actions without MongoDB server

## Summary

The functional analysis recommends `mongomock` for in-memory MongoDB simulation. After reviewing the API and data layer, I **concur with this recommendation** with specific implementation notes. The proposed approach is feasible but requires careful handling of:

1. Aggregation pipelines (time-based operations with timezone support)
2. Module-level MongoClient initialization (needs refactoring)
3. Schema migrations in mock context

## API Operations Compatibility Assessment

### MongoDB Operations Used

| Operation | Location | mongomock Support | Notes |
|-----------|----------|-------------------|-------|
| `find_one`, `find` | All API files | Full | Basic queries work |
| `insert_one` | All API files | Full | Works |
| `update_one` | Sessions, Topics, Auth | Full | Works |
| `delete_one`, `delete_many` | Topics, Folders | Full | Works |
| `replace_one(upsert=True)` | Users, Folders | Full | Used in test fixtures |
| `$set` | Sessions, Topics, Auth | Full | Update operator supported |
| `$push`, `$pull` | Topics (items array) | Full | Array operators supported |
| `$elemMatch` | Topics (item matching) | Full | Query operator supported |
| `$in` | Feed, Stats, Follows | Full | Works |
| `create_index` | data.py | Supported | In-memory index creation |
| `aggregate` | Stats (streak/weekly) | Partial | See details below |
| `sort`, `limit` | Feed, Stats | Full | Works |

### Aggregation Pipeline Analysis

**Critical**: The stats module uses aggregation pipelines with timezone-aware date operations. These require verification with mongomock.

#### Pipeline 1: Streak Calculation (stats.py:37-61)

```python
pipeline = [
  {"$match": {"user": user_email, "kind": "quiz", "status": {"$in": ["completed", "abandoned"]}}},
  {"$project": {"day": {"$dateToString": {"date": "$started_at", "format": "%Y-%m-%d", "timezone": "Europe/Brussels"}}, "elapsed": 1}},
  {"$group": {"_id": "$day", "total_elapsed": {"$sum": "$elapsed"}}},
  {"$match": {"total_elapsed": {"$gte": 900}}},
  {"$sort": {"_id": -1}}
]
```

**mongomock Compatibility**:
- `$dateToString` with `timezone` parameter: **May have issues** - mongomock's support for timezone-aware date operators in aggregation is limited
- `$sum` accumulator: **Works**
- `$match`, `$project`, `$group`, `$sort`: **Works**

**Mitigation**: Write dedicated tests for these aggregation pipelines to verify behavior. If timezone support is incomplete, consider:
1. Pre-computing dates in Python before aggregation
2. Skipping aggregation-based stats tests with `@pytest.mark.real_mongo`
3. Using simpler aggregations for tests

#### Pipeline 2: Weekly Stats (stats.py:186-201)

```python
pipeline = [
  {"$match": {"user": user_email, "kind": "quiz", "status": {"$in": ["completed", "abandoned"]}, "started_at": {"$gte": monday_utc}}},
  {"$group": {"_id": None, "quizzes": {"$sum": 1}, "correct": {"$sum": "$correct"}, "attempts": {"$sum": "$attempts"}, "total_elapsed": {"$sum": "$elapsed"}}}
]
```

**mongomock Compatibility**: **Works** - Simple aggregations without date operators.

### Rate Limiting Storage

Flask-Limiter uses MongoDB for storage (`storage_uri=DB_CONN` in `web.py`).

**Status**: **NOT A PROBLEM** - Rate limiting is disabled in testing mode:
```python
limiter = Limiter(
  ...
  enabled=not config.is_testing(),
  ...
)
```

The `conftest.py` sets `FLASK_ENV=testing`, which triggers `config.is_testing()` to return `True`. Therefore, Flask-Limiter won't attempt MongoDB storage operations during tests.

**Note**: The cleanup fixture `cleanup_rate_limits` in `conftest.py` attempts to clean up rate limit collections, but since rate limiting is disabled, this is a no-op.

## Data Layer Changes Required

### Current Pattern (Problematic)

```python
# data.py - lines 47-50
DB_CONN = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/letmelearn")
DB_NAME = parse_database_name(DB_CONN)

db = MongoClient(DB_CONN, serverSelectionTimeoutMS=3000)[DB_NAME]
```

**Issue**: MongoClient is created at module import time, before test fixtures can inject a mock client.

### Recommended Pattern (Lazy Initialization)

```python
# data.py
_db = None

def get_db():
    """Get database connection, initializing if needed."""
    global _db
    if _db is None:
        DB_CONN = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/letmelearn")
        DB_NAME = parse_database_name(DB_CONN)
        client = MongoClient(DB_CONN, serverSelectionTimeoutMS=3000)
        _db = client[DB_NAME]
        _run_migrations(_db)
    return _db

def _run_migrations(db):
    """Run schema migrations on database."""
    # Move existing migration logic here
    ...

# For backward compatibility
db = property(lambda self: get_db())
```

**Alternative**: Keep module-level `db` but make it injectable:

```python
# data.py
import os
from pymongo import MongoClient

DB_CONN = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/letmelearn")
DB_NAME = parse_database_name(DB_CONN)

# Allow injection for testing
_injected_db = None

def set_test_db(mock_db):
    """Inject mock database for testing."""
    global _injected_db
    _injected_db = mock_db

@property
def db():
    if _injected_db is not None:
        return _injected_db
    return MongoClient(DB_CONN, serverSelectionTimeoutMS=3000)[DB_NAME]
```

### Schema Migration Handling

**Current**: Migrations run at module import time (lines 60-102 in `data.py`).

**With mongomock**:
1. Index creation (`create_index`) works in mongomock
2. Data migration (topics schema upgrade) works in mongomock
3. `find_one_and_update` with `upsert=True` works in mongomock

**Recommendation**: Migrations should work with mongomock, but add a test to verify:
```python
def test_schema_migrations_with_mock():
    """Verify schema migrations run correctly with mongomock."""
    from mongomock import MongoClient
    client = MongoClient()
    db = client['test_db']
    # Import and run migration logic
    ...
```

## Test Fixture Changes

### Required Changes to `conftest.py`

```python
import pytest
import os
import warnings

# Environment setup
os.environ['TEST_MODE'] = 'true'
os.environ['FLASK_ENV'] = 'testing'
os.environ['APP_SECRET_KEY'] = 'test-secret-key'
os.environ['OAUTH_PROVIDER'] = 'https://accounts.google.com'
os.environ['OAUTH_CLIENT_ID'] = 'test-client-id'
os.environ['TEST_USERS'] = 'test@example.com,...'

# Use mongomock if no MongoDB URI or explicit mock:// URI
MONGODB_URI = os.environ.get('MONGODB_URI', 'mock://localhost/letmelearn_test')
USE_MOCK = MONGODB_URI.startswith('mock://') or not MONGODB_URI.startswith('mongodb://')

if USE_MOCK:
    import mongomock
    from mongomock import MongoClient as MockClient

@pytest.fixture(scope='session')
def db():
    """Create test database connection (mock or real)."""
    if USE_MOCK:
        client = MockClient()
        db = client['letmelearn_test']
    else:
        from pymongo import MongoClient
        client = MongoClient(MONGODB_URI)
        db = client['letmelearn_test']

    # Import data module to inject db
    from letmelearn import data
    data._injected_db = db  # Or use lazy init pattern

    yield db

    # Cleanup
    if USE_MOCK:
        # mongomock: just drop references
        pass
    else:
        # Real MongoDB: drop database and close client
        client.drop_database('letmelearn_test')
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=DeprecationWarning)
            client.close()
```

## Risk Mitigation

### High Priority Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Aggregation timezone operators | Medium | Create dedicated test for `test_stats.py`; consider fallback for CI |
| Module-level db initialization | High | Refactor `data.py` to lazy initialization |
| Migration compatibility | Low | Add explicit test for migrations with mock |

### Recommended Test Markers

```python
# conftest.py
import pytest

def pytest_configure(config):
    config.addinivalue_line(
        "markers", "real_mongo: mark test as requiring real MongoDB"
    )
    config.addinivalue_line(
        "markers", "aggregation: mark test as using MongoDB aggregations"
    )
```

Tests using aggregation pipelines should be:
1. Run locally with real MongoDB
2. In CI, either skip or verify mongomock supports the operations

### Fallback Strategy

If mongomock proves insufficient for aggregation tests:

```python
# tests/test_stats.py
import pytest

@pytest.mark.aggregation
class TestStatsStreak:
    @pytest.mark.skipif(os.environ.get('CI') == 'true',
                        reason="mongomock lacks timezone aggregation support")
    def test_streak_computes_correctly(self, auth_client, db, test_user):
        ...
```

## Additional Tasks Identified

Based on this review, the functional analysis task breakdown should include:

1. **Data layer refactoring** (already identified but needs emphasis)
   - Priority: High
   - Impact: All API endpoints depend on `data.db`
   - Risk: Breaking changes to imports

2. **Aggregation pipeline verification**
   - Create specific tests for `mongomock` aggregation support
   - Consider simplifying aggregations for test environment
   - Add `@pytest.mark.aggregation` markers

3. **Migration logic testability**
   - Extract migration logic to testable function
   - Add unit tests for migrations with mock database

4. **Import dependency audit**
   - Verify all modules use `from letmelearn.data import db`
   - No direct MongoClient instantiation outside `data.py`

## Implementation Phases (Updated)

### Phase 1: Core Infrastructure (Estimated: 3-4 hours)

1. **Refactor `data.py` for lazy initialization**
   - Create `get_db()` function
   - Allow test injection of mock database
   - Move migrations to separate function

2. **Add mongomock dependency**
   - Add to `requirements-test.txt`
   - Add to `tox.ini` deps

3. **Modify `conftest.py`**
   - Detect `mock://` URI or missing MongoDB
   - Create mongomock client
   - Inject mock database into data module

### Phase 2: Validation (Estimated: 2 hours)

1. **Create aggregation compatibility tests**
   - Test `$dateToString` with timezone
   - Test `$group` with `$sum`
   - Document supported operations

2. **Add test markers**
   - `@pytest.mark.aggregation` for aggregation tests
   - `@pytest.mark.real_mongo` for real DB tests

3. **Run full test suite**
   - Verify 178 tests pass
   - Document any skipped tests

### Phase 3: CI Setup (Estimated: 30 minutes)

1. **Create GitHub Actions workflow**
   - No MongoDB service needed
   - Python matrix: py39-py312

2. **Add environment variables**
   - `MONGODB_URI=mock://localhost/letmelearn_test`
   - `FLASK_ENV=testing`

## Conclusion

**Recommendation**: **Proceed with mongomock implementation** with the following conditions:

1. **Refactor `data.py`** to support dependency injection before proceeding
2. **Add explicit aggregation tests** to verify mongomock compatibility
3. **Keep real MongoDB option** for local development via environment variable

The functional analysis is accurate and comprehensive. The primary additional finding is the need for careful handling of timezone-aware aggregation pipelines, which may require test markers or simplified alternatives for CI.

## Next Steps

1. Create detailed implementation plan for `data.py` refactoring
2. Write aggregation compatibility tests with mongomock
3. Update task breakdown in TODO.md with refined estimates