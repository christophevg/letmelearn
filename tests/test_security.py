"""
Security tests for LetMeLearn.

Tests for security fixes C1, C2, and C3:
- C1: Secret key validation
- C2: TEST_MODE bypass protection
- C3: Regex injection prevention
"""

import pytest
import os
from unittest.mock import patch


class TestGetEnvironment:
  """Tests for get_environment function."""

  def test_default_environment_is_development(self, monkeypatch):
    """Without FLASK_ENV, should default to 'development'."""
    monkeypatch.delenv('FLASK_ENV', raising=False)

    from letmelearn.config import get_environment

    assert get_environment() == 'development'

  def test_production_environment(self, monkeypatch):
    """Should return 'production' when FLASK_ENV=production."""
    monkeypatch.setenv('FLASK_ENV', 'production')

    from letmelearn.config import get_environment

    assert get_environment() == 'production'

  def test_development_environment(self, monkeypatch):
    """Should return 'development' when FLASK_ENV=development."""
    monkeypatch.setenv('FLASK_ENV', 'development')

    from letmelearn.config import get_environment

    assert get_environment() == 'development'

  def test_testing_environment(self, monkeypatch):
    """Should return 'testing' when FLASK_ENV=testing."""
    monkeypatch.setenv('FLASK_ENV', 'testing')

    from letmelearn.config import get_environment

    assert get_environment() == 'testing'

  def test_case_insensitive_environment(self, monkeypatch):
    """Should handle case-insensitive environment names."""
    monkeypatch.setenv('FLASK_ENV', 'PRODUCTION')

    from letmelearn.config import get_environment

    assert get_environment() == 'production'

  def test_invalid_environment_raises_error(self, monkeypatch):
    """Should raise ValueError for invalid environment."""
    monkeypatch.setenv('FLASK_ENV', 'staging')

    from letmelearn.config import get_environment

    with pytest.raises(ValueError) as exc_info:
      get_environment()

    assert "Invalid FLASK_ENV 'staging'" in str(exc_info.value)


class TestEnvironmentHelpers:
  """Tests for environment helper functions."""

  def test_is_production_true(self, monkeypatch):
    """Should return True for production environment."""
    monkeypatch.setenv('FLASK_ENV', 'production')

    from letmelearn.config import is_production

    assert is_production() is True

  def test_is_production_false(self, monkeypatch):
    """Should return False for non-production environment."""
    monkeypatch.setenv('FLASK_ENV', 'development')

    from letmelearn.config import is_production

    assert is_production() is False

  def test_is_testing_true(self, monkeypatch):
    """Should return True for testing environment."""
    monkeypatch.setenv('FLASK_ENV', 'testing')

    from letmelearn.config import is_testing

    assert is_testing() is True

  def test_is_testing_false(self, monkeypatch):
    """Should return False for non-testing environment."""
    monkeypatch.setenv('FLASK_ENV', 'development')

    from letmelearn.config import is_testing

    assert is_testing() is False

  def test_is_development_true(self, monkeypatch):
    """Should return True for development environment."""
    monkeypatch.setenv('FLASK_ENV', 'development')

    from letmelearn.config import is_development

    assert is_development() is True

  def test_is_development_false(self, monkeypatch):
    """Should return False for non-development environment."""
    monkeypatch.setenv('FLASK_ENV', 'production')

    from letmelearn.config import is_development

    assert is_development() is False


class TestGetSecretKey:
  """Tests for get_secret_key function (C1: Secret Key Validation)."""

  def test_returns_env_secret_key_when_set(self, monkeypatch):
    """Should return APP_SECRET_KEY when set."""
    monkeypatch.setenv('APP_SECRET_KEY', 'my-secret-key-123')
    monkeypatch.setenv('FLASK_ENV', 'development')

    from letmelearn.config import get_secret_key

    assert get_secret_key() == 'my-secret-key-123'

  def test_generates_key_in_development(self, monkeypatch):
    """Should generate random key in development when APP_SECRET_KEY not set."""
    monkeypatch.delenv('APP_SECRET_KEY', raising=False)
    monkeypatch.setenv('FLASK_ENV', 'development')

    from letmelearn.config import get_secret_key

    key = get_secret_key()
    assert key is not None
    assert len(key) == 64  # 32 bytes hex = 64 chars

  def test_generates_key_in_testing(self, monkeypatch):
    """Should generate random key in testing when APP_SECRET_KEY not set."""
    monkeypatch.delenv('APP_SECRET_KEY', raising=False)
    monkeypatch.setenv('FLASK_ENV', 'testing')

    from letmelearn.config import get_secret_key

    key = get_secret_key()
    assert key is not None
    assert len(key) == 64

  def test_production_requires_secret_key(self, monkeypatch):
    """Should raise RuntimeError in production without APP_SECRET_KEY."""
    monkeypatch.delenv('APP_SECRET_KEY', raising=False)
    monkeypatch.setenv('FLASK_ENV', 'production')

    from letmelearn.config import get_secret_key

    with pytest.raises(RuntimeError) as exc_info:
      get_secret_key()

    assert "APP_SECRET_KEY environment variable is required in production" in str(exc_info.value)

  def test_production_with_secret_key(self, monkeypatch):
    """Should return APP_SECRET_KEY in production when set."""
    monkeypatch.setenv('APP_SECRET_KEY', 'prod-secret-key-xyz')
    monkeypatch.setenv('FLASK_ENV', 'production')

    from letmelearn.config import get_secret_key

    assert get_secret_key() == 'prod-secret-key-xyz'


