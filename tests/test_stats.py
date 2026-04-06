"""
Tests for statistics endpoints.
"""

import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from bson.objectid import ObjectId

BELGIUM_TZ = ZoneInfo("Europe/Brussels")


class TestStatsStreak:
    """Tests for GET /api/stats/streak endpoint."""

    def test_streak_returns_zero_for_new_user(self, auth_client):
        """A new user should have zero streak."""
        response = auth_client.get('/api/stats/streak')

        assert response.status_code == 200
        data = response.get_json()
        assert data['streak'] == 0
        assert data['today_minutes'] == 0
        assert data['streak_risk'] == True
        assert data['risk_level'] == 'high'

    def test_streak_computes_correctly(self, auth_client, db, test_user):
        """Streak should count consecutive days with 15+ min quiz time."""
        # Create sessions for 3 consecutive days
        today = datetime.now(BELGIUM_TZ).date()

        for days_ago in range(3):
            day = today - timedelta(days=days_ago)
            # Create a session that started on that day
            session_time = datetime.combine(day, datetime.min.time())
            session_time = session_time.replace(tzinfo=BELGIUM_TZ).astimezone(ZoneInfo("UTC"))

            db.sessions.insert_one({
                "_id": str(ObjectId()),
                "user": test_user["_id"],
                "kind": "quiz",
                "status": "completed",
                "started_at": session_time,
                "stopped_at": session_time + timedelta(minutes=20),
                "elapsed": 1200,  # 20 minutes = 1200 seconds
                "questions": 10,
                "asked": 10,
                "attempts": 10,
                "correct": 10,
                "topics": ["topic-1"]
            })

        response = auth_client.get('/api/stats/streak')

        assert response.status_code == 200
        data = response.get_json()
        assert data['streak'] == 3

    def test_streak_breaks_on_missed_day(self, auth_client, db, test_user):
        """Streak should break if a day is missed."""
        today = datetime.now(BELGIUM_TZ).date()

        # Create session today
        session_time = datetime.combine(today, datetime.min.time())
        session_time = session_time.replace(tzinfo=BELGIUM_TZ).astimezone(ZoneInfo("UTC"))
        db.sessions.insert_one({
            "_id": str(ObjectId()),
            "user": test_user["_id"],
            "kind": "quiz",
            "status": "completed",
            "started_at": session_time,
            "elapsed": 1200,
            "topics": []
        })

        # Create session 2 days ago (skip yesterday)
        two_days_ago = today - timedelta(days=2)
        session_time = datetime.combine(two_days_ago, datetime.min.time())
        session_time = session_time.replace(tzinfo=BELGIUM_TZ).astimezone(ZoneInfo("UTC"))
        db.sessions.insert_one({
            "_id": str(ObjectId()),
            "user": test_user["_id"],
            "kind": "quiz",
            "status": "completed",
            "started_at": session_time,
            "elapsed": 1200,
            "topics": []
        })

        response = auth_client.get('/api/stats/streak')

        data = response.get_json()
        # Streak should be 1 (only today)
        assert data['streak'] == 1

    def test_risk_level_none_when_15_min_reached(self, auth_client, db, test_user):
        """Risk level should be none when 15+ minutes today."""
        today = datetime.now(BELGIUM_TZ).date()
        session_time = datetime.combine(today, datetime.min.time())
        session_time = session_time.replace(tzinfo=BELGIUM_TZ).astimezone(ZoneInfo("UTC"))

        db.sessions.insert_one({
            "_id": str(ObjectId()),
            "user": test_user["_id"],
            "kind": "quiz",
            "status": "completed",
            "started_at": session_time,
            "elapsed": 1200,  # 20 minutes
            "topics": []
        })

        response = auth_client.get('/api/stats/streak')

        data = response.get_json()
        assert data['streak_risk'] == False
        assert data['risk_level'] == 'none'

    def test_only_quiz_counts_toward_streak(self, auth_client, db, test_user):
        """Only quiz sessions should count toward streak."""
        today = datetime.now(BELGIUM_TZ).date()
        session_time = datetime.combine(today, datetime.min.time())
        session_time = session_time.replace(tzinfo=BELGIUM_TZ).astimezone(ZoneInfo("UTC"))

        # Create training session (should not count)
        db.sessions.insert_one({
            "_id": str(ObjectId()),
            "user": test_user["_id"],
            "kind": "training",
            "status": "completed",
            "started_at": session_time,
            "elapsed": 1200,
            "topics": []
        })

        response = auth_client.get('/api/stats/streak')

        data = response.get_json()
        # Training time should not appear in today_minutes
        assert data['today_minutes'] == 0


