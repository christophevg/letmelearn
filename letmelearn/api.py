import logging
logger = logging.getLogger(__name__)

import json
import re

from flask_restful import Resource
from flask_login import current_user
from flask import abort

from pymongo.collection import ReturnDocument

from datetime import datetime

from letmelearn      import server
from letmelearn.data import db
from letmelearn.auth import authenticated

class Folders(Resource):
  @authenticated
  def get(self):
    folders = db.folders.find_one({ "_id": current_user.email })
    if folders and "items" in folders:
      return folders["items"]
    return []

  @authenticated
  def post(self, parent=""):
    name = server.request.json["name"]
    logger.info(f"adding {name} to {parent}")
    # retrieve current folder structure or default
    folders = db.folders.find_one({ "_id": current_user.email })
    if not folders:
      folders = { "items" : [] }

    # follow path to parent, 404 if step is missing (= no upserting intemediate)
    current = folders["items"]
    if parent:
      for step in parent.split("/"):
        for existing_step in current:
          if existing_step["name"] == step and "children" in existing_step:
            current = existing_step["children"]
            break
        else:
          # we didn't found this step
          logger.warn(f"couldn't find parent '{parent}'")
          abort(404)
    
    # found all steps we're at the parent
    current.append({
      "id"       : parent + "/" + name if parent else name,
      "name"     : name,
      "children" : []
    })

    # replace entire folder structure with new one
    db.folders.replace_one(
      { "_id"   : current_user.email },
      folders,
      upsert=True
    )
    
    return folders["items"]

server.api.add_resource(Folders, "/api/folders",               endpoint="api-folders")
server.api.add_resource(Folders, "/api/folders/",              endpoint="api-folders-root")
server.api.add_resource(Folders, "/api/folders/<path:parent>", endpoint="api-folders-parent")

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
    folder = update.pop("folder", None)

    updated_topic = db.topics.find_one_and_update(
      {
        "_id"  : id,
        "user" : current_user.email
      },
      {
        "$set" : update
      },
      return_document=ReturnDocument.AFTER
    );

    updated_folders = []
    if folder:
      folders = db.folders.find_one({ "_id": current_user.email })
      if not folders:
        folders = { "items" : [] }
      def recurse(items):
        # remove this topic (id) from items if here is old location
        indices = [ idx for idx, item in enumerate(items) if item["id"] == id ]
        for idx in reversed(indices):
          del items[idx]
        # recurse remaining items, looking for folder(id)
        for item in items:
          if "children" in item:
            recurse(item["children"])
            if item["id"] == folder:
              item["children"].append({ "id" : id, "name" : update["name"] })
      recurse(folders["items"])
      # replace entire folder structure with new one
      db.folders.replace_one(
        { "_id"   : current_user.email },
        folders,
        upsert=True
      )
      updated_folders = folders["items"]
    
    return {
      "topic"   : updated_topic,
      "folders" : updated_folders
    }

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
