"""
Tests for database connection and migration utilities.
"""

from letmelearn.data import parse_database_name, get_migration_version


class TestParseDatabaseName:
  """Tests for MongoDB connection string database name parsing."""

  def test_standard_uri(self):
    """Standard URI with port should extract database name."""
    result = parse_database_name("mongodb://localhost:27017/letmelearn")
    assert result == "letmelearn"

  def test_standard_uri_different_db_name(self):
    """Standard URI should extract different database names."""
    result = parse_database_name("mongodb://localhost:27017/myapp")
    assert result == "myapp"

  def test_uri_with_credentials(self):
    """URI with credentials should extract database name correctly."""
    result = parse_database_name("mongodb://user:password@host:27017/mydb")
    assert result == "mydb"

  def test_uri_with_credentials_no_port(self):
    """URI with credentials and no port should extract database name."""
    result = parse_database_name("mongodb://user:pass@host/myapp")
    assert result == "myapp"

  def test_uri_with_query_parameters(self):
    """URI with query parameters should extract database name correctly."""
    result = parse_database_name(
      "mongodb://localhost/mydb?retryWrites=true&w=majority"
    )
    assert result == "mydb"

  def test_replica_set_uri(self):
    """Replica set URI should extract database name correctly."""
    result = parse_database_name(
      "mongodb://host1:27017,host2:27017,host3:27017/mydb?replicaSet=myReplicaSet"
    )
    assert result == "mydb"

  def test_srv_record_uri(self):
    """SRV record URI should extract database name correctly."""
    result = parse_database_name(
      "mongodb+srv://cluster.example.com/mydb?retryWrites=true"
    )
    assert result == "mydb"

  def test_srv_record_with_credentials(self):
    """SRV record URI with credentials should extract database name."""
    result = parse_database_name(
      "mongodb+srv://user:pass@cluster.example.com/myapp"
    )
    assert result == "myapp"

  def test_no_database_path(self):
    """URI without database path should return default name."""
    result = parse_database_name("mongodb://localhost:27017")
    assert result == "letmelearn"

  def test_no_database_path_no_port(self):
    """URI without database path and no port should return default."""
    result = parse_database_name("mongodb://localhost")
    assert result == "letmelearn"

  def test_only_host(self):
    """URI with only host should return default database name."""
    result = parse_database_name("mongodb://host")
    assert result == "letmelearn"

  def test_uri_with_slash_no_db(self):
    """URI with trailing slash but no database name should return default."""
    result = parse_database_name("mongodb://localhost:27017/")
    assert result == "letmelearn"

  def test_complex_credentials_special_chars(self):
    """URI with special characters in credentials should work."""
    result = parse_database_name(
      "mongodb://user%40domain:p%40ssw0rd@host:27017/mydb"
    )
    assert result == "mydb"

  def test_query_parameters_with_multiple_options(self):
    """URI with multiple query parameters should extract database name."""
    result = parse_database_name(
      "mongodb://localhost/mydb?retryWrites=true&w=majority&authSource=admin"
    )
    assert result == "mydb"


class TestGetMigrationVersion:
  """Tests for migration version retrieval."""

  def test_version_present(self):
    """Should return version when collection exists in versions dict."""
    versions = {"topics": 2, "users": 1}
    result = get_migration_version(versions, "topics")
    assert result == 2

  def test_version_missing(self):
    """Should return 0 when collection not in versions dict."""
    versions = {"users": 1}
    result = get_migration_version(versions, "topics")
    assert result == 0

  def test_empty_versions(self):
    """Should return 0 when versions dict is empty."""
    versions = {}
    result = get_migration_version(versions, "topics")
    assert result == 0

  def test_version_zero_explicit(self):
    """Should return 0 when version is explicitly 0."""
    versions = {"topics": 0}
    result = get_migration_version(versions, "topics")
    assert result == 0

  def test_version_one(self):
    """Should return 1 for version 1."""
    versions = {"topics": 1}
    result = get_migration_version(versions, "topics")
    assert result == 1

  def test_different_collection(self):
    """Should work for different collection names."""
    versions = {"topics": 2, "sessions": 1, "users": 3}
    result = get_migration_version(versions, "sessions")
    assert result == 1

  def test_collection_not_in_versions(self):
    """Should return 0 for unknown collection."""
    versions = {"topics": 2}
    result = get_migration_version(versions, "unknown")
    assert result == 0