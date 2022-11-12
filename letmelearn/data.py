import os
from pymongo import MongoClient

DB       = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/letmelearn")
mongo    = MongoClient(DB)
database = DB.split("/")[-1].split("?")[0]
db       = mongo[database]
