import os

from letmelearn.web import server, TEST_PAGE

for page, route in {
  "about"    : "/about",
  "advalvas" : None,
  "quiz"     : "/quiz",
  "topics"   : "/topics",
  "training" : "/training"
 }.items():
  server.register_component(f"{page}.js", os.path.dirname(__file__), route=route)

# Conditionally include test page
if TEST_PAGE:
  server.register_component("tests.js", os.path.dirname(__file__), route="/tests")
