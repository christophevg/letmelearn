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

### Phase 4: Frontend - Components (prio:1)

- [x] Create `StatsCards` Vue component
  - Four stat cards: Streak, Activity, Accuracy, Time
  - Responsive layout (4 columns on desktop, 2x2 on mobile)
  - Risk level styling (colors based on risk_level)
  - Loading skeleton states
  - Acceptance: Cards display correctly on all screen sizes

- [x] Integrate StatsCards into Advalvas page
  - Add above feed section
  - Load stats on page mount
  - Refresh stats after quiz completion
  - Acceptance: Stats display and update correctly

### Phase 5: Frontend - Session Integration (prio:1)

- [x] Integrate session tracking in quiz page
  - Call startSession when quiz begins
  - Call stopSession when quiz ends
  - Handle page unload (beforeunload event)
  - Handle session resume on page load
  - Acceptance: Sessions tracked correctly through quiz lifecycle

- [x] Integrate session tracking in training page
  - Similar to quiz integration
  - Training sessions marked with kind="training"
  - Acceptance: Training sessions tracked correctly

- [x] Handle edge cases for session tracking
  - Browser tab close (beforeunload)
  - Browser crash (server-side 5-min timeout)
  - Network failure during stop (retry logic)
  - Acceptance: Sessions not lost in edge cases

### Phase 6: Testing & Documentation (prio:2)

- [x] Write backend unit tests
  - Test streak computation with various scenarios
  - Test session lifecycle (start, stop, concurrent)
  - Test timezone handling
  - Acceptance: All tests pass, coverage > 80%

- [x] Write backend integration tests
  - Test API endpoints with authenticated requests
  - Test stats aggregation
  - Acceptance: All integration tests pass

- [x] Fix OAuth mocking for tests
  - Mock requests.get to prevent oatk network calls
  - Disable Flask-Login session protection in tests
  - Fix ObjectId type mismatches in database queries
  - Acceptance: All 32 tests pass

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

- [x] Phase 3: Frontend - Store Modules
  - [x] Create `sessions` Vuex module (SessionsStore.js)
  - [x] Create `stats` Vuex module (StatsStore.js)
  - [x] Register store modules in web.py

- [x] Phase 1: Backend - Session Tracking
  - [x] Create `sessions` MongoDB collection with indexes
  - [x] Implement `POST /api/sessions` endpoint
  - [x] Implement `PATCH /api/sessions/{id}` endpoint
  - [x] Implement `GET /api/sessions/current` endpoint

- [x] Phase 2: Backend - Statistics
  - [x] Implement streak computation logic
  - [x] Implement `GET /api/stats/streak` endpoint
  - [x] Implement `GET /api/stats/weekly` endpoint

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