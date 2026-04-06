# API Analysis: Session Tracking and Statistics

This document provides a detailed analysis of the session tracking and statistics API design for Let Me Learn.

## Overview

The API adds gamification features to encourage daily engagement through:
- Session tracking for quiz and training activities
- Streak computation based on daily activity
- Weekly statistics for progress monitoring

## RESTful Design Analysis

### Problem: RPC-style Endpoints

The original proposal used RPC-style endpoints:

```
POST /api/sessions/start    # Action: start
POST /api/sessions/stop     # Action: stop
GET  /api/sessions/current  # Convenience: get active
```

**Issues with this approach:**
1. URLs encode actions (verbs) instead of identifying resources (nouns)
2. Session ID passed in request body instead of URL path
3. Inconsistent with existing API patterns in codebase
4. Violates REST architecture principles

### Solution: Resource-Oriented Design

The corrected API uses proper REST patterns:

```
POST   /api/sessions           # Create (start) a session
PATCH  /api/sessions/{id}      # Update (stop) a session
GET    /api/sessions/current   # Convenience endpoint for active session
```

**Why this is better:**

1. **Resources as Nouns:** `/sessions` is a collection of session resources.

2. **HTTP Methods as Actions:**
   - `POST` creates a new resource (starts session)
   - `PATCH` updates an existing resource (stops session, adds results)
   - `GET` retrieves resources

3. **Session ID in URL Path:** The session identifier is part of the URL (`/sessions/{id}`), making it cacheable and consistent with other endpoints.

4. **State Transitions via PATCH:** Session status is just another field. Use `PATCH /sessions/{id}` with `{"status": "completed"}` to stop a session.

5. **Consistency with Existing Patterns:** Matches how topics and folders are handled:
   ```
   POST /api/topics       -> Create topic
   PATCH /api/topics/{id} -> Update topic
   POST /api/sessions     -> Create session
   PATCH /api/sessions/{id} -> Update session
   ```

### State Transitions

Sessions have a simple state machine:

```
         POST /sessions
              │
              ▼
         ┌─────────┐
         │ Active  │
         └────┬────┘
              │
    ┌─────────┼─────────┐
    │         │         │
    ▼         ▼         ▼
Completed  Abandoned  Expired
```

**REST Mapping:**
- `POST /sessions` creates session in "active" state
- `PATCH /sessions/{id}` with `{"status": "completed"}` transitions to completed
- `PATCH /sessions/{id}` with `{"status": "abandoned"}` transitions to abandoned
- Expired state is computed lazily (not explicit transition)

### Request/Response Examples

**Creating a session (starting):**

```http
POST /api/sessions
Content-Type: application/json

{
  "kind": "quiz",
  "topics": ["topic-id-1", "topic-id-2"]
}

Response 201:
{
  "session_id": "507f1f77bcf86cd799439011",
  "started_at": "2026-04-06T14:00:00Z",
  "status": "active"
}
```

**Updating a session (stopping):**

```http
PATCH /api/sessions/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "status": "completed",
  "questions": 10,
  "asked": 10,
  "attempts": 12,
  "correct": 8
}

Response 200:
{
  "session_id": "507f1f77bcf86cd799439011",
  "elapsed": 300,
  "status": "completed"
}
```

### Trade-offs

| Aspect | REST (Recommended) | RPC-style |
|--------|-------------------|-----------|
| Explicit naming | Less explicit (`PATCH` vs `/stop`) | Very explicit (`/sessions/stop`) |
| Resource ID in URL | Yes | No (in request body) |
| Consistency with codebase | High | Low |
| HTTP semantics | Correct | Mixed (POST for everything) |
| Caching | Possible (by session ID) | Harder |
| Discoverability | Standard REST conventions | Custom API knowledge needed |

### Alternative: Sub-resource Actions

For very explicit state transitions, consider:

```
POST /api/sessions                    # Create session
POST /api/sessions/{id}/complete     # Complete session
POST /api/sessions/{id}/abandon      # Abandon session
```

This is a middle-ground between RESTful and explicit, but adds more endpoints to maintain. Not recommended unless the state machine becomes more complex.

## Functional Analysis

### 1. Session Lifecycle

#### 1.1 Session States

```
                    POST /sessions
                         │
                         ▼
                    ┌─────────┐
                    │ Active  │
                    └────┬────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
    ┌───────────┐ ┌───────────┐ ┌───────────┐
    │ Completed │ │ Abandoned  │ │ Expired   │
    │ (stopped) │ │ (replaced) │ │ (>5min)   │
    └───────────┘ └───────────┘ └───────────┘
```

**State Definitions:**

| State | Entry Condition | Exit Condition | Time Contribution |
|-------|-----------------|----------------|-------------------|
| Active | POST /sessions | PATCH /sessions/{id} with status or new session | Partial (until stopped) |
| Completed | User PATCHes with status="completed" | Terminal | Full elapsed time |
| Abandoned | User starts new session while active | Terminal | Full elapsed time |
| Expired | Auto-stop after 5 min inactivity | Terminal | Capped at 5 min |

**Question:** Should we implement the 5-minute inactivity timeout?

