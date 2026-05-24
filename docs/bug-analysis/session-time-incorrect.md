# Bug Analysis: Session Time Display Incorrect

**Issue**: GitHub Issue #12
**Status**: Fixed
**Severity**: High (affects core user experience)
**Scope**: Frontend + Backend (race condition)
**Fixed**: 2026-05-24

## Fix Summary

**Root Cause**: The `visibilitychange` handler stopped sessions when users switched tabs, but the frontend continued tracking time locally. When the user returned and clicked Stop, the backend returned the original (stale) elapsed time from when the session was first stopped.

**Solution**: Removed the beacon send from the `visibilitychange` handler. The `beforeunload` handler already covers actual page close scenarios. Users can now switch tabs during a quiz/training without the session being stopped.

**Files Modified**:
- `letmelearn/pages/quiz.js` - Removed visibilitychange beacon send
- `letmelearn/pages/training.js` - Removed visibilitychange beacon send
- `tests/test_sessions.py` - Added tests for idempotent session stop behavior

## Summary

A 20-minute quiz/training session can display as less than 1 minute in the session feedback. The root cause is a **race condition between the `visibilitychange` handler and normal session stopping**.

## Root Cause Analysis

### The Bug Flow

1. User starts quiz (session created with `started_at = T1`)
2. User switches tabs after 30 seconds
   - `visibilitychange` handler fires with `document.visibilityState === "hidden"`
   - Beacon sent to `/api/sessions/<id>`, session stopped with `elapsed = 30s`
   - Backend marks session as `"abandoned"`, stores `elapsed = 30`
3. User returns to tab
   - Frontend state persists: `playing = true`, `elapsedSeconds = 30`
   - Backend session is already stopped (not active)
   - Frontend does NOT know session was stopped
4. User continues playing for 20 more minutes
   - Frontend `elapsedSeconds` continues updating via `setInterval`
5. User clicks Stop
   - Frontend calls `stopSession("completed")`
   - Backend PATCH handler sees `session["status"] != "active"`
   - Returns **existing** `elapsed = 30s` (idempotent behavior)
6. Feedback displays 30 seconds instead of 20 minutes 30 seconds

### Code Evidence

**Frontend visibility handler (quiz.js:142-146)**:
```javascript
this._visibilityHandler = function(e) {
  if (document.visibilityState === "hidden" && self.playing) {
    self._sendSessionBeacon("abandoned");
  }
};
```

**Backend idempotent return (sessions.py:150-156)**:
```python
if session["status"] != "active":
  # Idempotent: return existing result if already stopped
  return {
    "session_id": session_id,
    "elapsed": session.get("elapsed", 0),
    "status": session["status"]
  }, 200
```

**Frontend continues unaware (quiz.js:317-327)**:
```javascript
stopSession: function(status) {
  if (!store.getters.hasActiveSession) {
    return Promise.resolve(null);
  }
  return store.dispatch("stopSession", {
    // No elapsed passed - backend calculates it
  });
}
```

The `hasActiveSession` getter only checks if `_currentSessionId !== null`, not if the backend session is still active.

## Why This Happens

The `visibilitychange` handler was designed to stop sessions when users navigate away, ensuring data isn't lost. However:

1. **Tab switching is common** - Users frequently switch tabs to check messages, look up information, etc.
2. **Session is stopped prematurely** - The beacon stops the session even though the user intends to continue
3. **No frontend recovery** - When returning to the tab, the frontend doesn't detect the session was stopped
4. **Idempotent backend** - The backend correctly returns existing data, but that data is stale

## Additional Findings

### Timer.elapsed Computation Issue (Minor)

The analysis correctly identified that `Timer.elapsed` returns 0 when no countdown is set:

```javascript
elapsed: function() {
  return this.seconds - this.seconds_left;
}
// When minutes=0: returns 0 - 0 = 0
```

This is stored in `this.result.elapsed` but **never sent to the backend**, so it doesn't cause the reported bug. The backend calculates elapsed independently.

### Session Resumption Gap

When a page is refreshed during an active session:
- Backend: session remains active with correct `started_at`
- Frontend: `mounted()` logs "resuming existing session" but **doesn't initialize `startTime` or `elapsedInterval`**

This means the real-time display would show 00:00 after refresh, but the final backend calculation would be correct. This is a separate (minor) UI bug.

## Recommended Fix

### Option A: Don't Stop Session on Tab Hide (Recommended)

Remove or modify the `visibilitychange` handler:

```javascript
this._visibilityHandler = function(e) {
  // Only stop if the page is actually unloading, not just tab switch
  // The beforeunload handler already covers page close
  if (document.visibilityState === "hidden" && self.playing) {
    // DON'T send beacon - session should continue
    // User might just be switching tabs temporarily
  }
};
```

**Rationale**: The `beforeunload` handler already stops sessions when the page closes. Tab switching should not stop the session.

### Option B: Frontend Recovery After Tab Return

When returning to the tab, check if the session is still active and restart if needed:

```javascript
this._visibilityHandler = function(e) {
  if (document.visibilityState === "visible" && self.playing) {
    // Check if session is still active
    store.dispatch("checkCurrentSession").then(function(session) {
      if (!session) {
        // Session was stopped, need to restart tracking
        console.warn("Session was stopped while tab was hidden");
      }
    });
  }
};
```

**Rationale**: Allows the visibility handler to stop sessions, but recovers when returning.

### Option C: Use Different Beacon Status

Use a different status like "paused" instead of "abandoned" and allow resuming:

```javascript
_sendSessionBeacon: function(status) {
  // Use "paused" instead of "abandoned" for visibility changes
  // Backend would need to support "resuming" a paused session
};
```

**Rationale**: More granular session state, but requires backend changes.

## Recommended Implementation

**Option A** is the simplest and most robust fix:

1. Remove the `visibilitychange` beacon send
2. Keep `beforeunload` for actual page close scenarios
3. This aligns with expected user behavior (tab switching shouldn't stop a quiz)

## Files to Modify

| File | Change |
|------|--------|
| `letmelearn/pages/quiz.js` | Remove beacon send from `visibilitychange` handler |
| `letmelearn/pages/training.js` | Remove beacon send from `visibilitychange` handler |

## Test Cases

1. **Tab Switch Scenario**: Start quiz, switch tabs for 30 seconds, return, complete quiz - elapsed time should be accurate
2. **Page Close Scenario**: Start quiz, close tab/browser - session should be marked as "abandoned"
3. **Normal Completion**: Start quiz, complete normally - elapsed time should be accurate
4. **Page Refresh**: Start quiz, refresh page - elapsed time should continue correctly from backend

## Related Code Locations

- `letmelearn/pages/quiz.js:142-146` - visibilitychange handler
- `letmelearn/pages/quiz.js:131-138` - beforeunload handler
- `letmelearn/pages/training.js:157-162` - visibilitychange handler
- `letmelearn/api/sessions.py:150-156` - idempotent session stop
- `letmelearn/components/SessionsStore.js:63-77` - stopSession action