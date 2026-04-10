import logging
import os
from urllib.parse import urlparse

from pymongo import MongoClient

logger = logging.getLogger(__name__)


def parse_database_name(connection_string):
  """Extract database name from MongoDB connection string.

  Handles various URI formats including:
  - Standard: mongodb://localhost:27017/mydb
  - With credentials: mongodb://user:pass@host/mydb
  - Replica sets: mongodb://host1,host2,host3/mydb
  - SRV records: mongodb+srv://cluster.example.com/mydb
  - Query parameters: mongodb://localhost/mydb?retryWrites=true
  - No database path: mongodb://localhost (defaults to 'letmelearn')

  Args:
    connection_string: MongoDB connection URI

  Returns:
    Database name extracted from path, or 'letmelearn' as default
  """
  parsed = urlparse(connection_string)
  # Path will be like '/mydb' or '/mydb?options', so we strip leading '/'
  # and split on '?' to remove query params
  db_name = parsed.path.lstrip('/').split('?')[0]
  return db_name if db_name else "letmelearn"


def get_migration_version(versions, collection_name):
  """Safely get migration version for a collection.

  Args:
    versions: Dictionary of collection versions
    collection_name: Name of the collection to check

  Returns:
    Version number (0 if not found)
  """
  return versions.get(collection_name, 0)


# Module-level state for lazy initialization
_db = None
_client = None

# Connection settings (computed once at module load)
DB_CONN = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/letmelearn")
DB_NAME = parse_database_name(DB_CONN)


def _run_migrations(db):
  """Run schema migrations for all collections.

  Args:
    db: MongoDB database instance
  """
  versions = {
    version["_id"]: version["version"]
    for version in db.versions.find({})
  }
  if not versions:
    versions = {"topics": 0}

  logger.info(f"collection versions: {versions}")

  current_version = get_migration_version(versions, "topics")
  if current_version < 2:
    logger.info(f"upgrading topics collection from version {current_version} to 2")
    for topic in db.topics.find({}):
      topic["question"] = {
        "type": "BasicQuestion",
        "labels": {
          "left": "Key",
          "right": "Value"
        }
      }
      for item in topic["items"]:
        item["left"] = item.pop("key").split("|")
        item["right"] = item.pop("value").split("|")
      db.topics.find_one_and_update({"_id": topic.pop("_id")}, {"$set": topic})
    db.versions.find_one_and_update(
      {"_id": "topics"},
      {"$set": {"version": 2}},
      upsert=True
    )
    logger.info("topics collection upgraded to version 2")


def _create_indexes(db):
  """Create indexes for collections.

  These are idempotent - safe to run on every startup.

  Args:
    db: MongoDB database instance
  """
  # Create indexes for sessions collection
  db.sessions.create_index([("user", 1), ("started_at", -1)], name="user_sessions")
  db.sessions.create_index([("user", 1), ("status", 1)], name="user_active_session")
  db.sessions.create_index(
    [("user", 1), ("kind", 1), ("status", 1), ("started_at", -1)],
    name="user_quiz_sessions"
  )
  logger.info("sessions collection indexes verified")

  # Create indexes for follows collection
  db.follows.create_index(
    [("follower", 1), ("following", 1)],
    unique=True,
    name="follow_unique"
  )
  db.follows.create_index([("follower", 1), ("created_at", -1)], name="follower_created")
  db.follows.create_index([("following", 1), ("created_at", -1)], name="following_created")
  logger.info("follows collection indexes verified")


def get_db():
  """Get the database instance with lazy initialization.

  Uses mongomock when USE_MONGOMOCK=true, otherwise uses real MongoDB.
  This enables tests to run without a MongoDB server.

  Returns:
    MongoDB database instance (real or mocked)
  """
  global _db, _client

  if _db is not None:
    return _db

  use_mongomock = os.environ.get("USE_MONGOMOCK", "false").lower() == "true"

  if use_mongomock:
    import mongomock
    logger.info("Using mongomock for in-memory MongoDB simulation")
    _client = mongomock.MongoClient()
    _db = _client[DB_NAME]
  else:
    _client = MongoClient(DB_CONN, serverSelectionTimeoutMS=3000)
    _db = _client[DB_NAME]

  _run_migrations(_db)
  _create_indexes(_db)
  return _db


def reset_db():
  """Reset the database connection.

  This is used for testing to clean up between test sessions.
  After calling this, the next call to get_db() will create a fresh connection.
  """
  global _db, _client

  if _client is not None:
    try:
      _client.close()
    except Exception:
      pass

  _db = None
  _client = None


class _DBProxy:
  """Proxy class for backward compatibility with code that imports `db` directly.

  This class delegates all attribute access to the lazily-initialized database.
  """

  def __getattr__(self, name):
    return getattr(get_db(), name)

  def __getitem__(self, name):
    return get_db()[name]


# For backward compatibility: `from letmelearn.data import db`
db = _DBProxy()