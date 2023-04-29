import logging
logger = logging.getLogger(__name__)

import os

# register the Vue component for the UI

from baseweb.interface import register_component

register_component("quiz.js", os.path.dirname(__file__))
