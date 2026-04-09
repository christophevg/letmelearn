"""
Security configuration and environment detection for LetMeLearn.

Provides centralized configuration validation and environment detection.
"""

import os
import logging
import secrets

logger = logging.getLogger(__name__)


def get_environment():
  """Detect current environment from FLASK_ENV.

  Returns:
    str: 'production', 'development', or 'testing'

  Behavior:
    - Returns value from FLASK_ENV environment variable
    - Defaults to 'development' for safety (fail-open for devs)
    - Raises ValueError for invalid values
  """
  env = os.environ.get('FLASK_ENV', 'development').lower()
  valid_envs = ('production', 'development', 'testing')
  if env not in valid_envs:
    raise ValueError(
      f"Invalid FLASK_ENV '{env}'. "
      f"Must be one of: {', '.join(valid_envs)}"
    )
  return env


def is_production():
  """Check if running in production environment."""
  return get_environment() == 'production'


def is_testing():
  """Check if running in test environment."""
  return get_environment() == 'testing'


def is_development():
  """Check if running in development environment."""
  return get_environment() == 'development'


def get_secret_key():
  """Get Flask secret key with environment-appropriate validation.

  Returns:
    str: Secret key for session signing

  Raises:
    RuntimeError: In production if APP_SECRET_KEY is not set

  Behavior:
    - Production: Requires APP_SECRET_KEY, fails if missing
    - Development/Testing: Generates random key if not set (with warning)
  """
  secret_key = os.environ.get('APP_SECRET_KEY')

  if secret_key:
    return secret_key

  if is_production():
    # CRITICAL: Production MUST have a secret key
    raise RuntimeError(
      "APP_SECRET_KEY environment variable is required in production. "
      "Generate a secure secret key using: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

  # Development/Testing: Generate a random key for convenience
  generated_key = secrets.token_hex(32)
  logger.warning(
    "APP_SECRET_KEY not set. Using generated key for %s. "
    "This is acceptable for development but MUST be set in production.",
    get_environment()
  )
  return generated_key


def is_test_mode_allowed():
  """Check if TEST_MODE is enabled and permitted in current environment.

  Returns:
    bool: True if TEST_MODE can be used

  Raises:
    RuntimeError: If TEST_MODE is true in production

  Behavior:
    - Production: TEST_MODE must be false (raises if true)
    - Development/Testing: TEST_MODE allowed
  """
  test_mode = os.environ.get('TEST_MODE', 'false').lower() == 'true'

  if test_mode and is_production():
    raise RuntimeError(
      "TEST_MODE=true is not allowed in production environment. "
      "This configuration would bypass OAuth authentication."
    )

  return test_mode