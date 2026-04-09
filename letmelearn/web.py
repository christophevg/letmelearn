# needed explicitly for recursion issue in eventlet+ssl on outgoing pymongo
# and to be able to create single pymongo Database object
# problem only appears on render.com setup
import eventlet
eventlet.monkey_patch()

# load the environment variables for this setup from .env file
from dotenv import load_dotenv, find_dotenv  # noqa
load_dotenv(find_dotenv())
load_dotenv(find_dotenv(".env.local"))

import logging  # noqa
import os  # noqa
from pathlib import Path  # noqa

LOG_LEVEL = os.environ.get("LOG_LEVEL") or "INFO"
FORMAT = "[%(name)s] [%(levelname)s] %(message)s"
DATEFMT = "%Y-%m-%d %H:%M:%S %z"

logging.basicConfig(level=LOG_LEVEL, format=FORMAT, datefmt=DATEFMT)
formatter = logging.Formatter(FORMAT, DATEFMT)
logging.getLogger().handlers[0].setFormatter(formatter)

# "silence" lower-level modules
for module in ["gunicorn.error", "pymongo.serverSelection", "urllib3"]:
  module_logger = logging.getLogger(module)
  module_logger.setLevel(logging.WARN)
  if len(module_logger.handlers) > 0:
    module_logger.handlers[0].setFormatter(formatter)

logger = logging.getLogger(__name__)

from letmelearn import config  # noqa: E402
from letmelearn.data import DB_CONN # noqa

# set up server

from baseweb import Baseweb  # noqa
server = Baseweb("LetMeLearn")
server.config["TEMPLATES_AUTO_RELOAD"] = True # TODO: use is_development?
server.config["SECRET_KEY"] = config.get_secret_key()
server.log_config()

# Initialize rate limiter using MongoDB for storage
# Disabled in testing mode to avoid rate limiting during tests
from flask_limiter import Limiter, util  # noqa

def is_static_request():
  """Check if current request is for static files.

  Static files (JS components, CSS, etc.) are loaded on every page load
  and should not count against API rate limits.

  Returns:
    bool: True if request should be exempt from rate limiting
  """
  from flask import request
  # Exempt static file routes
  if request.path.startswith("/app/"):
    return True
  if request.path.startswith("/static/"):
    return True
  # Exempt component requests (loaded on page load)
  if request.path.startswith("/components/"):
    return True
  # Exempt OAuth callback and assets
  if request.path in ["/oatk.js", "/favicon.ico"]:
    return True
  return False

limiter = Limiter(
  app=server,
  key_func=util.get_remote_address,
  default_limits=["200 per day", "50 per hour"],
  storage_uri=DB_CONN,
  enabled=not config.is_testing(),
  default_limits_exempt_when=is_static_request
)
if limiter.enabled:
  logger.info("✅ rate limiter enabled")
else:
  logger.warning("⚠️  rate limiter NOT enabled")

# set up content

HERE = Path(__file__).resolve().parent

server.app_static_folder = HERE / "static"

server.register_stylesheet("custom.css", HERE / "static" / "css")
server.register_stylesheet("flashcards.css", HERE / "static" / "css")

# TODO: glob folder recursively
for component in [
  "navigation",
  "Timer",
  "ProtectedPage",
  "FeedStore",
  "TopicsStore",
  "SessionsStore",
  "StatsStore",
  "FollowsStore",
  "StatsCards",
  "TopicSelector",
  "FolderSelector",
  "TextDiff",
  "SimpleDialog",
  "MultiTextField",
  "FollowButton",
  "UserSearch",
  "FollowingStreaks",
  "questions/BasicQuestion",
  "questions/FillInQuestion"
]:
  server.register_component(f"{component}.js", HERE / "components")

# Enable test page in development
TEST_PAGE = os.environ.get("TEST_PAGE", "false").lower() == "true"

# Auth setup
import letmelearn.auth # noqa
letmelearn.auth.setup(server)

# OAuth setup
import letmelearn.oauth  # noqa
letmelearn.oauth.setup(server)

# API endpoints
import letmelearn.api  # noqa
letmelearn.api.register_endpoints(server)

# Error handlers
import letmelearn.errors  # noqa
letmelearn.errors.register_error_handlers(server)

# Page routes
import letmelearn.pages  # noqa

# External scripts
for script in ["logging", "auth", "diff", "nl", "ajax"]:
  server.register_external_script(f"/app/static/{script}.js")

server.log_routes()
logger.info("✅ everything loaded...")
