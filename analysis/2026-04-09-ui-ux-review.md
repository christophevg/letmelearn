# UX/UI Analysis: Alternate Identity Dashboard

**Date**: 2026-04-09
**Task**: Prio:1 - Alternate identity dashboard fix
**Context**: Parent viewing child's account via alternate identity feature

## Executive Summary

The alternate identity feature allows parents to view their child's learning progress. Currently, switching identities only partially updates the dashboard. This analysis defines the expected UX behavior and provides actionable implementation guidance.

## Current State Analysis

### Identity Switching Flow

```
User clicks identity dropdown
  -> select_identity(identity) dispatched
  -> PUT /api/session with { identity: email }
  -> On success:
     - Update session state
     - Call load_user_data()
     - load_topics(), load_folders(), load_feed()
```

### Components Affected by Identity Switch

| Component | Current Behavior | Expected Behavior |
|-----------|------------------|-------------------|
| StatsCards | **No refresh** | Refresh with new identity's streak/weekly stats |
| AdvalvasFeed | Refreshes correctly | Already working |
| FollowingSection | **No refresh** | Refresh with new identity's following/followers |
| User greeting | Shows logged-in user's name | Show "Viewing as: {identity.name}" |
| Toolbar avatar | Shows current identity (small) | Working correctly |

### Missing Updates in `load_user_data()`

The current `load_user_data()` dispatches:
- `load_topics` - Correct
- `load_folders` - Correct
- `load_feed` - Correct

**Missing:**
- `loadStats` - For streak and weekly stats
- `loadFollowing` - For following list
- `loadFollowers` - For followers list

## UX Design Decisions

### 1. Instant Switch vs. Confirmation Dialog

**Decision: Instant switch with loading states**

**Rationale:**
- Parents frequently check child's progress - confirmation adds unnecessary friction
- Dashboard is read-only (no unsaved data risk)
- Quick context switching is the primary use case

**Implementation:**
- No confirmation dialog needed
- Clear loading indicators during data refresh
- Immediate visual feedback on identity selection

### 2. Active Identity Indication

**Current Implementation:**
- Small avatar overlay (30px) on main avatar
- Greeting shows logged-in user: "Hi {session.name}!"

**Recommended Changes:**

#### Visual Indicator (Toolbar)
Keep the current avatar approach, it's clear and unobtrusive.

#### Greeting Text Change
When viewing alternate identity, change the greeting:

**Current:** `Hi Christophe!`

**When viewing alternate:** `Viewing: Emma`

This provides clear context about whose data is being displayed.

#### Dashboard Banner
Add a subtle contextual banner at the top of the dashboard when viewing alternate identity:

```
[Info icon] Viewing Emma's progress. [Switch back to me]
```

This is especially helpful for:
- New users unfamiliar with the feature
- Quick orientation when returning to the dashboard
- Accessibility (screen readers announce the context)

### 3. Unsaved Data Handling

**Not applicable for dashboard view:**
- Dashboard is read-only (no forms to lose data)
- Stats and feed data can be safely replaced

**Future consideration for other pages:**
- If user is mid-quiz and switches identity, prompt to save/lose progress
- This is outside current scope but worth documenting

### 4. Loading and Refresh Behavior

#### Recommended Loading UX

**Phase 1: Immediate Feedback (0-100ms)**
- Close dropdown menu
- Show subtle "refreshing" indicator (rotating icon or pulse)
- Dim the stats cards slightly

**Phase 2: Data Loading (100ms-1s typical)**
- Display skeleton loaders in stats cards (already implemented)
- Show loading state in feed list
- Social section shows loading placeholder

**Phase 3: Complete**
- Remove all loading states
- Banner appears if viewing alternate identity
- Greeting updates to show context

#### Implementation with Vuex

