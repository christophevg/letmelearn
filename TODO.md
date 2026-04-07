# TODO

## Priority Order

| Priority | Meaning |
|----------|---------|
| prio:1 | Most urgent - do first |
| prio:2-4 | Medium priority |
| prio:5 | Nice to have |
| prio:0 | Unprioritized - lowest |

---

## Backlog

### Fix

- [ ] fill In Question: text size according to width when xs (prio:0)

## Improve

### General

- [ ] create AbstractQuestion base class (prio:0)
- [ ] add testing (prio:0)
- [ ] generic error catch-all (prio:0)
  - [ ] start up (prio:0)
- [ ] generic error reporting (prio:0)
- [ ] on db connection failure (prio:0)
- [ ] use ProtectedPage baseweb plugin (prio:0)
- [ ] add proper internationalisation (https://kazupon.github.io/vue-i18n) (prio:0)
- [ ] make import more robust (prio:0)
  - [ ] extract common parsing logic (prio:0)

### Ad Valvas Dashboard

#### UX Improvements

- [ ] add empty feed state with friendly message (prio:0)
- [ ] group feed items by date (Today, Yesterday, This week, Older) (prio:2)
- [ ] add filter chips: All / Quizzes / Training / New Topics (prio:2)
- [ ] add pagination or infinite scroll (API currently limits to 10 items) (prio:0)

#### Maintainability

- [ ] move news items to config file or backend collection (prio:0)
- [ ] add ability to dismiss/acknowledge seen news items (prio:0)
- [ ] add loading states / skeleton loaders (prio:0)

## Extend

- [ ] add streak freeze feature (prio:2)
  - Protect streak for one day if user misses goal
  - Max 2 consecutive freezes
  - Requires `frozen_days` array in user document
  - Postponed until core streak feature is implemented
- [ ] share topics with other users (prio:0)
- [ ] search/filter topics by all aspects (name, tags,...) (prio:0)

### API Review Fixes (from api-architect review) - Low Priority

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

### Phase 7: Social Feed System - API Review Fixes

- [x] Fix email as path parameter in `/api/following` (prio:1)
  - Issue: Email addresses cause URL encoding issues with `@` and `.` characters
  - Fix: Changed `<path:email>` to `<string:email>`

- [x] Fix schema inconsistency in `following` field type (prio:1)
  - Issue: `following` field has different types in POST vs DELETE responses
  - Fix: DELETE now returns UserInfo object

- [x] Fix OpenAPI schema mismatch for FollowingStreak (prio:1)
  - Issue: OpenAPI schema uses `user` object but implementation returns flat fields
  - Fix: Implementation now wraps user info in `user` object

- [x] Implement RFC 7807 Problem Details for errors (prio:2)
  - Issue: Errors use Flask's `abort()` returning plain text, not structured format
  - Fix: Created `letmelearn/errors.py` module, updated all `abort()` calls, updated frontend `ajax.js`
  - Added `/errors` documentation page with human-friendly descriptions

- [x] Increase minimum search prefix length (prio:2)
  - Issue: User enumeration vulnerability - 2 character minimum is too short
  - Fix: Changed minimum from 2 to 3 characters

- [x] Add privacy setting for streak visibility (prio:2)
  - Issue: `/api/stats/following/streaks` exposes streak data without user consent
  - Fix: Already implemented correctly - endpoint only returns streaks for users the authenticated user follows

- [x] Add 422 Unprocessable Entity for business rule violations (prio:2)
  - Issue: Uses 400 for business rule violations, 422 is more semantic
  - Fix: Changed "Cannot follow yourself" from 400 to 422

### Phase 7: Social Feed System - Frontend

- [x] Create UserSearch component (prio:1)
  - Search for users by email
  - Display follow/unfollow button

- [x] Create FollowingStreaks component (prio:1)
  - Display followed users' streaks
  - Sort by streak descending
  - Show today's practice time

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