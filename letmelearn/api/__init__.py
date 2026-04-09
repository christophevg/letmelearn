"""
LetMeLearn API endpoints.

All REST API endpoints are registered here when the module is imported.
"""

import logging

from letmelearn.api.session import Session
from letmelearn.api.folders import Folders
from letmelearn.api.topics import Topics, TopicResource, Items
from letmelearn.api.feed import Feed
from letmelearn.api.sessions import Sessions, SessionResource, SessionCurrent
from letmelearn.api.stats import StatsStreak, StatsWeekly, StatsFollowingStreaks
from letmelearn.api.follows import Following, FollowingUser, Followers, UserSearch

logger = logging.getLogger(__name__)

def register_endpoints(server):
  """Register all API endpoints with the Flask server."""
  # Session endpoint (OAuth login)
  server.api.add_resource(Session, "/api/session")

  # Folders endpoints
  server.api.add_resource(Folders, "/api/folders", endpoint="api-folders")
  server.api.add_resource(Folders, "/api/folders/", endpoint="api-folders-root")
  server.api.add_resource(Folders, "/api/folders/<path:path>", endpoint="api-folders-parent")

  # Topics endpoints
  server.api.add_resource(Topics, "/api/topics", endpoint="api-topics")
  server.api.add_resource(TopicResource, "/api/topics/<id>", endpoint="api-topic")
  server.api.add_resource(Items, "/api/topics/<id>/items", endpoint="api-items")

  # Feed endpoint
  server.api.add_resource(Feed, "/api/feed", endpoint="api-feed")

  # Session tracking endpoints
  server.api.add_resource(Sessions, "/api/sessions", endpoint="api-sessions")
  server.api.add_resource(SessionResource, "/api/sessions/<session_id>", endpoint="api-session")
  server.api.add_resource(SessionCurrent, "/api/sessions/current", endpoint="api-sessions-current")

  # Statistics endpoints
  server.api.add_resource(StatsStreak, "/api/stats/streak", endpoint="api-stats-streak")
  server.api.add_resource(StatsWeekly, "/api/stats/weekly", endpoint="api-stats-weekly")
  server.api.add_resource(StatsFollowingStreaks, "/api/stats/following/streaks", endpoint="api-stats-following-streaks")

  # Social/following endpoints
  server.api.add_resource(Following, "/api/following", endpoint="api-following")
  server.api.add_resource(FollowingUser, "/api/following/<string:email>", endpoint="api-following-user")
  server.api.add_resource(Followers, "/api/followers", endpoint="api-followers")
  server.api.add_resource(UserSearch, "/api/users", endpoint="api-users")

  logger.info("✅ API resources registered")
