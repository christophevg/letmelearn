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

*Unsorted and pending tasks. Ready for prioritization.*

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
