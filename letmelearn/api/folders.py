"""
Folders endpoint for folder tree management.

Provides RESTful endpoints for:
- GET /api/folders - Get folder tree
- POST /api/folders - Create folder at root
- POST /api/folders/<path> - Create folder in path
- DELETE /api/folders/<path> - Delete folder
"""

import logging

from flask_restful import Resource
from flask_login import current_user

from letmelearn.web import server
from letmelearn.data import db
from letmelearn.auth import authenticated
from letmelearn.treeitems import TreeItems, Folder
from letmelearn.errors import problem_response

logger = logging.getLogger(__name__)


class Folders(Resource):
  """Manage folder tree structure."""

  @staticmethod
  def _get():
    """Get current user's folder tree."""
    items = db.folders.find_one({"_id": current_user.identity.email})
    if items and "items" in items:
      return items["items"]
    return []

  @staticmethod
  def _set(items):
    """Save folder tree to database."""
    return db.folders.find_one_and_replace(
      {"_id": current_user.identity.email},
      {"items": items},
      upsert=True,
      return_document=True
    )["items"]

  @authenticated
  def get(self):
    """Get folder tree.

    Returns:
      List of folder items in tree structure.
    """
    return self._get()

  @authenticated
  def post(self, path=None):
    """Create a folder.

    Args:
      path: Optional parent folder path. If None, creates at root.

    Request body:
      {"name": "new-folder-name"}

    Returns:
      Updated folder tree.

    Raises:
      404: Parent folder not found.
    """
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
    """Delete a folder.

    Args:
      path: Folder path to delete.

    Returns:
      Updated folder tree.

    Raises:
      404: Folder not found.
    """
    tree = TreeItems.from_dicts(Folders._get())
    try:
      tree.remove(path)
      return Folders._set(tree.as_dicts())
    except KeyError:
      # we didn't find this item
      logger.warn(f"couldn't find item '{path}'")
      return problem_response("not_found", detail=f"Item '{path}' not found")