The requirement mentions auto-stop after 5 minutes of inactivity. However, this requires:
1. Client-side heartbeat mechanism, OR
2. Server-side job scheduler (Celery/APScheduler), OR
3. Lazy computation on stats query (check if session start > 5 min ago)

**Recommendation:** Use lazy computation approach:
- On stats query, check for active sessions older than 5 minutes
- Mark them as expired and compute elapsed as min(actual, 300)
- This avoids additional infrastructure complexity

#### 1.2 Concurrent Session Handling

**Scenario:** User starts quiz on device A, then starts another on device B.

**Behavior:**
1. POST /sessions on device B
2. Server detects active session for user
3. Server auto-stops previous session (status: abandoned)
4. Server creates new session
5. Both sessions contribute time to streak

**Implementation:**
```python
def start_session(user_email, kind, topics):
    # Check for active session
    active = db.sessions.find_one({
        "user": user_email,
        "status": "active"
    })

    if active:
        # Auto-stop previous session
        now = datetime.utcnow()
        elapsed = (now - active["started_at"]).total_seconds()
        db.sessions.update_one(
            {"_id": active["_id"]},
            {"$set": {
                "status": "abandoned",
                "stopped_at": now,
                "elapsed": int(elapsed)
            }}
        )

    # Create new session
    session_id = str(ObjectId())
    db.sessions.insert_one({
        "_id": session_id,
        "user": user_email,
        "kind": kind,
        "topics": topics,
        "status": "active",
        "started_at": datetime.utcnow()
    })

    return session_id
```

### 2. Streak Computation

#### 2.1 Day Boundary

**Critical Design Decision:** When does a "day" begin and end?

**Options:**

| Option | Definition | Pros | Cons |
|--------|------------|------|------|
| UTC | 00:00-23:59 UTC | Simple, consistent globally | User perception mismatch |
| Server TZ | Belgium/Europe | Matches user expectations | Server TZ dependency |
| User TZ | Per-user timezone | Perfect user experience | Requires user TZ storage |

**Recommendation:** Use server timezone (Belgium/Europe).
- Application is primarily for Dutch-speaking users in Belgium
- Avoids complexity of per-user timezone storage
- Consistent behavior for all users

**Implementation:**
```python
from zoneinfo import ZoneInfo

BELGIUM_TZ = ZoneInfo("Europe/Brussels")

def get_today_belgium():
    """Return today's date in Belgium timezone."""
    return datetime.now(BELGIUM_TZ).date()
```

#### 2.2 Streak Algorithm

```python
def compute_streak(user_email):
    """
    Compute current streak for a user.

    A streak day requires 15+ minutes of quiz time.
    """
    BELGIUM_TZ = ZoneInfo("Europe/Brussels")

    # Aggregate quiz time per day (Belgium calendar days)
    pipeline = [
        {"$match": {
            "user": user_email,
            "kind": "quiz",
            "status": {"$in": ["completed", "abandoned"]}
        }},
        {"$project": {
            # Convert UTC to Belgium date
            "day": {
                "$dateToString": {
                    "date": "$started_at",
                    "format": "%Y-%m-%d",
                    "timezone": "Europe/Brussels"
                }
            },
            "elapsed": 1
        }},
        {"$group": {
            "_id": "$day",
            "total_elapsed": {"$sum": "$elapsed"}
        }},
        {"$match": {
            "total_elapsed": {"$gte": 900}  # 15 min = 900 sec
        }},
        {"$sort": {"_id": -1}}
    ]

    qualifying_days = list(db.sessions.aggregate(pipeline))

    # Count consecutive days from today backwards
    today = datetime.now(BELGIUM_TZ).date()
    streak = 0

    for day_doc in qualifying_days:
        day_date = datetime.strptime(day_doc["_id"], "%Y-%m-%d").date()
        expected = today - timedelta(days=streak)

        if day_date == expected:
            streak += 1
        else:
            break

    return streak
```

#### 2.3 Risk Level Calculation

The requirement mentions proportional warning for streak risk.

**Recommendation:**

| Today's Time | Risk Level | Visual Indicator |
|--------------|------------|------------------|
| >= 15 min | none | Green flame, no warning |
| 10-15 min | low | Yellow hint |
| 5-10 min | medium | Orange warning |
| 0-5 min | high | Red alert |

### 3. Weekly Statistics

#### 3.1 Week Definition

**Question:** Should week be rolling 7 days or calendar week (Mon-Sun)?

**Recommendation:** Calendar week (Monday-Sunday).

**Rationale:**
- Matches user mental model ("this week")
- Aligns with typical work/study schedules
- Clear reset point (Monday 00:00)

**Implementation:**
```python
def get_week_bounds_belgium():
    """Get Monday and Sunday of current week in Belgium."""
    BELGIUM_TZ = ZoneInfo("Europe/Brussels")
    now = datetime.now(BELGIUM_TZ)

    # Monday of current week
    monday = now - timedelta(days=now.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)

    # Sunday end of week
    sunday = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)

    return monday, sunday
```

#### 3.2 Accuracy Calculation

**Clarification:** The requirement mentions "correct / attempts".

**Question:** Is this:
- (A) correct answers / total questions, OR
- (B) correct answers / total attempts

**Recommendation:** Use (B) - correct / attempts.