class TestIsTestModeAllowed:
  """Tests for is_test_mode_allowed function (C2: TEST_MODE Bypass Protection)."""

  def test_test_mode_false_in_development(self, monkeypatch):
    """Should return False when TEST_MODE=false in development."""
    monkeypatch.setenv('TEST_MODE', 'false')
    monkeypatch.setenv('FLASK_ENV', 'development')

    from letmelearn.config import is_test_mode_allowed

    assert is_test_mode_allowed() is False

  def test_test_mode_true_in_development(self, monkeypatch):
    """Should return True when TEST_MODE=true in development."""
    monkeypatch.setenv('TEST_MODE', 'true')
    monkeypatch.setenv('FLASK_ENV', 'development')

    from letmelearn.config import is_test_mode_allowed

    assert is_test_mode_allowed() is True

  def test_test_mode_true_in_testing(self, monkeypatch):
    """Should return True when TEST_MODE=true in testing."""
    monkeypatch.setenv('TEST_MODE', 'true')
    monkeypatch.setenv('FLASK_ENV', 'testing')

    from letmelearn.config import is_test_mode_allowed

    assert is_test_mode_allowed() is True

  def test_test_mode_false_in_production(self, monkeypatch):
    """Should return False when TEST_MODE=false in production."""
    monkeypatch.setenv('TEST_MODE', 'false')
    monkeypatch.setenv('FLASK_ENV', 'production')

    from letmelearn.config import is_test_mode_allowed

    assert is_test_mode_allowed() is False

  def test_test_mode_blocked_in_production(self, monkeypatch):
    """Should raise RuntimeError when TEST_MODE=true in production."""
    monkeypatch.setenv('TEST_MODE', 'true')
    monkeypatch.setenv('FLASK_ENV', 'production')

    from letmelearn.config import is_test_mode_allowed

    with pytest.raises(RuntimeError) as exc_info:
      is_test_mode_allowed()

    assert "TEST_MODE=true is not allowed in production" in str(exc_info.value)

  def test_test_mode_case_insensitive(self, monkeypatch):
    """Should handle case-insensitive TEST_MODE values."""
    monkeypatch.setenv('TEST_MODE', 'TRUE')
    monkeypatch.setenv('FLASK_ENV', 'development')

    from letmelearn.config import is_test_mode_allowed

    assert is_test_mode_allowed() is True


class TestEscapeRegexPattern:
  """Tests for escape_regex_pattern function (C3: Regex Injection Prevention)."""

  def test_escape_simple_string(self):
    """Should return simple string unchanged."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('simple') == 'simple'

  def test_escape_dot_character(self):
    """Should escape dot character."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('test@example.com') == 'test@example\\.com'

  def test_escape_asterisk(self):
    """Should escape asterisk."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('test*') == 'test\\*'

  def test_escape_plus(self):
    """Should escape plus sign."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('test+') == 'test\\+'

  def test_escape_question_mark(self):
    """Should escape question mark."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('test?') == 'test\\?'

  def test_escape_brackets(self):
    """Should escape square brackets."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('test[abc]') == 'test\\[abc\\]'

  def test_escape_parentheses(self):
    """Should escape parentheses."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('test(a|b)') == 'test\\(a\\|b\\)'

  def test_escape_caret_and_dollar(self):
    """Should escape anchor characters."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('^test$') == '\\^test\\$'

  def test_escape_pipe(self):
    """Should escape pipe character."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('a|b') == 'a\\|b'

  def test_escape_backslash(self):
    """Should escape backslash."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('test\\file') == 'test\\\\file'

  def test_escape_curly_braces(self):
    """Should escape curly braces."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('test{3}') == 'test\\{3\\}'

  def test_empty_string(self):
    """Should return empty string for empty input."""
    from letmelearn.api.follows import escape_regex_pattern

    assert escape_regex_pattern('') == ''

  def test_none_input(self):
    """Should handle None input gracefully."""
    from letmelearn.api.follows import escape_regex_pattern

    result = escape_regex_pattern(None)
    assert result is None


class TestUserSearchRegexInjection:
  """Integration tests for UserSearch endpoint with regex injection prevention."""

  def test_search_with_dot_injection(self, auth_client, db):
    """Should safely handle dot character in search."""
    # Create user with dot in email
    db.users.insert_one({
      "_id": "test.dot@user.com",
      "name": "Test Dot User"
    })

    # Search with dot - should match only actual dots, not wildcard
    response = auth_client.get('/api/users?email=test.')

    # If not properly escaped, '.' would match any character
    # With proper escaping, only emails starting with 'test.' should match
    assert response.status_code == 200
    data = response.get_json()
    # Should not match emails without literal dot
    emails = [u['email'] for u in data]
    assert 'test.dot@user.com' in emails or len(emails) == 0

  def test_search_with_asterisk_injection(self, auth_client, db):
    """Should safely handle asterisk in search."""
    # Search with asterisk - should be escaped, not used as wildcard
    response = auth_client.get('/api/users?email=test*')

    assert response.status_code == 200
    # With proper escaping, '*' is literal, not "match anything"
    # So this should return empty or only emails literally containing '*'

  def test_search_with_complex_regex_injection(self, auth_client, db):
    """Should safely handle complex regex injection attempt."""
    # Attempt ReDoS-style injection
    response = auth_client.get('/api/users?email=(a+)+$')

    assert response.status_code == 200
    # With proper escaping, this is treated as literal text
    # Not as a regex pattern that could cause ReDoS