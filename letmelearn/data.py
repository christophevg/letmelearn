import logging
import os
import json

from pymongo import MongoClient

logger = logging.getLogger(__name__)

DB_CONN = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/letmelearn")
DB_NAME = DB_CONN.split("/")[-1].split("?")[0]

db = MongoClient(DB_CONN, serverSelectionTimeoutMS=3000)[DB_NAME]
versions = {
  version["_id"] : version["version"]
  for version in db.versions.find({})
}
if not versions:
  versions = { "topics" : 0 }

logger.info(f"collection versions: {versions}")

if versions["topics"] < 2:
  logger.info(f"upgrading topics collection from version {versions['topics']} to 2")
  for topic in db.topics.find({}):
    topic["question"] = {
      "type" : "BasicQuestion",
      "labels" : {
        "left" : "Key",
        "right": "Value"
      }
    }
    for item in topic["items"]:
      item["left"]  = item.pop("key").split("|")
      item["right"] = item.pop("value").split("|")
    db.topics.find_one_and_update({"_id" : topic.pop("_id")}, { "$set" : topic })
  db.versions.find_one_and_update(
    {"_id" : "topics"},
    { "$set" : {"version" : 2 } },
    upsert=True
  )
  logger.info("topics collection upgraded to version 2")
