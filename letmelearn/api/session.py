"""
Session endpoint for OAuth login.

In test mode, accepts email in request body instead of OAuth token.
"""

import logging
from flask import request
from flask_restful import Resource
from flask_login import current_user, login_user, logout_user

from letmelearn.web import server, limiter
from letmelearn.auth import User, authenticated
from letmelearn.oauth import oauth_authenticated, TEST_MODE, get_oauth
from letmelearn.errors import problem_response
from letmelearn.config import get_test_users
from letmelearn.api.stats import compute_streak_for_user, get_personal_best_accuracy, StatsWeekly
from letmelearn.data import db

logger = logging.getLogger(__name__)

logger = logging.getLogger(__name__)


class Session(Resource):
  """Manage user sessions (login/logout/identity)."""

  @limiter.limit("5 per minute")  # Stricter rate limit for login
  @oauth_authenticated  # OAuth token required (bypassed in test mode)
  def post(self):
    """Login - validate OAuth token or use test email.

    In production: validates OAuth Bearer token from Authorization header.
    In test mode: accepts email in request body for easier testing.

    Returns:
      User info JSON with email, name, picture, identities, current.
    """
    if TEST_MODE:
      # Test mode: accept email in request body (whitelisted only)
      allowed_emails = get_test_users()
      email = request.json.get("email", "test@example.com")

      if email not in allowed_emails:
        logger.warning(f"non-whitelisted user attempted test login: {email}")
        return problem_response("forbidden", detail="Test mode requires whitelisted user")

      user = User.find(email)
      if not user:
        logger.warning(f"unknown user in test mode: {email}")
        return problem_response("forbidden", detail="Unknown user")
      login_user(user, remember=True)
      return current_user.as_json()

    # Normal OAuth flow
    oauth = get_oauth()
    if oauth is None:
      return problem_response("unauthorized", detail="OAuth not configured")
    claims = oauth.decode(request.headers["Authorization"][7:])
    user = User.find(claims["email"])
    if not user:
      logger.warning(f"unknown user: {claims}")
      return problem_response("forbidden", detail="Unknown user")
    user.update(**claims)
    login_user(user, remember=True)
    return current_user.as_json()

  @authenticated
  def get(self):
    """Get current user info.

    Returns:
      User info JSON with email, name, picture, identities, current.
    """
    return current_user.as_json()

  @authenticated
  def delete(self):
    """Logout - clear Flask-Login session.

    Returns:
      True
    """
    logout_user()
    return True

  @authenticated
  def put(self):
    """Switch identity - change current identity for users with multiple accounts.

    Request body:
      {"identity": "email@example.com"}

    Returns:
      User info JSON with updated current identity.
    """
    identity = server.request.json.get("identity")
    if identity not in current_user._identities and identity != current_user.email:
      return problem_response("unprocessable_entity",
                             detail=f"Invalid identity: {identity}")
    logger.info(f"changing current identity: {identity}")
    current_user.update(email=current_user.email, current=identity)
    return current_user.as_json()


class SessionFeedback(Resource):
  """Provide processed feedback for a completed session."""

  @authenticated
  def get(self, id):
    """Get a 'UI-ready' feedback payload for a session.

    Returns:
      {
        "session": { accuracy, avg_time, correct, asked, attempts, elapsed },
        "comparisons": { accuracy_vs_avg, speed_vs_avg, is_personal_best },
        "streak": { current, today_minutes, needs_more_time, minutes_remaining },
        "message": str
      }
    """
    from bson.objectid import ObjectId

    user_email = current_user.identity.email

    # Convert string ID to ObjectId
    try:
      oid = ObjectId(id)
    except Exception:
      return problem_response("invalid_session", detail=f"Invalid session ID format: {id}")

    session_doc = db.sessions.find_one({"_id": oid})

    if not session_doc:
      return problem_response("not_found", detail=f"Session {id} not found")

    if session_doc.get("user") != user_email:
      return problem_response("forbidden", detail="Session does not belong to current user")

    # 1. Current Session Stats
    correct = session_doc.get("correct", 0) or 0
    attempts = session_doc.get("attempts", 0) or 0
    elapsed = session_doc.get("elapsed", 0) or 0
    asked = session_doc.get("asked", attempts) or attempts  # Fall back to attempts
    questions = session_doc.get("questions", 0) or 0

    accuracy = (correct / attempts * 100) if attempts > 0 else 0.0
    # Speed = time per question asked (not per attempt)
    avg_time = (elapsed / asked) if asked > 0 else 0.0

    # 2. Historical Comparisons (Weekly)
    weekly_stats = StatsWeekly().get()

    weekly_acc = weekly_stats.get("accuracy", 0.0)
    weekly_total_min = weekly_stats.get("time_minutes", 0)
    weekly_attempts = weekly_stats.get("attempts", 0)

    # Only compute comparisons if there's meaningful weekly data
    # (need at least some attempts to compare against)
    has_weekly_data = weekly_attempts > 0

    if has_weekly_data:
      accuracy_vs_avg = round(accuracy - weekly_acc, 1)
      weekly_avg_accuracy = round(weekly_acc, 1)
      if weekly_total_min > 0:
        weekly_avg_time = (weekly_total_min * 60 / weekly_attempts)
        # Positive = slower than average (bad), negative = faster (good)
        speed_vs_avg = round(avg_time - weekly_avg_time, 2)
        weekly_avg_speed = round(weekly_avg_time, 1)
      else:
        speed_vs_avg = None
        weekly_avg_speed = None
    else:
      accuracy_vs_avg = None
      speed_vs_avg = None
      weekly_avg_accuracy = None
      weekly_avg_speed = None

    # 3. Personal Best (compare against last 30 days)
    is_pb = False
    if asked >= 5:
      max_acc = get_personal_best_accuracy(user_email, exclude_session_id=id)
      if accuracy >= max_acc:
        is_pb = True

    # 4. Streak & Goal
    streak_data = compute_streak_for_user(user_email)
    today_min = streak_data["today_minutes"]
    needs_more = today_min < 15
    min_remaining = max(0, 15 - today_min)

    # 5. Motivational Message
    if is_pb:
      message = "Personal Best! Your mastery is growing!"
    elif accuracy_vs_avg is not None and accuracy_vs_avg > 2:
      message = "Great improvement in accuracy!"
    elif speed_vs_avg is not None and speed_vs_avg > 0.5:
      message = "You're getting faster!"
    else:
      message = "Keep practicing to improve your skills!"

    return {
      "session": {
        "accuracy": round(accuracy, 1),
        "avg_time": round(avg_time, 2),
        "correct": correct,
        "asked": asked,
        "attempts": attempts,
        "questions": questions,
        "elapsed": elapsed
      },
      "comparisons": {
        "accuracy_vs_avg": accuracy_vs_avg,
        "speed_vs_avg": speed_vs_avg,
        "weekly_avg_accuracy": weekly_avg_accuracy,
        "weekly_avg_speed": weekly_avg_speed,
        "is_personal_best": is_pb
      },
      "streak": {
        "current": streak_data["streak"],
        "today_minutes": today_min,
        "needs_more_time": needs_more,
        "minutes_remaining": min_remaining
      },
      "message": message
    }