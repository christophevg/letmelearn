"""
OAuth integration for LetMeLearn.

Handles OAuth token validation and login flow.
In test mode, OAuth is bypassed for easier testing.
"""

import os
import logging
from functools import wraps
from flask import Response

from oatk import OAuthToolkit

from letmelearn.config import is_test_mode_allowed
from letmelearn.errors import problem_response

logger = logging.getLogger(__name__)

# Test mode flag - bypasses OAuth validation for testing
# Uses is_test_mode_allowed() to prevent TEST_MODE in production
TEST_MODE = is_test_mode_allowed()

# OAuth instance (None in test mode)
_oauth = None

def setup(server):
  """Setup OAuth - defaults to None if TEST_MODE is true."""
  global _oauth

  if TEST_MODE:
    logger.info("TEST_MODE enabled - OAuth bypassed")
    _oauth = None
    return

  # Setup OAuth settings
  server.settings["oauth"] = {
    "provider": os.environ.get("OAUTH_PROVIDER"),
    "client_id": os.environ.get("OAUTH_CLIENT_ID")
  }

  # Create OAuth instance
  _oauth = OAuthToolkit()
  _oauth.using_provider(os.environ["OAUTH_PROVIDER"])
  _oauth.with_client_id(os.environ["OAUTH_CLIENT_ID"])

  # Register OAuth-related routes.
  @server.route("/oatk.js")
  def oatk_script():
    import oatk.js
    return Response(oatk.js.as_src(), mimetype="application/javascript")

  server.register_external_script("/oatk.js")
  logger.info("✅ oauth set up")

def oauth_authenticated(func):
  """Decorator for OAuth token validation - bypassed in test mode.

  In TEST_MODE, this decorator passes through without validation,
  allowing tests to authenticate via Flask-Login session only.

  In production, it validates the OAuth Bearer token.
  """
  @wraps(func)
  def wrapper(*args, **kwargs):
    if TEST_MODE:
      return func(*args, **kwargs)
    if _oauth is None:
      # OAuth not initialized - should not happen in production
      return problem_response("unauthorized", detail="OAuth not configured")
    return _oauth.authenticated(func)(*args, **kwargs)
  return wrapper

def get_oauth():
  """Get the OAuth instance (None in test mode)."""
  return _oauth
