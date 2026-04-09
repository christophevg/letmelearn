__version__ = "0.0.6"

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

# register components

from baseweb import Baseweb  # noqa
server = Baseweb("LetMeLearn")
server.log_config()

HERE = Path(__file__).resolve().parent

server.app_static_folder = HERE / "static"

server.register_stylesheet("custom.css", HERE / "static" / "css")
server.register_stylesheet("flashcards.css", HERE / "static" / "css")

# TODO: glob folder recursively
COMPONENTS = HERE / "components"
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
  server.register_component(f"{component}.js", COMPONENTS)

server.config["TEMPLATES_AUTO_RELOAD"] = True

# Import config after basic setup to avoid circular imports
from letmelearn.config import get_secret_key  # noqa
server.config["SECRET_KEY"] = get_secret_key()

# Enable test page in development
TEST_PAGE = os.environ.get("TEST_PAGE", "false").lower() == "true"
if TEST_PAGE:
  logging.getLogger(__name__).info("Test page enabled")

# Import modules in dependency order
# 1. Data layer
import letmelearn.data  # noqa

# 2. Authentication (User class, Flask-Login)
import letmelearn.auth  # noqa

# 3. OAuth setup (depends on auth)
import letmelearn.oauth  # noqa
letmelearn.oauth.register_oauth_route(server)

# 4. API endpoints (depends on auth, oauth)
import letmelearn.api  # noqa
letmelearn.api.register_endpoints(server)

# 5. Error handlers
import letmelearn.errors  # noqa
letmelearn.errors.register_error_handlers(server)

# 6. Page routes
import letmelearn.pages  # noqa

# External scripts
for script in ["logging", "auth", "diff", "nl", "ajax"]:
  server.register_external_script(f"/app/static/{script}.js")

server.log_routes()
logging.getLogger(__name__).info("everything loaded...")