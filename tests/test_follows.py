"""
Tests for follow relationship endpoints.
"""

import pytest
from datetime import datetime


class TestFollowingPost:
    """Tests for POST /api/following/{email} endpoint."""

    def test_follow_user_returns_201(self, auth_client, db):
        """Following a user should return 201."""
        # Create user to follow
        db.users.insert_one({
            "_id": "target@example.com",
            "name": "Target User",
            "picture": "https://example.com/target.jpg"
        })

        response = auth_client.post('/api/following/target@example.com')

        assert response.status_code == 201
        data = response.get_json()
        assert data['following']['email'] == 'target@example.com'
        assert data['following']['name'] == 'Target User'
        assert 'created_at' in data

    def test_follow_user_creates_relationship(self, auth_client, db):
        """Following a user should create a relationship in the database."""
        # Create user to follow
        db.users.insert_one({
            "_id": "target@example.com",
            "name": "Target User",
            "picture": "https://example.com/target.jpg"
        })

        auth_client.post('/api/following/target@example.com')

        follow = db.follows.find_one({
            "follower": "test@example.com",
            "following": "target@example.com"
        })

        assert follow is not None
        assert follow['created_at'] is not None

    def test_follow_already_following_returns_200(self, auth_client, db):
        """Following a user already followed should return 200."""
        # Create user to follow
        db.users.insert_one({
            "_id": "target@example.com",
            "name": "Target User",
            "picture": "https://example.com/target.jpg"
        })

        # Follow once
        auth_client.post('/api/following/target@example.com')

        # Follow again
        response = auth_client.post('/api/following/target@example.com')

        assert response.status_code == 200
        data = response.get_json()
        assert data['following']['email'] == 'target@example.com'

    def test_follow_self_returns_400(self, auth_client):
        """Following yourself should return 400."""
        response = auth_client.post('/api/following/test@example.com')

        assert response.status_code == 400
        # Flask abort returns 'message' or 'error' depending on configuration
        data = response.get_json()
        assert 'yourself' in (data.get('error') or data.get('message') or '').lower()

    def test_follow_nonexistent_user_returns_404(self, auth_client):
        """Following a non-existent user should return 404."""
        response = auth_client.post('/api/following/nonexistent@example.com')

        assert response.status_code == 404

    def test_unauthenticated_request_rejected(self, client):
        """Unauthenticated requests should be rejected."""
        response = client.post('/api/following/target@example.com')

        assert response.status_code == 401


class TestFollowingDelete:
    """Tests for DELETE /api/following/{email} endpoint."""

    def test_unfollow_user_returns_200(self, auth_client, db):
        """Unfollowing a user should return 200."""
        # Create user and follow them
        db.users.insert_one({
            "_id": "target@example.com",
            "name": "Target User",
            "picture": "https://example.com/target.jpg"
        })
        db.follows.insert_one({
            "follower": "test@example.com",
            "following": "target@example.com",
            "created_at": datetime.utcnow()
        })

        response = auth_client.delete('/api/following/target@example.com')

        assert response.status_code == 200
        data = response.get_json()
        assert data['removed'] is True

    def test_unfollow_removes_relationship(self, auth_client, db):
        """Unfollowing should remove the relationship from the database."""
        # Create user and follow them
        db.users.insert_one({
            "_id": "target@example.com",
            "name": "Target User"
        })
        db.follows.insert_one({
            "follower": "test@example.com",
            "following": "target@example.com",
            "created_at": datetime.utcnow()
        })

        auth_client.delete('/api/following/target@example.com')

        follow = db.follows.find_one({
            "follower": "test@example.com",
            "following": "target@example.com"
        })

        assert follow is None

    def test_unfollow_not_following_returns_200(self, auth_client):
        """Unfollowing a user not followed should return 200 with removed=False."""
        response = auth_client.delete('/api/following/target@example.com')

        assert response.status_code == 200
        data = response.get_json()
        assert data['removed'] is False


class TestFollowingGet:
    """Tests for GET /api/following endpoint."""

    def test_get_following_empty(self, auth_client):
        """Getting following list when empty should return empty array."""
        response = auth_client.get('/api/following')

        assert response.status_code == 200
        data = response.get_json()
        assert data == []

    def test_get_following_returns_list(self, auth_client, db):
        """Getting following list should return users with details."""
        # Create users to follow
        db.users.insert_many([
            {"_id": "user1@example.com", "name": "User One", "picture": "https://example.com/1.jpg"},
            {"_id": "user2@example.com", "name": "User Two", "picture": "https://example.com/2.jpg"}
        ])

        # Create follow relationships
        db.follows.insert_many([
            {"follower": "test@example.com", "following": "user1@example.com", "created_at": datetime(2026, 4, 1, 10, 0, 0)},
            {"follower": "test@example.com", "following": "user2@example.com", "created_at": datetime(2026, 4, 2, 10, 0, 0)}
        ])

        response = auth_client.get('/api/following')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 2
        # Most recent first
        assert data[0]['email'] == 'user2@example.com'
        assert data[1]['email'] == 'user1@example.com'

    def test_unauthenticated_request_rejected(self, client):
        """Unauthenticated requests should be rejected."""
        response = client.get('/api/following')

        assert response.status_code == 401


class TestFollowersGet:
    """Tests for GET /api/followers endpoint."""

    def test_get_followers_empty(self, auth_client):
        """Getting followers list when empty should return empty array."""
        response = auth_client.get('/api/followers')

        assert response.status_code == 200
        data = response.get_json()
        assert data == []

    def test_get_followers_returns_list(self, auth_client, db):
        """Getting followers list should return users with details."""
        # Create follower users
        db.users.insert_many([
            {"_id": "follower1@example.com", "name": "Follower One", "picture": "https://example.com/f1.jpg"},
            {"_id": "follower2@example.com", "name": "Follower Two", "picture": "https://example.com/f2.jpg"}
        ])

        # Create follow relationships (they follow test@example.com)
        db.follows.insert_many([
            {"follower": "follower1@example.com", "following": "test@example.com", "created_at": datetime(2026, 4, 1, 10, 0, 0)},
            {"follower": "follower2@example.com", "following": "test@example.com", "created_at": datetime(2026, 4, 2, 10, 0, 0)}
        ])

        response = auth_client.get('/api/followers')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 2
        # Most recent first
        assert data[0]['email'] == 'follower2@example.com'
        assert data[1]['email'] == 'follower1@example.com'

    def test_unauthenticated_request_rejected(self, client):
        """Unauthenticated requests should be rejected."""
        response = client.get('/api/followers')

        assert response.status_code == 401