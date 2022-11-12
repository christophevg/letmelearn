__version__ = "0.0.4"

import eventlet
eventlet.monkey_patch()

# load the environment variables for this setup
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(usecwd=True))

import letmelearn.setup
