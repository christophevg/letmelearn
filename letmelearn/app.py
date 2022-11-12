import logging
logger = logging.getLogger(__name__)

import os

from baseweb.web import server

server.config["TEMPLATES_AUTO_RELOAD"] = True
server.config["SECRET_KEY"] = os.environ.get("APP_SECRET_KEY", default="local")

import letmelearn.data

logger.info("loading pages...")

import letmelearn.pages.index
