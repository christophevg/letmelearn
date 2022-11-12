import logging
logger = logging.getLogger(__name__)

from flask import render_template

from letmelearn import app

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def catch_all(path):
  return render_template("index.html")
