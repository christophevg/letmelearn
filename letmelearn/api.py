from flask_restful import Resource

from flask_login import current_user

from baseweb.rest import api

from letmelearn      import db
from letmelearn.auth import authenticated

class Sets(Resource):
  @authenticated
  def get(self):    
    return db.sets.find({"user" : current_user["email"] })

api.add_resource(Sets, "/api/sets", endpoint="sets")

class Set(Resource):
  @authenticated
  def post(self, id):
    db.sets.insert_one({
      "_id"  : id,
      "user" : current_user["email"],
      "items": request.json
    })
    return True
  
  @authenticated
  def get(self, id):    
    return db.sets.find_one({
      "_id": id,
      "user": current_user["email"]
    })

  @authenticated
  def put(self, id):
    db.sets.update_one({
      "_id"  : id,
      "user" : current_user["email"],
      "items": request.json
    })
    return True

  @authenticated
  def delete(self, id):
    db.sets.remove_one({
      "_id": id,
      "user": current_user["email"]
    })
    return True

api.add_resource(Set, "/api/sets/<id>", endpoint="set")
