__version__ = "0.0.2"

# load the environment variables for this setup
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(usecwd=True))

import letmelearn.setup

import pathlib
PATH = pathlib.Path(__file__).parent.resolve()

import os

from flask import Flask

app = Flask(__name__,
  template_folder = PATH / "pages",
  static_folder   = PATH / "static"
)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SECRET_KEY"] = os.environ.get("APP_SECRET_KEY", default="local")

import flask_restful

api = flask_restful.Api(app)

import letmelearn.ui
import letmelearn.api
