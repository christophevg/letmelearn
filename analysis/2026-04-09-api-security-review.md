# API Security & Architecture Review

**Date**: 2026-04-09
**Reviewer**: API Architect Agent
**Context**: Post-baseline code review - security and architecture assessment

## Executive Summary

This review analyzes the Let Me Learn API from security, RESTful design, and architecture perspectives. The codebase demonstrates good adherence to RFC 7807 error handling standards and RESTful principles, but has several critical security vulnerabilities and API design gaps that require immediate attention.

**Overall Assessment**: Production-ready with critical security fixes required. API design follows RESTful principles well. OpenAPI specification is comprehensive but missing some details.

---

## Critical Security Vulnerabilities (Prio:1)

### C1: Default Secret Key in Production Code

**Location**: `letmelearn/web.py:72`

```python
server.config["SECRET_KEY"] = os.environ.get("APP_SECRET_KEY", default="local")
```

**API Impact**: HIGH - Session hijacking, CSRF bypass

**Issue**: The default secret key "local" allows an attacker who doesn't have the environment variable set to forge session cookies. This affects:
- Flask-Login session integrity
- CSRF token validation
- Flash message signing

**API Recommendations**:

1. **Fail-fast approach** (recommended):
```python
secret_key = os.environ.get("APP_SECRET_KEY")
if not secret_key:
    if os.environ.get("ENV", "development") == "production":
        raise RuntimeError("APP_SECRET_KEY must be set in production")
    logger.warning("Using insecure default secret key - not suitable for production")
    secret_key = "local-development-only"
server.config["SECRET_KEY"] = secret_key
```

2. **Add environment check**:
```python
# At startup, validate production configuration
def validate_production_config():
    if server.config["SECRET_KEY"] == "local":
        if os.environ.get("ENV") == "production":
            raise RuntimeError("Insecure secret key in production environment")
```

3. **Document in OpenAPI**: Add security notes to OpenAPI spec about required environment variables.

### C2: TEST_MODE Bypasses OAuth

**Location**: `letmelearn/oauth.py:16`

```python
TEST_MODE = os.environ.get("TEST_MODE", "false").lower() == "true"
```

**API Impact**: CRITICAL - Authentication bypass in production

**Issue**: If `TEST_MODE=true` is accidentally left in production:
- OAuth decorator passes through without validation
- Session endpoint accepts any email in request body
- No rate limiting protects test endpoints

**API Recommendations**:

1. **Fail-fast with production check**:
```python
TEST_MODE = os.environ.get("TEST_MODE", "false").lower() == "true"

if TEST_MODE:
    env = os.environ.get("ENV", "development")
    if env == "production":
        raise RuntimeError(
            "TEST_MODE cannot be enabled in production environment. "
            "Set ENV=production or remove TEST_MODE=true"
        )
    logger.warning("=" * 60)
    logger.warning("TEST_MODE ENABLED - OAUTH BYPASSED")
    logger.warning("DO NOT USE IN PRODUCTION")
    logger.warning("=" * 60)
```

2. **Add security headers** for test mode responses:
```python
@authenticated
def get(self):
    response = current_user.as_json()
    if TEST_MODE:
        response.headers["X-Test-Mode"] = "true"
    return response
```

3. **Rate limit test mode** even if OAuth is bypassed.

### C3: Regex Injection Vulnerability

**Location**: `letmelearn/api/follows.py:318`

```python
users = list(db.users.find(
    {"_id": {"$regex": f"^{email_prefix}", "$options": "i"}},
    {"_id": 1, "name": 1, "picture": 1}
).limit(10))
```

**API Impact**: HIGH - ReDoS attack, potential data exposure

**Issue**: User input `email_prefix` is directly interpolated into a regex pattern without escaping. Malicious inputs like:
- `a.*.*.*.*.*` - causes exponential backtracking
- `^$` - could match unintended patterns

**API Recommendations**:

1. **Escape regex special characters** (immediate fix):
```python
import re

def escape_regex(s):
    """Escape regex special characters for literal matching."""
    return re.escape(s)

# In UserSearch.get():
email_prefix = server.request.args.get("email", "")
safe_prefix = re.escape(email_prefix)
users = list(db.users.find(
    {"_id": {"$regex": f"^{safe_prefix}", "$options": "i"}},
    {"_id": 1, "name": 1, "picture": 1}
).limit(10))
```

