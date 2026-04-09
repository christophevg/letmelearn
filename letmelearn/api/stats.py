"""
Statistics endpoints for gamification features.

Provides RESTful endpoints for:
- GET /api/stats/streak - Current streak and today's time
- GET /api/stats/weekly - Weekly statistics
- GET /api/stats/following/streaks - Streaks of followed users
"""

import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from flask_restful import Resource
from flask_login import current_user

from letmelearn.data import db
from letmelearn.auth import authenticated

logger = logging.getLogger(__name__)

BELGIUM_TZ = ZoneInfo("Europe/Brussels")


def compute_streak_for_user(user_email):
  """Compute streak data for a specific user.

  Returns:
    {
      "streak": int,
      "today_minutes": int
    }
  """
  today = datetime.now(BELGIUM_TZ).date()

  # Compute streak: consecutive days with 15+ min quiz time
  pipeline = [
    {"$match": {
      "user": user_email,
      "kind": "quiz",
      "status": {"$in": ["completed", "abandoned"]}
    }},
    {"$project": {
      "day": {
        "$dateToString": {
          "date": "$started_at",
          "format": "%Y-%m-%d",
          "timezone": "Europe/Brussels"
        }
      },
      "elapsed": 1
    }},
    {"$group": {
      "_id": "$day",
      "total_elapsed": {"$sum": "$elapsed"}
    }},
    {"$match": {
      "total_elapsed": {"$gte": 900}  # 15 min = 900 seconds
    }},
    {"$sort": {"_id": -1}}
  ]

  qualifying_days = list(db.sessions.aggregate(pipeline))

  # Count consecutive qualifying days
  streak = 0

  # Determine starting point: if today doesn't qualify yet, check from yesterday
  today_str = today.isoformat()
  today_qualifies = any(d["_id"] == today_str for d in qualifying_days)

  if today_qualifies:
    expected_day = today
  else:
    expected_day = today - timedelta(days=1)

  for day_doc in qualifying_days:
    day_date = datetime.strptime(day_doc["_id"], "%Y-%m-%d").date()
    if day_date == expected_day:
      streak += 1
      expected_day -= timedelta(days=1)
    else:
      break

  # Get today's time
  today_str = today.isoformat()
  today_pipeline = [
    {"$match": {
      "user": user_email,
      "kind": "quiz",
      "status": {"$in": ["completed", "abandoned", "active"]}
    }},
    {"$project": {
      "day": {
        "$dateToString": {
          "date": "$started_at",
          "format": "%Y-%m-%d",
          "timezone": "Europe/Brussels"
        }
      },
      "elapsed": 1
    }},
    {"$match": {"day": today_str}},
    {"$group": {
      "_id": None,
      "total": {"$sum": "$elapsed"}
    }}
  ]

  today_result = list(db.sessions.aggregate(today_pipeline))
  today_seconds = today_result[0]["total"] if today_result else 0
  today_minutes = today_seconds // 60

  return {
    "streak": streak,
    "today_minutes": today_minutes
  }


class StatsStreak(Resource):
  """Get current streak information."""

  @authenticated
  def get(self):
    """Get streak data for gamification display.

    A streak day requires 15+ minutes of quiz time.
    Streak counts consecutive days from today backwards.

    Returns:
      {
        "streak": 5,
        "today_minutes": 12,
        "streak_risk": true,
        "risk_level": "medium"
      }
    """
    user_email = current_user.identity.email
    streak_data = compute_streak_for_user(user_email)

    # Compute risk level
    today_minutes = streak_data["today_minutes"]
    streak_risk = today_minutes < 15
    if today_minutes >= 15:
      risk_level = "none"
    elif today_minutes >= 10:
      risk_level = "low"
    elif today_minutes >= 5:
      risk_level = "medium"
    else:
      risk_level = "high"

    return {
      "streak": streak_data["streak"],
      "today_minutes": today_minutes,
      "streak_risk": streak_risk,
      "risk_level": risk_level
    }


class StatsWeekly(Resource):
  """Get weekly statistics."""

  @authenticated
  def get(self):
    """Get statistics for the current calendar week (Monday-Sunday).

    Returns:
      {
        "quizzes": 23,
        "correct": 87,
        "attempts": 100,
        "accuracy": 87.0,
        "time_minutes": 45
      }
    """
    user_email = current_user.identity.email

    # Get Monday of current week in Belgium timezone
    now_belgium = datetime.now(BELGIUM_TZ)
    monday = now_belgium - timedelta(days=now_belgium.weekday())
    monday_start = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    # Convert to UTC for MongoDB query
    monday_utc = monday_start.astimezone(timezone.utc)

    pipeline = [
      {"$match": {
        "user": user_email,
        "kind": "quiz",
        "status": {"$in": ["completed", "abandoned"]},
        "started_at": {"$gte": monday_utc}
      }},
      {"$group": {
        "_id": None,
        "quizzes": {"$sum": 1},
        "correct": {"$sum": "$correct"},
        "attempts": {"$sum": "$attempts"},
        "total_elapsed": {"$sum": "$elapsed"}
      }}
    ]

    result = list(db.sessions.aggregate(pipeline))

    if result:
      r = result[0]
      accuracy = (r["correct"] / r["attempts"] * 100) if r["attempts"] and r["attempts"] > 0 else 0
      return {
        "quizzes": r.get("quizzes", 0) or 0,
        "correct": r.get("correct", 0) or 0,
        "attempts": r.get("attempts", 0) or 0,
        "accuracy": round(accuracy, 1),
        "time_minutes": (r.get("total_elapsed", 0) or 0) // 60
      }

    return {
      "quizzes": 0,
      "correct": 0,
      "attempts": 0,
      "accuracy": 0.0,
      "time_minutes": 0
    }


class StatsFollowingStreaks(Resource):
  """Get streak information for followed users."""

  @authenticated
  def get(self):
    """Get streak data for all users the current user follows.

    Returns:
      [
        {
          "user": {
            "email": "user@example.com",
            "name": "User Name",
            "picture": "https://..."
          },
          "streak": 7,
          "today_minutes": 25
        },
        ...
      ]
    """
    user_email = current_user.identity.email

    # Get list of followed users
    follows = list(db.follows.find(
      {"follower": user_email},
      {"_id": 0, "following": 1}
    ))

    if not follows:
      return []

    following_emails = [f["following"] for f in follows]

    # Get user info for each followed user
    users = {
      u["_id"]: u
      for u in db.users.find({"_id": {"$in": following_emails}})
    }

    # Compute streak for each followed user
    results = []
    for email in following_emails:
      user = users.get(email)
      if not user:
        continue

      streak_data = compute_streak_for_user(email)

      results.append({
        "user": {
          "email": email,
          "name": user.get("name", email),
          "picture": user.get("picture")
        },
        "streak": streak_data["streak"],
        "today_minutes": streak_data["today_minutes"]
      })

    # Sort by streak descending, then by name
    results.sort(key=lambda x: (-x["streak"], x["user"]["name"]))

    return results