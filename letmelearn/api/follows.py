"""
Follow relationship management for social features.

Provides RESTful endpoints for:
- GET /api/following - List users I follow
- POST /api/following/<email> - Follow a user
- GET /api/following/<email> - Check if following a user
- DELETE /api/following/<email> - Unfollow a user
- GET /api/followers - List users following me
- GET /api/users?email= - Search users by email prefix
"""

import logging
from datetime import datetime

from flask_restful import Resource
from flask_login import current_user

from letmelearn.web import server
from letmelearn.data import db
from letmelearn.auth import authenticated
from letmelearn.errors import problem_response

logger = logging.getLogger(__name__)


class Following(Resource):
  """Manage the list of users the current user follows."""

  @authenticated
  def get(self):
    """List users the current user follows.

    Returns:
      [
        {
          "email": "user@example.com",
          "name": "User Name",
          "picture": "https://...",
          "followed_at": "2026-04-06T14:00:00Z"
        },
        ...
      ]
    """
    user_email = current_user.identity.email

    # Get follow relationships
    follows = list(db.follows.find(
      {"follower": user_email},
      {"_id": 0, "following": 1, "created_at": 1}
    ).sort("created_at", -1))

    if not follows:
      return []

    # Get user info for each followed user
    following_emails = [f["following"] for f in follows]
    users = {
      u["_id"]: u
      for u in db.users.find({"_id": {"$in": following_emails}})
    }

    # Build response
    result = []
    for follow in follows:
      email = follow["following"]
      user = users.get(email)
      if user:
        result.append({
          "email": email,
          "name": user.get("name", email),
          "picture": user.get("picture"),
          "followed_at": follow["created_at"].isoformat() + "Z"
        })

    return result


class FollowingUser(Resource):
  """Manage a specific follow relationship."""

  @authenticated
  def get(self, email):
    """Check if following a specific user.

    Args:
      email: Email address of user to check (in URL path)

    Returns:
      {
        "following": true,
        "followed_at": "2026-04-06T14:00:00Z"
      }

    Status codes:
      200: Relationship exists
      404: Not following this user
    """
    user_email = current_user.identity.email

    follow = db.follows.find_one({
      "follower": user_email,
      "following": email
    })

    if not follow:
      return {"following": False}, 200

    return {
      "following": True,
      "followed_at": follow["created_at"].isoformat() + "Z"
    }, 200

  @authenticated
  def post(self, email):
    """Follow a user.

    Args:
      email: Email address of user to follow (in URL path)

    Returns:
      {
        "follower": "current@example.com",
        "following": {
          "email": "user@example.com",
          "name": "User Name",
          "picture": "https://..."
        },
        "created_at": "2026-04-06T14:00:00Z"
      }

    Status codes:
      201: Successfully followed
      200: Already following (idempotent)
      422: Cannot follow yourself
      404: User not found
    """
    user_email = current_user.identity.email

    # Cannot follow yourself
    if email == user_email:
      return problem_response("self_follow", detail="Users cannot follow themselves")

    # Check if user exists
    target_user = db.users.find_one({"_id": email})
    if not target_user:
      return problem_response("user_not_found", detail=f"User '{email}' not found")

    # Check if already following
    existing = db.follows.find_one({
      "follower": user_email,
      "following": email
    })

    if existing:
      # Idempotent - return existing relationship
      return {
        "follower": user_email,
        "following": {
          "email": email,
          "name": target_user.get("name", email),
          "picture": target_user.get("picture")
        },
        "created_at": existing["created_at"].isoformat() + "Z"
      }, 200

    # Create follow relationship
    now = datetime.utcnow()
    db.follows.insert_one({
      "follower": user_email,
      "following": email,
      "created_at": now
    })

    logger.info(f"User {user_email} started following {email}")

    return {
      "follower": user_email,
      "following": {
        "email": email,
        "name": target_user.get("name", email),
        "picture": target_user.get("picture")
      },
      "created_at": now.isoformat() + "Z"
    }, 201

  @authenticated
  def delete(self, email):
    """Unfollow a user.

    Args:
      email: Email address of user to unfollow (in URL path)

    Returns:
      {
        "follower": "current@example.com",
        "following": {
          "email": "user@example.com",
          "name": "User Name",
          "picture": "https://..."
        },
        "removed": true
      }

    Status codes:
      200: Successfully unfollowed (or wasn't following)
    """
    user_email = current_user.identity.email

    # Get user info before removing relationship
    target_user = db.users.find_one({"_id": email})

    # Remove follow relationship
    result = db.follows.delete_one({
      "follower": user_email,
      "following": email
    })

    if result.deleted_count > 0:
      logger.info(f"User {user_email} unfollowed {email}")

    return {
      "follower": user_email,
      "following": {
        "email": email,
        "name": target_user.get("name", email) if target_user else email,
        "picture": target_user.get("picture") if target_user else None
      },
      "removed": result.deleted_count > 0
    }, 200


class Followers(Resource):
  """Manage users following the current user."""

  @authenticated
  def get(self):
    """List users following the current user.

    Returns:
      [
        {
          "email": "user@example.com",
          "name": "User Name",
          "picture": "https://...",
          "followed_at": "2026-04-06T14:00:00Z"
        },
        ...
      ]
    """
    user_email = current_user.identity.email

    # Get follower relationships
    follows = list(db.follows.find(
      {"following": user_email},
      {"_id": 0, "follower": 1, "created_at": 1}
    ).sort("created_at", -1))

    if not follows:
      return []

    # Get user info for each follower
    follower_emails = [f["follower"] for f in follows]
    users = {
      u["_id"]: u
      for u in db.users.find({"_id": {"$in": follower_emails}})
    }

    # Build response
    result = []
    for follow in follows:
      email = follow["follower"]
      user = users.get(email)
      if user:
        result.append({
          "email": email,
          "name": user.get("name", email),
          "picture": user.get("picture"),
          "followed_at": follow["created_at"].isoformat() + "Z"
        })

    return result


class UserSearch(Resource):
  """Search for users by email."""

  @authenticated
  def get(self):
    """Search for users by email prefix.

    Query params:
      email: Email prefix to search for (required, min 3 chars)

    Returns:
      [
        {
          "email": "user@example.com",
          "name": "User Name",
          "picture": "https://..."
        },
        ...
      ]

    Status codes:
      200: Search results
      400: Missing or invalid email parameter
    """
    email_prefix = server.request.args.get("email", "")

    if len(email_prefix) < 3:
      return []

    user_email = current_user.identity.email

    # Search for users by email prefix (case-insensitive)
    users = list(db.users.find(
      {"_id": {"$regex": f"^{email_prefix}", "$options": "i"}},
      {"_id": 1, "name": 1, "picture": 1}
    ).limit(10))

    # Format response and exclude current user
    result = []
    for user in users:
      email = user["_id"]
      if email == user_email:
        continue  # Don't include current user in results
      result.append({
        "email": email,
        "name": user.get("name", email),
        "picture": user.get("picture")
      })

    return result