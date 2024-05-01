import os

from letmelearn import server

for page in [ "about", "advalvas", "quiz", "topics", "training" ]:
  server.register_component(f"{page}.js", os.path.dirname(__file__))