class TestStatsWeekly:
    """Tests for GET /api/stats/weekly endpoint."""

    def test_weekly_returns_zeros_for_new_user(self, auth_client):
        """A new user should have zero weekly stats."""
        response = auth_client.get('/api/stats/weekly')

        assert response.status_code == 200
        data = response.get_json()
        assert data['quizzes'] == 0
        assert data['correct'] == 0
        assert data['attempts'] == 0
        assert data['accuracy'] == 0.0
        assert data['time_minutes'] == 0

    def test_weekly_aggregates_sessions(self, auth_client, db, test_user):
        """Weekly stats should aggregate all sessions this week."""
        # Get Monday of current week
        now_belgium = datetime.now(BELGIUM_TZ)
        monday = now_belgium - timedelta(days=now_belgium.weekday())
        monday_start = monday.replace(hour=0, minute=0, second=0, microsecond=0)
        monday_utc = monday_start.astimezone(ZoneInfo("UTC"))

        # Create a session
        db.sessions.insert_one({
            "_id": str(ObjectId()),
            "user": test_user["_id"],
            "kind": "quiz",
            "status": "completed",
            "started_at": monday_utc + timedelta(hours=12),
            "elapsed": 600,  # 10 minutes
            "questions": 10,
            "asked": 10,
            "attempts": 12,
            "correct": 8,
            "topics": []
        })

        response = auth_client.get('/api/stats/weekly')

        assert response.status_code == 200
        data = response.get_json()
        assert data['quizzes'] == 1
        assert data['correct'] == 8
        assert data['attempts'] == 12
        # Accuracy = 8/12 * 100 = 66.67%
        assert abs(data['accuracy'] - 66.67) < 0.1
        assert data['time_minutes'] == 10

    def test_weekly_only_includes_current_week(self, auth_client, db, test_user):
        """Weekly stats should not include sessions from previous week."""
        now_belgium = datetime.now(BELGIUM_TZ)

        # Create session from last week
        last_week = now_belgium - timedelta(days=8)
        session_time = last_week.astimezone(ZoneInfo("UTC"))

        db.sessions.insert_one({
            "_id": str(ObjectId()),
            "user": test_user["_id"],
            "kind": "quiz",
            "status": "completed",
            "started_at": session_time,
            "elapsed": 600,
            "questions": 10,
            "attempts": 10,
            "correct": 10,
            "topics": []
        })

        response = auth_client.get('/api/stats/weekly')

        data = response.get_json()
        assert data['quizzes'] == 0  # Should not include last week

    def test_accuracy_computed_from_attempts(self, auth_client, db, test_user):
        """Accuracy should be correct/attempts, not correct/questions."""
        now_belgium = datetime.now(BELGIUM_TZ)
        monday = now_belgium - timedelta(days=now_belgium.weekday())
        monday_utc = monday.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(ZoneInfo("UTC"))

        db.sessions.insert_one({
            "_id": str(ObjectId()),
            "user": test_user["_id"],
            "kind": "quiz",
            "status": "completed",
            "started_at": monday_utc + timedelta(hours=12),
            "elapsed": 600,
            "questions": 10,
            "asked": 10,
            "attempts": 15,  # More attempts than questions
            "correct": 10,
            "topics": []
        })

        response = auth_client.get('/api/stats/weekly')

        data = response.get_json()
        # Accuracy = 10/15 * 100 = 66.67%
        assert abs(data['accuracy'] - 66.67) < 0.1