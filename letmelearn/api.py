import re

from flask import request

from flask_restful import Resource

from flask_login import current_user

from baseweb.rest import api

from letmelearn      import db
from letmelearn.auth import authenticated

from pymongo.collection import ReturnDocument

class Topics(Resource):
  @authenticated
  def get(self):    
    return list(db.topics.find({ "user": current_user.email }, { "user": False }))

  @authenticated
  def post(self):
    name  = request.json["name"]
    items = request.json["items"]
    id = re.sub(r"[^a-zA-Z0-9 ]", "", name.lower()).replace(" ", "-")
    new_topic = {
      "_id"  : id,
      "name" : name,
      "user" : current_user.email,
      "items": items
    }
    db.topics.insert_one(new_topic)
    return new_topic

api.add_resource(Topics, "/api/topics", endpoint="topics")

class Topic(Resource):
  @authenticated
  def get(self, id):    
    return db.topics.find_one({
      "_id": id,
      "user": current_user.email
    })

  @authenticated
  def put(self, id):
    update = request.json
    update.pop("_id", None)
    update.pop("user", None)

    return db.topics.find_one_and_update(
      {
        "_id"  : id,
        "user" : current_user.email
      },
      {
        "$set" : update
      },
      return_document=ReturnDocument.AFTER
    );

  @authenticated
  def delete(self, id):
    db.topics.delete_one({
      "_id": id,
      "user": current_user.email
    })
    return True

api.add_resource(Topic, "/api/topics/<id>", endpoint="topic")

class Items(Resource):
  @authenticated
  def post(self, id):    
    return db.topics.find_one_and_update(
      {
        "_id"  : id,
        "user" : current_user.email
      },
      {
        "$push" : { "items" : request.json }
      })
  @authenticated
  def patch(self, id):
    if "original" in request.json:
      # update
      return db.topics.find_one_and_update(
        {
          "_id"       : id,
          "user"      : current_user.email,
          "items.key" : request.json["original"]["key"]
        },
        {
          "$set" : {
            "items.$.key"   : request.json["key"],
            "items.$.value" : request.json["value"],
          }
        })
    else:
      # delete
      return db.topics.find_one_and_update(
        { "_id" : id, "user" : current_user.email },
        { "$pull" : { "items" : request.json }}
      )

api.add_resource(Items, "/api/topics/<id>/items", endpoint="items")
