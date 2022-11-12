import logging
logger = logging.getLogger(__name__)

from flask         import request
from flask_restful import Resource

from letmelearn import api

class Hello(Resource):
  def get(self):
    name = request.args["name"]
    logger.info(f"got hello request from {name}")
    return { "message" : f"Hello, {name}" }

api.add_resource(Hello, "/api/hello")
