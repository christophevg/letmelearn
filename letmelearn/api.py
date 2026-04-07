import logging

from flask_restful import Resource
from flask_login import current_user

import pymongo
from pymongo.collection import ReturnDocument
from bson.objectid import ObjectId

from datetime import datetime

from letmelearn.web       import server
from letmelearn.data      import db
from letmelearn.auth      import authenticated
from letmelearn.treeitems import TreeItems, Folder, Topic, idfy
from letmelearn.errors    import problem_response

logger = logging.getLogger(__name__)

class Folders(Resource):
  @staticmethod
  def _get():
    items = db.folders.find_one({ "_id": current_user.identity.email })
    if items and "items" in items:
      return items["items"]
    return []
  
  @staticmethod
  def _set(items):
    return db.folders.find_one_and_replace(
      { "_id"   : current_user.identity.email },
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
      return problem_response("not_found", detail=f"Folder '{path}' not found")

  @authenticated
  def delete(self, path):
    tree = TreeItems.from_dicts(Folders._get())
    try:
      tree.remove(path)
      return Folders._set(tree.as_dicts())
    except KeyError:
      # we didn't find this folder
      logger.warn(f"couldn't find item '{path}'")
      return problem_response("not_found", detail=f"Item '{path}' not found")

server.api.add_resource(Folders, "/api/folders",             endpoint="api-folders")
server.api.add_resource(Folders, "/api/folders/",            endpoint="api-folders-root")
server.api.add_resource(Folders, "/api/folders/<path:path>", endpoint="api-folders-parent")

class Topics(Resource):
  @authenticated
  def get(self):    
    return list(db.topics.find(
      { "user": current_user.identity.email },
      { "user": False }
    ))

  @authenticated
  def post(self):
    name     = server.request.json["name"]
    question = server.request.json["question"]
    items    = server.request.json.get("items", [])
    id       = idfy(name)
    new_topic = {
      "_id"      : id,
      "user"     : current_user.identity.email,
      "name"     : name,
      "question" : question,
      "items"    : items
    }
    try:
      db.topics.insert_one(new_topic)
    except pymongo.errors.DuplicateKeyError:
      return problem_response("duplicate_name", detail="This name has already been used. Please choose a different name.")
    return new_topic

server.api.add_resource(Topics, "/api/topics", endpoint="api-topics")

class TopicResource(Resource):
  @authenticated
  def get(self, id):    
    return db.topics.find_one({
      "_id": id,
      "user": current_user.identity.email
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
        "user" : current_user.identity.email
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
        # first find parent
        parent = tree[folder["id"]]
        # then first remove
        try:
          topic = tree.remove(id)
        except KeyError:
          # topic might not yet be in the tree
          topic = Topic(updated_topic["name"], id=id)
        # then add to new parent
        parent.add(topic)
      except KeyError:
        # we didn't find this folder
        logger.warn(f"couldn't find new folder '{folder}'")
        return problem_response("not_found", detail=f"Folder '{folder}' not found")
  
    return {
      "topic"     : updated_topic,
      "treeitems" : Folders._set(tree.as_dicts())
    }

  @authenticated
  def delete(self, id):
    # delete the topic
    db.topics.delete_one({
      "_id": id,
      "user": current_user.identity.email
    })

    # remove it from the folders structure
    try:
      tree = TreeItems.from_dicts(Folders._get())
      tree.remove(id)
      Folders._set(tree.as_dicts())
    except KeyError:
      # might happen if the topic wasn't added to the TreeItems yet
      pass
      
    # delete feed items referencing it
    db.feed.delete_many({ "topics" : id })

    return {
      "topic"   : id,
      "treeitems" : Folders._set(tree.as_dicts()),
      "feed"    : Feed._get()
    }

server.api.add_resource(TopicResource, "/api/topics/<id>", endpoint="api-topic")

class Items(Resource):
  @authenticated
  def post(self, id):    
    return db.topics.find_one_and_update(
      {
        "_id"  : id,
        "user" : current_user.identity.email
      },
      {
        "$push" : { "items" : server.request.json }
      })

  @authenticated
  def patch(self, id):
    return db.topics.find_one_and_update(
      {
        "_id"   : id,
        "user"  : current_user.identity.email,
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
      { "_id" : id, "user" : current_user.identity.email },
      { "$pull" : { "items" : server.request.json }}
    )

server.api.add_resource(Items, "/api/topics/<id>/items", endpoint="api-items")

class Feed(Resource):
  @staticmethod
  def _get_sessions_feed(user_emails, limit=10):
    """
    Derive feed items from sessions collection.
    Quiz/training results are derived from completed/abandoned sessions.
    """
    # Get sessions for the specified users
    sessions = list(db.sessions.find(
      {"user": {"$in": user_emails}, "status": {"$in": ["completed", "abandoned"]}},
      {"_id": 0, "user": 1, "kind": 1, "topics": 1, "questions": 1, "asked": 1, "attempts": 1, "correct": 1, "elapsed": 1, "stopped_at": 1}
    ).sort("stopped_at", -1).limit(limit))

    if not sessions:
      return []

    # Get unique user emails from sessions
    session_emails = list(set(s["user"] for s in sessions))

    # Look up users (similar to how Following endpoint does it)
    users_map = {
      u["_id"]: u
      for u in db.users.find({"_id": {"$in": session_emails}}, {"_id": 1, "name": 1, "picture": 1})
    }

    # Build results
    results = []
    for session in sessions:
      user_email = session["user"]
      user_doc = users_map.get(user_email)

      # Build user object
      if user_doc:
        user_info = {
          "email": user_email,
          "name": user_doc.get("name", user_email),
          "picture": user_doc.get("picture")
        }
      else:
        user_info = {
          "email": user_email,
          "name": user_email,
          "picture": None
        }

      # Convert ObjectId topics to strings and add topic names
      topic_objects = []
      if "topics" in session and session["topics"]:
        topic_ids = [str(t) if hasattr(t, '__str__') else t for t in session["topics"]]
        valid_object_ids = []
        for tid in topic_ids:
          try:
            valid_object_ids.append(ObjectId(tid))
          except:
            topic_objects.append({"_id": tid, "name": tid})

        if valid_object_ids:
          topic_docs = list(db.topics.find(
            {"_id": {"$in": valid_object_ids}},
            {"_id": 1, "name": 1}
          ))
          topic_map = {str(t["_id"]): t.get("name", "Unknown") for t in topic_docs}
          for tid in topic_ids:
            if tid in topic_map:
              topic_objects.append({"_id": tid, "name": topic_map[tid]})

      results.append({
        "kind": session["kind"] + " result",
        "user": [user_info],
        "when": session["stopped_at"].isoformat() + "Z" if session.get("stopped_at") else None,
        "topics": topic_objects,
        "questions": session.get("questions"),
        "asked": session.get("asked"),
        "attempts": session.get("attempts"),
        "correct": session.get("correct"),
        "elapsed": session.get("elapsed")
      })

    return results

  @staticmethod
  def _get_topics_feed(user_emails, limit=10):
    """
    Get "new topic" events from feed collection.
    """
    # Get feed items for the specified users
    feed_items = list(db.feed.find(
      {"user.0": {"$in": user_emails}, "kind": "new topic"},
      {"_id": 0, "user": 1, "kind": 1, "when": 1, "topic": 1}
    ).sort("when", -1).limit(limit))

    if not feed_items:
      return []

    # Get unique user emails from feed items
    feed_emails = []
    for item in feed_items:
      if item.get("user") and len(item["user"]) > 0:
        feed_emails.append(item["user"][0])
    feed_emails = list(set(feed_emails))

    # Look up users
    users_map = {
      u["_id"]: u
      for u in db.users.find({"_id": {"$in": feed_emails}}, {"_id": 1, "name": 1, "picture": 1})
    }

    # Build results
    results = []
    for item in feed_items:
      user_email = item["user"][0] if item.get("user") else None
      user_doc = users_map.get(user_email) if user_email else None

      # Build user object
      if user_doc:
        user_info = {
          "email": user_email,
          "name": user_doc.get("name", user_email),
          "picture": user_doc.get("picture")
        }
      else:
        user_info = {
          "email": user_email or "unknown",
          "name": user_email or "Unknown",
          "picture": None
        }

      # Add topic name
      topic_info = None
      if "topic" in item and item["topic"]:
        topic_id = str(item["topic"]) if hasattr(item["topic"], '__str__') else item["topic"]
        try:
          topic_doc = db.topics.find_one({"_id": ObjectId(topic_id)}, {"_id": 1, "name": 1})
          if topic_doc:
            topic_info = {"_id": topic_id, "name": topic_doc.get("name", "Unknown")}
          else:
            topic_info = {"_id": topic_id, "name": topic_id}
        except:
          topic_info = {"_id": topic_id, "name": topic_id}

      results.append({
        "kind": item["kind"],
        "user": [user_info],
        "when": item.get("when") if isinstance(item.get("when"), str) else (item.get("when").isoformat() + "Z" if item.get("when") else None),
        "topic": topic_info
      })

    return results

  @staticmethod
  def _get_my_feed():
    """Get current user's own activity feed."""
    user_email = current_user.identity.email

    # Get sessions-derived feed (quiz/training results)
    sessions_feed = Feed._get_sessions_feed([user_email])

    # Get "new topic" events from feed collection
    topics_feed = Feed._get_topics_feed([user_email])

    # Combine and sort by when
    combined = sessions_feed + topics_feed
    combined.sort(key=lambda x: x.get("when", ""), reverse=True)

    return combined[:10]

  @staticmethod
  def _get_following_feed():
    """Get activity feed from followed users."""
    user_email = current_user.identity.email

    # Get list of followed users
    follows = list(db.follows.find(
      {"follower": user_email},
      {"_id": 0, "following": 1}
    ))
    following_emails = [f["following"] for f in follows]

    if not following_emails:
      return []

    # Get sessions-derived feed from followed users
    sessions_feed = Feed._get_sessions_feed(following_emails)

    # Get "new topic" events from followed users
    topics_feed = Feed._get_topics_feed(following_emails)

    # Combine and sort by when
    combined = sessions_feed + topics_feed
    combined.sort(key=lambda x: x.get("when", ""), reverse=True)

    return combined[:10]

  @staticmethod
  def _get_all_feed():
    """Get combined activity feed from both user and followed users."""
    user_email = current_user.identity.email

    # Get following list
    follows = list(db.follows.find(
      {"follower": user_email},
      {"_id": 0, "following": 1}
    ))
    following_emails = [f["following"] for f in follows]

    # Combined list: user + followed users
    all_emails = [user_email] + following_emails

    # Get sessions-derived feed
    sessions_feed = Feed._get_sessions_feed(all_emails)

    # Get "new topic" events
    topics_feed = Feed._get_topics_feed(all_emails)

    # Combine and sort by when
    combined = sessions_feed + topics_feed
    combined.sort(key=lambda x: x.get("when", ""), reverse=True)

    return combined[:10]

  @authenticated
  def get(self):
    """Get activity feed.

    Query params:
      mode: "my" (default) - current user's activity
            "following" - activity from followed users
            "all" - combined activity from both
    """
    mode = server.request.args.get("mode", "my")

    if mode == "following":
      return Feed._get_following_feed()
    elif mode == "all":
      return Feed._get_all_feed()
    else:
      return Feed._get_my_feed()

  @authenticated
  def post(self):
    # create feed item to insert
    allowed = [
      "kind", "topic", "topics",
      "questions", "asked", "attempts", "correct",
      "elapsed"
    ]
    new_item = {
      prop : server.request.json[prop]
      for prop in allowed
      if prop in server.request.json
    }
    # add user and timestamp
    new_item["user"] = [ current_user.identity.email ] # by ref in collection
    new_item["when"] = datetime.now().isoformat()

    db.feed.insert_one(new_item)
    new_item.pop("_id") # remove byref added _id

    new_item["user" ] = [ current_user.identity.as_json() ] # return by value
    return new_item

server.api.add_resource(Feed, "/api/feed", endpoint="api-feed")
