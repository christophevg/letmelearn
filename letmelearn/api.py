from flask_restful import Resource

from flask_login import current_user

from baseweb.rest import api

from letmelearn      import db
from letmelearn.auth import authenticated

class Sets(Resource):
  @authenticated
  def get(self):    
    return list(db.topics.find({ "user": current_user.email }, { "user": False }))

api.add_resource(Sets, "/api/topics", endpoint="topics")

class Set(Resource):
  @authenticated
  def post(self, id):
    db.topics.insert_one({
      "_id"  : id,
      "user" : current_user.email,
      "items": request.json
    })
    return True
  
  @authenticated
  def get(self, id):    
    return db.topics.find_one({
      "_id": id,
      "user": current_user.email
    })

  @authenticated
  def put(self, id):
    db.topics.update_one({
      "_id"  : id,
      "user" : current_user.email,
      "items": request.json
    })
    return True

  @authenticated
  def delete(self, id):
    db.topics.remove_one({
      "_id": id,
      "user": current_user["email"]
    })
    return True

api.add_resource(Set, "/api/topics/<id>", endpoint="topic")
