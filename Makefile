-include ~/.claude/Makefile

# Project settings
PROJECT := $(shell basename $(CURDIR))
PYTHON_VERSION := 3.11.12
MAIN_ENV := $(PROJECT)
TEST_ENV := $(PROJECT)-test-$(PYTHON_VERSION)

# Database settings
DB?=letmelearn
COLLECTION?=topics
FILE?=${COLLECTION}

# Run the application
run: env
	gunicorn -b 0.0.0.0:8000 -k eventlet -w 1 letmelearn.web:server

# Install main environment
install:
	@echo "👷‍♂️ Creating main environment $(MAIN_ENV)..."
	pyenv virtualenv $(PYTHON_VERSION) $(MAIN_ENV) 2>/dev/null || true
	pyenv local $(MAIN_ENV)
	pip install -U pip
	pip install -r requirements.txt
	@echo "✅ Main environment ready"

# Install test environment (requires main environment)
install-test: install
	@echo "👷‍♂️ Creating test environment $(TEST_ENV)..."
	pyenv virtualenv $(PYTHON_VERSION) $(TEST_ENV) 2>/dev/null || true
	~/.pyenv/versions/$(TEST_ENV)/bin/pip install -U pip
	~/.pyenv/versions/$(TEST_ENV)/bin/pip install -r requirements-test.txt
	~/.pyenv/versions/$(TEST_ENV)/bin/pip install -e .
	@echo "✅ Test environment ready"
	@pyenv local $(MAIN_ENV)

# Run tests using test environment
test: env-test
	@echo "🧪 Running tests in $(TEST_ENV)..."
	pytest tests/ $(ARGS)
	@echo "✅ Tests complete"
	@pyenv local $(MAIN_ENV)

# Run tests with coverage
coverage: env-test
	@echo "🧪 Running tests with coverage in $(TEST_ENV)..."
	pytest --cov=letmelearn --cov-report=term-missing tests/ $(ARGS)
	@echo "✅ Coverage complete"
	@pyenv local $(MAIN_ENV)

# Lint code
lint: env-test
	-ruff check --select=E9,F63,F7,F82 --target-version=py311 .
	-ruff check --target-version=py311 .
	@pyenv local $(MAIN_ENV)

env-test:
	@pyenv local $(TEST_ENV)

env:
	@pyenv local $(MAIN_ENV)

# Database operations
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

COLLECTIONS=feed folders follows sessions topics users versions

sync:
	@for col in $(COLLECTIONS); do \
		echo "$(RED)** $$col$(NC)"; \
		COLLECTION=$$col $(MAKE) sync-from-production; \
	done

# Colors
GREEN=\033[0;32m
RED=\033[0;31m
BLUE=\033[0;34m
NC=\033[0m

# Clean up environments
clean:
	@echo "🧹 Cleaning up test environment..."
	-pyenv virtualenv-delete $(TEST_ENV) 2>/dev/null || true
	@echo "✅ Clean complete"

.PHONY: install install-test test coverage lint clean
