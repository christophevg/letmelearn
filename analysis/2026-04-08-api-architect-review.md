# API Architect Review: Backend Testing Priority

**Date**: 2026-04-08
**Reviewer**: API Architect Agent
**Task**: Review prio:1 testing task from an API perspective

---

## Executive Summary

The prio:1 task "create backend tests for all API calls based on OpenAPI spec" is well-defined but requires clarification on scope and approach. Existing test coverage is good for sessions, follows, and stats modules, but critical gaps exist for folders, topics, feed, and auth endpoints. The OpenAPI specification provides a solid foundation for contract testing.

---

## 1. Current Test Coverage Analysis

### Existing Tests

| Test File | Endpoints Covered | Coverage Quality |
|-----------|------------------|------------------|
| `test_sessions.py` | POST/PATCH/GET /sessions | Good - covers auth, state transitions, concurrent sessions |
| `test_follows.py` | POST/DELETE/GET /following, GET /followers | Good - covers auth, idempotency, database verification |
| `test_stats.py` | GET /stats/streak, GET /stats/weekly | Good - covers timezone, aggregation, edge cases |
| `test_treeitems.py` | TreeItems dataclass | Unit test only - not API |

### Missing Test Coverage

| Endpoint Group | Status | Priority |
|----------------|--------|----------|
| `/api/folders` (GET/POST/DELETE) | No tests | High |
| `/api/topics` (GET/POST/PATCH/DELETE) | No tests | High |
| `/api/feed` (GET/POST) | No tests | High |
| `/api/session` (GET/POST/DELETE/PUT) | No tests | High |
| `/api/users` (GET search) | No tests | Medium |
| `/api/stats/following/streaks` | No tests | Medium |

---

## 2. OpenAPI Specification Compliance

### 2.1 Schema Validation Opportunities

The OpenAPI specification is well-structured and can be used for:

1. **Request validation testing** - Verify requests match schemas
2. **Response validation testing** - Verify responses match schemas
3. **Status code testing** - Verify correct status codes per scenario

### 2.2 Schema Inconsistencies Found

From the previous API review (`2026-04-07-api-review.md`), some issues were already addressed:

| Issue | Status |
|-------|--------|
| Email as path parameter causing encoding issues | Fixed (`<string:email>`) |
| Schema inconsistency in `following` field type | Fixed (UserInfo object) |
| OpenAPI schema mismatch for FollowingStreak | Fixed (wrapped in `user` object) |
| RFC 7807 Problem Details for errors | Implemented |
| Minimum search prefix length (user enumeration) | Fixed (increased to 3 chars) |
| Privacy for streak visibility | Already correctly implemented |
| 422 for business rule violations | Implemented |

### 2.3 Remaining Low-Priority Issues

These are documented in TODO.md as prio:0 and should not block testing:

- Add rate limiting
- Add email format validation
- Add pagination for collection endpoints
- Add documentation for rate limiting and privacy policy

---

## 3. Testing Approach Recommendations

### 3.1 Test Categories

**Unit Tests (module-level functionality):**
- Data transformations (TreeItems, session state logic)
- Streak computation algorithm
- Weekly stats aggregation logic
- Email/user validation utilities

**Integration Tests (API-level):**
- Endpoint request/response validation
- Authentication/authorization flows
- Database state verification
- Error response format (RFC 7807)

**Contract Tests (OpenAPI compliance):**
- Request schema validation
- Response schema validation
- Status code correctness

### 3.2 Recommended Test Structure

```
tests/
  conftest.py           # Shared fixtures (auth_client, db, test_user)
  test_sessions.py      # EXISTS - good coverage
  test_follows.py       # EXISTS - good coverage
  test_stats.py         # EXISTS - good coverage
  test_folders.py       # NEW - needed
  test_topics.py        # NEW - needed
  test_feed.py          # NEW - needed
  test_auth.py          # NEW - needed
  test_users.py         # NEW - needed
```

### 3.3 Priority Order for New Test Files

1. **test_auth.py** - Critical path (all other endpoints depend on auth)
2. **test_folders.py** - Core functionality, affects topics
3. **test_topics.py** - Core functionality
4. **test_feed.py** - User-visible feature
5. **test_users.py** - Search endpoint (lower priority)

---

