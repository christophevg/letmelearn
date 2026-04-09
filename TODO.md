# TODO

This document tracks all tasks for Let Me Learn: current work, backlog, and completed items.

## Workflow

### TODO Management (this document)

1. **Add** — User adds rough task outlines to the "Backlog" section
2. **Refine** — Review expands tasks with clear descriptions and acceptance criteria
3. **Prioritize** — User assigns priorities using `prio:N` tags (see table below)
4. **Work** — Work proceeds on tasks by priority (prio:1 first) OR by user's explicit instructions
5. **Complete** — When done, mark `[x]` AND move to the "Done" section with completion date

### Task Development (when starting work)

1. Ensure task has clear description and acceptance criteria
2. Create `analysis/` folder notes if complex analysis needed
3. Create `reporting/{task-slug}/` folder for implementation notes
4. Work through task, updating status as needed
5. Mark as complete and move to Done section

## Priority System

| Priority | Meaning | Behavior |
|----------|---------|----------|
| `prio:1` | Most urgent | Work on this first |
| `prio:2-4` | Medium | Work after prio:1 items |
| `prio:5` | Nice to have | Work when no higher priority items |
| `prio:0` | Unprioritized | Default if no priority specified |

**Note**: Items without an explicit priority tag default to `prio:0` (lowest priority).

---

## Current Work

*Tasks being actively worked on. Check the checkbox when starting work.*

(None - ready for next task)

---

## Backlog

### Flask Limiter app statics (prio:1)

Flask Limiter currently also track app static files (component JS, pages JS,...). These should at least be exempt, because simply loading a page takes up roughly 25 calls. With 50 calls per hour limit, refreshing the page twice ends the session. A better selection of rate limited pages is required. I've disabled the feature for now.

### Linting (prio:1)

Run `make lint` to perform ruff linting. Please fix.

### Running test suite produces ignored exception (prio:1)

```console
Exception ignored in thread started by: <bound method Thread._bootstrap of <Thread(pymongo_kill_cursors_thread, started daemon 6135508992)>>
Traceback (most recent call last):
  File "/Users/xtof/.pyenv/versions/3.11.12/lib/python3.11/threading.py", line 1002, in _bootstrap
    self._bootstrap_inner()
  File "/Users/xtof/.pyenv/versions/3.11.12/lib/python3.11/threading.py", line 1049, in _bootstrap_inner
    self._delete()
  File "/Users/xtof/.pyenv/versions/3.11.12/lib/python3.11/threading.py", line 1081, in _delete
    del _active[get_ident()]
        ~~~~~~~^^^^^^^^^^^^^
KeyError: 4496054080
```

### FLASK_ENV handling (prio:1)

Isn't it a better idea to make production the default? This should be the most restrictive and if we want a less restrictive development or testing environment this should be set explicitly?! Now if FLASK_ENV is not explicitly set to "production", the default is development, not something you want in actual production. Or am I misreading the code?

### Bug: bugs/session-registration (prio:1)

- [ ] review bug
- [ ] check ongoing migration from feed to session

### Code Review Fixes (Critical - prio:1)

*Security issues from baseline code review (2026-04-09)*

- [x] Remove default secret key "local" from production code (prio:1)
  - **Issue**: `web.py:72` has hardcoded default secret key
  - **Fix**: Created `config.py` with `get_secret_key()` that fails in production without APP_SECRET_KEY
  - **File**: `letmelearn/web.py`, `letmelearn/config.py`

- [x] Fix regex injection vulnerability in user search (prio:1)
  - **Issue**: `api/follows.py:318` uses MongoDB `$regex` with user input - potential ReDoS
  - **Fix**: Added `escape_regex_pattern()` to escape special characters before regex query
  - **File**: `letmelearn/api/follows.py`

