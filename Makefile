all: run

run:
	gunicorn -b 0.0.0.0:8000 -k eventlet -w 1 letmelearn.web:server

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

COLLECTIONS=feed topics folders users versions

sync:
	@for col in $(COLLECTIONS); do \
		echo "$(RED)** $$col$(NC)"; \
		COLLECTION=$$col $(MAKE) sync-from-production; \
	done

# colors

GREEN=\033[0;32m
RED=\033[0;31m
BLUE=\033[0;34m
NC=\033[0m

# test envs

PYTHON_VERSIONS ?= 3.9.18 3.10.13 3.11.12 3.12.10
RUFF_PYTHON_VERSION ?= py311

PROJECT=$(shell basename $(CURDIR))
TEST_ENVS=$(addprefix $(PROJECT)-test-,$(PYTHON_VERSIONS))

install: install-env-test
install-env-test: $(TEST_ENVS)
$(PROJECT)-test-%:
	@echo "👷‍♂️ $(BLUE)creating virtual test environment $@$(NC)"
	pyenv local --unset
	-pyenv virtualenv $* $@ > /dev/null
	pyenv local $@
	pip install -U pip > /dev/null
	pip install -U ruff tox > /dev/null

uninstall: uninstall-envs
uninstall-envs: uninstall-env-test 
uninstall-env-test: $(addprefix uninstall-env-test-,$(PYTHON_VERSIONS))
$(addprefix uninstall-env-test-,$(PYTHON_VERSIONS)): uninstall-env-%:
	@echo "👷‍♂️ $(RED)deleting virtual environment $(PROJECT)-$*$(NC)"
	-pyenv virtualenv-delete $(PROJECT)-$*

clean-env:
	@echo "👷‍♂️ $(RED)deleting all packages from current environment$(NC)"
	pip freeze | cut -d"@" -f1 | cut -d'=' -f1 | xargs pip uninstall -y > /dev/null

# env switching

env-%:
	pyenv local $(PROJECT)-$*

env:
	pyenv local $(PROJECT)

env-test:
	@echo "👉 $(BLUE)activating virtual test environment $(TEST_ENVS)$(NC)"
	pyenv local $(TEST_ENVS)
	
# functional targets

test: env-test lint
	tox

coverage: test
	coverage report

lint: env-test
	ruff check --select=E9,F63,F7,F82 --target-version=$(RUFF_PYTHON_VERSION) .
	ruff check --target-version=$(RUFF_PYTHON_VERSION) .
