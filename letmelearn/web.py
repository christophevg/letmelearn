__version__ = "0.0.6"

# needed explicitly for recursion issue in eventlet+ssl on outgoing pymongo
# and to be able to create single pymongo Database object
# problem only appears on render.com setup
import eventlet
eventlet.monkey_patch()

# load the environment variables for this setup from .env file
from dotenv import load_dotenv, find_dotenv # noqa
load_dotenv(find_dotenv())
load_dotenv(find_dotenv(".env.local"))

import logging # noqa
logger = logging.getLogger(__name__)

import os # noqa
from pathlib import Path # noqa

LOG_LEVEL = os.environ.get("LOG_LEVEL") or "INFO"
FORMAT    = "[%(name)s] [%(levelname)s] %(message)s"
DATEFMT   = "%Y-%m-%d %H:%M:%S %z"

logging.basicConfig(level=LOG_LEVEL, format=FORMAT, datefmt=DATEFMT)
formatter = logging.Formatter(FORMAT, DATEFMT)
logging.getLogger().handlers[0].setFormatter(formatter)

# "silence" lower-level modules
for module in [ "gunicorn.error", "pymongo.serverSelection", "urllib3" ]:
  module_logger = logging.getLogger(module)
  module_logger.setLevel(logging.WARN)
  if len(module_logger.handlers) > 0:
    module_logger.handlers[0].setFormatter(formatter)

# register components

from baseweb import Baseweb # noqa
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
  "TopicSelector",
  "FolderSelector",
  "TextDiff",
  "SimpleDialog",
  "MultiTextField",
  "questions/BasicQuestion",
  "questions/FillInQuestion"
]:
  server.register_component(f"{component}.js", COMPONENTS)

server.config["TEMPLATES_AUTO_RELOAD"] = True
server.config["SECRET_KEY"] = os.environ.get("APP_SECRET_KEY", default="local")

import letmelearn.auth # noqa
import letmelearn.api  # noqa

for script in [ "auth", "diff", "nl"]:
  server.register_external_script(f"/app/static/{script}.js")

import letmelearn.pages # noqa

server.log_routes()
logger.info("✅ everything loaded...")
