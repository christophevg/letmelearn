import os
from pymongo import MongoClient

DB = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/letmelearn")

def db():
  mongo    = MongoClient(DB)
  database = DB.split("/")[-1].split("?")[0]
  return mongo[database]
