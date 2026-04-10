# Functional Analysis - MongoDB-less Tests for CI

**Date**: 2026-04-10
**Analyst**: Functional Analyst Agent
**Context**: Enable tests to run on GitHub Actions without MongoDB server

## Executive Summary

The current test suite requires a running MongoDB instance at `mongodb://localhost:27017/letmelearn_test`. To enable CI on GitHub Actions, tests must run without a real MongoDB server. This analysis evaluates three approaches and recommends `mongomock` as the optimal solution for this Flask/PyMongo codebase.

## Current State Analysis

### Test Infrastructure

| Aspect | Current State |
|--------|---------------|
| Test Framework | pytest with coverage via tox |
| Python Versions | py39, py310, py311, py312 |
| Database | Real MongoDB (localhost:27017/letmelearn_test) |
| Test Count | 178 tests across 16 test files |
| Fixtures | Session-scoped `app` and `db`, function-scoped cleanup |

### Database Dependencies

**`letmelearn/data.py`** (lines 47-102):
```python
# Global MongoClient initialization at module import time
DB_CONN = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/letmelearn")
DB_NAME = parse_database_name(DB_CONN)
db = MongoClient(DB_CONN, serverSelectionTimeoutMS=3000)[DB_NAME]

# Schema migrations run on startup
# Index creation on startup
```

**Impact**: Tests import `from letmelearn.data import db` creating a real connection immediately.

### Test Fixtures (`tests/conftest.py`)

- Lines 11-18: Environment setup before app import
- Lines 46-59: Session-scoped `app` and `db` fixtures
- Lines 67-73: Database cleanup after all tests
- Lines 111-162: Auto-use cleanup fixtures for collections

### Critical Findings

1. **No GitHub workflows exist** - Need to create `.github/workflows/` directory
2. **Module-level MongoClient** - Connection happens at import time
3. **Schema migrations** - Run on every startup, modify data
4. **Index creation** - Idempotent operations on startup
5. **178 tests passing** - Significant test coverage to preserve

## Requirements Analysis

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Tests run successfully without MongoDB server | Critical |
| FR-2 | Test results are identical to real MongoDB tests | High |
| FR-3 | CI runs on GitHub Actions for all supported Python versions | High |
| FR-4 | Local development can still use real MongoDB | Medium |
| FR-5 | Test execution time remains acceptable | Medium |

### Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1 | No modification to application code for test mode | High |
| NFR-2 | Minimal changes to existing test files | Medium |
| NFR-3 | Clear documentation for running tests locally vs CI | Medium |
| NFR-4 | Ability to run subset of tests with mocks | Low |

### Edge Cases to Consider

1. **ObjectId handling**: Mock library must support `bson.objectid.ObjectId`
2. **Index creation**: Mock must support `create_index()` operations
3. **Complex queries**: `$elemMatch`, `$set`, `$push`, `$pull` operators
4. **Aggregation pipelines**: Used in stats and feed endpoints
5. **Time-based queries**: Used in session streak calculations
6. **Rate limiting storage**: Flask-Limiter uses MongoDB collection

## Technical Approach Options

### Option A: mongomock (Recommended)

**Description**: In-memory Python implementation of MongoDB API.

**Pros**:
- Native Python, no external dependencies
- Excellent compatibility with PyMongo API
- Fast test execution (no I/O)
- Easy setup via pytest fixture
- Works with existing PyMongo code without changes
- Active maintenance

**Cons**:
- Not 100% MongoDB feature complete
- Some edge cases may differ from real MongoDB
- No persistence (acceptable for tests)

**Implementation Complexity**: Low

**Code Changes Required**:
1. Add `mongomock` to test dependencies
2. Create `tests/conftest_mongomock.py` fixture
3. Modify `tests/conftest.py` to use mock when `MONGODB_URI` is not set or set to `mock://`
4. Handle schema migrations in mock context
5. Create GitHub Actions workflow

**Compatibility Matrix**:

| Feature Used | mongomock Support | Notes |
|--------------|-------------------|-------|
| CRUD operations | Full | All basic operations |
| `find_one`, `find` | Full | With filters |
| `$set`, `$push`, `$pull` | Full | Update operators |
| `$elemMatch` | Full | Query operator |
| `replace_one(upsert=True)` | Full | Used in test_user fixture |
| `create_index` | Supported | Creates in-memory index |
| Aggregation | Partial | Basic pipelines work |
| `bson.ObjectId` | Full | Via pymongo dependency |

### Option B: mongodb-memory-server

**Description**: Spawns real MongoDB in-memory process for tests.

**Pros**:
- Real MongoDB behavior (best fidelity)
- All MongoDB features supported
- Good for integration testing

**Cons**:
- Requires native binary download (may fail in CI)
- Slower startup than mongomock
- More complex setup
- Platform-specific binaries
- Potential CI timeouts

**Implementation Complexity**: Medium

**Code Changes Required**:
1. Add `mongodb-memory-server` dependency
2. Create async fixture for server lifecycle
3. Handle process management in CI
4. Configure binary download caching

### Option C: Interface Mocking (Repository Pattern)

**Description**: Refactor to use repository pattern, mock data layer.

**Pros**:
- Clean architecture
- No database dependency
- Fast unit tests
- Best separation of concerns

**Cons**:
- Major refactoring required
- Changes application code significantly
- Higher implementation cost
- Still need integration tests with real DB

**Implementation Complexity**: High

**Code Changes Required**:
1. Create `Repository` interface/abstract class
2. Create `MongoRepository` implementation
3. Create `MockRepository` for testing
4. Refactor all API code to use repository
5. Dependency injection framework changes