- [x] Add production safeguard for TEST_MODE (prio:1)
  - **Issue**: `oauth.py:16` bypasses OAuth with simple string comparison
  - **Fix**: Created `is_test_mode_allowed()` that raises RuntimeError if TEST_MODE in production
  - **File**: `letmelearn/oauth.py`, `letmelearn/config.py`

### Code Review Fixes (High - prio:2)

- [ ] Fix MongoDB connection string parsing (prio:2)
  - **Issue**: `data.py:8-9` uses fragile string splitting for DB name extraction
  - **Fix**: Use `urllib.parse.urlparse` for proper parsing
  - **File**: `letmelearn/data.py`

- [ ] Restrict test mode login to test accounts only (prio:2)
  - **Issue**: `api/session.py:34-41` allows login with any existing email in test mode
  - **Fix**: Add test-user whitelist or restriction
  - **File**: `letmelearn/api/session.py`

- [ ] Fix schema migration to run only when needed (prio:2)
  - **Issue**: `data.py:21-40` runs migration on every startup
  - **Fix**: Add version check before running migration
  - **File**: `letmelearn/data.py`

- [ ] Fix Items endpoint to return proper 404 (prio:2)
  - **Issue**: `api/topics.py:213-221` returns `None` instead of error for non-existent topics
  - **Fix**: Return proper RFC 7807 error response
  - **File**: `letmelearn/api/topics.py`

- [ ] Fix JSON comparison in item update query (prio:2)
  - **Issue**: `api/topics.py:236-247` uses JSON.stringify comparison - fragile
  - **Fix**: Use proper MongoDB query for item matching
  - **File**: `letmelearn/api/topics.py`

- [ ] Add rate limiting to authentication endpoints (prio:2)
  - **Issue**: No rate limiting on `/api/session` POST - vulnerable to brute force
  - **Fix**: Add rate limiting middleware
  - **Files**: Multiple API files

### Code Review Fixes (Medium - prio:3)

- [ ] Extract streak calculation to service class (prio:3)
  - **Issue**: Complex logic in `api/stats.py:26-118` endpoint
  - **Fix**: Move to separate service class for testability
  - **File**: `letmelearn/api/stats.py`

- [ ] Fix shuffle algorithm in TopicsStore (prio:3)
  - **Issue**: `TopicsStore.js:167` uses biased `Math.random() - 0.5`
  - **Fix**: Implement Fisher-Yates shuffle algorithm
  - **File**: `letmelearn/components/TopicsStore.js`

- [ ] Fix template literal syntax in topics.js (prio:3)
  - **Issue**: `pages/topics.js:188` has template literal without backticks
  - **Fix**: Use proper backtick syntax
  - **File**: `letmelearn/pages/topics.js`

- [ ] Extract duplicated topic lookup logic (prio:3)
  - **Issue**: `api/feed.py:78-110` has duplicated topic name resolution
  - **Fix**: Extract to helper function
  - **File**: `letmelearn/api/feed.py`

- [ ] Make timezone configurable (prio:3)
  - **Issue**: "Europe/Brussels" hardcoded in `api/stats.py`
  - **Fix**: Add `TIMEZONE` environment variable
  - **File**: `letmelearn/api/stats.py`

### Code Review Fixes (Low - prio:4)

- [ ] Add Python type hints throughout codebase (prio:4)
  - **Benefit**: Better IDE support and code documentation

- [ ] Resolve TODO comments in codebase (prio:4)
  - `pages/topics.js:321` - virtual root folder
  - `components/TopicsStore.js:343` - window.hash cleanup

- [ ] Add pytest markers for slow tests (prio:4)
  - **Benefit**: Allow selective test running

- [ ] Apply consistent import ordering with isort (prio:4)
  - **Issue**: Mixed `import` and `from` ordering across files

### Test Coverage Gaps (prio:3)

