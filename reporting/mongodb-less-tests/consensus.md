# Consensus Report: MongoDB-less Tests Implementation

**Date**: 2026-04-10
**Task**: Tests should be able to run without real MongoDB (prio:1)
**Analysts**: functional-analyst, api-architect, ui-ux-designer

## Consensus Summary

All three domain analysts **agree** on the approach to enable tests to run without a real MongoDB server using `mongomock`.

### Agent Recommendations

| Agent | Recommendation | Key Concerns |
|-------|----------------|--------------|
| functional-analyst | Use mongomock | Implementation plan with 5 sub-tasks |
| api-architect | Proceed with mongomock | Aggregation timezone handling, data.py refactoring priority |
| ui-ux-designer | Approved | No UI/UX impact, browser tests unaffected |

## Agreed Implementation Approach

### Technology Choice: mongomock

**Rationale**:
- Minimal code changes (only test fixtures)
- Fast execution (in-memory, no I/O)
- CI-friendly (pure Python, no external dependencies)
- Good compatibility with current test operations

### Task Breakdown (from TODO.md)

1. **Add mongomock to test dependencies** (prio:1)
2. **Modify conftest.py for mock MongoDB support** (prio:1)
3. **Make MongoClient initialization testable** (prio:1)
4. **Create GitHub Actions workflow** (prio:1)
5. **Update documentation for test modes** (prio:2)

### Critical Implementation Notes

From API Architect review:

1. **Data Layer Refactoring (Priority: HIGH)**
   - `data.py` must be refactored to lazy initialization
   - Module-level MongoClient prevents mock injection
   - Use `get_db()` function or test injection pattern

2. **Aggregation Compatibility**
   - `$dateToString` with `timezone` parameter may have limited mongomock support
   - Stats module uses timezone-aware aggregations
   - Add dedicated compatibility tests
   - Consider `@pytest.mark.aggregation` markers for selective skipping

3. **Rate Limiting**
   - Already disabled in test mode - not a concern

4. **Schema Migrations**
   - Should work with mongomock
   - Add explicit test to verify

## Acceptance Criteria (Agreed)

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-1 | Tests pass without MongoDB server running | Critical |
| AC-2 | GitHub Actions workflow runs all tests successfully | Critical |
| AC-3 | All 178 existing tests pass with mongomock | Critical |
| AC-4 | tox runs across py39-py312 | Critical |
| AC-5 | make test works locally with real MongoDB | Critical |
| AC-6 | Schema migrations handled in mock context | Critical |
| AC-7 | Test execution under 60 seconds | High |
| AC-8 | Documentation updated | High |

## Risk Mitigation (Agreed)

| Risk | Mitigation |
|------|------------|
| Aggregation timezone operators | Add dedicated tests, use markers for selective skip in CI |
| Module-level db initialization | Refactor data.py first (blocking dependency) |
| Different mock vs real DB behavior | Keep real MongoDB as fallback for local dev |
| CI flakiness | Add retry logic, cache dependencies |

## Files to Modify

| File | Changes |
|------|---------|
| `letmelearn/data.py` | Lazy initialization or injection pattern |
| `tests/conftest.py` | Mock detection, fixture creation |
| `requirements.txt` or `requirements-test.txt` | Add mongomock |
| `tox.ini` | Add mongomock dependency |
| `.github/workflows/test.yml` | Create new (CI workflow) |
| `README.md` | Test documentation |
| `CLAUDE.md` | CI information |

## Implementation Order

1. **Phase 1**: Core Infrastructure (3-4 hours)
   - Refactor data.py
   - Add mongomock dependency
   - Modify conftest.py

2. **Phase 2**: Validation (2 hours)
   - Run test suite
   - Add aggregation tests
   - Add test markers

3. **Phase 3**: CI Setup (30 minutes)
   - Create GitHub Actions workflow
   - Configure environment

4. **Phase 4**: Documentation (1 hour)
   - Update README.md
   - Update CLAUDE.md

## Consensus Status

**APPROVED** - All agents agree on the approach. Ready for implementation.