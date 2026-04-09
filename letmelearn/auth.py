"""
Authentication for LetMeLearn.

Provides Flask-Login integration and the @authenticated decorator.
OAuth handling is in oauth.py.
"""

import logging
from functools import wraps

from flask_login import LoginManager, UserMixin, current_user

from letmelearn.data import db
from letmelearn.errors import problem_response

logger = logging.getLogger(__name__)

# Flask-Login setup
login_manager = LoginManager()

def setup(server):
  login_manager.session_protection = "strong"
  login_manager.init_app(server)
  logger.info("✅ auth set up")

class User(UserMixin):
  """User model for Flask-Login."""

  def __init__(self, email, name=None, picture=None, identities=None, current=None):
    self.email = email
    self.name = name
    self.picture = picture
    if identities is None:
      identities = []
    self._identities = identities
    self._current = current

  def __str__(self):
    return self.email

  def __repr__(self):
    return self.__str__()

  @property
  def identities(self):
    """Get list of identity User objects."""
    ids = []
    for email in self._identities:
      identity = User.find(email)
      if identity:
        ids.append(identity)
    return ids

  @property
  def identity(self):
    """Get current identity (or self if no alternate identity)."""
    if not self._current:
      return self
    identity = User.find(self._current)
    if not identity:
      return self
    return identity

  def as_json(self):
    """Return user info as JSON."""
    info = {
      "email": self.email,
      "name": self.name,
      "picture": self.picture,
      "identities": [identity.as_identity_json() for identity in self.identities]
    }
    current = self.identity
    info["current"] = current.email if current else None
    return info

  def as_identity_json(self):
    """Return identity info as JSON (for identities list)."""
    return {
      "email": self.email,
      "name": self.name,
      "picture": self.picture
    }

  @classmethod
  def create(clazz, email=None, name=None, picture=None, **kwargs):
    """Create a new user in the database."""
    if not email:
      raise ValueError("need at least an email to create a user")
    db.users.insert_one({
      "_id": email,
      "name": name,
      "picture": picture
    })
    return clazz(email, name, picture)

  def update(self, email=None, name=None, picture=None, current=None, **kwargs):
    """Update user info in the database."""
    if email is None:
      raise ValueError("missing email address")
    changes = {}
    if name and self.name != name:
      self.name = name
      changes["name"] = name
    if picture and self.picture != picture:
      self.picture = picture
      changes["picture"] = picture
    if current and self._current != current:
      if current == current_user.email:
        current = None
      self._current = current
      changes["current"] = current
    db.users.update_one({"_id": self.email}, {"$set": changes})

  @classmethod
  def find(clazz, email):
    """Find a user by email."""
    if not email:
      return None
    info = db.users.find_one({"_id": email})
    if info:
      email = info.pop("_id")
      return clazz(email, **info)
    return None

  def get_id(self):
    """Return user email as Flask-Login user ID."""
    return self.email


@login_manager.user_loader
def load_user(email):
  """Load user by email for Flask-Login."""
  return User.find(email)


def authenticated(func):
  """Decorator to check if current_user is logged in.

  Returns 401 Unauthorized if not authenticated.
  """
  @wraps(func)
  def wrapper(*args, **kwargs):
    if not current_user.is_anonymous:
      return func(*args, **kwargs)
    return problem_response("unauthorized", detail="Authentication required")
  return wrapper
