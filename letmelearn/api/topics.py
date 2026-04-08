"""
Topics endpoint for topic management.

Provides RESTful endpoints for:
- GET /api/topics - List topics
- POST /api/topics - Create topic
- GET /api/topics/<id> - Get topic
- PATCH /api/topics/<id> - Update topic
- DELETE /api/topics/<id> - Delete topic
- POST /api/topics/<id>/items - Add item
- PATCH /api/topics/<id>/items - Update item
- DELETE /api/topics/<id>/items - Remove item
"""

import logging

from flask_restful import Resource
from flask_login import current_user

import pymongo
from pymongo.collection import ReturnDocument

from letmelearn.web import server
from letmelearn.data import db
from letmelearn.auth import authenticated
from letmelearn.treeitems import TreeItems, Topic, idfy
from letmelearn.errors import problem_response

logger = logging.getLogger(__name__)


class Topics(Resource):
  """Manage topics."""

  @authenticated
  def get(self):
    """List all topics for current user.

    Returns:
      List of topic objects (without user field).
    """
    return list(db.topics.find(
      {"user": current_user.identity.email},
      {"user": False}
    ))

  @authenticated
  def post(self):
    """Create a topic.

    Request body:
      {
        "name": "topic-name",
        "question": {...},
        "items": [...]
      }

    Returns:
      Created topic object.

    Raises:
      409: Duplicate topic name.
    """
    name = server.request.json["name"]
    question = server.request.json["question"]
    items = server.request.json.get("items", [])
    id = idfy(name)
    new_topic = {
      "_id": id,
      "user": current_user.identity.email,
      "name": name,
      "question": question,
      "items": items
    }
    try:
      db.topics.insert_one(new_topic)
    except pymongo.errors.DuplicateKeyError:
      return problem_response("duplicate_name",
                             detail="This name has already been used. Please choose a different name.")
    return new_topic


class TopicResource(Resource):
  """Manage a single topic."""

  @authenticated
  def get(self, id):
    """Get a topic.

    Args:
      id: Topic ID.

    Returns:
      Topic object or None if not found.
    """
    return db.topics.find_one({
      "_id": id,
      "user": current_user.identity.email
    })

  @authenticated
  def patch(self, id):
    """Update a topic.

    Args:
      id: Topic ID.

    Request body:
      {
        "name": "new-name",
        "question": {...},
        "folder": {"id": "folder-path"}
      }

    Returns:
      {"topic": updated_topic, "treeitems": updated_tree}
    """
    update = server.request.json
    update.pop("_id", None)
    update.pop("user", None)
    folder = update.pop("folder", None)

    logger.info(f"patching {id} with {update} and {folder}")

    # patch topic
    updated_topic = db.topics.find_one_and_update(
      {
        "_id": id,
        "user": current_user.identity.email
      },
      {
        "$set": update
      },
      return_document=ReturnDocument.AFTER
    )

    # optionally move to new folder
    from letmelearn.api.folders import Folders
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
        logger.warning(f"couldn't find new folder '{folder}'")
        return problem_response("not_found", detail=f"Folder '{folder}' not found")

    return {
      "topic": updated_topic,
      "treeitems": Folders._set(tree.as_dicts())
    }

  @authenticated
  def delete(self, id):
    """Delete a topic.

    Args:
      id: Topic ID.

    Returns:
      {"topic": id, "treeitems": updated_tree}

    Note: Also removes topic from folder tree.
    """
    from letmelearn.api.folders import Folders

    # delete the topic
    db.topics.delete_one({
      "_id": id,
      "user": current_user.identity.email
    })

    # remove it from the folders structure
    tree = TreeItems.from_dicts(Folders._get())
    try:
      tree.remove(id)
      Folders._set(tree.as_dicts())
    except KeyError:
      # might happen if the topic wasn't added to the TreeItems yet
      pass

    return {
      "topic": id,
      "treeitems": Folders._set(tree.as_dicts())
    }


class Items(Resource):
  """Manage topic items."""

  @authenticated
  def post(self, id):
    """Add item to topic.

    Args:
      id: Topic ID.

    Request body: Item object.

    Returns:
      Updated topic.
    """
    return db.topics.find_one_and_update(
      {
        "_id": id,
        "user": current_user.identity.email
      },
      {
        "$push": {"items": server.request.json}
      }
    )

  @authenticated
  def patch(self, id):
    """Update item in topic.

    Args:
      id: Topic ID.

    Request body:
      {"original": {...}, "update": {...}}

    Returns:
      Updated topic.
    """
    return db.topics.find_one_and_update(
      {
        "_id": id,
        "user": current_user.identity.email,
        "items": server.request.json["original"]
      },
      {
        "$set": {
          "items.$": server.request.json["update"]
        }
      }
    )

  @authenticated
  def delete(self, id):
    """Remove item from topic.

    Args:
      id: Topic ID.

    Request body: Item object to remove.

    Returns:
      Updated topic.
    """
    return db.topics.find_one_and_update(
      {"_id": id, "user": current_user.identity.email},
      {"$pull": {"items": server.request.json}}
    )