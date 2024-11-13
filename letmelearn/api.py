import re

from flask_restful import Resource
from flask_login import current_user

from pymongo.collection import ReturnDocument

from datetime import datetime

from letmelearn      import server
from letmelearn.data import db
from letmelearn.auth import authenticated

class Topics(Resource):
  @authenticated
  def get(self):    
    return list(db.topics.find({ "user": current_user.email }, { "user": False }))

  @authenticated
  def post(self):
    name     = server.request.json["name"]
    question = server.request.json["question"]
    items    = server.request.json.get("items", [])
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

server.api.add_resource(Topics, "/api/topics", endpoint="api-topics")

class Topic(Resource):
  @authenticated
  def get(self, id):    
    return db.topics.find_one({
      "_id": id,
      "user": current_user.email
    })

  @authenticated
  def patch(self, id):
    update = server.request.json
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

server.api.add_resource(Topic, "/api/topics/<id>", endpoint="api-topic")

class Items(Resource):
  @authenticated
  def post(self, id):    
    return db.topics.find_one_and_update(
      {
        "_id"  : id,
        "user" : current_user.email
      },
      {
        "$push" : { "items" : server.request.json }
      })

  @authenticated
  def patch(self, id):
    return db.topics.find_one_and_update(
      {
        "_id"   : id,
        "user"  : current_user.email,
        "items" : server.request.json["original"]
      },
      {
        "$set" : {
          "items.$" : server.request.json["update"]
        }
      })

  @authenticated
  def delete(self, id):
    return db.topics.find_one_and_update(
      { "_id" : id, "user" : current_user.email },
      { "$pull" : { "items" : server.request.json }}
    )

server.api.add_resource(Items, "/api/topics/<id>/items", endpoint="api-items")

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
    new_item = server.request.json
    new_item["user"] = [ current_user.email ]
    new_item["when"] = datetime.now().isoformat()

    db.feed.insert_one(new_item)
    new_item.pop("_id")
    
    new_item["user" ] = [ current_user.as_json ]
    return new_item

server.api.add_resource(Feed, "/api/feed", endpoint="api-feed")
