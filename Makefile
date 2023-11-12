all: run

run:
	gunicorn -b 0.0.0.0:8000 -k eventlet -w 1 letmelearn:server

clear:
	@pip freeze | cut -d"=" -f1 | xargs pip uninstall -y

upgrade: clear
	pip install -U pip
	pip install -r requirements.base.txt
	pip freeze > requirements.txt

DB=letmelearn
COLLECTION=topics

backup: local/${COLLECTION}.json

local/${COLLECTION}.json:
	@echo "*** exporting local '${COLLECTION}'..."
	@mongoexport --quiet --collection=${COLLECTION} --db=${DB} --out=$@ --pretty

import-local:
	@echo "*** importing local '${COLLECTION}'..."
	@mongoimport --quiet --collection=${COLLECTION} --drop --db=${DB} local/${COLLECTION}.json

backup-remote: local/$(COLLECTION)-remote.json

local/$(COLLECTION)-remote.json:
	. local/credentials.txt; \
	mongoexport --quiet --collection=${COLLECTION} --db=${DB} --out=$@ --pretty \
	             --username=$$MONGO_USER --password=$$MONGO_PASS $$MONGO_URI
