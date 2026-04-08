"""
Session endpoint for OAuth login.

In test mode, accepts email in request body instead of OAuth token.
"""

import logging
from flask import request
from flask_restful import Resource
from flask_login import current_user, login_user, logout_user

from letmelearn.web import server
from letmelearn.auth import User, authenticated
from letmelearn.oauth import oauth_authenticated, TEST_MODE, get_oauth
from letmelearn.errors import problem_response

logger = logging.getLogger(__name__)


class Session(Resource):
  """Manage user sessions (login/logout/identity)."""

  @oauth_authenticated  # OAuth token required (bypassed in test mode)
  def post(self):
    """Login - validate OAuth token or use test email.

    In production: validates OAuth Bearer token from Authorization header.
    In test mode: accepts email in request body for easier testing.

    Returns:
      User info JSON with email, name, picture, identities, current.
    """
    if TEST_MODE:
      # Test mode: accept email in request body
      email = request.json.get("email", "test@example.com")
      user = User.find(email)
      if not user:
        logger.warn(f"unknown user in test mode: {email}")
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
      logger.warn(f"unknown user: {claims}")
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