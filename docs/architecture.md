# Let Me Learn - Architecture Overview

A Vue.js SPA/PWA for learning definitions and words, built on Flask + MongoDB.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (Vue.js + Vuetify)                │
│   pages/          components/       static/      Vuex Store │
│   (routes)        (reusable UI)    (scripts)    (state)    │
└─────────────────────────┬───────────────────────────────────┘
                          │ AJAX/JSON
┌─────────────────────────┼───────────────────────────────────┐
│                 Backend (Flask + Baseweb)                   │
│   web.py          api.py          auth.py      data.py      │
│   (entry point)   (REST API)      (OAuth)      (MongoDB)     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                    MongoDB                                 │
│   folders    topics    feed    users    versions           │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Modules (`letmelearn/`)

| File | Purpose |
|------|---------|
| `web.py` | Entry point - initializes Baseweb server, registers components/pages |
| `api.py` | REST endpoints: `/api/folders`, `/api/topics`, `/api/feed`, `/api/session` |
| `auth.py` | OAuth (Google), Flask-Login session, `User` class, `@authenticated` decorator |
| `data.py` | MongoDB connection, schema migrations |
| `treeitems.py` | `Folder`/`Topic` dataclasses for hierarchical topic organization |
| `sessions.py` | Session tracking: `/api/sessions` for quiz/training session lifecycle |
| `stats.py` | Statistics: `/api/stats/streak` and `/api/stats/weekly` for gamification |
| `pages/__init__.py` | Registers page routes: `/`, `/topics`, `/quiz`, `/training`, `/about` |

---

## Frontend Structure

### Pages (`pages/`)

| File | Route | Purpose |
|------|-------|---------|
| `advalvas.js` | `/` | Home - activity feed |
| `topics.js` | `/topics` | Create/edit/import topics |
| `quiz.js` | `/quiz` | Quiz mode with scoring |
| `training.js` | `/training` | Flashcard training |
| `about.js` | `/about` | About page |

### Components (`components/`)

| File | Purpose |
|------|---------|
| `ProtectedPage.js` | Auth guard - shows login if unauthenticated |
| `TopicsStore.js` | Vuex module for topics/folders state |
| `FeedStore.js` | Vuex module for activity feed |
| `SessionsStore.js` | Vuex module for session lifecycle state |
| `StatsStore.js` | Vuex module for statistics state |
| `StatsCards.js` | Statistics display cards (streak, activity, accuracy, time) |
| `TopicSelector.js` | Tree-based topic/folder picker |
| `FolderSelector.js` | Folder selection dialog |
| `Timer.js` | Quiz timer component |
| `SimpleDialog.js` | Reusable dialog wrapper |
| `MultiTextField.js` | Multi-value text input |
| `TextDiff.js` | Visual diff for wrong answers |
| `questions/BasicQuestion.js` | Key-value question type |
| `questions/FillInQuestion.js` | Fill-in-the-blank question type |

### Static Files (`static/`)

| File | Purpose |
|------|---------|
| `auth.js` | Client-side OAuth via `oatk.js` |
| `ajax.js` | API call wrapper with error handling |
| `logging.js` | Console logging (disabled in production) |
| `nl.js` | Dutch locale for moment.js |
| `diff.js` | jsdiff library for text comparison |
| `css/custom.css` | Custom styles |
| `css/flashcards.css` | Flip card animation for training mode |

---

## Data Model

### Topic Document

```json
{
  "_id": "topic-id",
  "user": "email@example.com",
  "name": "Topic Name",
  "question": {
    "type": "BasicQuestion",
    "labels": { "left": "Key", "right": "Value" }
  },
  "tags": ["optional", "archived"],
  "items": [
    { "left": ["answer1", "answer2"], "right": ["correct1"] }
  ]
}
```

### Folder Tree Structure

```json
[
  {
    "id": "folder-name",
    "name": "Folder Name",
    "children": [
      { "id": "topic-id", "name": "Topic Name" }
    ]
  }
]
```

### TreeItem Hierarchy (Python)

```
TreeItem (base class)
├── Topic (leaf node with id derived from name)
└── Folder (can have children)
    └── TreeItems (container for root-level items)
```

---

## Request Flow

1. **Browser** → Vue component dispatches Vuex action
2. **Vuex** → `ajax.js` calls `/api/...` endpoint
3. **Flask** → `@authenticated` decorator checks session
4. **API** → MongoDB query via `db.collection.find(...)`
5. **Response** → JSON returned, Vuex commit updates state

### Detailed Flow Example: Taking a Quiz