## 4. Key Test Scenarios by Endpoint

### 4.1 Authentication (`/api/session`)

| Endpoint | Scenario | Expected |
|----------|----------|----------|
| GET /api/session | Authenticated user | 200 with user info |
| GET /api/session | Unauthenticated | 401 |
| POST /api/session | Valid OAuth token | 200 with user info |
| POST /api/session | Invalid token | 403 |
| DELETE /api/session | Authenticated | 200, session cleared |
| PUT /api/session | Switch identity | 200 with new identity |

### 4.2 Folders (`/api/folders`)

| Endpoint | Scenario | Expected |
|----------|----------|----------|
| GET /api/folders | Authenticated user | 200 with folder tree |
| POST /api/folders/{path} | Create folder | 200 with updated tree |
| DELETE /api/folders/{path} | Delete folder | 200 with updated tree |
| POST /api/folders/{path} | Invalid path | 404 |

### 4.3 Topics (`/api/topics`)

| Endpoint | Scenario | Expected |
|----------|----------|----------|
| GET /api/topics | List all topics | 200 with array |
| POST /api/topics | Create topic | 200 with topic |
| GET /api/topics/{id} | Get topic | 200 with topic |
| PATCH /api/topics/{id} | Update topic | 200 with topic + treeitems |
| DELETE /api/topics/{id} | Delete topic | 200 with references |
| All endpoints | Unauthenticated | 401 |

### 4.4 Feed (`/api/feed`)

| Endpoint | Scenario | Expected |
|----------|----------|----------|
| GET /api/feed | Default (my) | 200 with user's feed |
| GET /api/feed?mode=following | Following mode | 200 with followed users' feed |
| GET /api/feed?mode=invalid | Invalid mode | 400 |
| POST /api/feed | Create feed item | 200 with item |

### 4.5 Users Search (`/api/users`)

| Endpoint | Scenario | Expected |
|----------|----------|----------|
| GET /api/users?email=abc | Valid prefix (3+ chars) | 200 with array |
| GET /api/users?email=ab | Too short | 200 with empty array |
| GET /api/users | Missing param | 400 |
| GET /api/users | Unauthenticated | 401 |

---

## 5. RFC 7807 Error Response Testing

The project has implemented RFC 7807 Problem Details format. Tests should verify:

```python
def test_error_response_format(client):
    """All API errors should follow RFC 7807 format."""
    response = client.post('/api/sessions', json={})
    
    assert response.status_code == 422
    data = response.get_json()
    assert 'type' in data      # Error type URI
    assert 'title' in data     # Short summary
    assert 'status' in data    # HTTP status
    # Optional: 'detail', 'instance'
```

---

## 6. Test Fixture Recommendations

### 6.1 Existing Fixtures (from conftest.py)

Based on existing tests, the following fixtures are already established:
- `client` - Unauthenticated Flask test client
- `auth_client` - Authenticated Flask test client
- `db` - MongoDB database connection
- `test_user` - Test user document

### 6.2 Additional Fixtures Needed

```python
# For folders/topics tests
@pytest.fixture
def test_folder(db):
    """Create a test folder."""
    db.folders.insert_one({"name": "Test Folder", "user": "test@example.com"})
    yield db.folders.find_one({"name": "Test Folder"})
    db.folders.delete_many({})

@pytest.fixture
def test_topic(db):
    """Create a test topic."""
    db.topics.insert_one({
        "_id": "test-topic",
        "name": "Test Topic",
        "user": "test@example.com"
    })
    yield db.topics.find_one({"_id": "test-topic"})
    db.topics.delete_many({})

# For feed tests
@pytest.fixture
def test_session_for_feed(db, test_user):
    """Create a completed session for feed testing."""
    session_id = str(ObjectId())
    db.sessions.insert_one({
        "_id": session_id,
        "user": test_user["_id"],
        "kind": "quiz",
        "status": "completed",
        "started_at": datetime.utcnow(),
        "elapsed": 300,
        "topics": []
    })
    yield session_id
```

---

## 7. OpenAPI Contract Testing Tools

### 7.1 Recommended: schemathesis

For Python/Flask projects, `schemathesis` provides excellent OpenAPI contract testing:

