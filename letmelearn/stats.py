"""
Statistics endpoints for gamification features.

Provides RESTful endpoints for:
- GET /api/stats/streak - Current streak and today's time
- GET /api/stats/weekly - Weekly statistics
"""

import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from flask_restful import Resource
from flask_login import current_user

from letmelearn.web import server
from letmelearn.data import db
from letmelearn.auth import authenticated

logger = logging.getLogger(__name__)

BELGIUM_TZ = ZoneInfo("Europe/Brussels")


class StatsStreak(Resource):
    """Get current streak information."""

    @authenticated
    def get(self):
        """
        Get streak data for gamification display.

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

        # Count consecutive days from today
        streak = 0
        for day_doc in qualifying_days:
            day_date = datetime.strptime(day_doc["_id"], "%Y-%m-%d").date()
            expected = today - timedelta(days=streak)
            if day_date == expected:
                streak += 1
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

        # Handle active session: add its current duration
        active = db.sessions.find_one({
            "user": user_email,
            "status": "active",
            "kind": "quiz"
        })
        if active:
            active_elapsed = int((datetime.utcnow() - active["started_at"]).total_seconds())
            today_seconds += active_elapsed
            today_minutes = today_seconds // 60

        # Compute risk level
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
            "streak": streak,
            "today_minutes": today_minutes,
            "streak_risk": streak_risk,
            "risk_level": risk_level
        }


class StatsWeekly(Resource):
    """Get weekly statistics."""

    @authenticated
    def get(self):
        """
        Get statistics for the current calendar week (Monday-Sunday).

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


# Register endpoints
server.api.add_resource(StatsStreak, "/api/stats/streak", endpoint="api-stats-streak")
server.api.add_resource(StatsWeekly, "/api/stats/weekly", endpoint="api-stats-weekly")