**Rationale:**
- Accounts for multiple attempts per question
- Better reflects actual performance
- Matches the existing feed schema

**Example:**
- 10 questions
- User answered 8 correctly on first try
- 2 questions needed 2 attempts each
- Total attempts: 8 + 2*2 = 12
- Correct: 10
- Accuracy: 10/12 = 83.3%

## Database Schema

### sessions Collection

```javascript
{
  "_id": "session-uuid",           // ObjectId as string
  "user": "email@example.com",     // User email (indexed)
  "kind": "quiz",                  // "quiz" | "training"
  "topics": ["topic-id-1"],        // Topic IDs included
  "status": "completed",           // "active" | "completed" | "abandoned" | "expired"

  // Timing (server-side)
  "started_at": ISODate,           // Server timestamp on start
  "stopped_at": ISODate,           // Server timestamp on stop
  "elapsed": 300,                   // Seconds (computed on stop)

  // Quiz metrics (client-provided on stop)
  "questions": 10,                 // Total questions
  "asked": 10,                     // Questions asked
  "attempts": 12,                  // Total attempts
  "correct": 8                     // Correct answers
}
```

**Indexes:**

```javascript
// Primary lookup by user
db.sessions.createIndex({ "user": 1, "started_at": -1 })

// Active session lookup
db.sessions.createIndex({ "user": 1, "status": 1 })

// Streak computation (aggregate by day)
db.sessions.createIndex({
  "user": 1,
  "kind": 1,
  "status": 1,
  "started_at": -1
})
```

### User Document Extensions

No changes required to user documents.

**Future consideration for streak freeze:**

```javascript
{
  "_id": "email@example.com",
  "name": "User Name",
  "picture": "https://...",
  "frozen_days": ["2026-04-05", "2026-04-03"]  // Future: streak freeze
}
```

## API Endpoints

### POST /api/sessions

Creates a new session (starts a quiz or training session).

**Request:**
```json
{
  "kind": "quiz",
  "topics": ["topic-id-1", "topic-id-2"]
}
```

**Response (201):**
```json
{
  "session_id": "507f1f77bcf86cd799439011",
  "started_at": "2026-04-06T14:00:00Z",
  "status": "active"
}
```

**Error Responses:**
- 401: Not authenticated
- 500: Database error

**Behavior:**
- If user has an active session, it is auto-stopped with status "abandoned"
- New session is created with status "active"
- Returns session ID for subsequent operations

### PATCH /api/sessions/{session_id}

Updates a session, typically to stop it and record results.

**Request:**
```json
{
  "status": "completed",
  "questions": 10,
  "asked": 10,
  "attempts": 12,
  "correct": 8
}
```

**Response (200):**
```json
{
  "session_id": "507f1f77bcf86cd799439011",
  "elapsed": 300,
  "status": "completed"
}
```

**Error Responses:**
- 401: Not authenticated
- 404: Session not found
- 422: Invalid state transition or validation error

**Behavior:**
- Computes elapsed time from server-side start timestamp
- Creates feed item for completed sessions
- Idempotent: can be called multiple times safely

### GET /api/sessions/current

Returns the currently active session, if any.

