__version__ = "0.0.4"

# load the environment variables for this setup
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(usecwd=True))

import letmelearn.setup

from baseweb.web import server
