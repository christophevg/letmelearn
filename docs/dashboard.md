# Ad Valvas Dashboard Design

This document describes the statistics dashboard on the Ad Valvas (home) page.

## Overview

The dashboard displays gamification statistics to encourage daily engagement:
- Current streak (days of 15+ minutes quiz time)
- Activity metrics (quizzes this week)
- Accuracy percentage
- Time spent today

## Layout

### Desktop

```
┌─────────────────────────────────────────────────────────────────┐
│  Ad Valvas                                    [user avatar]      │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │ 🔥         │ │ 📊        │ │ ✅        │ │ ⏱️        │       │
│  │ 5         │ │ 23        │ │ 87%      │ │ 45m       │       │
│  │ day       │ │ quizzes   │ │ correct   │ │ today     │       │
│  │ streak    │ │ this wk   │ │ this wk   │ │           │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│                                                                 │
│  [Feed Section]                                                 │
│  [News Section]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile (xs/sm)

Stats cards wrap to 2 per row:

```
┌───────────────────────────┐
│  ┌─────────┐ ┌─────────┐  │
│  │ 🔥 5    │ │ 📊 23   │  │
│  │ streak  │ │ quizzes │  │
│  └─────────┘ └─────────┘  │
│  ┌─────────┐ ┌─────────┐  │
│  │ ✅ 87%  │ │ ⏱️ 45m  │  │
│  │ correct │ │ today   │  │
│  └─────────┘ └─────────┘  │
│  ...                      │
└───────────────────────────┘
```

## Stats Cards

### 1. Streak Card

| Field | Description |
|-------|-------------|
| Icon | 🔥 (orange flame) when active, gray when broken |
| Value | Current streak (consecutive days with 15+ min quiz time) |
| Label | "day streak" |

**Visual States:**
- **Active streak**: Orange flame with pulse animation
- **Streak at risk**: Amber warning (used <15 min today)
- **Broken streak**: Gray/neutral icon

### 2. Activity Card

| Field | Description |
|-------|-------------|
| Icon | 📊 |
| Value | Number of quizzes completed this week |
| Label | "quizzes this week" |

**Week Definition:** Rolling 7 days (last 168 hours from now)

### 3. Accuracy Card

| Field | Description |
|-------|-------------|
| Icon | ✅ |
| Value | Percentage correct this week |
| Label | "correct this week" |

**Calculation:** `correct answers / total attempts × 100`

### 4. Time Card

| Field | Description |
|-------|-------------|
| Icon | ⏱️ |
| Value | Minutes spent in quiz mode today |
| Label | "today" |

**Today Definition:** Calendar day in user's timezone (computed server-side from UTC)

---

## Data Model

### Sessions Collection

Records every completed quiz/training session:

```javascript
{
  "_id": ObjectId,
  "user": "email@example.com",      // user reference
  "kind": "quiz",                    // "quiz" or "training"
  "topics": ["topic-id-1"],          // topics included
  "questions": 10,                   // total questions in session
  "asked": 10,                       // questions asked
  "attempts": 12,                    // total attempts made
  "correct": 8,                      // correct answers
  "elapsed": 300,                    // seconds spent (server-computed)
  "when": ISODate("2026-04-06T14:30:00Z")  // server timestamp
}
```

### Time Tracking

**Client responsibilities:**
- Send `start` event when quiz begins
- Send `stop` event when quiz ends (or page unload)

**Server responsibilities:**
- Record start/stop timestamps per session
- Compute elapsed time from start/stop events
- Store final elapsed time in session document

**Event flow:**
```
Client                          Server
  │                               │
  │── POST /api/sessions/start ──▶
  │    { topics: [...] }          │
  │                               │── create session record
  │                               │    with start_time
  │                               │
  │── POST /api/sessions/stop ───▶
  │    { questions, asked,        │
  │      attempts, correct }      │
  │                               │── compute elapsed = now - start_time
  │                               │── store session with elapsed
  │                               │
  │◀── { session_id, elapsed } ───│
```

### Streak Computation

Streak is computed from sessions collection:

```python
def get_streak(user_email):
    # Get all days with 15+ minutes of quiz time
    days = db.sessions.aggregate([
        { "$match": { "user": user_email, "kind": "quiz" } },
        { "$group": {
            "_id": { "$dateToString": { "date": "$when", "format": "%Y-%m-%d" } },
            "total_elapsed": { "$sum": "$elapsed" }
        }},
        { "$match": { "total_elapsed": { "$gte": 900 } } },  # 15 min = 900 sec
        { "$sort": { "_id": -1 } }
    ])

    # Count consecutive days from today backwards
    streak = 0
    for day in days:
        if day == expected_date(streak):
            streak += 1
        else:
            break
    return streak
```

---

## API Endpoints

### POST /api/sessions/start

Start a new quiz/training session.

**Request:**
```json
{
  "kind": "quiz",
  "topics": ["topic-id-1", "topic-id-2"]
}
```

**Response:**
```json
{
  "session_id": "abc123",
  "started_at": "2026-04-06T14:00:00Z"
}
```

### POST /api/sessions/stop

End a session and record results.

**Request:**
```json
{
  "session_id": "abc123",
  "questions": 10,
  "asked": 10,
  "attempts": 12,
  "correct": 8
}
```

**Response:**
```json
{
  "session_id": "abc123",
  "elapsed": 300
}
```

### GET /api/stats/streak

Get current streak and today's time.

**Response:**
```json
{
  "streak": 5,
  "today_minutes": 12,
  "streak_risk": true
}
```

### GET /api/stats/weekly

Get weekly statistics.

**Response:**
```json
{
  "quizzes": 23,
  "correct": 87,
  "attempts": 100,
  "accuracy": 87.0
}
```

---

## Future Enhancements

### Streak Freeze (Not Implemented Yet)

Protect streak for one day if user misses their goal.

| Feature | Description |
|---------|-------------|
| What | Protects streak from breaking for one day |
| Limit | Max 2 consecutive freezes, or limited quantity per month |
| Storage | Add `frozen_days: ["2026-04-05", ...]` to user document |

### Additional Stats Cards

- Longest streak
- Weekly average time
- Topic mastery progress
- Comparison with previous week

---

## Implementation Checklist

- [ ] Create `sessions` MongoDB collection
- [ ] Add `POST /api/sessions/start` endpoint
- [ ] Add `POST /api/sessions/stop` endpoint
- [ ] Add `GET /api/stats/streak` endpoint
- [ ] Add `GET /api/stats/weekly` endpoint
- [ ] Create StatsCards Vue component
- [ ] Update Advalvas page to include stats bar
- [ ] Add start/stop event handlers in quiz.js
- [ ] Add start/stop event handlers in training.js
- [ ] Test streak computation edge cases (timezone, midnight)