**Response (200 - active session):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "kind": "quiz",
  "topics": ["topic-id-1"],
  "status": "active",
  "started_at": "2026-04-06T14:00:00Z"
}
```

**Response (200 - no active session):**
```json
null
```

**Use Case:**
- Called on page load to check for ongoing session
- Used to resume interrupted sessions

### GET /api/stats/streak

**Response (200):**
```json
{
  "streak": 5,
  "today_minutes": 12,
  "streak_risk": true,
  "risk_level": "medium"
}
```

### GET /api/stats/weekly

**Response (200):**
```json
{
  "quizzes": 23,
  "correct": 87,
  "attempts": 100,
  "accuracy": 87.0,
  "time_minutes": 45
}
```

## Vue Store Module

### stats module (New)

```javascript
store.registerModule("stats", {
  state: {
    streak: null,
    weekly: null,
    loading: false,
    error: null
  },

  getters: {
    streak: state => state.streak,
    weekly: state => state.weekly,
    streakRisk: state => state.streak?.streak_risk || false,
    riskLevel: state => state.streak?.risk_level || "none"
  },

  actions: {
    loadStats: async function(context) {
      context.commit("loading", true);

      try {
        // Load streak and weekly stats in parallel
        const [streak, weekly] = await Promise.all([
          api.get("stats/streak"),
          api.get("stats/weekly")
        ]);

        context.commit("streak", streak);
        context.commit("weekly", weekly);
        context.commit("error", null);
      } catch (err) {
        context.commit("error", err.message);
        console.error("Failed to load stats:", err);
      } finally {
        context.commit("loading", false);
      }
    },

    refreshAfterQuiz: async function(context) {
      // Called after quiz completion to refresh stats
      await context.dispatch("loadStats");
    }
  },

  mutations: {
    streak: function(state, data) {
      Vue.set(state, "streak", data);
    },
    weekly: function(state, data) {
      Vue.set(state, "weekly", data);
    },
    loading: function(state, value) {
      state.loading = value;
    },
    error: function(state, message) {
      state.error = message;
    }
  }
});
```

### sessions module (New)

```javascript
store.registerModule("sessions", {
  state: {
    currentSessionId: null,
    sessionStartTime: null
  },

  getters: {
    currentSessionId: state => state.currentSessionId,
    isSessionActive: state => state.currentSessionId !== null
  },

  actions: {
    startSession: async function(context, payload) {
      // payload: { kind, topics }
      const response = await api.post("sessions", payload);
      context.commit("sessionStarted", response);
      return response;
    },

    stopSession: async function(context, payload) {
      // payload: { questions, asked, attempts, correct }
      const sessionId = context.getters.currentSessionId;
      if (!sessionId) {
        console.warn("No active session to stop");
        return null;
      }

      const response = await api.patch(`sessions/${sessionId}`, {
        status: "completed",
        ...payload
      });

      context.commit("sessionStopped");
      return response;
    },

    // Check for existing session on page load
    checkCurrentSession: async function(context) {
      try {
        const session = await api.get("sessions/current");
        if (session) {
          context.commit("sessionResumed", session);
        }
        return session;
      } catch (err) {
        console.error("Failed to check current session:", err);
        return null;
      }
    }
  },

  mutations: {
    sessionStarted: function(state, response) {
      state.currentSessionId = response.session_id;
      state.sessionStartTime = response.started_at;
    },
    sessionStopped: function(state) {
      state.currentSessionId = null;
      state.sessionStartTime = null;
    },
    sessionResumed: function(state, session) {
      state.currentSessionId = session._id;
      state.sessionStartTime = session.started_at;
    }
  }
});
```

## Error Handling

### Error Response Format

All errors follow consistent format:

```json
{
  "error": "Human-readable error message",
  "code": 404
}
```

### Error Scenarios

| Endpoint | Scenario | HTTP Status | Error Message |
|----------|----------|-------------|---------------|
| sessions/start | Not authenticated | 401 | "Authentication required" |
| sessions/start | Database error | 500 | "Failed to create session" |
| sessions/stop | Session not found | 404 | "Session not found" |
| sessions/stop | Already stopped | 422 | "Session already completed" |
| sessions/stop | Not owner | 422 | "Session belongs to another user" |
| stats/* | Not authenticated | 401 | "Authentication required" |

### Client-Side Error Handling

```javascript
// In api wrapper
async function api(method, endpoint, data) {
  try {
    const response = await fetch(`/api/${endpoint}`, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : null,
      credentials: "include"
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Request failed");
    }

    return await response.json();
  } catch (err) {
    // Log and re-throw for component handling
    console.error(`API error (${method} ${endpoint}):`, err);
    throw err;
  }
}
```

## Best Practices

### 1. Idempotency

Session start should be idempotent within a reasonable window (e.g., 1 minute).

```python
def start_session(user_email, kind, topics):
    # Check for recent active session (< 1 min old)
    recent = db.sessions.find_one({
        "user": user_email,
        "status": "active",
        "started_at": {"$gt": datetime.utcnow() - timedelta(minutes=1)}
    })

    if recent:
        # Return existing session
        return recent

    # Otherwise create new...
```

### 2. Graceful Degradation

Stats endpoints should handle missing data gracefully.

```python
def get_weekly_stats(user_email):
    result = db.sessions.aggregate([...])

    # Default values if no data
    return {
        "quizzes": 0,
        "correct": 0,
        "attempts": 0,
        "accuracy": 0.0,
        "time_minutes": 0
    } if not result else result
```

### 3. Rate Limiting

Consider rate limiting for session endpoints to prevent abuse.

```python
# Future: Add rate limiting decorator
@rate_limit(requests=100, window=3600)  # 100 req/hour
def start_session():
    ...
```

### 4. Data Retention

Define retention policy for old sessions.

**Recommendation:** Keep sessions for 1 year, then archive or delete.

```python
# Future: Scheduled cleanup job
def cleanup_old_sessions():
    cutoff = datetime.utcnow() - timedelta(days=365)
    db.sessions.delete_many({"started_at": {"$lt": cutoff}})