```javascript
// In auth.js - select_identity action
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

### 5. Edge Cases

#### Network Failure During Refresh

**Problem:** API call to switch identity succeeds, but subsequent data loads fail.

**Solution:**
- Show error snackbar: "Failed to load [stats/following]. Please refresh."
- Keep the identity switch (session is updated)
- Allow user to retry loading manually
- Consider auto-retry with exponential backoff

**Implementation:**
```javascript
// In auth.js
select_identity: function(context, identity) {
  context.commit("identitySwitching", true);

  api("PUT", "session", function(session) {
    context.commit("session", session);

    Promise.allSettled([  // Note: allSettled, not all
      store.dispatch("load_topics"),
      store.dispatch("load_folders"),
      store.dispatch("load_feed"),
      store.dispatch("loadStats"),
      store.dispatch("loadFollowing"),
      store.dispatch("loadFollowers")
    ]).then(function(results) {
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        store.dispatch("raise_error",
          "Some data failed to load. Please refresh the page.");
      }
      context.commit("identitySwitching", false);
    });
  }, { identity: identity.email });
}
```

#### Identity No Longer Exists

**Problem:** Child account was deleted after parent selected it.

**Solution:**
- Backend returns 404 or 410 for deleted identity
- Frontend shows: "This account is no longer available"
- Automatically switch back to parent's identity
- Show notification explaining what happened

#### Slow Network Connection

**Problem:** Data takes >3s to load.

**Solution:**
- After 1s, show "Still loading..." message
- After 3s, show retry button
- Keep skeleton loaders visible until data arrives

### 6. Accessibility Considerations

#### Keyboard Navigation
- Identity dropdown must be keyboard accessible
- Tab should navigate through identity options
- Enter/Space should select identity
- Escape should close dropdown without selecting

#### Screen Reader Announcements
When identity is switched:
- Announce: "Now viewing {identity.name}'s progress"
- Announce when data loads: "Dashboard updated with {identity.name}'s statistics"

#### Color Contrast
- Banner for alternate identity view should have sufficient contrast (WCAG 2.1 AA minimum)
- Loading states should not rely solely on color (use patterns/skeletons)

#### Focus Management
- After identity switch, keep focus on the dropdown trigger
- Do not auto-scroll to top of page
- Preserve user's scroll position

## Wireframe Descriptions

### Current State (Logged-in User)
```
+----------------------------------------------------------+
| [Avatar] Hi Christophe!                [Dashboard] [X]  |
+----------------------------------------------------------+
|                                                          |
|  +----------+  +----------+  +----------+  +----------+ |
|  |   7      |  |   15     |  |   87%    |  |   42     | |
|  |  Days    |  |  Min     |  |  Acc     |  |  Min     | |
|  |  Streak  |  |  Today   |  |  This wk |  |  Total   | |
|  +----------+  +----------+  +----------+  +----------+ |
|                                                          |
|  +----------------------------------------------------+ |
|  |  Your Feed                    [My] [Following]     | |
|  |  ...                                               | |
|  +----------------------------------------------------+ |
|                                                          |
+----------------------------------------------------------+
```

### After Identity Switch (Viewing Child)
```
+----------------------------------------------------------+
| [Avatar] Viewing: Emma                                  |
| [Info] Viewing Emma's progress. [Switch back to me]      |
+----------------------------------------------------------+
|                                                          |
|  +----------+  +----------+  +----------+  +----------+ |
|  |   3      |  |   5      |  |   65%    |  |   18     | |
|  |  Days    |  |  Min     |  |  Acc     |  |  Min     | |
|  |  Streak  |  |  Today   |  |  This wk |  |  Total   | |
|  +----------+  +----------+  +----------+  +----------+ |
|                                                          |
|  +----------------------------------------------------+ |
|  |  Emma's Feed                  [My] [Following]     | |
|  |  ...                                               | |
|  +----------------------------------------------------+ |
|                                                          |
+----------------------------------------------------------+
```

### During Identity Switch (Loading State)
```
+----------------------------------------------------------+
| [Avatar] Viewing: Emma                                  |
+----------------------------------------------------------+
|                                                          |
|  +----------+  +----------+  +----------+  +----------+ |
|  | [skeleton] | [skeleton] | [skeleton] | [skeleton] | |
|  | [skeleton] | [skeleton] | [skeleton] | [skeleton] | |
|  | [skeleton] | [skeleton] | [skeleton] | [skeleton] | |
|  +----------+  +----------+  +----------+  +----------+ |
|                                                          |
|  +----------------------------------------------------+ |
|  |  [Loading...]                                      | |
|  +----------------------------------------------------+ |
|                                                          |
+----------------------------------------------------------+
```

## Implementation Recommendations

### Phase 1: Core Fix (Required for prio:1)

1. **Update `load_user_data()` in auth.js**
   - Add `loadStats`, `loadFollowing`, `loadFollowers` dispatches

2. **Add loading state management**
   - Add `identitySwitching` state to auth store
   - StatsCards, Feed, FollowingSection watch this state

3. **Update greeting text**
   - ProtectedPage shows "Viewing: {name}" when `session.current` exists

4. **Add contextual banner**
   - Optional but recommended for clarity

### Phase 2: Polish (Nice to Have)

1. **Error handling for partial failures**
   - Use `Promise.allSettled()` instead of `Promise.all()`
   - Show specific error messages for failed components

2. **Accessibility improvements**
   - ARIA announcements on identity switch
   - Focus management

3. **Performance optimization**
   - Debounce rapid identity switches
   - Cache previous identity's data

## Acceptance Criteria

### Functional Requirements

- [ ] GIVEN user with multiple identities
- [ ] WHEN user selects alternate identity from dropdown
- [ ] THEN stats cards refresh with selected identity's data
- [ ] AND feed refreshes with selected identity's activity
- [ ] AND following/followers refresh with selected identity's social data
- [ ] AND greeting updates to show "Viewing: {name}"
- [ ] AND loading skeleton appears during data fetch
- [ ] AND error message shown if data fetch fails

### UX Requirements

- [ ] No confirmation dialog on identity switch
- [ ] Visual loading state visible within 100ms
- [ ] Clear indication of whose data is being viewed
- [ ] Smooth transition back to original identity

### Accessibility Requirements

- [ ] Identity dropdown keyboard navigable
- [ ] Screen reader announces identity change
- [ ] Focus preserved after identity switch
- [ ] Color contrast meets WCAG 2.1 AA

## Files to Modify

### Backend (API changes needed)

| File | Change |
|------|--------|
| `letmelearn/api.py` | Add optional `user` parameter to `/api/stats/streak`, `/api/stats/weekly` |
| `letmelearn/api.py` | Add optional `user` parameter to `/api/following`, `/api/followers` |
| `docs/openapi.yaml` | Document `user` query parameter |

### Frontend (State management)

| File | Change |
|------|--------|
| `letmelearn/static/auth.js` | Add `identitySwitching` state, update `load_user_data()` |
| `letmelearn/components/ProtectedPage.js` | Update greeting logic for alternate identity |
| `letmelearn/components/StatsCards.js` | Watch `identitySwitching` state |
| `letmelearn/components/StatsStore.js` | Handle user parameter in `loadStreak`/`loadWeekly` |
| `letmelearn/components/FeedStore.js` | Already refreshes, may need user parameter |
| `letmelearn/components/FollowsStore.js` | Handle user parameter in `loadFollowing`/`loadFollowers` |

## Testing Notes

### Manual Test Cases

1. **Basic identity switch**
   - Login as parent with child identity
   - Select child from dropdown
   - Verify all sections update

2. **Rapid switching**
   - Switch between identities quickly
   - Verify no race conditions
   - Verify final state matches last selection

3. **Network failure**
   - Disable network mid-switch
   - Verify graceful error handling
   - Verify user can retry

4. **First-time user**
   - New parent account with no children
   - Verify dropdown shows only own identity

### Automated Test Cases

```javascript
// tests.js additions
describe('Identity Switching', function() {
  it('should load stats after identity switch', function(done) {
    // Setup: mock session with alternate identity
    // Action: dispatch select_identity
    // Assert: loadStats was called
  });

  it('should load following after identity switch', function(done) {
    // Setup: mock session with alternate identity
    // Action: dispatch select_identity
    // Assert: loadFollowing was called
  });

  it('should show loading state during switch', function(done) {
    // Setup: slow API response
    // Action: dispatch select_identity
    // Assert: statsLoading is true during fetch
  });
});
```

## References

- Original task: TODO.md line 65
- Functional analysis: analysis/2026-04-09-functional-analysis.md
- Previous UX review: analysis/2026-04-08-ui-ux-review.md