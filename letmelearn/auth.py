import logging

import os

from functools import wraps

from letmelearn import server

from letmelearn.data import db

# setup flask_login infrastructure

from flask_login import LoginManager
from flask_login import UserMixin
from flask_login import current_user, login_user, logout_user

from flask import Response, abort
from flask_restful import Resource

import oatk.js
from oatk import OAuthToolkit

logger = logging.getLogger(__name__)

login_manager = LoginManager()
login_manager.init_app(server)

class User(UserMixin):
  def __init__(self, email, name=None, picture=None):
    self.email   = email
    self.name    = name
    self.picture = picture
    
  def __str__(self):
    return self.email

  def __repr__(self):
    return self.__str__()

  @property
  def as_json(self):
    return {
      "email"   : self.email,
      "name"    : self.name,
      "picture" : self.picture
    }

  @classmethod
  def create(clazz, email=None, name=None, picture=None, **kwargs):
    if not email:
      raise ValueError("need at least an email to create a user")
    db.users.insert_one({
      "_id"     : email,
      "name"    : name,
      "picture" : picture
    })
    return clazz(email, name, picture)

  def update(self, email=None, name=None, picture=None, **kwargs):
    self.name    = name
    self.picture = picture
    db.users.update_one({
      "_id" : self.email
    },
    {
      "$set" : {
        "name"    : self.name,
        "picture" : self.picture
      }
    })

  @classmethod
  def find(clazz, email):
    info = db.users.find_one({"_id" : email})
    if info:
      email = info.pop("_id")
      return clazz(email, **info)
    return None
  
  def get_id(self):
    return self.email

@login_manager.user_loader
def load_user(email):
  return User.find(email)

# setup OATK infrastructure
# add discovery url and client_id from env
server.settings["oauth"] = {
  "provider" : os.environ.get("OAUTH_PROVIDER"),
  "client_id": os.environ.get("OAUTH_CLIENT_ID")
}

# route for oatk.js from the oatk package
@server.route("/oatk.js")
def oatk_script():
  return Response(oatk.js.as_src(), mimetype="application/javascript")

# and have it included in the HTML
server.register_external_script("/oatk.js")

# a protected session setup API endpoint

# decorator to check if current_user is logged in
def authenticated(func):
  @wraps(func)
  def wrapper(*args, **kwargs):
    if not current_user.is_anonymous:
      return func(*args, **kwargs)
    abort(401)
  return wrapper

# setup oatk
oauth = OAuthToolkit()
oauth.using_provider(os.environ["OAUTH_PROVIDER"])
oauth.with_client_id(os.environ["OAUTH_CLIENT_ID"])

class Session(Resource):
  @oauth.authenticated  # oauth token required to create session
  def post(self):
    claims = oauth.decode(server.request.headers["Authorization"][7:])
    user = User.find(claims["email"])
    if not user:
      logger.warn(f"unknown user: {claims}")
      abort(403)
    user.update(**claims)
    login_user(user)
    return current_user.as_json

  @authenticated # flask login session required to get the current_user
  def get(self):
    return current_user.as_json

  @authenticated # flask login session required to delete/logout session
  def delete(self):
    logout_user()
    return True

server.api.add_resource(Session, "/api/session")
