import logging
logger = logging.getLogger(__name__)

import os

# register the Vue component for the UI

from baseweb.interface import register_component

register_component("index.js", os.path.dirname(__file__))

from flask         import request
from flask_restful import Resource

from baseweb.rest import api

from letmelearn import data

class Hello(Resource):
  def get(self):
    name = request.args["name"]
    logger.info(f"got hello request from {name}")
    try:
      greeting = data.db()["greetings"].find_one({"name" : name})["greeting"]
    except TypeError:
      greeting = "Hello Stranger..."
    return { "message" : greeting.format(name=name) }

api.add_resource(Hello, "/api/hello")
