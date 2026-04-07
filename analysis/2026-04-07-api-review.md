# API Review: Social Feed System

Date: 2026-04-07
Reviewer: api-architect agent

---

## Overview

The Social Feed System APIs follow RESTful principles reasonably well but have several areas for improvement. Below is my detailed analysis.

---

## 1. RESTful Design Principles

**Strengths:**
- Collection resources use nouns (`/following`, `/followers`, `/users`)
- Proper HTTP method semantics (GET for read, POST for create, DELETE for remove)
- Sub-resource pattern used correctly for `/stats/following/streaks`

**Issues:**

### 1.1 Email as Resource Identifier

The `/api/following/{email}` endpoint uses email addresses as path parameters, which is problematic:

```python
# Line 333 in follows.py
server.api.add_resource(FollowingUser, "/api/following/<path:email>", ...)
```

The use of `<path:email>` instead of `<string:email>` indicates URL encoding issues with `@` and `.` characters.

**Recommendation:** Use a URL-safe user identifier instead:
```yaml
# Current (problematic)
/api/following/user@example.com

# Recommended
/api/following/usr_abc123
# OR
/api/following?email=user@example.com  # for the GET check endpoint
```

### 1.2 GET Returns 200 for Non-Existent Resource

The GET `/api/following/{email}` endpoint returns 200 with `{"following": false}` when not following:

```python
# Lines 107-113 in follows.py
if not follow:
    return {"following": False}, 200

return {
    "following": True,
    "followed_at": follow["created_at"].isoformat() + "Z"
}, 200
```

This is a convenience pattern but violates REST semantics. A GET for a specific resource should return the resource or 404.

**Recommendation:** Either:
1. **Option A (Pure REST):** Return 404 when not following
2. **Option B (Current approach but documented):** Keep current behavior but clearly document this is intentional for client convenience

---

## 2. Consistent Naming Conventions

**Strengths:**
- Consistent field names across responses (`email`, `name`, `picture`)
- Consistent timestamp naming (`followed_at`, `created_at`)

**Issues:**

### 2.1 Schema Inconsistency

The `following` field has different types in different responses:

| Endpoint | Field | Type |
|----------|-------|------|
| POST `/api/following/{email}` (201) | `following` | `UserInfo` object |
| DELETE `/api/following/{email}` (200) | `following` | `string` (email) |

```python
# POST response (lines 179-187)
return {
    "follower": user_email,
    "following": {              # Object
        "email": email,
        "name": ...,
        "picture": ...
    },
    ...
}

# DELETE response (lines 218-222)
return {
    "follower": user_email,
    "following": email,         # String
    ...
}
```

**Recommendation:** Standardize to return consistent types:

```yaml
# Recommended: Use UserInfo object everywhere
UnfollowResponse:
  properties:
    follower:
      type: string
    following:
      $ref: '#/components/schemas/UserInfo'
    removed:
      type: boolean
```

---

## 3. Error Handling Patterns

**Issues:**

### 3.1 Non-Standard Error Format

Errors use Flask's `abort()` which returns plain text, not RFC 7807 Problem Details:

```python
# Lines 143-149 in follows.py
if email == user_email:
    abort(400, "Cannot follow yourself")

if not target_user:
    abort(404, "User not found")
```

**Recommendation:** Implement RFC 7807 Problem Details:

```json
{
  "type": "https://api.letmelearn.com/errors/self-follow",
  "title": "Cannot Follow Self",
  "status": 400,
  "detail": "Users cannot follow themselves."
}
```

### 3.2 Missing Input Validation

No validation on email format:

```python
email_prefix = server.request.args.get("email", "")
if len(email_prefix) < 2:
    return []
```

**Recommendation:** Add email format validation:

```python
import re
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')

if not EMAIL_REGEX.match(email):
    abort(422, "Invalid email format")
```

---

## 4. Request/Response Structure

**Issues:**

### 4.1 No Pagination for Collection Endpoints

`/api/following` and `/api/followers` return unbounded arrays:

```python
# Lines 45-76 in follows.py
result = []
for follow in follows:
    ...
    result.append({...})
return result  # No pagination
```

**Recommendation:** Add pagination:

```yaml
GET /api/following?limit=20&cursor=xxx

Response:
{
  "data": [...],
  "pagination": {
    "next_cursor": "...",
    "has_more": true
  }
}
```

### 4.2 Missing 422 Status for Validation

The OpenAPI spec lists 400 for validation errors, but 422 Unprocessable Entity is more semantic for business rule violations:

```yaml
# Current
'400':
  description: Cannot follow yourself

# Recommended
'400':
  description: Malformed request (e.g., invalid JSON)
'422':
  description: Cannot follow yourself (valid format, invalid business rule)
```

---

## 5. Security Considerations

**Issues:**

### 5.1 User Enumeration via Search

The `/api/users?email={prefix}` endpoint could be abused for email enumeration:

```python
# Lines 310-314 in follows.py
users = list(db.users.find(
    {"_id": {"$regex": f"^{email_prefix}", "$options": "i"}},
    ...
).limit(10))
```

**Recommendation:**
1. Increase minimum prefix length (currently 2 chars - too short)
2. Add rate limiting
3. Consider only showing users with mutual follows or connections

```python
if len(email_prefix) < 3:  # Increase from 2 to 3
    return []
```

### 5.2 Privacy of Followed Users' Stats

The `/api/stats/following/streaks` endpoint exposes streak data of followed users without their consent:

```python
# Lines 269-277 in stats.py
results.append({
    "email": email,
    "name": user.get("name", email),
    "picture": user.get("picture"),
    "streak": streak_data["streak"],
    "today_minutes": streak_data["today_minutes"]
})
```

**Recommendation:** Add a privacy setting for users to control visibility of their stats:

```python
# Add to user schema
{
  "_id": "email@example.com",
  "privacy": {
    "show_streak_to_followers": true  # Default false?
  }
}
```

### 5.3 Missing Authorization on Cross-User Data

Users can view streaks of anyone they follow, but there's no mechanism for the followed user to opt out.

---

## 6. Documentation Completeness

**Issues:**

### 6.1 OpenAPI Schema Mismatch

The `FollowingStreak` schema in OpenAPI differs from implementation:

```yaml
# OpenAPI (lines 1310-1327)
FollowingStreak:
  properties:
    user:        # Uses 'user' key
      $ref: '#/components/schemas/UserInfo'
    streak: ...
    today_minutes: ...

# Implementation (stats.py lines 271-277)
{
    "email": email,     # Uses 'email' key directly
    "name": ...,
    "picture": ...,
    "streak": ...,
    "today_minutes": ...
}
```

**Recommendation:** Align OpenAPI spec with implementation. Either:
1. Update OpenAPI to match implementation, or
2. Update implementation to wrap user info in `user` key

### 6.2 Missing Documentation

- No documentation for rate limiting
- No privacy policy for user data visibility
- No documentation on pagination support (or explicit note that it's unbounded)

---

## Summary of Recommendations

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| **High** | Email as path parameter | Consider using user IDs or query parameter for GET |
| **High** | Schema inconsistency | Standardize `following` field type across responses |
| **High** | OpenAPI/Implementation mismatch | Fix `FollowingStreak` schema |
| **Medium** | Error format | Implement RFC 7807 Problem Details |
| **Medium** | User enumeration | Increase minimum search prefix, add rate limiting |
| **Medium** | Privacy concern | Add opt-out for streak visibility |
| **Low** | Pagination | Add pagination for `/following` and `/followers` |
| **Low** | Input validation | Add email format validation |

---

## Files Requiring Updates

1. **`letmelearn/follows.py`** - Schema consistency, error handling
2. **`letmelearn/stats.py`** - Schema consistency, privacy
3. **`docs/openapi.yaml`** - Schema alignment, add 422 status
4. **`analysis/api.md`** - Document decisions, privacy considerations