```

## Cross-Domain Concerns

### UI/UX Coordination

**Impact on frontend:**

1. **StatsCards Component**
   - Needs risk level styling (colors, icons)
   - Loading states during data fetch
   - Error states if stats unavailable

2. **Quiz Page**
   - Must call startSession on quiz begin
   - Must call stopSession on quiz end
   - Handle page unload (beforeunload event)
   - Handle session resume on page load

3. **Training Page**
   - Similar session tracking as quiz
   - May not count toward streak (clarify requirement)

**Questions for UI/UX Designer:**
- Should training time count toward streak?
- Visual design for risk levels
- Behavior when stats fail to load

### Authentication Coordination

No changes to authentication flow, but session tracking depends on:
- Flask-Login session being active
- `current_user.identity.email` for user identification

## Implementation Checklist

See TODO.md for detailed implementation tasks.

### Backend Tasks

- [ ] Create `sessions` collection with indexes
- [ ] Implement `Sessions` Resource (start, stop, current)
- [ ] Implement `Stats` Resource (streak, weekly)
- [ ] Add timezone handling (pytz/zoneinfo)
- [ ] Write unit tests for streak computation
- [ ] Write integration tests for session lifecycle

### Frontend Tasks

- [ ] Create `sessions` Vuex module
- [ ] Create `stats` Vuex module
- [ ] Create `StatsCards` component
- [ ] Integrate session tracking in quiz page
- [ ] Integrate session tracking in training page
- [ ] Handle page unload for session stop
- [ ] Handle session resume on page load

### Documentation Tasks

- [ ] Update `docs/architecture.md` with new endpoints
- [ ] Add API usage examples
- [ ] Document timezone assumptions

## Open Questions

1. **Training and Streaks:** Should training time count toward the 15-minute daily goal?
   - **Option A:** Only quiz time counts (stricter, encourages quizzes)
   - **Option B:** Both quiz and training count (more flexible)
   - **Recommendation:** Option A - quiz only, as training is less rigorous

2. **Minimum Session Duration:** Should very short sessions (< 30 seconds) be recorded?
   - **Option A:** Record all sessions
   - **Option B:** Only record sessions > 30 seconds
   - **Recommendation:** Option A - simpler, no client-side filtering

3. **Streak Reset Time:** When exactly does the streak reset?
   - **Option A:** Midnight Belgium time
   - **Option B:** 24 hours after last qualifying session
   - **Recommendation:** Option A - calendar day boundary

---

# Social Feed API Analysis

This section extends the API with social features for following users and viewing their activity.

## Overview

The social feed system enables users to:
1. Follow other users to see their learning activity
2. View a consolidated feed showing activity from followed users
3. See streak information for followed users

## Problem: Dual-Write in Feed

### Current Architecture

```
┌─────────────┐     ┌─────────────┐
│   Quiz/     │────▶│  sessions   │
│   Training  │     │  collection │
└─────────────┘     └─────────────┘
       │
       │ (duplicate write)
       ▼
┌─────────────┐
│    feed     │
│  collection │
└─────────────┘
```

**Issues:**
1. Two writes for every session completion
2. Risk of inconsistency if one write fails
3. Feed and session data can diverge
4. No clear source of truth

### Proposed Architecture

```
┌─────────────┐     ┌─────────────┐
│   Quiz/     │────▶│  sessions   │──┐
│   Training  │     │  collection │  │
└─────────────┘     └─────────────┘  │
                                     │
       ┌─────────────┐               │ (aggregation query)
       │    feed     │◀──────────────┘
       │  collection │
       │  (new topic │
       │    only)    │
       └─────────────┘
```

**Benefits:**
1. Sessions are the single source of truth for quiz/training activity
2. Feed collection only stores "new topic" events (no duplication)
3. Aggregation query derives feed on demand
4. No dual-write consistency issues

## Follow Relationships

### Data Model

A new `follows` collection stores follow relationships:

```javascript
{
  "_id": ObjectId("..."),
  "follower": "alice@example.com",     // who follows
  "following": "bob@example.com",      // who is followed
  "created_at": ISODate("2026-04-06T14:00:00Z")
}
```

**Indexes:**

```javascript
// Unique constraint on follower-following pairs
db.follows.createIndex(
  { "follower": 1, "following": 1 },
  { unique: true }
)

// Efficient lookup of user's following list
db.follows.createIndex({ "follower": 1, "created_at": -1 })

// Efficient lookup of user's followers list
db.follows.createIndex({ "following": 1, "created_at": -1 })
```

### RESTful Design

Following REST conventions for collection/resource patterns:

| Operation | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| Follow user | POST | `/api/following/{email}` | Create follow relationship |
| Unfollow user | DELETE | `/api/following/{email}` | Remove follow relationship |
| List following | GET | `/api/following` | Users I follow |
| List followers | GET | `/api/followers` | Users following me |

**Why this design:**

1. **`/following` as collection**: Represents the set of users the authenticated user follows
2. **`{email}` as resource**: The user being followed is identified by their email
3. **POST creates**: Following a user creates a new relationship
4. **DELETE removes**: Unfollowing removes the relationship
5. **Idempotent**: Following same user twice returns 200 (already exists)
6. **Consistent with existing patterns**: Same authentication and error handling

### Request/Response Examples

**Follow a user:**

```http
POST /api/following/bob@example.com
Authorization: Cookie session=...

Response 201:
{
  "follower": "alice@example.com",
  "following": {
    "email": "bob@example.com",
    "name": "Bob Smith",
    "picture": "https://..."
  },
  "created_at": "2026-04-06T14:00:00Z"
}
```

**Unfollow a user:**

```http
DELETE /api/following/bob@example.com
Authorization: Cookie session=...

Response 200:
{
  "follower": "alice@example.com",
  "following": "bob@example.com",
  "removed": true
}
```

**List users I follow:**

```http
GET /api/following
Authorization: Cookie session=...

Response 200:
[
  {
    "email": "bob@example.com",
    "name": "Bob Smith",
    "picture": "https://...",
    "followed_at": "2026-04-01T10:00:00Z"
  },
  {
    "email": "carol@example.com",
    "name": "Carol Jones",
    "picture": "https://...",
    "followed_at": "2026-03-15T08:30:00Z"
  }
]
```

**List my followers:**

```http
GET /api/followers
Authorization: Cookie session=...