## Recommendation

**Use Option A: mongomock**

### Rationale

1. **Minimal Code Changes**: Only test fixtures need modification
2. **Fast Execution**: In-memory, no process spawn
3. **CI-Friendly**: Pure Python, works everywhere
4. **Compatibility**: Supports all current test operations
5. **Maintainability**: Standard pytest pattern, easy to understand

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| mongomock behavior differs from MongoDB | Add smoke test with real MongoDB in local dev |
| Missing mongomock features | Use real MongoDB for affected tests with `@pytest.mark.real_mongo` |
| Aggregation edge cases | Test aggregations separately, may need real DB |

## Acceptance Criteria

### Must Have (Critical)

- [ ] **AC-1**: Tests pass without MongoDB server running locally
- [ ] **AC-2**: GitHub Actions workflow runs all tests successfully
- [ ] **AC-3**: All 178 existing tests pass with mongomock
- [ ] **AC-4**: `tox` runs successfully across all Python versions (py39-py312)
- [ ] **AC-5**: `make test` continues to work locally with real MongoDB
- [ ] **AC-6**: Schema migrations handled correctly in mock environment

### Should Have (High)

- [ ] **AC-7**: Test execution time under 60 seconds total
- [ ] **AC-8**: Clear documentation in README about test modes
- [ ] **AC-9**: Ability to run subset of tests without MongoDB

### Nice to Have (Medium)

- [ ] **AC-10**: Optional real MongoDB tests with `@pytest.mark.integration`
- [ ] **AC-11**: Pre-commit hook for running tests locally

## Implementation Plan

### Phase 1: Core Changes (Estimated: 2-3 hours)

1. **Add mongomock dependency**
   - Add to `requirements.txt` or create `requirements-test.txt`
   - Add `mongomock` to tox dependencies

2. **Modify `tests/conftest.py`**
   - Add MongoDB mock detection (environment variable or missing server)
   - Create `get_db()` factory that returns mock or real client
   - Handle schema migrations in mock context
   - Handle rate limiter storage in mock context

3. **Modify `letmelearn/data.py`**
   - Make MongoClient initialization lazy/conditional
   - Or create `get_db()` function to use in tests

4. **Create GitHub Actions workflow**
   - `.github/workflows/test.yml`
   - Test matrix for py39-py312
   - No services needed (mongomock)

### Phase 2: Documentation (Estimated: 1 hour)

1. **Update README.md**
   - Document local test setup with MongoDB
   - Document CI test setup with mongomock

2. **Update CLAUDE.md**
   - Add test mode documentation

### Phase 3: Validation (Estimated: 1-2 hours)

1. **Run full test suite locally**
   - Verify all 178 tests pass
   - Verify with real MongoDB still works

2. **Run in GitHub Actions**
   - Create PR with changes
   - Verify CI passes

3. **Edge case testing**
   - Test aggregations work correctly
   - Test ObjectId handling
   - Test index creation

## Task Breakdown

Based on this analysis, the TODO.md task should be split into:

### Task 1: Add mongomock test infrastructure
- Add mongomock to test dependencies
- Modify conftest.py for mock support
- Update data.py for lazy initialization
- Estimated: 2-3 hours

### Task 2: Create GitHub Actions workflow
- Create `.github/workflows/test.yml`
- Configure matrix for py39-py312
- Estimated: 30 minutes

### Task 3: Update documentation
- Update README.md with test instructions
- Update CLAUDE.md with CI information
- Estimated: 1 hour

### Task 4: Validate and fix edge cases
- Run full test suite
- Fix any mongomock compatibility issues
- Estimated: 1-2 hours

## Questions for User

### 1. Mock vs Real MongoDB Preference

Should local development use:
- **Option A**: Always use real MongoDB (current behavior)
- **Option B**: Allow mongomock for faster unit tests
- **Option C**: Use environment variable to choose

**Recommendation**: Option A - Keep real MongoDB for local dev, mongomock for CI.

### 2. Integration Tests

Should we add a separate integration test suite that requires real MongoDB?

- **Option A**: No, unit tests are sufficient
- **Option B**: Yes, with `@pytest.mark.integration` decorator
- **Option C**: Yes, in separate `tests/integration/` directory

**Recommendation**: Option B for future expansion, not required for this task.

### 3. CI Trigger Events

Which events should trigger CI tests?

- Push to main branch?
- Push to feature branches?
- Pull requests?

**Recommendation**: Pull requests and pushes to main branch.

## Dependencies

### New Dependencies Required

| Package | Version | Purpose |
|---------|---------|---------|
| mongomock | ^4.1 | In-memory MongoDB for tests |

### No New Runtime Dependencies

Mongomock is a test-only dependency, no production impact.

## Files to Modify

| File | Changes |
|------|---------|
| `tests/conftest.py` | Add mongomock detection, create mock db fixture |
| `letmelearn/data.py` | Make MongoClient initialization testable |
| `requirements.txt` or new `requirements-test.txt` | Add mongomock |
| `tox.ini` | Add mongomock to test dependencies |
| `.github/workflows/test.yml` | Create (new file) |
| `README.md` | Add test documentation |
| `CLAUDE.md` | Add CI/test documentation |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| mongomock missing features | Medium | Medium | Smoke test, fallback to real DB |
| Different query behavior | Low | Low | Extensive test validation |
| Schema migration issues | Low | Medium | Mock migrations separately |
| CI flakiness | Low | Medium | Add retry logic, cache dependencies |