- [ ] Add frontend Jest tests for Vuex store modules (prio:3)
- [ ] Add test for invalid ObjectId edge cases (prio:3)
- [ ] Add test for session auto-stop behavior (concurrency) (prio:3)
- [ ] Add test for schema version migration (prio:3)
- [ ] Add tests for database connection failures (prio:3)

### Session Improvements (prio:2)

*Feature enhancements for session tracking and feedback.*

- [ ] Session feedback to user (prio:2)
  - **Description**: After completing a session, show a feedback page with session statistics
  - **Requirements**:
    - Base feedback on actual recorded session data
    - Show stats improvements explicitly
    - Add encouragement for streak maintenance
  - **API Dependency**: Enhanced GET endpoint for session feedback

- [ ] Session detailed tracking (prio:3)
  - **Description**: Track individual questions as they are answered during a session
  - **Requirements**:
    - Record question-level progress in real-time
    - Provide partial information on abandonment
    - Requires `questions` array in session document
  - **API Dependency**: New PATCH endpoint for question tracking
  - **Security Dependency**: Rate limiting (H6) must be implemented first

### New stats: e.g. answers/minute (prio: 2)

Tracking the number of answers per minute gives an indication of the speed of the user, which is a measure for his/her ability. Research other possible statistics we can capture/compute with respect to learning.

### New Auth mechanism: magic email link (prio: 3)

### User sign up and admin pages (prio:3 )

- Record information from new users (include humand detection)
- store in collection
- provide admin page for review and approve

### General Improvements

- [ ] fill In Question: text size according to width when xs (prio:0)
- [ ] create AbstractQuestion base class (prio:0)
- [ ] generic error catch-all (prio:0)
  - [ ] start up (prio:0)