2. **Add input validation**:
```python
# Validate email prefix format
if not re.match(r'^[a-zA-Z0-9._%+-]+$', email_prefix):
    return []  # Invalid characters, return empty
```

3. **Consider alternative query** (long-term):
```python
# Use case-insensitive index instead of regex
users = list(db.users.find(
    {"_id": {"$gte": email_prefix.lower(), "$lt": email_prefix.lower() + "\uffff"}},
    {"_id": 1, "name": 1, "picture": 1}
).limit(10))
```

4. **Update OpenAPI** to document input restrictions:
```yaml
parameters:
  - name: email
    in: query
    required: true
    schema:
      type: string
      minLength: 3
      pattern: '^[a-zA-Z0-9._%+-]+$'
    description: |
      Email prefix to search for (minimum 3 characters).
      Only alphanumeric characters and ._%+- are allowed.
```

---

## High Priority Security Issues (Prio:2)

### H2: Test Mode Arbitrary Email Login

**Location**: `letmelearn/api/session.py:34-41`

**API Impact**: MEDIUM - Privilege escalation

**Issue**: In test mode, any existing email in the database can be used to authenticate. This allows:
- Any test user to impersonate any other user
- Privilege escalation if test accounts have elevated permissions

**API Recommendations**:

1. **Add test user whitelist**:
```python
# In oauth.py or config
ALLOWED_TEST_USERS = [
    "test@example.com",
    "admin@test.local",
]

# In session.py
if TEST_MODE:
    email = request.json.get("email", "test@example.com")
    if email not in ALLOWED_TEST_USERS:
        logger.warning(f"Unauthorized test login attempt: {email}")
        return problem_response("forbidden", detail="Test mode restricted to test accounts")
```

2. **Add audit logging**:
```python
logger.info(f"Test mode login: {email} from IP {request.remote_addr}")
```

### H6: No Rate Limiting on Authentication Endpoints

**Location**: All API files, specifically `api/session.py`

**API Impact**: HIGH - Brute force vulnerability

**Issue**: `POST /api/session` has no rate limiting. In production (with OAuth), this isn't critical, but in test mode, it allows unlimited authentication attempts.

**API Recommendations**:

1. **Add Flask-Limiter** (recommended):
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    server,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Apply to authentication endpoints
@limiter.limit("10 per minute")
def post(self):
    # session creation
