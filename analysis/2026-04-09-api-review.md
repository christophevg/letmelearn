# API Review: Alternate Identity Dashboard Fix

**Date**: 2026-04-09
**Reviewer**: API Architect Agent
**Task**: Prio:1 - "Alternate identity dashboard fix"

## Executive Summary

**Critical Finding**: The backend ALREADY supports identity switching correctly. The endpoints use `current_user.identity.email` which respects the server-side identity state (`User._current` field). The issue is likely a frontend problem where dashboard components do not refresh after the identity switch.

**Recommendation**: Before adding new parameters to endpoints, investigate whether the issue is simply that the frontend does not re-fetch data after PUT /api/session.

## Current Implementation Analysis

### Identity System (auth.py)

```python
# Lines 55-62
@property
def identity(self):
  """Get current identity (or self if no alternate identity)."""
  if not self._current:
    return self
  identity = User.find(self._current)
  if not identity:
    return self
  return identity
```

The `User.identity` property correctly returns:
- The alternate identity user object if `_current` is set and found
- The authenticated user otherwise

### Stats Endpoints (stats.py)

All stats endpoints ALREADY use `current_user.identity.email`:

| Endpoint | Line | Code |
|----------|------|------|
| `/api/stats/streak` | 129 | `user_email = current_user.identity.email` |
| `/api/stats/weekly` | 168 | `user_email = current_user.identity.email` |
| `/api/stats/following/streaks` | 236 | `user_email = current_user.identity.email` |

### Feed Endpoint (feed.py)

All feed methods ALREADY use `current_user.identity.email`:

| Method | Line | Code |
|--------|------|------|
| `_get_my_feed()` | 194 | `user_email = current_user.identity.email` |
| `_get_following_feed()` | 215 | `user_email = current_user.identity.email` |
| `_get_all_feed()` | 246 | `user_email = current_user.identity.email` |

### Identity Switch Endpoint (PUT /api/session)

From openapi.yaml lines 772-799, the endpoint exists:
- `PUT /api/session` with `{ "identity": "email@example.com" }`
- Calls `User.update()` with `current` parameter
- Updates `users` collection with the new `_current` field

## Root Cause Analysis

### Why Stats/Feed May Not Update

The most likely causes:

1. **Frontend not refreshing**: After calling PUT /api/session, the frontend Vue components do not re-fetch stats/feed data
2. **Vuex store caching**: StatsStore and FeedStore may cache data and not refresh on identity change
3. **Race condition**: Frontend may re-fetch before the server-side state is fully persisted

### The Implementation Notes in TODO.md May Be Incorrect

The TODO.md states:
> Backend: Add optional `user` parameter to `/api/stats/*` and `/api/feed/*` endpoints

This is likely unnecessary because:
- The endpoints already use `current_user.identity.email`
- Adding a parameter duplicates functionality
- Server-side state is cleaner than per-request parameters

## Two Design Approaches

### Option A: Server-Side Identity State (Current Design)

**How it works**:
1. Frontend calls `PUT /api/session { "identity": "child@example.com" }`
2. Server updates `users` collection: `{ "_id": "parent@example.com", "current": "child@example.com" }`
3. All subsequent API calls automatically use `current_user.identity.email`
4. Frontend refreshes dashboard components

**Pros**:
- Single source of truth
- No need to pass identity on every request
- Consistent behavior across all endpoints
- Simpler frontend implementation

**Cons**:
- Requires frontend to re-fetch data after identity switch
- Identity state is shared across all browser tabs

**Fix Required**: Ensure frontend re-fetches after PUT /api/session

### Option B: Per-Request Identity Parameter (Alternative)

**How it works**:
1. Frontend passes `?identity=child@example.com` on each API request
2. Server validates that authenticated user has permission to view that identity
3. Server uses the passed identity instead of server-side state

**Pros**:
- More granular control
- No need to manage server-side state
- Different tabs can show different identities

**Cons**:
- Every frontend component must pass identity parameter
- More complex frontend implementation
- Security validation needed on every request

**Implementation Required**:
- Add `identity` query parameter to stats and feed endpoints
- Add authorization check: `identity in current_user._identities`
- Return 403 Forbidden if unauthorized identity requested

## Security Considerations

### Current Design (Server-Side State)

The security is implicit:
- `User._identities` list defines which identities a user can switch to
- `User.update()` only accepts identities from the `identities` list
- No endpoint allows arbitrary identity viewing

### If Adding Identity Parameter

Must implement explicit authorization:

```python
def get_authorized_identity(requested_identity):
  """Return authorized identity email or raise error."""
  if not requested_identity:
    return current_user.identity.email

  # Check if user has permission to view this identity
  if requested_identity not in current_user._identities:
    raise ForbiddenError(
      "Cannot view data for identity you do not have permission to access"
    )

  return requested_identity
```

## Recommended Approach

### Phase 1: Verify the Bug (Investigation)

1. **Test PUT /api/session**: Verify that identity switch persists correctly
   - Call PUT /api/session with different identity
   - Call GET /api/session to verify `current` field updated
   - Call GET /api/stats/streak to verify it uses new identity

