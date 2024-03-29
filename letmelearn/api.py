import re

from flask import request

from flask_restful import Resource

from flask_login import current_user

from pymongo.collection import ReturnDocument

from datetime import datetime

from baseweb.rest import api

from letmelearn.data import db
from letmelearn.auth import authenticated

class Topics(Resource):
  @authenticated
  def get(self):    
    return list(db.topics.find({ "user": current_user.email }, { "user": False }))

  @authenticated
  def post(self):
    name     = request.json["name"]
    question = request.json["question"]
    items    = request.json.get("items", [])
    id = re.sub(r"[^a-zA-Z0-9 ]", "", name.lower()).replace(" ", "-")
    new_topic = {
      "_id"      : id,
      "user"     : current_user.email,
      "name"     : name,
      "question" : question,
      "items"    : items
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
  def patch(self, id):
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
    # delete the topic
    db.topics.delete_one({
      "_id": id,
      "user": current_user.email
    })
    # delete feed items referencing it
    db.feed.delete_many({
      "$or" : [
        { "topic"  : id },
        { "topics" : id }
      ]
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
    return db.topics.find_one_and_update(
      {
        "_id"   : id,
        "user"  : current_user.email,
        "items" : request.json["original"]
      },
      {
        "$set" : {
          "items.$" : request.json["update"]
        }
      })

  @authenticated
  def delete(self, id):
    return db.topics.find_one_and_update(
      { "_id" : id, "user" : current_user.email },
      { "$pull" : { "items" : request.json }}
    )

api.add_resource(Items, "/api/topics/<id>/items", endpoint="items")

class Feed(Resource):
  @authenticated
  def get(self):
    return list(db.feed.aggregate([
      {
        "$match" : {
          "user": current_user.email,
          "$or" : [
            { "asked" : { "$exists": False } },
            { "asked" : { "$gt" : 0        } }
          ]
        }
      },
      {
        "$lookup" : {
          "from" : "users",
          "localField": "user.0",
          "foreignField" : "_id",
          "as" : "user"
        }
      },
      {
        "$project" : {
          "_id" : False,
          "user._id" : False
        }
      },
      {
        "$sort" : {
          "when" : -1
        }
      },
      {
        "$limit" : 10
      }
    ]))

  @authenticated
  def post(self):
    new_item = request.json
    new_item["user"] = [ current_user.email ]
    new_item["when"] = datetime.now().isoformat()

    db.feed.insert_one(new_item)
    new_item.pop("_id")
    
    new_item["user" ] = [ current_user.as_json ]
    return new_item

api.add_resource(Feed, "/api/feed", endpoint="feed")