```python
# conftest.py
import schemathesis
from hypothesis import settings

schema = schemathesis.from_path("docs/openapi.yaml")

@schema.parametrize()
@settings(max_examples=50)
def test_api_compliance(case):
    """All endpoints should comply with OpenAPI spec."""
    response = case.call()
    case.validate_response(response)
```

### 7.2 Alternative: Manual Schema Validation

If not using schemathesis, create helper:

```python
# tests/helpers.py
import jsonschema
import yaml

with open("docs/openapi.yaml") as f:
    openapi_spec = yaml.safe_load(f)

def validate_response(endpoint, method, status_code, response_data):
    """Validate response against OpenAPI schema."""
    schema = openapi_spec["paths"][endpoint][method]["responses"][str(status_code)]["content"]["application/json"]["schema"]
    jsonschema.validate(response_data, schema)
```

---

## 8. Implementation Phases

### Phase 1: Core Endpoint Tests (prio:1)
1. Create `test_folders.py` with basic CRUD tests
2. Create `test_topics.py` with CRUD tests
3. Create `test_auth.py` with session management tests
4. Add missing `/api/stats/following/streaks` tests to `test_stats.py`

### Phase 2: Contract Testing
1. Integrate schemathesis or manual schema validation
2. Add schema validation to existing tests
3. Add schema validation to new tests

### Phase 3: Edge Case Coverage
1. Add error response format tests
2. Add boundary condition tests
3. Add concurrent operation tests

---

## 9. Recommendations Summary

| Priority | Recommendation |
|----------|----------------|
| **High** | Create test files for folders, topics, auth, feed endpoints |
| **High** | Test all authentication scenarios (401 responses) |
| **Medium** | Add OpenAPI contract testing with schemathesis |
| **Medium** | Add `/api/stats/following/streaks` endpoint tests |
| **Medium** | Test RFC 7807 error format on all error responses |
| **Low** | Add performance benchmarks for streak computation |
| **Low** | Add rate limiting tests (when implemented) |

---

## 10. Task Definition Assessment

### Is the prio:1 task well-defined?

**Partially.** The task scope in TODO.md states:
- API tests based on OpenAPI specification
- Unit tests for module-level functionality
- Ensuring the public API layer operates as documented

**Clarifications needed:**

1. **"Based on OpenAPI spec"** - Should tests validate requests/responses against schemas, or use schemas as documentation reference? Recommend: both.

2. **"Unit tests for module-level functionality"** - This is vague. Which modules? TreeItems already has tests. Should streak computation logic have separate unit tests?

3. **"Public API layer"** - Does this include `/api/session` authentication endpoints?

**Recommended task refinement:**

```
- [ ] create backend tests for all API calls based on OpenAPI spec (prio:1)
  - [ ] Create test_folders.py with CRUD tests
  - [ ] Create test_topics.py with CRUD tests
  - [ ] Create test_auth.py with session management tests
  - [ ] Create test_feed.py with mode parameter tests
  - [ ] Add /api/stats/following/streaks tests to test_stats.py
  - [ ] Add /api/users search endpoint tests
  - [ ] Integrate schemathesis for OpenAPI contract testing
  - [ ] Ensure all error responses follow RFC 7807 format
```

---

## 11. Files to Create/Modify

| File | Action |
|------|--------|
| `tests/test_folders.py` | Create new |
| `tests/test_topics.py` | Create new |
| `tests/test_auth.py` | Create new |
| `tests/test_feed.py` | Create new |
| `tests/test_users.py` | Create new |
| `tests/test_stats.py` | Add following/streaks tests |
| `tests/conftest.py` | Add new fixtures |
| `requirements.txt` | Add schemathesis (optional) |

---

## 12. Conclusion

The prio:1 testing task is appropriately prioritized and addresses a real gap in test coverage. The existing tests for sessions, follows, and stats provide a good pattern to follow. The OpenAPI specification is comprehensive and can serve as the authoritative reference for contract testing.

**Key blockers:** None. The task can proceed as defined.

**Estimated effort:** Medium. Creating 5 new test files and extending 1 existing file. Each test file should follow the pattern established in existing tests (auth, database verification, error cases).

---

## Next Steps

1. Confirm task refinement with user
2. Create test files in priority order
3. Run full test suite after each file to ensure no regressions
4. Consider CI integration for schemathesis contract testing