```
1. User visits /quiz
   └─> quiz.js page component loaded

2. Component checks authentication
   └─> ProtectedPage.js checks store.getters.session
   └─> If not authenticated, shows login button
   └─> auth.js handles OAuth flow via oatk.js

3. User selects topics
   └─> TopicSelector.js shows tree of folders/topics
   └─> Vuex topics module manages state
   └─> TopicsStore.js dispatches "load_topics"
   └─> ajax.js calls GET /api/topics
   └─> api.py returns topics from MongoDB

4. User starts quiz
   └─> Quiz.js: store.dispatch("startSession", { kind: "quiz", topics: [...] })
   └─> SessionsStore.js: POST /api/sessions
   └─> sessions.py creates session document, returns session_id
   └─> Quiz.js: store.dispatch("create_quiz")
   └─> Items shuffled into _quiz state

5. User answers question
   └─> BasicQuestion.js or FillInQuestion.js component
   └─> Emits "next" event with success boolean
   └─> Quiz.js updates score, commits "mark_correct" or "mark_incorrect"

6. Quiz complete
   └─> Quiz.js: store.dispatch("stopSession", { status: "completed", ... })
   └─> SessionsStore.js: PATCH /api/sessions/<id>
   └─> sessions.py computes elapsed time, updates document
   └─> Result saved: store.dispatch("add_feed_item")
   └─> POST /api/feed with quiz result
   └─> Stats refreshed: store.dispatch("refreshAfterQuiz")
   └─> GET /api/stats/streak and /api/stats/weekly
```

---

## API Endpoints

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/folders` | GET, POST | Get/set folder tree structure |
| `/api/folders/<path>` | POST, DELETE | Create/delete folder at path |
| `/api/topics` | GET, POST | List all topics / create new topic |
| `/api/topics/<id>` | GET, PATCH, DELETE | CRUD for individual topics |
| `/api/topics/<id>/items` | POST, PATCH, DELETE | Manage items within a topic |
| `/api/feed` | GET, POST | Activity feed (quiz/training results) |
| `/api/session` | GET, POST, PUT, DELETE | Session management (login/logout) |
| `/api/sessions` | POST | Start a new quiz/training session |
| `/api/sessions/<id>` | PATCH | Stop and finalize a session |
| `/api/sessions/current` | GET | Get current active session (if any) |
| `/api/stats/streak` | GET | Get current streak and today's time |
| `/api/stats/weekly` | GET | Get weekly statistics |

---

## Session Tracking

Sessions track user activity during quizzes and training:

### Session Lifecycle

```
1. User starts quiz/training
   └─> POST /api/sessions { kind: "quiz"|"training", topics: [...] }
   └─> Returns: { session_id, started_at, status: "active" }

2. Session stored in MongoDB with status="active"

3. User completes/abandons quiz
   └─> PATCH /api/sessions/<id> {
         status: "completed"|"abandoned",
         questions, asked, attempts, correct
       }
   └─> Elapsed time calculated server-side

4. Stats updated from completed sessions
```

### Session Document

```json
{
  "_id": "session-id",
  "user": "email@example.com",
  "kind": "quiz",
  "topics": ["topic-id-1", "topic-id-2"],
  "status": "completed",
  "started_at": "2026-04-06T14:00:00Z",
  "stopped_at": "2026-04-06T14:15:00Z",
  "elapsed": 900,
  "questions": 10,
  "asked": 10,
  "attempts": 12,
  "correct": 8
}
```

### Edge Cases

- **Concurrent sessions**: Starting a new session auto-stops any active session
- **Browser close**: `beforeunload` handler stops session as "abandoned"
- **Page refresh**: `checkCurrentSession` resumes tracking active session
- **Server timeout**: Sessions older than 5 minutes treated as abandoned

---

## Statistics & Gamification

### Streak System

- A **streak day** requires 15+ minutes of quiz time
- Streak counts consecutive days from today backwards
- Risk levels indicate how close today's time is to 15-minute goal:
  - `none`: Already reached 15+ minutes today
  - `low`: 10-14 minutes today
  - `medium`: 5-9 minutes today
  - `high`: 0-4 minutes today

### Weekly Statistics

- Calendar week (Monday-Sunday) aggregation
- Includes: quizzes count, correct/attempts ratio, total time
- Accuracy = correct / attempts × 100

### Timezone Handling

- All times stored in MongoDB as UTC
- Statistics computed using Belgium timezone (Europe/Brussels)
- Weekly boundaries: Monday 00:00 - Sunday 23:59 Belgium time

---

## Authentication Flow

```
1. User clicks "Login"
   └─> auth.js: store.dispatch("login")
   └─> oatk.login() redirects to Google OAuth

2. Google returns with access token
   └─> auth.js: store.dispatch("create_session")
   └─> POST /api/session with Authorization header

3. Session API (auth.py)
   └─> @oauth.authenticated decorator validates token
   └─> Claims decoded: { email, name, picture }
   └─> User.find(email) or User.create(email, ...)
   └─> login_user(user) sets Flask-Login session
   └─> Returns user JSON to frontend

4. Subsequent requests
   └─> Flask-Login session cookie included
   └─> @authenticated decorator allows access
```

---

## Key Technical Details

- **Framework**: Built on `baseweb` - a custom rapid-prototyping framework
- **Auth**: `oatk` (OAuth Toolkit) for OAuth/OpenID Connect with Google
- **State Management**: Custom Vuex-like store pattern (modules: auth, status, topics, feed)
- **Question Types**: Pluggable architecture - register question types via `store.commit("question_type", {...})`
- **Database**: MongoDB with automatic schema migrations (version tracking in `versions` collection)
- **Data Sync**: Makefile targets for syncing production/local data
- **Testing**: pytest with tox for multi-version Python testing
- **No build step**: JavaScript served directly to browser (no webpack/vite)