- [ ] generic error reporting (prio:0)
- [ ] on db connection failure (prio:0)
- [ ] use ProtectedPage baseweb plugin (prio:0)
- [ ] add proper internationalisation (https://kazupon.github.io/vue-i18n) (prio:0)
- [ ] make import more robust (prio:0)
  - [ ] extract common parsing logic (prio:0)

### Ad Valvas Dashboard

#### Fix

- [x] When the "alternate identity" feature is used, all sections in the advalvas dashboard (stats, feed, socials) should be updated accordingly (prio:1)

#### UX Improvements

- [ ] add empty feed state with friendly message (prio:2)
  - **Acceptance Criteria**:
    - GIVEN a new user with no activity
    - WHEN they view the Ad Valvas page
    - THEN they should see a friendly welcome message
    - AND a prominent "Create your first topic" call-to-action
  - **Critical for**: First-time user experience and onboarding

- [ ] group feed items by date (Today, Yesterday, This week, Older) (prio:2)
  - **Acceptance Criteria**:
    - Items grouped into collapsible sections with item count in header
    - "Today" = items from today
    - "Yesterday" = items from yesterday
    - "This Week" = items from past 7 days (excluding today/yesterday)
    - "Older" = all other items

- [ ] add filter chips: All / Quizzes / Training / New Topics (prio:2)
  - **Note**: Combine with existing mode toggles into cohesive filter bar

- [ ] add pagination or infinite scroll (API currently limits to 10 items) (prio:2)
  - **Acceptance Criteria**:
    - Users can view history beyond most recent 10 items
  - **Options**: Load-more button, infinite scroll, or dedicated history page
  - **Backend Dependency**: Requires cursor-based pagination implementation

#### Maintainability

- [ ] move news items to config file or backend collection (prio:0)
- [ ] add ability to dismiss/acknowledge seen news items (prio:0)
- [ ] add loading states / skeleton loaders (prio:0)

#### Accessibility

- [ ] add keyboard navigation for identity dropdown (prio:0)
  - **Description**: Ensure identity selection is fully keyboard accessible
  - **Acceptance Criteria**:
    - Tab navigates through identity options
    - Enter/Space selects identity
    - Escape closes dropdown without selecting
    - Focus preserved after selection

- [ ] add screen reader announcements for identity switch (prio:0)
  - **Description**: Announce context changes for screen readers
  - **Acceptance Criteria**:
    - Announce "Now viewing {name}'s progress" on switch
    - Announce when data loading completes

### Feature Extensions

- [ ] add streak freeze feature (prio:3)
  - **Description**: Protect streak for one day if user misses goal
  - **Requirements**:
    - Max 2 consecutive freezes
    - Requires `frozen_days` array in user document
  - **Acceptance Criteria**:
    - GIVEN a user with an active streak
    - WHEN they miss their daily goal but have a streak freeze available
    - THEN their streak should be preserved for that day
    - AND the freeze count should decrement
  - **Dependency**: Requires core streak feature to be stable

- [ ] share topics with other users (prio:0)
- [ ] search/filter topics by all aspects (name, tags,...) (prio:0)

### API Review Fixes (Low Priority)

*Technical debt items from api-architect review.*

- [ ] Add rate limiting (prio:0)
  - Recommendation: add rate limiting
  - File: `letmelearn/follows.py` (lines 310-314)

- [ ] Add email format validation (prio:0)
  - Issue: No validation on email format in search endpoint
  - Recommendation: Add regex validation for email format
  - File: `letmelearn/follows.py`

- [ ] Add pagination for collection endpoints (prio:0)
  - Issue: `/api/following` and `/api/followers` return unbounded arrays
  - Recommendation: Add cursor-based pagination with `data` and `pagination` fields
  - Files: `letmelearn/follows.py`, `docs/openapi.yaml`

- [ ] Add documentation for rate limiting and privacy policy (prio:0)
  - Issue: Missing documentation in OpenAPI spec
  - Recommendation: Document rate limits, privacy policy, pagination behavior
  - File: `docs/openapi.yaml`

---

## Done

*All completed tasks. Items are marked [x] and archived here with completion date.*

### 2026-04-09: Critical Security Fixes (C1, C2, C3)

- [x] Remove default secret key "local" from production code
  - Created `letmelearn/config.py` with environment detection and validation
  - Implemented `get_secret_key()` that fails in production without APP_SECRET_KEY
  - Development/testing generates random key with warning
- [x] Fix regex injection vulnerability in user search
  - Added `escape_regex_pattern()` function using `re.escape()`
  - Applied escaping to user input in UserSearch endpoint
- [x] Add production safeguard for TEST_MODE
  - Implemented `is_test_mode_allowed()` with production guard
  - Raises RuntimeError if TEST_MODE=true in production
- [x] Created comprehensive test suite (38 tests in `tests/test_security.py`)
- [x] All 178 tests pass
- Summary: reporting/security-fixes/development-summary.md

### 2026-04-09: Alternate Identity Dashboard Fix

- [x] Fix alternate identity dashboard to refresh all sections when switching identities
- [x] Frontend: Added loadStats and loadAllFollows dispatches to load_user_data()
- [x] Frontend: Added identitySwitching state management
- [x] Frontend: Fixed null check for session.identities
- [x] Backend: NOT NEEDED - all endpoints already use current_user.identity.email correctly
- [x] All 138 tests pass
- [x] Code review approved
- Summary: reporting/alternate-identity-dashboard/summary.md

### 2026-04-08: OpenAPI Schema Validation Helper

- [x] Created manual schema validation helper (tests/helpers/schema_validator.py)
- [x] Added jsonschema dependency for proper schema validation
- [x] Created tests/test_schemas.py with 16 schema validation tests
- [x] All 138 tests pass
- [x] Rejected schemathesis (parametrized tests unreliable, no real schema validation)

### 2026-04-08: Backend Testing Infrastructure

- [x] Create API sub-module for better code organization
- [x] Simplify OAuth testing with TEST_MODE
- [x] Update OpenAPI Error schema to RFC 7807 format
- [x] Create test_auth.py with session management tests (17 tests)
- [x] Create test_folders.py with CRUD tests (9 tests)
- [x] Create test_topics.py with CRUD tests (18 tests)
- [x] Create test_feed.py with mode parameter tests (14 tests)
- [x] Create test_users.py with search tests (7 tests)
- [x] Create test_errors.py for RFC 7807 compliance (6 tests)
- [x] Extend test_stats.py with following streaks tests (6 tests)
- [x] Fix FeedStore.js default mode from "all" to "my"
- [x] Fix deprecation warnings (logger.warn → logger.warning)

### Phase 7: Social Feed System - API Review Fixes

- [x] Fix email as path parameter in `/api/following` (prio:1)
- [x] Fix schema inconsistency in `following` field type (prio:1)
- [x] Fix OpenAPI schema mismatch for FollowingStreak (prio:1)
- [x] Implement RFC 7807 Problem Details for errors (prio:2)
- [x] Increase minimum search prefix length (prio:2)
- [x] Add privacy setting for streak visibility (prio:2)
- [x] Add 422 Unprocessable Entity for business rule violations (prio:2)

### Phase 7: Social Feed System - Frontend

- [x] Create UserSearch component (prio:1)
- [x] Create FollowingStreaks component (prio:1)
- [x] Update `docs/openapi.yaml` with social endpoints (prio:1)
- [x] Update `analysis/api.md` with social feed analysis (prio:1)
- [x] Create `FollowsStore` Vuex module
- [x] Modify `FeedStore` for mode support
- [x] Add frontend tests to tests.js
- [x] Create `FollowButton` component
- [x] Modify Advalvas page for feed modes
- [x] Remove dual-write from quiz.js and training.js
- [x] Fix JSON serialization for feed aggregation

### Phase 7: Social Feed System - Backend

- [x] Create `follows` MongoDB collection with indexes
- [x] Implement `POST /api/following/{email}` endpoint
- [x] Implement `DELETE /api/following/{email}` endpoint
- [x] Implement `GET /api/following` endpoint
- [x] Implement `GET /api/followers` endpoint
- [x] Modify `GET /api/feed` to support `mode` parameter
- [x] Implement `GET /api/stats/following/streaks` endpoint
- [x] Write backend unit tests (tests/test_follows.py)

### Phase 6: Testing & Documentation

- [x] Write backend unit tests
- [x] Write backend integration tests
- [x] Fix OAuth mocking for tests
- [x] Update documentation

### Phase 5: Frontend - Session Integration

- [x] Integrate session tracking in quiz page
- [x] Integrate session tracking in training page
- [x] Handle edge cases for session tracking

### Phase 4: Frontend - Components

- [x] Create StatsCards Vue component
- [x] Integrate StatsCards into Advalvas page

### Phase 3: Frontend - Store Modules

- [x] Create `sessions` Vuex module (SessionsStore.js)
- [x] Create `stats` Vuex module (StatsStore.js)
- [x] Register store modules in web.py

### Phase 2: Backend - Statistics

- [x] Implement streak computation logic
- [x] Implement `GET /api/stats/streak` endpoint
- [x] Implement `GET /api/stats/weekly` endpoint

### Phase 1: Backend - Session Tracking

- [x] Create `sessions` MongoDB collection with indexes
- [x] Implement `POST /api/sessions` endpoint
- [x] Implement `PATCH /api/sessions/{id}` endpoint
- [x] Implement `GET /api/sessions/current` endpoint

### Other

- [x] clear dialogs on dismissal
  - [x] create topic
- [x] new tree/folder-based TopicSelector
- [x] track results
  - [x] create feed -> ad valvas
- [x] implement FillInQuestion
- [x] generic error catch-all
  - [x] all API calls
- [x] design API contracts for session tracking and statistics
  - [x] create OpenAPI specification (docs/openapi.yaml)
  - [x] create API analysis document (analysis/api.md)
  - [x] update TODO.md with implementation tasks
