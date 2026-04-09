# Consensus: Alternate Identity Dashboard Fix

**Date**: 2026-04-09
**Participants**: Functional Analyst, API Architect, UI/UX Designer

## Summary

All agents agree on the **root cause and primary fix**:

| Finding | Consensus |
|---------|-----------|
| Root Cause | Frontend does not refresh stats/following data after identity switch |
| Backend Status | Already works correctly - uses `current_user.identity.email` |
| Primary Fix | Frontend-only: Add missing dispatch calls in `load_user_data()` |
| Backend Changes | NOT required for this task |

## Key Discovery

The API Architect found that **all backend endpoints already support identity switching**:

```python
# All endpoints use this pattern:
user_email = current_user.identity.email  # Respects server-side identity state
```

The `User.identity` property returns the alternate identity when `_current` is set via `PUT /api/session`.

## Root Cause Analysis

### What's Working

| Component | Status | Code |
|-----------|--------|------|
| `PUT /api/session` | Working | Sets `User._current` field |
| `/api/stats/streak` | Working | Uses `current_user.identity.email` |
| `/api/stats/weekly` | Working | Uses `current_user.identity.email` |
| `/api/feed` | Working | Uses `current_user.identity.email` |
| `/api/following` | Working | Uses `current_user.identity.email` |
| `/api/followers` | Working | Uses `current_user.identity.email` |

### What's Broken

The `load_user_data()` function in `auth.js` (lines 100-104) dispatches:

```javascript
// Current dispatches:
load_topics    // ✓ Correct
load_folders   // ✓ Correct
load_feed      // ✓ Correct

// Missing dispatches:
loadStats      // ✗ Not called - stats don't refresh
loadFollowing  // ✗ Not called - following list doesn't refresh
loadFollowers  // ✗ Not called - followers list doesn't refresh
```

## Agreed Implementation Plan

### Phase 1: Frontend Fix (prio:1 - Required)

**Files to Modify:**

| File | Change |
|------|--------|
| `letmelearn/static/auth.js` | Add `loadStats`, `loadFollowing`, `loadFollowers` to `load_user_data()` |
| `letmelearn/static/auth.js` | Add `identitySwitching` state management |
| `letmelearn/components/ProtectedPage.js` | Update greeting: "Viewing: {name}" when alternate identity active |

**Changes Required:**

```javascript
// In auth.js - select_identity action (updated)
select_identity: function(context, identity) {
  console.debug("store.actions.select_identity", identity);

  // Signal that we're switching identities
  context.commit("identitySwitching", true);

  api("PUT", "session", function(session) {
    console.debug("store.actions.select_identity", "success");
    context.commit("session", session);

    // Load all user data for the new identity
    Promise.all([
      store.dispatch("load_topics"),
      store.dispatch("load_folders"),
      store.dispatch("load_feed"),
      store.dispatch("loadStats"),        // NEW
      store.dispatch("loadFollowing"),    // NEW
      store.dispatch("loadFollowers")     // NEW
    ]).then(function() {
      context.commit("identitySwitching", false);
    });
  }, { identity: identity.email });
}
```

### Phase 2: Polish (Future Enhancement)

These are NOT part of the prio:1 task but noted for future consideration:

| Enhancement | Priority | Rationale |
|-------------|----------|-----------|
| Contextual banner showing "Viewing Emma's progress" | prio:2 | Nice-to-have UX improvement |
| Error handling with `Promise.allSettled()` | prio:2 | Graceful degradation on partial failures |
| Accessibility announcements | prio:2 | WCAG compliance |

### Not Required for This Task

| Item | Reason |
|------|--------|
| Backend API changes | Backend already works correctly |
| OpenAPI schema updates | No new parameters needed |
| `user` query parameter | Server-side identity state is cleaner approach |

## Test Plan

### Backend Verification (Confirm it Works)

```bash
# 1. Verify identity switch persists
curl -X PUT /api/session -H "Content-Type: application/json" \
  -d '{"identity": "child@example.com"}'

# 2. Verify subsequent calls use new identity
curl /api/stats/streak  # Should return child's streak
curl /api/feed?mode=my  # Should return child's feed
```

### Frontend Fix Verification

1. Login as parent with alternate identity
2. Open browser DevTools Network tab
3. Select child from identity dropdown
4. Verify API calls for stats, following, followers
5. Verify dashboard updates with child's data

### Acceptance Criteria

```
GIVEN user with multiple identities
WHEN user selects alternate identity from dropdown
THEN stats cards refresh with selected identity's data
AND feed refreshes with selected identity's activity
AND following/followers refresh with selected identity's social data
AND greeting updates to show "Viewing: {name}"
AND loading skeleton appears during data fetch
```

## Agent Agreement

| Agent | Agrees with Plan |
|-------|-------------------|
| Functional Analyst | Yes - clarifies scope correctly |
| API Architect | Yes - confirms backend works, frontend fix is correct approach |
| UI/UX Designer | Yes - notes optional polish items for future |

## Files to Create/Modify

### Frontend (Required)

- [ ] `letmelearn/static/auth.js` - Add dispatch calls and loading state
- [ ] `letmelearn/components/ProtectedPage.js` - Update greeting text

### Backend (Not Required)

No backend changes needed for this task.

## Next Steps

1. **Implement frontend fix** - Add dispatch calls to `load_user_data()`
2. **Test identity switch** - Verify all sections refresh correctly
3. **Update greeting** - Show "Viewing: {name}" for alternate identity
4. **Mark task complete** - Move to Done section in TODO.md