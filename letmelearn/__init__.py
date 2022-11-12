__version__ = "0.0.4"

# needed explicitly for recursion issue in eventlet+ssl on outgoing pymongo
import eventlet
eventlet.monkey_patch()

# load the environment variables for this setup from .env file
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(usecwd=True))

import logging
logger = logging.getLogger(__name__)

import os

LOG_LEVEL = os.environ.get("LOG_LEVEL") or "DEBUG"
FORMAT    = "[%(name)s] [%(levelname)s] %(message)s"
DATEFMT   = "%Y-%m-%d %H:%M:%S %z"

logging.basicConfig(level=LOG_LEVEL, format=FORMAT, datefmt=DATEFMT)
formatter = logging.Formatter(FORMAT, DATEFMT)
logging.getLogger().handlers[0].setFormatter(formatter)

# adjust gunicorn logger
gunicorn_logger = logging.getLogger("gunicorn.error")
gunicorn_logger.handlers[0].setFormatter(formatter)
gunicorn_logger.setLevel(logging.INFO)

# expose baseweb server and perform additional configuration
from baseweb.web import server

server.config["TEMPLATES_AUTO_RELOAD"] = True
server.config["SECRET_KEY"] = os.environ.get("APP_SECRET_KEY", default="local")

logger.debug("loading pages...")

import letmelearn.pages.index