Response 200:
[
  {
    "email": "dave@example.com",
    "name": "Dave Wilson",
    "picture": "https://...",
    "followed_at": "2026-04-02T12:00:00Z"
  }
]
```

## Feed Modifications

### Two Feed Modes

The feed endpoint gains a `mode` query parameter:

| Mode | Description | Source |
|------|-------------|--------|
| `my` | My own activity (default) | sessions + feed (new topic) |
| `following` | Activity from followed users | sessions aggregation + feed (new topic) |

### Feed Derivation from Sessions

**Query for "my" mode:**

```python
def get_my_feed(user_email, limit=10):
    # Aggregate sessions
    sessions_pipeline = [
        {"$match": {
            "user": user_email,
            "status": {"$in": ["completed", "abandoned"]}
        }},
        {"$project": {
            "kind": 1,
            "topics": 1,
            "questions": 1,
            "asked": 1,
            "attempts": 1,
            "correct": 1,
            "elapsed": 1,
            "when": "$started_at"
        }},
        {"$sort": {"when": -1}},
        {"$limit": limit}
    ]

    # Also get "new topic" events from feed
    feed_pipeline = [
        {"$match": {
            "user": [user_email],
            "kind": "new topic"
        }},
        {"$sort": {"when": -1}},
        {"$limit": limit}
    ]

    # Merge and sort results
    ...
```

**Query for "following" mode:**

```python
def get_following_feed(user_email, limit=10):
    # Get list of followed users
    following = db.follows.distinct("following", {"follower": user_email})

    if not following:
        return []

    # Aggregate sessions from followed users
    sessions_pipeline = [
        {"$match": {
            "user": {"$in": following},
            "status": {"$in": ["completed", "abandoned"]}
        }},
        {"$lookup": {
            "from": "users",
            "localField": "user",
            "foreignField": "_id",
            "as": "user_info"
        }},
        {"$project": {
            "kind": 1,
            "user": {"$arrayElemAt": ["$user_info", 0]},
            "topics": 1,
            "questions": 1,
            "asked": 1,
            "attempts": 1,
            "correct": 1,
            "elapsed": 1,
            "when": "$started_at"
        }},
        {"$sort": {"when": -1}},
        {"$limit": limit}
    ]

    # Also get "new topic" events from followed users
    feed_pipeline = [
        {"$match": {
            "user.0": {"$in": following},
            "kind": "new topic"
        }},
        {"$sort": {"when": -1}},
        {"$limit": limit}
    ]

    # Merge and sort results
    ...
```

### Request/Response Examples

**Get my activity feed:**

```http
GET /api/feed?mode=my
Authorization: Cookie session=...

Response 200:
[
  {
    "kind": "quiz",
    "user": {
      "email": "alice@example.com",
      "name": "Alice Chen",
      "picture": "https://..."
    },
    "topics": ["topic-1", "topic-2"],
    "questions": 10,
    "asked": 10,
    "attempts": 12,
    "correct": 8,
    "elapsed": 300,
    "when": "2026-04-06T14:00:00Z"
  },
  {
    "kind": "new topic",
    "user": {
      "email": "alice@example.com",
      "name": "Alice Chen",
      "picture": "https://..."
    },
    "topic": "topic-3",
    "when": "2026-04-05T10:30:00Z"
  }
]
```

**Get following activity feed:**

```http
GET /api/feed?mode=following
Authorization: Cookie session=...

Response 200:
[
  {
    "kind": "quiz",
    "user": {
      "email": "bob@example.com",
      "name": "Bob Smith",
      "picture": "https://..."
    },
    "topics": ["topic-1"],
    "questions": 15,
    "asked": 15,
    "attempts": 18,
    "correct": 14,
    "elapsed": 450,
    "when": "2026-04-06T13:45:00Z"
  },
  {
    "kind": "new topic",
    "user": {
      "email": "carol@example.com",
      "name": "Carol Jones",
      "picture": "https://..."
    },
    "topic": "topic-5",
    "when": "2026-04-06T12:00:00Z"
  }
]
```

## Social Statistics

### Following Streaks Endpoint

Users can see streak information for users they follow:

```http
GET /api/stats/following/streaks
Authorization: Cookie session=...

Response 200:
[
  {
    "user": {
      "email": "bob@example.com",
      "name": "Bob Smith",
      "picture": "https://..."
    },
    "streak": 7,
    "today_minutes": 25
  },
  {
    "user": {
      "email": "carol@example.com",
      "name": "Carol Jones",
      "picture": "https://..."
    },
    "streak": 0,
    "today_minutes": 0
  }
]
```

### Implementation

```python
class StatsFollowingStreaks(Resource):
    @authenticated
    def get(self):
        user_email = current_user.identity.email

        # Get list of followed users
        following = db.follows.distinct("following", {"follower": user_email})

        if not following:
            return []

        # Get streak info for each followed user
        results = []
        for followed_email in following:
            # Get user info
            user = db.users.find_one({"_id": followed_email})
            if not user:
                continue

            # Compute streak (same logic as StatsStreak)
            streak = compute_streak(followed_email)
            today_minutes = compute_today_minutes(followed_email)

            results.append({
                "user": {
                    "email": followed_email,
                    "name": user.get("name", followed_email),
                    "picture": user.get("picture")
                },
                "streak": streak,
                "today_minutes": today_minutes
            })

        # Sort by streak descending
        results.sort(key=lambda x: (-x["streak"], x["user"]["name"]))
        return results
