"""
Schema validation helper for OpenAPI contract testing.

This module provides utilities to validate API responses against
the OpenAPI specification defined in docs/openapi.yaml.

Usage:
    from tests.helpers.schema_validator import validate_response

    def test_get_folders(auth_client):
        response = auth_client.get('/api/folders')
        assert response.status_code == 200
        validate_response('/folders', 'GET', 200, response.get_json())
"""

import yaml
import jsonschema
from pathlib import Path
from functools import lru_cache
from jsonschema.validators import validator_for


# Path to OpenAPI specification
OPENAPI_PATH = Path(__file__).parent.parent.parent / 'docs' / 'openapi.yaml'


@lru_cache(maxsize=1)
def load_openapi_spec():
  """Load and cache the OpenAPI specification."""
  with open(OPENAPI_PATH) as f:
    return yaml.safe_load(f)


def _resolve_refs(schema, spec, seen=None):
  """Recursively resolve $ref references in a schema.

  OpenAPI uses $ref to reference components. This function expands
  those references inline so jsonschema can validate properly.

  Args:
    schema: Schema dict that may contain $ref
    spec: Full OpenAPI spec (for resolving references)
    seen: Set of already resolved refs (prevents infinite recursion)

  Returns:
    Schema with all $ref references expanded.
  """
  if seen is None:
    seen = set()

  if isinstance(schema, dict):
    if '$ref' in schema:
      ref_path = schema['$ref']
      # Prevent infinite recursion for circular references
      if ref_path in seen:
        return schema  # Return the ref as-is for circular refs
      seen.add(ref_path)

      # Parse the reference: "#/components/schemas/User"
      if ref_path.startswith('#/'):
        parts = ref_path[2:].split('/')
        resolved = spec
        for part in parts:
          resolved = resolved.get(part, {})
        return _resolve_refs(resolved, spec, seen)
      return schema
    return {k: _resolve_refs(v, spec, seen.copy()) for k, v in schema.items()}
  elif isinstance(schema, list):
    return [_resolve_refs(item, spec, seen.copy()) for item in schema]
  return schema


def get_response_schema(endpoint, method, status_code):
  """Get the response schema for an endpoint/method/status combination.

  Args:
    endpoint: API endpoint path (e.g., '/folders', '/topics/{id}')
    method: HTTP method (e.g., 'GET', 'POST')
    status_code: HTTP status code as integer (e.g., 200, 404)

  Returns:
    JSON Schema dict (with refs resolved) or None if no schema defined.

  Raises:
    ValueError: If endpoint or method not found in spec.
  """
  spec = load_openapi_spec()

  # Normalize endpoint (remove /api prefix if present)
  if endpoint.startswith('/api/'):
    endpoint = endpoint[4:]

  # Get path spec
  paths = spec.get('paths', {})
  if endpoint not in paths:
    raise ValueError(f"Endpoint '{endpoint}' not found in OpenAPI spec")

  path_spec = paths[endpoint]
  method_lower = method.lower()

  if method_lower not in path_spec:
    raise ValueError(f"Method '{method}' not found for endpoint '{endpoint}'")

  method_spec = path_spec[method_lower]
  responses = method_spec.get('responses', {})

  status_str = str(status_code)
  if status_str not in responses:
    return None

  response_spec = responses[status_str]
  content = response_spec.get('content', {})
  json_content = content.get('application/json', {})
  schema = json_content.get('schema')

  if schema is None:
    return None

  # Resolve $ref references
  return _resolve_refs(schema, spec)


def validate_response(endpoint, method, status_code, response_data):
  """Validate response data against OpenAPI schema.

  Args:
    endpoint: API endpoint path (e.g., '/folders')
    method: HTTP method (e.g., 'GET')
    status_code: HTTP status code (e.g., 200)
    response_data: Parsed JSON response data

  Raises:
    jsonschema.ValidationError: If response doesn't match schema.
    ValueError: If schema not found for endpoint/method/status.
  """
  schema = get_response_schema(endpoint, method, status_code)

  if schema is None:
    # No schema defined - skip validation
    return

  # Use the appropriate validator for the schema version
  validator_cls = validator_for(schema)
  validator = validator_cls(schema)
  validator.validate(response_data)


def assert_valid_response(response, endpoint, method=None, status_code=None):
  """Convenience function to validate a Flask test response.

  Args:
    response: Flask test response object
    endpoint: API endpoint path
    method: HTTP method (default: response.request.method)
    status_code: Expected status code (default: response.status_code)

  Raises:
    AssertionError: If status code doesn't match
    jsonschema.ValidationError: If response doesn't match schema
  """
  if method is None:
    method = response.request.method

  if status_code is not None:
    assert response.status_code == status_code, \
      f"Expected status {status_code}, got {response.status_code}"
    validate_code = status_code
  else:
    validate_code = response.status_code

  data = response.get_json()
  if data is not None:
    validate_response(endpoint, method, validate_code, data)


# Pre-defined validators for common response types

def validate_user_schema(data):
  """Validate User schema."""
  validate_response('/session', 'GET', 200, data)


def validate_treeitem_array(data):
  """Validate TreeItem array schema."""
  validate_response('/folders', 'GET', 200, data)


def validate_topic_array(data):
  """Validate Topic array schema."""
  validate_response('/topics', 'GET', 200, data)


def validate_feeditem_array(data):
  """Validate FeedItem array schema."""
  validate_response('/feed', 'GET', 200, data)


def validate_streakstats(data):
  """Validate StreakStats schema."""
  validate_response('/stats/streak', 'GET', 200, data)


def validate_weeklystats(data):
  """Validate WeeklyStats schema."""
  validate_response('/stats/weekly', 'GET', 200, data)


def validate_followeduser_array(data):
  """Validate FollowedUser array schema."""
  validate_response('/following', 'GET', 200, data)


def validate_followeruser_array(data):
  """Validate FollowerUser array schema."""
  validate_response('/followers', 'GET', 200, data)


def validate_error_response(data):
  """Validate RFC 7807 Error schema."""
  # Common error schema - use 401 as example endpoint
  validate_response('/folders', 'GET', 401, data)