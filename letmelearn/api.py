import logging

import re

from flask_restful import Resource
from flask_login import current_user
from flask import abort

from pymongo.collection import ReturnDocument

from datetime import datetime

from letmelearn.web       import server
from letmelearn.data      import db
from letmelearn.auth      import authenticated
from letmelearn.treeitems import TreeItems, Folder

logger = logging.getLogger(__name__)

class Folders(Resource):
  @staticmethod
  def _get():
    items = db.folders.find_one({ "_id": current_user.email })
    if items and "items" in items:
      return items["items"]
    return []
  
  @staticmethod
  def _set(items):
    return db.folders.find_one_and_replace(
      { "_id"   : current_user.email },
      { "items" : items },
      upsert=True,
      return_document=ReturnDocument.AFTER
    )["items"]
  
  @authenticated
  def get(self):
    return self._get()

  @authenticated
  def post(self, path=None):
    name = server.request.json["name"]
    logger.info(f"adding {name} to {path}")

    tree = TreeItems.from_dicts(Folders._get())
    try:
      tree[path].add(Folder(name))
      return Folders._set(tree.as_dicts())
    except KeyError:
      # we didn't find this folder
      logger.warn(f"couldn't find folder '{path}'")
      abort(404)

  @authenticated
  def delete(self, path):
    tree = TreeItems.from_dicts(Folders._get())
    try:
      tree.remove(path)
      return Folders._set(tree.as_dicts())
    except KeyError:
      # we didn't find this folder
      logger.warn(f"couldn't find item '{path}'")
      abort(404)

server.api.add_resource(Folders, "/api/folders",             endpoint="api-folders")
server.api.add_resource(Folders, "/api/folders/",            endpoint="api-folders-root")
server.api.add_resource(Folders, "/api/folders/<path:path>", endpoint="api-folders-parent")

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

class TopicResource(Resource):
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
    
    logger.info(f"patching {id} with {update} and {folder}")

    # patch topic
    updated_topic = db.topics.find_one_and_update(
      {
        "_id"  : id,
        "user" : current_user.email
      },
      {
        "$set" : update
      },
      return_document=ReturnDocument.AFTER
    )

    # optionally move to new folder
    tree = TreeItems.from_dicts(Folders._get())
    if folder:
      # (re)move
      try:
        parent = tree[folder]
        logger.info(f"{folder} -> {parent}")
        parent.add(tree.remove(id))
      except KeyError:
        # we didn't find this folder
        logger.warn(f"couldn't find item '{id}'")
        abort(404)
  
    return {
      "topic"   : updated_topic,
      "folders" : Folders._set(tree.as_dicts())
    }

  @authenticated
  def delete(self, id):
    # delete the topic
    db.topics.delete_one({
      "_id": id,
      "user": current_user.email
    })

    # remove it from the folders structure
    try:
      Folders._get().remove(id)
    except KeyError:
      # might happen if the topic wasn't added to the TreeItems yet
      pass
      
    # delete feed items referencing it
    db.feed.delete_many({
      "$or" : [
        { "topic"  : id },
        { "topics" : id }
      ]
    })
    return True

server.api.add_resource(TopicResource, "/api/topics/<id>", endpoint="api-topic")

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