```

2. **Rate limits by endpoint type**:

| Endpoint | Recommended Limit | Rationale |
|----------|------------------|-----------|
| `POST /api/session` | 10/minute | Authentication brute-force protection |
| `GET /api/users` | 30/minute | Search rate limiting |
| `POST /api/following/{email}` | 30/minute | Prevent follow spam |
| `POST /api/sessions` | 60/minute | Normal quiz usage |
| `GET /api/*` | 200/minute | General read limit |

3. **Return rate limit headers**:
```python
# Flask-Limiter adds these automatically:
# X-RateLimit-Limit: 10
# X-RateLimit-Remaining: 9
# X-RateLimit-Reset: 1609459200
```

4. **Add 429 response to OpenAPI**:
```yaml
responses:
  '429':
    description: Rate limit exceeded
    headers:
      X-RateLimit-Limit:
        schema:
          type: integer
      X-RateLimit-Remaining:
        schema:
          type: integer
      Retry-After:
        schema:
          type: integer
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
```

---

## API Design Issues

### H4: Items Endpoint Returns None Instead of 404

**Location**: `letmelearn/api/topics.py:213-221`

**API Impact**: MEDIUM - Breaks error handling contract

**Issue**: When posting an item to a non-existent topic, the endpoint returns `None` instead of a proper 404 response.

```python
return db.topics.find_one_and_update(
    {"_id": id, "user": current_user.identity.email},
    {"$push": {"items": server.request.json}}
)
# Returns None if topic not found, instead of 404
```

**API Recommendations**:

1. **Return proper 404 response**:
```python
def post(self, id):
    result = db.topics.find_one_and_update(
        {"_id": id, "user": current_user.identity.email},
        {"$push": {"items": server.request.json}},
        return_document=True
    )
    if not result:
        return problem_response("not_found",
            detail=f"Topic '{id}' not found or does not belong to you")
    return result
```

2. **Update OpenAPI to document 404**:
```yaml
/api/topics/{id}/items:
  post:
    responses:
      '200':
        description: Item added to topic
      '401':
        $ref: '#/components/responses/Unauthorized'
      '404':
        description: Topic not found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Error'
```

### H5: JSON Comparison for Item Matching

**Location**: `letmelearn/api/topics.py:236-247`

**API Impact**: LOW - Data integrity issue

**Issue**: Using `items: server.request.json["original"]` as a query filter relies on JSON key ordering matching exactly, which is unreliable.

**API Recommendations**:

1. **Use item ID instead**:
```python
# Add item IDs to items
for i, item in enumerate(topic.items):
    item["id"] = f"item_{i}"

# Then query by ID
def patch(self, id):
    item_id = server.request.json["id"]
    result = db.topics.find_one_and_update(
        {"_id": id, "user": current_user.identity.email, "items.id": item_id},
        {"$set": {"items.$": server.request.json["update"]}},
        return_document=True
    )
```

2. **Or use array index**:
```python
def patch(self, id):
    index = server.request.json["index"]
    result = db.topics.find_one_and_update(
        {"_id": id, "user": current_user.identity.email},
        {"$set": {f"items.{index}": server.request.json["update"]}},
        return_document=True
    )
```

### Pagination Missing

**Location**: All collection endpoints

**API Impact**: MEDIUM - Performance, scalability

**Issue**: The following endpoints return unbounded arrays:

| Endpoint | Current Behavior | Risk |
|----------|------------------|------|
| `GET /api/following` | Returns all followed users | Performance at scale |
| `GET /api/followers` | Returns all followers | Performance at scale |
| `GET /api/feed` | Returns last 10 items | OK (limited) |
| `GET /api/topics` | Returns all topics | Performance with many topics |
| `GET /api/folders` | Returns entire tree | OK (hierarchical) |

**API Recommendations**:

1. **Add cursor-based pagination**:
```python
# Example for /api/following
def get(self):
    cursor = server.request.args.get("cursor")
    limit = min(int(server.request.args.get("limit", 20)), 100)

    query = {"follower": current_user.identity.email}
    if cursor:
        query["created_at"] = {"$lt": ObjectId(cursor)}

    follows = list(db.follows.find(query)
        .sort("created_at", -1)
        .limit(limit + 1))

    has_more = len(follows) > limit
    if has_more:
        follows = follows[:limit]

    return {
        "data": [format_follow(f) for f in follows],
        "pagination": {
            "next_cursor": follows[-1]["_id"] if has_more else None,
            "has_more": has_more
        }
    }
```

2. **Update OpenAPI schemas**:
```yaml
FollowListResponse:
  type: object
  required:
    - data
    - pagination
  properties:
    data:
      type: array
      items:
        $ref: '#/components/schemas/FollowedUser'
    pagination:
      $ref: '#/components/schemas/Pagination'

Pagination:
  type: object
  required:
    - has_more
  properties:
    next_cursor:
      type: string
      description: Cursor for next page (null if no more)
    has_more:
      type: boolean
      description: Whether more results exist
```

---

## RESTful Compliance Assessment

### Strengths

1. **Resource-oriented URLs**: All endpoints use nouns, not verbs
   - `/sessions`, `/topics`, `/feed`, `/following/{email}`

2. **Proper HTTP methods**:
   - `GET` for retrieval
   - `POST` for creation
   - `PATCH` for partial updates
   - `DELETE` for removal

3. **Status codes**: Generally good use of 200, 201, 401, 404

4. **RFC 7807 compliance**: Excellent error handling format

### Areas for Improvement

| Issue | Current | Recommended | Priority |
|-------|---------|-------------|----------|
| Creation returns 200 | `POST /api/following` returns 200 | Return 201 for creation | Low |
| 201 vs 200 inconsistency | Some POSTs return 200, some 201 | Standardize on 201 for creation | Low |
| Missing 429 Too Many Requests | No rate limiting | Add 429 responses | High |
| DELETE returns 200 | Returns resource | Consider 204 No Content | Low |
| Collection responses unwrapped | Return arrays | Wrap in `{data, pagination}` | Medium |

---

## OpenAPI Specification Assessment

### Completeness

| Area | Status | Notes |
|------|--------|-------|
| Endpoint definitions | Good | All endpoints documented |
| Request schemas | Good | Most request bodies defined |
| Response schemas | Good | Most response bodies defined |
| Error schemas | Excellent | RFC 7807 fully implemented |
| Security schemes | Good | Cookie + Bearer documented |
| Examples | Missing | No examples provided |
| Rate limiting docs | Missing | Not documented |
| Privacy policy | Missing | Not referenced |

### Recommendations

1. **Add response examples**:
```yaml
responses:
  '200':
    description: List of followed users
    content:
      application/json:
        example:
          - email: "user@example.com"
            name: "John Doe"
            picture: "https://..."
            followed_at: "2026-04-09T10:00:00Z"
```

2. **Add rate limiting documentation**:
```yaml
info:
  description: |
    ...
    
    ## Rate Limiting
    
    This API implements rate limiting:
    - Authentication endpoints: 10 requests/minute
    - Read endpoints: 200 requests/minute
    - Write endpoints: 50 requests/minute
    
    Rate limit headers are included in all responses.
```

3. **Document input validation**:
```yaml
components:
  schemas:
    EmailPrefix:
      type: string
      minLength: 3
      maxLength: 100
      pattern: '^[a-zA-Z0-9._%+-]+$'
      description: Email prefix for user search
```

---

## Authentication & Authorization Review

### Current Implementation

**OAuth Flow** (production):
1. Frontend obtains Google OAuth token
2. Token sent as `Authorization: Bearer <token>`
3. `POST /api/session` validates token via oatk
4. Flask-Login session created

**Test Mode Flow**:
1. `TEST_MODE=true` environment variable
2. OAuth bypassed
3. Email provided in request body
4. Flask-Login session created

### Security Assessment

| Aspect | Production | Test Mode | Risk |
|--------|-----------|-----------|------|
| OAuth validation | Required | Bypassed | HIGH |
| Session cookie | Secure | Secure | LOW |
| CSRF protection | Implicit | Implicit | LOW |
| Rate limiting | Needed | Critical | HIGH |
| Audit logging | Missing | Missing | MEDIUM |

### Recommendations

1. **Add audit logging for authentication events**:
```python
def post(self):
    if TEST_MODE:
        logger.info(f"AUTH: Test login for {email} from {request.remote_addr}")
    else:
        logger.info(f"AUTH: OAuth login for {email} from {request.remote_addr}")
```

2. **Add session expiration**:
```python
# In web.py
server.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=7)
server.config["SESSION_REFRESH_EACH_REQUEST"] = True
```

3. **Consider CSRF token validation** for state-changing operations.

---

## Input Validation Review

### Current State

**No centralized input validation**. Each endpoint handles validation ad-hoc:

| Endpoint | Validation | Gaps |
|----------|-----------|------|
| `POST /api/session` | None (test mode) | Email format not validated |
| `GET /api/users?email=` | Length check (3 chars) | Regex chars not escaped |
| `POST /api/following/{email}` | None | Email format not validated |
| `POST /api/topics` | None | Malformed JSON could crash |
| `POST /api/sessions` | Required fields | Type validation missing |

### Recommendations

1. **Add request validation decorator**:
```python
from functools import wraps
from flask import request

def validate_schema(schema):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                validate(request.json, schema)
            except ValidationError as e:
                return problem_response("bad_request",
                    detail=f"Validation error: {e.message}")
            return func(*args, **kwargs)
        return wrapper
    return decorator

# Usage
@validate_schema({
    "type": "object",
    "required": ["kind", "topics"],
    "properties": {
        "kind": {"enum": ["quiz", "training"]},
        "topics": {"type": "array", "minItems": 1}
    }
})
def post(self):
    ...
```

2. **Add email validation**:
```python
import re

EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

def validate_email(email):
    if not EMAIL_PATTERN.match(email):
        raise ValueError("Invalid email format")
    return email
```

---

## Performance Considerations

### Database Queries

| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| N+1 queries | `api/follows.py:58-74` | Medium | Use `$lookup` aggregation |
| Unbounded results | `GET /api/following` | High | Add pagination |
| Regex search | `api/follows.py:318` | Medium | Use escaped pattern or indexed query |
| Migration on startup | `data.py:21-40` | Low | Add version check |

### Recommendations

1. **Use aggregation for follows**:
```python
# Instead of N+1 queries
pipeline = [
    {"$match": {"follower": user_email}},
    {"$lookup": {
        "from": "users",
        "localField": "following",
        "foreignField": "_id",
        "as": "user"
    }},
    {"$unwind": "$user"},
    {"$project": {
        "email": "$following",
        "name": "$user.name",
        "picture": "$user.picture",
        "followed_at": "$created_at"
    }}
]
result = list(db.follows.aggregate(pipeline))
```

2. **Add database indexes** (already done for follows, sessions):
```python
# For user search
db.users.create_index([("_id", 1)])  # Already exists as _id_
```

---

## Error Handling Assessment

### Strengths

1. **RFC 7807 Problem Details**: Excellent implementation in `errors.py`
2. **Consistent format**: All errors use `type`, `title`, `status`, `detail`
3. **Custom problem types**: Business errors like `self_follow`, `user_not_found`

### Gaps

| Gap | Location | Recommendation |
|-----|----------|----------------|
| Missing 404 for items | `api/topics.py` | Add proper 404 response |
| Missing 422 for validation | None | Add input validation |
| Missing 429 for rate limit | None | Add rate limiting |

---

## Implementation Priority

### Phase 1: Critical Security (Immediate)

1. **Remove default secret key** (C1)
   - Add fail-fast for missing `APP_SECRET_KEY`
   - Add production environment check

2. **Fix regex injection** (C3)
   - Escape regex special characters
   - Add input validation

3. **Add TEST_MODE safeguard** (C2)
   - Fail-fast in production
   - Add warning banners
   - Add test user whitelist

### Phase 2: High Priority (Sprint)

1. **Add rate limiting** (H6)
   - Implement Flask-Limiter
   - Add rate limit documentation
   - Add 429 responses to OpenAPI

2. **Fix items endpoint 404** (H4)
   - Return proper error for non-existent topic

3. **Add test user whitelist** (H2)
   - Restrict test mode to specific accounts

### Phase 3: Medium Priority (Next Sprint)

1. **Add pagination** to collection endpoints
2. **Add input validation** layer
3. **Standardize response codes** (201 for creation)
4. **Add audit logging** for authentication

### Phase 4: Low Priority (Backlog)

1. **Add response examples** to OpenAPI
2. **Optimize N+1 queries**
3. **Add CSRF token validation**
4. **Consider DELETE returning 204**

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `letmelearn/web.py` | Remove default secret key, add env check | P1 |
| `letmelearn/oauth.py` | Add TEST_MODE production safeguard | P1 |
| `letmelearn/api/follows.py` | Escape regex, add rate limiting | P1/P2 |
| `letmelearn/api/session.py` | Add test user whitelist, rate limiting | P2 |
| `letmelearn/api/topics.py` | Fix 404 response | P2 |
| `letmelearn/data.py` | Add version check for migration | P2 |
| `docs/openapi.yaml` | Add rate limiting docs, examples | P3 |
| `letmelearn/errors.py` | Add 429 rate limit error type | P2 |

---

## Summary

The Let Me Learn API is well-designed from a RESTful perspective with excellent error handling. The main concerns are:

1. **Critical security vulnerabilities** that must be fixed before production deployment
2. **Missing rate limiting** on authentication endpoints
3. **Inconsistent error responses** in some endpoints
4. **Missing input validation** across the API

The OpenAPI specification is comprehensive but would benefit from examples and rate limiting documentation. The RFC 7807 error handling implementation is exemplary and should be maintained as the standard for all endpoints.

**Recommendation**: Address Phase 1 (Critical Security) immediately before any further production deployment.