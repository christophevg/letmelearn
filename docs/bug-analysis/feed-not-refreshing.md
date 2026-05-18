# Bug Analysis: Feed Not Showing Recent Quiz After Navigation

**Bug ID:** feed-not-refreshing
**Status:** Fixed
**Priority:** Medium (prio:2)
**Reported:** 2026-04-20
**Fixed:** 2026-05-18
**Affected Files:** `letmelearn/pages/advalvas.js`
**Test:** Manual testing required (frontend change)

## Summary

After completing a quiz and navigating to the Ad Valvas dashboard, the most recent quiz result is not shown in the feed. Manual page refresh is required to see the new result.

## Symptoms

1. User completes a quiz or training session
2. User navigates to Ad Valvas (Home) page
3. Feed shows stale data (missing the recent session result)
4. User must manually refresh page to see the new result

## Expected Behavior

- Feed should show the most recent session result immediately when navigating to Ad Valvas page
- No manual refresh should be required

## Actual Behavior

- Feed does not refresh on navigation
- Only refreshes on initial login or when switching identities

## Root Cause Analysis

### Code Flow Analysis

1. **Initial Login Flow** (`auth.js`):
   ```javascript
   load_user_data: function(context) {
     store.dispatch("load_topics");
     store.dispatch("load_folders");
     store.dispatch("load_feed");  // ← Feed loaded here
     store.dispatch("loadStats");
     store.dispatch("loadAllFollows");
   }
   ```
   Feed IS loaded on initial login.

2. **Identity Switch Flow** (`auth.js`):
   ```javascript
   select_identity: function(context, identity) {
     // ...
     Promise.all([
       store.dispatch("load_topics"),
       store.dispatch("load_folders"),
       store.dispatch("load_feed"),  // ← Feed loaded here
       store.dispatch("loadStats"),
       store.dispatch("loadAllFollows")
     ])
     // ...
   }
   ```
   Feed IS loaded when switching identities.

3. **Ad Valvas Page Mount** (`advalvas.js`):
   ```javascript
   mounted: function() {
     store.dispatch("loadStats");
     store.dispatch("loadFollowing");
     store.dispatch("loadFollowers");
     // ❌ MISSING: store.dispatch("load_feed");
   }
   ```
   Feed is NOT loaded on page navigation.

### Root Cause

The `Home` component's `mounted` hook dispatches `loadStats`, `loadFollowing`, and `loadFollowers`, but does NOT dispatch `load_feed`. This means:
- Feed data is only loaded on initial login
- When user navigates to Ad Valvas after completing a quiz, the feed is not refreshed
- The feed shows stale data from the last time it was loaded

## Proposed Fix

Add `store.dispatch("load_feed")` to the `Home` component's `mounted` hook in `advalvas.js`:

```javascript
mounted: function() {
  store.dispatch("loadStats");
  store.dispatch("loadFollowing");
  store.dispatch("loadFollowers");
  store.dispatch("load_feed");  // ← Add this line
}
```

## Test Strategy

**Frontend Test:** This is a Vue.js frontend bug. Testing options:

1. **Manual Test:**
   - Login to the app
   - Complete a quiz session
   - Navigate to Ad Valvas page
   - Verify feed shows the recent session result without refresh

2. **E2E Test (future):**
   - Use Playwright/Cypress to automate the flow
   - Verify feed updates on navigation

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Feed double-load on initial login | Low | Low | Feed already has cached data, second load is idempotent |
| Performance impact | Low | Low | API call is fast, already done for other data |

## Questions for Investigation

1. Should we also add a global navigation guard to refresh feed on route change?
   - **Answer:** No, would cause unnecessary API calls. Better to load only when visiting the page.

2. Should we use Vue router's `beforeRouteEnter` instead of `mounted`?
   - **Answer:** Either works. `mounted` is simpler for this use case.

## Next Steps

1. Implement the fix (one-line change)
2. Manual testing
3. Code review
4. Commit

---

## Fix Summary

### Changes Made

**File:** `letmelearn/pages/advalvas.js`

**Change:** Added `store.dispatch("load_feed")` to the `Home` component's `mounted` hook.

```javascript
// Before
mounted: function() {
  store.dispatch("loadStats");
  store.dispatch("loadFollowing");
  store.dispatch("loadFollowers");
}

// After
mounted: function() {
  store.dispatch("loadStats");
  store.dispatch("loadFollowing");
  store.dispatch("loadFollowers");
  store.dispatch("load_feed");  // ← Added this line
}
```

### Why This Works

1. **Before:** Feed was only loaded on initial login (via `load_user_data` in auth.js)
2. **After:** Feed is now loaded every time the Ad Valvas page is mounted

### Alternative Approaches Considered

1. **Vue Router Navigation Guard:** Could use `beforeRouteEnter` but `mounted` is simpler for this use case.
2. **Global Route Change Watcher:** Would cause unnecessary API calls on every route change. Better to load only when visiting the page.

### Testing

- **Manual Testing Required:** This is a frontend JavaScript change
- **Test Flow:**
  1. Login to the app
  2. Complete a quiz session
  3. Navigate to Ad Valvas page
  4. Verify feed shows the recent session result without manual refresh