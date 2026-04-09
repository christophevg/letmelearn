# Bug Analysis: Session Registration

**Bug ID:** session-registration
**Status:** Fixed
**Severity:** High
**Date:** 2026-04-09
**Fixed Date:** 2026-04-09

## Summary

Quiz sessions remain in 'active' status after user closes/refreshes the page, resulting in lost session data. The feed shows incomplete or missing quiz results.

## Symptoms

- User completes a quiz
- Session shows `status: 'active'` with null values for `questions`, `asked`, `attempts`, `correct`
- `stopped_at` is null
- Expected: `status: 'completed'` or `'abandoned'` with metrics populated

## Root Cause Analysis

### Primary Cause: `beforeunload` Async Race Condition

**Location:** `letmelearn/pages/quiz.js:152-156`

```javascript
window.addEventListener("beforeunload", function(e) {
  if (self.playing) {
    self.stopSession("abandoned");  // <-- Async AJAX call
  }
});
```

**Problem:**
1. The `beforeunload` event is designed for synchronous operations
2. `stopSession()` calls `api("PATCH", "sessions/" + sessionId, ...)` which uses `$.ajax()`
3. Browsers **do not wait** for async requests to complete during page unload
4. The AJAX request is often cancelled before reaching the server

**Browser Behavior:**
- Modern browsers limit async operations during page unload
- The `beforeunload` event fires but async XHR/fetch requests may be aborted
- This is by design for performance - browsers don't want to delay navigation

### Secondary Issues

1. **No visibility change handler:** Sessions aren't stopped when tabs become hidden
2. **No session recovery:** No mechanism to auto-stop orphaned sessions on page load
3. **Missing session timeout:** No backend cleanup for sessions stuck in 'active' state

## Proposed Fix

### 1. Use `navigator.sendBeacon()` for `beforeunload` (Primary Fix)

```javascript
// In quiz.js mounted()
window.addEventListener("beforeunload", function(e) {
  if (self.playing && store.getters.hasActiveSession) {
    var sessionId = store.getters.currentSessionId;
    var data = {
      status: "abandoned",
      questions: self.questions,
      asked: self.asked,
      attempts: self.attempts,
      correct: self.correct
    };
    navigator.sendBeacon("/api/sessions/" + sessionId, JSON.stringify(data));
  }
});
```

**Why `sendBeacon`:**
- Designed specifically for analytics/unload scenarios
- Browser guarantees delivery (async, non-blocking)
- Works even if page is closing
- Supported in all modern browsers

### 2. Add `visibilitychange` Handler (Secondary Fix)

```javascript
document.addEventListener("visibilitychange", function() {
  if (document.visibilityState === "hidden" && self.playing) {
    self.stopSession("abandoned");
  }
});
```

**Why `visibilitychange`:**
- Fires when tab becomes hidden (not just page close)
- More reliable than `beforeunload` for tab switches
- Complements `beforeunload` coverage

### 3. Add Backend Session Cleanup (Recovery Fix)

Add a periodic job or startup check to mark stale sessions as abandoned:

```python
# In data.py or scheduled task
def cleanup_stale_sessions():
    # Mark sessions older than 24 hours as abandoned
    cutoff = datetime.utcnow() - timedelta(hours=24)
    db.sessions.update_many(
        {"status": "active", "started_at": {"$lt": cutoff}},
        {"$set": {"status": "abandoned", "stopped_at": datetime.utcnow()}}
    )
```

## Test Strategy

1. **Unit Test:** Verify `sendBeacon` is called during simulated unload
2. **Integration Test:** Create session, simulate page close, verify session is stopped
3. **E2E Test:** Complete quiz, close tab, reopen, verify session state

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `sendBeacon` not supported | Low | Fallback to sync XHR for old browsers |
| Session still lost on crash | Medium | Backend cleanup for stale sessions |
| Double-stop race | Low | Idempotent PATCH endpoint handles re-stops |

## Files Modified

1. `letmelearn/pages/quiz.js` - Added `sendBeacon` and `visibilitychange` handlers
2. `letmelearn/pages/training.js` - Same changes
3. `letmelearn/api/sessions.py` - Added POST handler for `sendBeacon` support

## Acceptance Criteria

- [x] Session is properly stopped when user closes tab during quiz
- [x] Session is properly stopped when user refreshes page during quiz
- [x] Session is properly stopped when user navigates away during quiz
- [x] No orphaned 'active' sessions after user activity
- [x] All tests pass (207 passed)

## Lessons Learned

- `beforeunload` async handlers don't reliably complete - use `navigator.sendBeacon()`
- `visibilitychange` provides additional coverage for tab hiding scenarios
- Backend needs to accept POST for `sendBeacon` since it only sends POST requests