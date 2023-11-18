import os

from baseweb.interface import register_component

for page in [ "about", "advalvas", "quiz", "topics" ]:
  register_component(f"{page}.js", os.path.dirname(__file__))

