import os

from letmelearn.web import server

for page, route in {
  "about"    : "/about",
  "advalvas" : None,
  "quiz"     : "/quiz",
  "topics"   : "/topics",
  "training" : "/training"
 }.items():
  server.register_component(f"{page}.js", os.path.dirname(__file__), route=route)
