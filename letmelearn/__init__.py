__version__ = "0.0.5"

# needed explicitly for recursion issue in eventlet+ssl on outgoing pymongo
# and to be able to create single pymongo Database object
# problem only appears on render.com setup
import eventlet
eventlet.monkey_patch()

# load the environment variables for this setup from .env file
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(usecwd=True))
load_dotenv(find_dotenv(".env.local"))

import logging
logger = logging.getLogger(__name__)

import os

LOG_LEVEL = os.environ.get("LOG_LEVEL") or "INFO"
FORMAT    = "[%(name)s] [%(levelname)s] %(message)s"
DATEFMT   = "%Y-%m-%d %H:%M:%S %z"

logging.basicConfig(level=LOG_LEVEL, format=FORMAT, datefmt=DATEFMT)
formatter = logging.Formatter(FORMAT, DATEFMT)
logging.getLogger().handlers[0].setFormatter(formatter)

# "silence" lower-level modules
for module in [ "gunicorn.error", "baseweb.socketio", "baseweb.web", "baseweb.interface" ]:
  module_logger = logging.getLogger(module)
  module_logger.setLevel(logging.WARN)
  if len(module_logger.handlers) > 0:
    module_logger.handlers[0].setFormatter(formatter)

# register components

from baseweb.interface import register_component, register_external_script
from baseweb.interface import register_static_folder, register_stylesheet

HERE = os.path.dirname(__file__)

register_static_folder(os.path.join(HERE, "static"))

register_stylesheet("custom.css", os.path.join(HERE, "static", "css"))

# TODO: glob folder recursively
COMPONENTS = os.path.join(HERE, "components")
for component in [
  "navigation",
  "Timer",
  "ProtectedPage",
  "FeedStore",
  "TopicsStore",
  "TextDiff",
  "SimpleDialog",
  "MultiTextField",
  "questions/BasicQuestion",
  "questions/FillInQuestion"
]:
  register_component(f"{component}.js", COMPONENTS)

# expose baseweb server and perform additional configuration
from baseweb.web import server

server.config["TEMPLATES_AUTO_RELOAD"] = True
server.config["SECRET_KEY"] = os.environ.get("APP_SECRET_KEY", default="local")

import letmelearn.auth
import letmelearn.api

register_external_script(f"/app/static/auth.js")
register_external_script(f"/app/static/diff.js")

import letmelearn.pages.advalvas
import letmelearn.pages.topics
import letmelearn.pages.quiz
import letmelearn.pages.about

logger.info("✅ everything loaded...")
