import logging

import os

from functools import wraps

from letmelearn.web import server

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
login_manager.session_protection = "strong"
login_manager.init_app(server)

class User(UserMixin):
  def __init__(self, email, name=None, picture=None, identities=None, current=None):
    self.email       = email
    self.name        = name
    self.picture     = picture
    if identities is None:
      identities = []
    self._identities = identities
    self._current    = current

  def __str__(self):
    return self.email

  def __repr__(self):
    return self.__str__()

  @property
  def identities(self):
    ids = []
    for email in self._identities:
      identity = User.find(email)
      if identity:
        ids.append(identity)
    return ids

  @property
  def identity(self):
    if not self._current:
      return self
    identity = User.find(self._current)
    if not identity:
      return self
    return identity

  def as_json(self):
    info = {
      "email"      : self.email,
      "name"       : self.name,
      "picture"    : self.picture,
      "identities" : [ identity.as_identity_json() for identity in self.identities ]
    }
    current = self.identity
    info["current"] = current.email if current else None
    return info

  def as_identity_json(self):
    return {
      "email"      : self.email,
      "name"       : self.name,
      "picture"    : self.picture
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

  def update(self, email=None, name=None, picture=None, current=None, **kwargs):
    if email is None:
      raise ValueError("missing email address")
    changes = {}
    if name and self.name != name:
      self.name = name
      changes["name"] = name
    if picture and self.picture != picture:
      self.picture = picture
      changes["picture"] = picture
    if current and self._current != current:
      if current == current_user.email:
        current = None
      self._current = current
      changes["current"] = current
    db.users.update_one({ "_id" : self.email }, { "$set" : changes })

  @classmethod
  def find(clazz, email):
    if not email:
      return None
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
    login_user(user, remember=True)
    return current_user.as_json()

  @authenticated # flask login session required to get the current_user
  def get(self):
    return current_user.as_json()

  @authenticated # flask login session required to delete/logout session
  def delete(self):
    logout_user()
    return True

  @authenticated # flask login session required to put session = change identity
  def put(self):
    identity = server.request.json["identity"]
    if identity not in current_user._identities and identity != current_user.email:
      raise ValueError(f"invalid identity: {identity} not in {current_user._identities}")
    logger.info(f"changing current identity: {identity}")
    current_user.update(email=current_user.email, current=identity)
    return current_user.as_json()

server.api.add_resource(Session, "/api/session")
