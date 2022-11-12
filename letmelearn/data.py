import os
from pymongo import MongoClient

DB_CONN = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/letmelearn")
DB_NAME = DB_CONN.split("/")[-1].split("?")[0]

db = MongoClient(DB_CONN)[DB_NAME]