```

## API Endpoints Summary

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/following/{email}` | Follow a user |
| DELETE | `/api/following/{email}` | Unfollow a user |
| GET | `/api/following` | List users I follow |
| GET | `/api/followers` | List my followers |
| GET | `/api/stats/following/streaks` | Get streaks of followed users |

### Modified Endpoints

| Method | Endpoint | Change |
|--------|----------|--------|
| GET | `/api/feed` | Added `mode` query parameter (my/following) |

### Deprecated Endpoints

| Method | Endpoint | Note |
|--------|----------|------|
| POST | `/api/feed` | Only for "new topic" events; quiz/training sessions use `/api/sessions` |

## Data Migration

### Phase 1: Add Follows Collection

```javascript
// Create indexes
db.follows.createIndex(
  { "follower": 1, "following": 1 },
  { unique: true }
)
db.follows.createIndex({ "follower": 1, "created_at": -1 })
db.follows.createIndex({ "following": 1, "created_at": -1 })
```

### Phase 2: Migrate Feed to Session-Derived

No data migration required. The aggregation query handles derivation.

The `feed` collection will still contain "new topic" events. Quiz/training activity is derived from `sessions`.

## Error Handling

### Follow Errors

| Scenario | Status | Error Message |
|----------|--------|---------------|
| Cannot follow self | 400 | "Cannot follow yourself" |
| User not found | 404 | "User not found" |
| Already following | 200 | Returns existing relationship |
| Not following (on unfollow) | 200 | Returns unchanged state |

### Feed Errors

| Scenario | Status | Error Message |
|----------|--------|---------------|
| Invalid mode | 400 | "Invalid mode. Use 'my' or 'following'" |
| Not authenticated | 401 | "Authentication required" |

## Security Considerations

### Privacy Settings

**Question:** Should users be able to make their activity private?

**Recommendation:** Start with public activity (all users can see). Add privacy settings in future iteration if needed.

### Follow Limits

**Question:** Should there be a limit on following?

**Recommendation:** No hard limit initially. Monitor for abuse and add rate limiting if needed.

### Rate Limiting

```python
# Future: Add rate limiting
@rate_limit(requests=100, window=3600)  # 100 req/hour
def follow_user(email):
    ...
```

## Cross-Domain Concerns

### UI/UX Coordination

**Impact on frontend:**

1. **User Search/Discovery**
   - Need UI to search for and discover users
   - Follow/unfollow buttons on user profiles

2. **Feed Page**
   - Tab or toggle between "My Activity" and "Following"
   - User avatars in feed items

3. **Streak Display**
   - Show followed users' streaks in a list
   - Highlight users with high streaks

4. **Empty States**
   - "You're not following anyone yet" message
   - Suggestions for users to follow

### Backend/Database Coordination

**New collection:**
- `follows` collection with indexes

**Modified queries:**
- Feed aggregation now joins sessions + feed
- Stats endpoints need user lookup for following

## Open Questions for Social Features

1. **User Discovery:** How do users find each other to follow?
   - **Option A:** Search by email
   - **Option B:** Shareable profile links
   - **Recommendation:** Start with email search, add profile links later

2. **Activity Visibility:** Should all activity be visible?
   - **Option A:** All quiz/training activity visible to followers
   - **Option B:** Users can hide specific sessions
   - **Recommendation:** Option A for simplicity, add granularity later

3. **Notification:** Should users get notified when followed?
   - **Option A:** No notifications
   - **Option B:** In-app notification
   - **Option C:** Email notification
   - **Recommendation:** Option B - in-app notification in feed

## Appendix: Implementation Examples

### Python Implementation: Sessions Resource

```python
from flask_restful import Resource
from flask_login import current_user
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from pymongo import ReturnDocument
from letmelearn.web import server
from letmelearn.data import db
from letmelearn.auth import authenticated

BELGIUM_TZ = ZoneInfo("Europe/Brussels")

class Sessions(Resource):
    @authenticated
    def post(self):
        """Create a new session (start a quiz/training)."""
        kind = server.request.json["kind"]
        topics = server.request.json["topics"]

        # Check for active session and auto-stop it
        active = db.sessions.find_one({
            "user": current_user.identity.email,
            "status": "active"
        })

        if active:
            now = datetime.utcnow()
            elapsed = int((now - active["started_at"]).total_seconds())
            db.sessions.update_one(
                {"_id": active["_id"]},
                {"$set": {
                    "status": "abandoned",
                    "stopped_at": now,
                    "elapsed": elapsed
                }}
            )

        # Create new session
        session_id = str(db.sessions.insert_one({
            "user": current_user.identity.email,
            "kind": kind,
            "topics": topics,
            "status": "active",
            "started_at": datetime.utcnow()
        }).inserted_id)

        return {
            "session_id": session_id,
            "started_at": datetime.utcnow().isoformat() + "Z",
            "status": "active"
        }, 201

server.api.add_resource(Sessions, "/api/sessions")

class SessionResource(Resource):
    @authenticated
    def patch(self, session_id):
        """Update a session (stop and record results)."""
        # Find and validate session
        session = db.sessions.find_one({
            "_id": session_id,
            "user": current_user.identity.email
        })

        if not session:
            abort(404, "Session not found")

        if session["status"] != "active":
            abort(422, "Session already completed")

        new_status = server.request.json.get("status", "completed")

        # Compute elapsed time
        now = datetime.utcnow()
        elapsed = int((now - session["started_at"]).total_seconds())

        # Update session
        db.sessions.update_one(
            {"_id": session_id},
            {"$set": {
                "status": new_status,
                "stopped_at": now,
                "elapsed": elapsed,
                "questions": server.request.json.get("questions", 0),
                "asked": server.request.json.get("asked", 0),
                "attempts": server.request.json.get("attempts", 0),
                "correct": server.request.json.get("correct", 0)
            }}
        )

        return {
            "session_id": session_id,
            "elapsed": elapsed,
            "status": new_status
        }

server.api.add_resource(SessionResource, "/api/sessions/<session_id>")

class SessionCurrent(Resource):
    @authenticated
    def get(self):
        """Get current active session."""
        session = db.sessions.find_one({
            "user": current_user.identity.email,
            "status": "active"
        }, {"_id": 1, "kind": 1, "topics": 1, "started_at": 1, "status": 1})

        return session

server.api.add_resource(SessionCurrent, "/api/sessions/current")
```

