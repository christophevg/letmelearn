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

### Phase 1: Backend - Session Tracking (prio:1)

- [ ] Create `sessions` MongoDB collection with indexes
  - Index on `{ "user": 1, "started_at": -1 }`
  - Index on `{ "user": 1, "status": 1 }`
  - Index on `{ "user": 1, "kind": 1, "status": 1, "started_at": -1 }`
  - Acceptance: All indexes created and verified

- [ ] Implement `POST /api/sessions` endpoint (RESTful create)
  - Check for active session and auto-stop if exists
  - Create new session with status "active"
  - Return 201 with session_id, started_at, and status
  - Acceptance: Endpoint returns correct response, handles concurrent sessions

- [ ] Implement `PATCH /api/sessions/{id}` endpoint (RESTful update)
  - Validate session belongs to current user
  - Accept status in request body ("completed" or "abandoned")
  - Compute elapsed time from started_at
  - Update session with quiz metrics
  - Acceptance: Elapsed time computed correctly, session state transitions correctly

- [ ] Implement `GET /api/sessions/current` endpoint
  - Return active session for current user or null
  - Acceptance: Returns session when active, null otherwise

### Phase 2: Backend - Statistics (prio:1)

- [ ] Implement streak computation logic
  - Use Belgium/Europe timezone for day boundaries
  - Aggregate quiz time per day
  - Count consecutive days with 15+ min quiz time
  - Acceptance: Streak computed correctly across timezone boundaries

- [ ] Implement `GET /api/stats/streak` endpoint
  - Return streak count, today's minutes, streak_risk, risk_level
  - Handle risk level calculation (none/low/medium/high)
  - Acceptance: Returns correct streak data, handles new users gracefully

- [ ] Implement `GET /api/stats/weekly` endpoint
  - Use calendar week (Mon-Sun) in Belgium timezone
  - Aggregate quizzes, correct, attempts, accuracy, time_minutes
  - Acceptance: Returns correct weekly stats, handles start of week correctly

### Phase 3: Frontend - Store Modules (prio:1)

- [ ] Create `sessions` Vuex module
  - State: currentSessionId, sessionStartTime
  - Actions: startSession, stopSession, checkCurrentSession
  - Mutations: sessionStarted, sessionStopped, sessionResumed
  - Acceptance: Module handles session lifecycle correctly

- [ ] Create `stats` Vuex module
  - State: streak, weekly, loading, error
  - Actions: loadStats, refreshAfterQuiz
  - Getters: streak, weekly, streakRisk, riskLevel
  - Acceptance: Stats load and update correctly

### Phase 4: Frontend - Components (prio:1)

- [ ] Create `StatsCards` Vue component
  - Four stat cards: Streak, Activity, Accuracy, Time
  - Responsive layout (4 columns on desktop, 2x2 on mobile)
  - Risk level styling (colors based on risk_level)
  - Loading skeleton states
  - Acceptance: Cards display correctly on all screen sizes

- [ ] Integrate StatsCards into Advalvas page
  - Add above feed section
  - Load stats on page mount
  - Refresh stats after quiz completion
  - Acceptance: Stats display and update correctly

### Phase 5: Frontend - Session Integration (prio:1)

- [ ] Integrate session tracking in quiz page
  - Call startSession when quiz begins
  - Call stopSession when quiz ends
  - Handle page unload (beforeunload event)
  - Handle session resume on page load
  - Acceptance: Sessions tracked correctly through quiz lifecycle

- [ ] Integrate session tracking in training page
  - Similar to quiz integration
  - Training sessions marked with kind="training"
  - Acceptance: Training sessions tracked correctly

- [ ] Handle edge cases for session tracking
  - Browser tab close (beforeunload)
  - Browser crash (server-side 5-min timeout)
  - Network failure during stop (retry logic)
  - Acceptance: Sessions not lost in edge cases

### Phase 6: Testing & Documentation (prio:2)

- [ ] Write backend unit tests
  - Test streak computation with various scenarios
  - Test session lifecycle (start, stop, concurrent)
  - Test timezone handling
  - Acceptance: All tests pass, coverage > 80%

- [ ] Write backend integration tests
  - Test API endpoints with authenticated requests
  - Test stats aggregation
  - Acceptance: All integration tests pass

- [ ] Update documentation
  - Update `docs/architecture.md` with new endpoints
  - Add usage examples for session API
  - Document timezone assumptions
  - Acceptance: Documentation reflects current implementation

---

## Fix

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

- [ ] add streak freeze feature (prio:0)
  - Protect streak for one day if user misses goal
  - Max 2 consecutive freezes
  - Requires `frozen_days` array in user document
  - Postponed until core streak feature is implemented
- [ ] share topics with other users (prio:0)
- [ ] enable following of other users (prio:0)
  - [ ] see results in feed (prio:0)
- [ ] search/filter topics by all aspects (name, tags,...) (prio:0)

---

## Done

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