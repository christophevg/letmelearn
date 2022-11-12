import os
import logging

LOG_LEVEL = os.environ.get("LOG_LEVEL") or "DEBUG"

logger = logging.getLogger(__name__)

FORMAT  = "[%(name)s] [%(levelname)s] %(message)s"
DATEFMT = "%Y-%m-%d %H:%M:%S %z"

logging.basicConfig(level=logging.DEBUG, format=FORMAT, datefmt=DATEFMT)
formatter = logging.Formatter(FORMAT, DATEFMT)
logging.getLogger().handlers[0].setFormatter(formatter)

# adjust gunicorn logger
gunicorn_logger = logging.getLogger("gunicorn.error")
gunicorn_logger.handlers[0].setFormatter(formatter)
gunicorn_logger.setLevel(logging.INFO)
