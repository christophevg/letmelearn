"""
Tests for folders endpoints.

Tests folder tree management for organizing topics.
"""

from conftest import assert_rfc7807_error


class TestFoldersGet:
  """Tests for GET /api/folders - Get folder tree."""

  def test_get_folders_empty_for_new_user(self, auth_client):
    """New user should have empty folder tree."""
    response = auth_client.get('/api/folders')

    assert response.status_code == 200
    assert response.get_json() == []

  def test_get_folders_returns_tree(self, auth_client, db, test_user):
    """Should return folder tree structure."""
    # Create folders in DB using the API
    auth_client.post('/api/folders', json={"name": "First Folder"})
    auth_client.post('/api/folders', json={"name": "Second Folder"})

    response = auth_client.get('/api/folders')

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 2

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.get('/api/folders')

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)


class TestFoldersPost:
  """Tests for POST /api/folders - Create folder."""

  def test_create_root_folder(self, auth_client, db):
    """Create folder at root level."""
    response = auth_client.post('/api/folders', json={"name": "My Folder"})

    assert response.status_code == 200
    data = response.get_json()
    # Should return updated tree with new folder
    assert len(data) == 1
    assert data[0]["name"] == "My Folder"

  def test_create_multiple_folders(self, auth_client, db):
    """Creating multiple folders should work."""
    response1 = auth_client.post('/api/folders', json={"name": "Folder 1"})
    response2 = auth_client.post('/api/folders', json={"name": "Folder 2"})

    assert response1.status_code == 200
    assert response2.status_code == 200

    # Should have 2 folders
    response = auth_client.get('/api/folders')
    assert len(response.get_json()) == 2

  def test_create_folder_in_nonexistent_parent_returns_404(self, auth_client):
    """Creating folder in non-existent parent should return 404."""
    response = auth_client.post('/api/folders/nonexistent', json={"name": "Test"})

    assert response.status_code == 404
    assert_rfc7807_error(response, 'not_found', 404)

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.post('/api/folders', json={"name": "Test"})

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)


class TestFoldersDelete:
  """Tests for DELETE /api/folders/<path> - Delete folder."""

  def test_delete_folder_removes_from_tree(self, auth_client, db, test_user):
    """Delete folder should remove from tree."""
    # Create folder first
    auth_client.post('/api/folders', json={"name": "ToDelete"})

    response = auth_client.delete('/api/folders/todelete')

    assert response.status_code == 200
    data = response.get_json()
    # Tree should be empty after deletion
    assert len(data) == 0

  def test_delete_nonexistent_folder_returns_404(self, auth_client):
    """Deleting non-existent folder should return 404."""
    response = auth_client.delete('/api/folders/nonexistent')

    assert response.status_code == 404
    assert_rfc7807_error(response, 'not_found', 404)

  def test_unauthenticated_returns_401(self, client):
    """Unauthenticated request should return 401."""
    response = client.delete('/api/folders/test')

    assert response.status_code == 401
    assert_rfc7807_error(response, 'unauthorized', 401)