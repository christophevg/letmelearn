# Bug Analysis: Auth Session Not Persisting Between Visits

**Bug ID:** auth-session-persistence
**Status:** Fixed
**Priority:** Critical (prio:1)
**Reported:** 2026-04-20
**Fixed:** 2026-05-18
**Affected Files:** `letmelearn/auth.py`, `letmelearn/web.py`, `letmelearn/oauth.py`
**Test File:** `tests/test_session_persistence.py`

## Summary

Users must log in again every time they visit the app. Session seems not to be picked up or lifetime is too short.

## Symptoms

- User logs in successfully
- User closes browser or navigates away
- User returns to the app within expected session lifetime
- User is logged out and must re-authenticate

## Expected Behavior

- User logs in with OAuth
- Session persists across browser restarts (with "remember me" enabled)
- User remains logged in for a reasonable duration (typically days)

## Actual Behavior

- Session is lost between visits
- User must re-authenticate each visit

## Root Cause Investigation

### Hypothesis 1: `session_protection = "strong"` (Likely)

**Location:** `letmelearn/auth.py:22`

```python
login_manager.session_protection = "strong"
```

**Analysis:**
Flask-Login's "strong" session protection marks sessions as stale when:
- IP address changes
- User agent changes
- Other browser fingerprint changes

This can cause issues when:
- User switches between WiFi networks
- Mobile device switches between cellular/WiFi
- Browser updates change user agent
- Corporate networks use rotating IPs

**Impact:** HIGH - This is the most likely cause of session invalidation.

### Hypothesis 2: Missing Permanent Session Lifetime (Possible)

**Location:** `letmelearn/web.py`

No explicit `PERMANENT_SESSION_LIFETIME` configuration found.

**Analysis:**
- Flask default session lifetime is typically 31 days for permanent sessions
- `login_user(user, remember=True)` should create a permanent session
- However, if Flask's session cookie settings are not properly configured, the cookie might not persist

**Impact:** MEDIUM - Less likely but possible if deployment environment has specific constraints.

### Hypothesis 3: Secret Key Rotation (Possible)

**Location:** `letmelearn/config.py:50-82`

**Analysis:**
In development/testing, a new secret key is generated each restart:
```python
generated_key = secrets.token_hex(32)
```

This would invalidate all sessions on every restart.

**Impact:** HIGH for development, LOW for production (production requires APP_SECRET_KEY env var).

### Hypothesis 4: OAuth Token Not Refreshing (Unlikely)

**Location:** `letmelearn/oauth.py`

OAuth is only used for initial authentication. Once logged in, Flask-Login manages the session. OAuth token refresh should not affect Flask session.

**Impact:** LOW - OAuth is used for authentication, not session management.

## Proposed Fix Approach

### Primary Fix: Relax Session Protection

Change from "strong" to "basic" protection:

```python
# Before
login_manager.session_protection = "strong"

# After
login_manager.session_protection = "basic"
```

**Rationale:**
- "strong" protection invalidates sessions on IP/UA changes
- "basic" protection still provides session protection but allows IP/UA changes
- Trade-off: Slightly reduced security vs. user convenience

### Secondary Fix: Add Explicit Session Lifetime

Configure Flask session lifetime explicitly:

```python
from datetime import timedelta

server.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
server.config['SESSION_COOKIE_SECURE'] = True  # HTTPS only
server.config['SESSION_COOKIE_HTTPONLY'] = True
server.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
```

### Investigation Required

1. Check deployment environment for session cookie handling
2. Verify APP_SECRET_KEY is set in production
3. Check if load balancer is stripping headers
4. Verify HTTPS/cookie security settings

## Test Strategy

1. **Unit Test:** Verify `login_user(user, remember=True)` creates permanent session
2. **Integration Test:** Test session persistence across simulated IP changes
3. **Manual Test:** Login, close browser, reopen, verify still logged in

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Session hijacking | Low | High | Use HTTPS, SameSite cookies |
| Session fixation | Low | High | Flask-Login regenerates session ID |
| CSRF | Low | Medium | Use Flask-WTF CSRF protection |

## Questions for Investigation

1. Does this happen in production, development, or both?
2. Does this happen on mobile, desktop, or both?
3. What is the deployment environment (render.com mentioned in code)?
4. Is APP_SECRET_KEY properly set in production?

## Next Steps

1. Invoke functional-analyst to validate bug hypothesis
2. Create failing test case
3. Implement fix
4. Verify fix resolves issue

---

## Fix Summary

### Changes Made

**1. Changed session protection mode (letmelearn/auth.py:22)**
```python
# Before
login_manager.session_protection = "strong"

# After
login_manager.session_protection = "basic"
```

**Rationale:** Flask-Login's "strong" session protection invalidates sessions when IP address or User-Agent changes. This is too aggressive for modern network environments where users legitimately change networks (mobile/cellular switching, VPN, corporate networks). "Basic" protection still provides session integrity while allowing legitimate network changes.

**2. Added session cookie security configuration (letmelearn/web.py)**
```python
from datetime import timedelta

# Session cookie security configuration
server.config["SESSION_COOKIE_SAMESITE"] = "Lax"
server.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)

# Secure cookies only in production (HTTPS required)
if config.is_production():
    server.config["SESSION_COOKIE_SECURE"] = True
```

**Rationale:**
- `SameSite=Lax` prevents CSRF attacks while allowing top-level navigation
- 30-day session lifetime for remember_me functionality
- `SESSION_COOKIE_SECURE` only in production to support HTTP development

### Tests Added

Created `tests/test_session_persistence.py` with 13 tests covering:
- Session persistence with IP/User-Agent changes under "basic" protection
- Session invalidation behavior with "strong" protection (documenting the bug)
- Cookie security attributes (HttpOnly, SameSite, Secure, lifetime)
- Difference between "basic" and "strong" protection modes
- Remember me functionality

### Test Results

```
tests/test_session_persistence.py: 13 passed
tests/test_auth.py: 15 passed
All tests: 232 passed, 7 skipped
```

### Security Considerations

The change from "strong" to "basic" protection is an acceptable trade-off:
- Modern browsers + HTTPS + SameSite cookies already provide strong protection
- Industry standard for consumer applications is "basic" protection
- Flask-Login's session ID regeneration still provides integrity protection