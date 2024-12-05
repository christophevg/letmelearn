all: run

run:
	gunicorn -b 0.0.0.0:8000 -k eventlet -w 1 letmelearn:server

requirements.txt:
	@cat $@ | cut -d"=" -f1 | xargs pip uninstall -y
	pip install -U pip
	pip install -r requirements.base.txt
	pip freeze > $@

.PHONY: requirements.txt

DB?=letmelearn
COLLECTION?=topics
FILE?=${COLLECTION}

export-production:
	@echo "⬅️  exporting from remote '${COLLECTION}'..."
	@. ./.env.local; mongoexport --quiet --uri=$$URI --collection=${COLLECTION} --username=$$MONGO_USER --password=$$MONGO_PASS --db=${DB} --out=local/${FILE}.json
	@wc -l local/${FILE}.json

import-production:
	@echo "➡️  importing to remote '${COLLECTION}'..."
	@. ./.env.local; mongoimport --quiet --uri=$$URI --collection=${COLLECTION} --drop --username=$$MONGO_USER --password=$$MONGO_PASS --db=${DB} local/${FILE}.json

export-local:
	@echo "⬅️  exporting from local '${COLLECTION}'..."
	@mongoexport --quiet --collection=${COLLECTION} --db=${DB} --out=local/${FILE}.json
	@wc -l local/${FILE}.json

import-local:
	@echo "➡️  importing to local '${COLLECTION}'..."
	@mongoimport --quiet --collection=${COLLECTION} --drop --db=${DB} local/${FILE}.json

sync-from-production: export-production import-local

sync-to-production: export-local import-production

COLLECTIONS=feed topics users versions

sync:
	@for col in $(COLLECTIONS); do \
		echo "$(RED)** $$col$(NC)"; \
		COLLECTION=$$col $(MAKE) sync-from-production; \
	done
