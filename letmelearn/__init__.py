__version__ = "0.0.5"

# needed explicitly for recursion issue in eventlet+ssl on outgoing pymongo
# and to be able to create single pymongo Database object
# problem only appears on render.com setup
import eventlet
eventlet.monkey_patch()

# load the environment variables for this setup from .env file
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(usecwd=True))

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

# setup database connection

from pymongo import MongoClient

DB_CONN = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/letmelearn")
DB_NAME = DB_CONN.split("/")[-1].split("?")[0]

db = MongoClient(DB_CONN)[DB_NAME]

# register components

from baseweb.interface import register_component

HERE = os.path.dirname(__file__)
COMPONENTS = os.path.join(HERE, "components")
for component in [
  "navigation"
]:
  register_component(f"{component}.js", COMPONENTS)


# expose baseweb server and perform additional configuration
from baseweb.web import server

server.config["TEMPLATES_AUTO_RELOAD"] = True
server.config["SECRET_KEY"] = os.environ.get("APP_SECRET_KEY", default="local")

logger.debug("loading pages...")

import letmelearn.pages.index