2. **Test Frontend Behavior**: Check if frontend refreshes after identity switch
   - Monitor network requests after identity switch
   - Check if stats/feed endpoints are called again

3. **Root Cause**: If backend works but frontend doesn't refresh, fix the frontend

### Phase 2: Add Identity Parameter (If Needed)

If the server-side approach has limitations (e.g., multi-tab conflicts), then add identity parameter:

1. **Update StatsStreak**:
   ```python
   @authenticated
   def get(self):
     identity = self._get_authorized_identity(
       server.request.args.get("identity")
     )
     streak_data = compute_streak_for_user(identity)
     # ... rest of method

   def _get_authorized_identity(self, requested_identity):
     if not requested_identity:
       return current_user.identity.email
     if requested_identity not in current_user._identities:
       return problem_response("forbidden",
         detail=f"Cannot access identity: {requested_identity}")
     return requested_identity
   ```

2. **Update StatsWeekly**: Same pattern

3. **Update Feed**: Same pattern

4. **Update OpenAPI**: Add `identity` query parameter

## OpenAPI Schema Updates (If Adding Parameter)

### `/stats/streak` Addition

```yaml
parameters:
  - name: identity
    in: query
    required: false
    schema:
      type: string
      format: email
    description: |
      Email of the identity to view stats for.
      Must be in the authenticated user's identities list.
      Defaults to current identity (or authenticated user if no alternate selected).
```

### `/stats/weekly` Addition

Same as above.

### `/feed` Addition

Same parameter, but note interaction with `mode`:
- `identity` parameter works with any `mode`
- `mode=my` with `identity=X` shows X's activity
- `mode=following` with `identity=X` shows X's followed users' activity

### New Error Response

```yaml
'403':
  description: Not authorized to view this identity's data
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/Error'
      example:
        type: /errors#forbidden-identity
        title: Forbidden Identity
        status: 403
        detail: Cannot view data for identity you do not have permission to access
```

## Test Scenarios

### Backend Tests (If Adding Parameter)

1. **StatsStreak with no identity**:
   - GIVEN authenticated user with no alternate identity
   - WHEN GET /api/stats/streak
   - THEN returns authenticated user's streak

2. **StatsStreak with current identity**:
   - GIVEN authenticated user with `_current` set to alternate
   - WHEN GET /api/stats/streak
   - THEN returns alternate user's streak

3. **StatsStreak with authorized identity parameter**:
   - GIVEN authenticated user with `identities: ["child@example.com"]`
   - WHEN GET /api/stats/streak?identity=child@example.com
   - THEN returns child's streak

4. **StatsStreak with unauthorized identity parameter**:
   - GIVEN authenticated user with `identities: ["child@example.com"]`
   - WHEN GET /api/stats/streak?identity=other@example.com
   - THEN returns 403 Forbidden

5. **Feed with identity parameter**:
   - Same patterns as above, for all modes (my, following, all)

### Integration Tests

1. **Identity switch flow**:
   - PUT /api/session { "identity": "child@example.com" }
   - GET /api/session -> verify current is child
   - GET /api/stats/streak -> returns child's streak
   - GET /api/feed?mode=my -> returns child's feed

2. **Multiple tabs scenario**:
   - Tab A: identity = child
   - Tab B: identity = parent
   - Verify each tab sees correct data

## Backward Compatibility

All changes are additive:
- Adding optional query parameter does not break existing clients
- Existing behavior (using server-side state) remains default
- Parameter overrides server-side state when provided

## Implementation Tasks

If adding identity parameter is needed:

### Backend Tasks

- [ ] Create `_get_authorized_identity()` helper in stats.py
- [ ] Update `StatsStreak.get()` to use helper
- [ ] Update `StatsWeekly.get()` to use helper
- [ ] Update `Feed.get()` and helper methods to use helper
- [ ] Add 403 error handling for unauthorized identity
- [ ] Write backend tests for new parameter

### Frontend Tasks

- [ ] Update StatsStore to pass identity parameter (if using per-request approach)
- [ ] Update FeedStore to pass identity parameter (if using per-request approach)
- [ ] OR: Fix frontend to refresh after PUT /api/session (if using server-side approach)

### Documentation Tasks

- [ ] Update openapi.yaml with identity parameter
- [ ] Update error documentation for 403 Forbidden
- [ ] Update API analysis document

## Questions for User

1. **Root cause verified?** Has anyone verified whether the backend identity switch works but frontend doesn't refresh?

2. **Multi-tab behavior?** Is it a requirement that different browser tabs can show different identities simultaneously? This would favor Option B.

3. **Server-side vs per-request?** The server-side approach (Option A) is cleaner but requires frontend refresh. Is this acceptable?

## Conclusion

The backend identity switching mechanism is already implemented correctly. The TODO.md implementation notes suggesting "add optional user parameter" may be addressing the wrong problem.

**Recommended next steps**:
1. First verify the actual root cause (frontend not refreshing?)
2. If frontend refresh fixes the issue, no backend changes needed
3. If per-request identity is needed for multi-tab scenarios, implement the parameter with proper authorization