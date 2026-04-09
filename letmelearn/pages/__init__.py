from os.path import dirname

import logging

from letmelearn.web import server, TEST_PAGE

logger = logging.getLogger(__name__)

for page, route in {
  "about"    : "/about",
  "advalvas" : None,
  "quiz"     : "/quiz",
  "topics"   : "/topics",
  "training" : "/training",
  "errors"   : "/errors"
 }.items():
  server.register_component(f"{page}.js", dirname(__file__), route=route)

# Conditionally include test page
if TEST_PAGE:
  server.register_component("tests.js", dirname(__file__), route="/tests")
  logger.info("Test page enabled")

logger.info("✅ pages loaded")