### Python Implementation: Stats Resource

```python
class StatsStreak(Resource):
    @authenticated
    def get(self):
        """Get streak information."""
        user_email = current_user.identity.email

        # Compute streak
        pipeline = [
            {"$match": {
                "user": user_email,
                "kind": "quiz",
                "status": {"$in": ["completed", "abandoned"]}
            }},
            {"$project": {
                "day": {
                    "$dateToString": {
                        "date": "$started_at",
                        "format": "%Y-%m-%d",
                        "timezone": "Europe/Brussels"
                    }
                },
                "elapsed": 1
            }},
            {"$group": {
                "_id": "$day",
                "total_elapsed": {"$sum": "$elapsed"}
            }},
            {"$match": {
                "total_elapsed": {"$gte": 900}
            }},
            {"$sort": {"_id": -1}}
        ]

        qualifying_days = list(db.sessions.aggregate(pipeline))

        today = datetime.now(BELGIUM_TZ).date()
        streak = 0

        for day_doc in qualifying_days:
            day_date = datetime.strptime(day_doc["_id"], "%Y-%m-%d").date()
            expected = today - timedelta(days=streak)
            if day_date == expected:
                streak += 1
            else:
                break

        # Get today's time
        today_str = today.isoformat()
        today_pipeline = [
            {"$match": {
                "user": user_email,
                "kind": "quiz"
            }},
            {"$project": {
                "day": {
                    "$dateToString": {
                        "date": "$started_at",
                        "format": "%Y-%m-%d",
                        "timezone": "Europe/Brussels"
                    }
                },
                "elapsed": 1
            }},
            {"$match": {"day": today_str}},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$elapsed"}
            }}
        ]

        today_result = list(db.sessions.aggregate(today_pipeline))
        today_seconds = today_result[0]["total"] if today_result else 0
        today_minutes = today_seconds // 60

        # Compute risk
        streak_risk = today_minutes < 15
        if today_minutes >= 15:
            risk_level = "none"
        elif today_minutes >= 10:
            risk_level = "low"
        elif today_minutes >= 5:
            risk_level = "medium"
        else:
            risk_level = "high"

        return {
            "streak": streak,
            "today_minutes": today_minutes,
            "streak_risk": streak_risk,
            "risk_level": risk_level
        }

server.api.add_resource(StatsStreak, "/api/stats/streak")

class StatsWeekly(Resource):
    @authenticated
    def get(self):
        """Get weekly statistics."""
        user_email = current_user.identity.email

        # Get Monday of current week in Belgium
        now_belgium = datetime.now(BELGIUM_TZ)
        monday = now_belgium - timedelta(days=now_belgium.weekday())
        monday_utc = monday.replace(
            hour=0, minute=0, second=0, microsecond=0
        ).astimezone(ZoneInfo("UTC"))

        pipeline = [
            {"$match": {
                "user": user_email,
                "kind": "quiz",
                "started_at": {"$gte": monday_utc}
            }},
            {"$group": {
                "_id": None,
                "quizzes": {"$sum": 1},
                "correct": {"$sum": "$correct"},
                "attempts": {"$sum": "$attempts"},
                "total_elapsed": {"$sum": "$elapsed"}
            }}
        ]

        result = list(db.sessions.aggregate(pipeline))

        if result:
            r = result[0]
            accuracy = (r["correct"] / r["attempts"] * 100) if r["attempts"] > 0 else 0
            return {
                "quizzes": r["quizzes"],
                "correct": r["correct"],
                "attempts": r["attempts"],
                "accuracy": round(accuracy, 1),
                "time_minutes": r["total_elapsed"] // 60
            }

        return {
            "quizzes": 0,
            "correct": 0,
            "attempts": 0,
            "accuracy": 0.0,
            "time_minutes": 0
        }

server.api.add_resource(StatsWeekly, "/api/stats/weekly")
```