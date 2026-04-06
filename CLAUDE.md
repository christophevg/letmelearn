# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Let me Learn** is a learning app for definitions and words, built as a SPA/PWA using:
- **Backend**: Flask + Flask-RESTful + MongoDB (using the `baseweb` framework)
- **Frontend**: Vue.js + Vuetify
- **Auth**: OAuth/OpenID Connect via `oatk` package (Google accounts)

## Common Commands

```bash
# Run the development server
make run
# Runs: gunicorn -b 0.0.0.0:8000 -k eventlet -w 1 letmelearn.web:server

# Run tests (multi-version via tox)
make test

# Run linting
make lint

# Generate coverage report
make coverage
```

## Test Commands

```bash
# Run all tests
tox

# Run tests for specific Python version
tox -e py311

# Run single test file
pytest tests/test_treeitems.py

# Run with coverage
coverage run -m pytest tests/
coverage report
```

## Environment Setup

Requires environment variables (set in `.env` or `.env.local`):
- `MONGODB_URI` - MongoDB connection string
- `OAUTH_PROVIDER` - OAuth provider name
- `OAUTH_CLIENT_ID` - OAuth client ID
- `APP_SECRET_KEY` - Flask secret key

Use `pyenv` for Python version management. The `.python-version` file specifies `letmelearn` as the local version.

## Architecture

### Backend Structure

```
letmelearn/
├── web.py        # Entry point - baseweb server setup, component registration
├── api.py        # REST API resources: Folders, Topics, Items, Feed
├── auth.py       # OAuth authentication, Flask-Login, User class
├── data.py       # MongoDB connection, collection version migrations
├── treeitems.py  # TreeItem dataclasses for folder/topic hierarchy
└── pages/        # Flask page routes registration
```

**Key patterns:**
- `server` is the baseweb Flask instance imported across modules
- API resources use `@authenticated` decorator for protected endpoints
- MongoDB collections: `folders`, `topics`, `feed`, `users`, `versions`
- `TreeItems`/`Folder`/`Topic` dataclasses handle the hierarchical folder/topic structure

### Frontend Structure

```
letmelearn/
├── static/       # Static JS files (auth.js, ajax.js, etc.)
├── components/   # Vue components (registered with server.register_component)
└── pages/        # Vue page components (registered with routes)
```

**Key frontend files:**
- `static/auth.js` - OAuth client-side handling
- `components/TopicsStore.js` - Vuex-style store for topics
- `components/TopicSelector.js` - Tree-based topic/folder selector
- `pages/topics.js` - Topic management page
- `pages/quiz.js` / `pages/training.js` - Learning modes

### Database Migrations

`data.py` handles automatic schema migrations on startup by checking the `versions` collection. Current topics schema version is 2.

## Testing

Tests are located in `tests/` directory. The main test file is `test_treeitems.py` covering the `TreeItems` dataclasses.

## Database Sync Commands

```bash
# Sync all collections from production to local
make sync

# Sync specific collection
COLLECTION=topics make sync-from-production
```