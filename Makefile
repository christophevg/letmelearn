-include ~/.claude/Makefile
ARGS +=--plugin-dir ../baseweb

# Colors
GREEN=\033[0;32m
RED=\033[0;31m
BLUE=\033[0;34m
NC=\033[0m

# Project settings
PROJECT := $(shell basename $(CURDIR))
PYTHON_VERSION := 3.11.12
MAIN_ENV := $(PROJECT)
TEST_ENV := $(PROJECT)-test-$(PYTHON_VERSION)

# Database settings
DB?=letmelearn
COLLECTION?=topics
FILE?=${COLLECTION}

# Environment Switching

env-run:
	uv sync

env-test:
	uv sync --extra test

# Run the application
run: env-run
	uv run gunicorn -b 0.0.0.0:8000 -k eventlet -w 1 letmelearn.web:server

# Run tests using test environment
test: env-test
	@echo "🧪 Running tests..."
	uv run pytest tests/

# Run tests using test environment WITH Mongo
test-real: env-test
	@echo "🧪 Running tests... WITH Mongo"
	USE_MONGOMOCK=false uv run pytest tests/

# Run tests with coverage
coverage: env-test
	@echo "🧪 Running tests with coverage in $(TEST_ENV)..."
	uv run pytest --cov=letmelearn --cov-report=term-missing tests/

# Lint code
lint: env-test
	uv run ruff check --select=E9,F63,F7,F82 --target-version=py311 .
	uv run ruff check --target-version=py311 .

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

.PHONY: install install-test test coverage lint clean
