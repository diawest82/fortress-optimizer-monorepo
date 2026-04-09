"""
Health Endpoint Tests — Tests enhanced health check with DB status.
TDD: Tests written before health endpoint enhancement.
"""

import pytest


class TestHealthEndpoint:
    """Test the /health endpoint behavior."""

    def test_health_returns_200_when_healthy(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

    def test_health_includes_version(self, client):
        from main import app
        resp = client.get("/health")
        data = resp.json()
        assert "version" in data
        assert data["version"] == app.version

    def test_health_includes_database_status(self, client):
        resp = client.get("/health")
        data = resp.json()
        assert "database" in data
        assert data["database"] in ["connected", "disconnected"]

    def test_health_includes_timestamp(self, client):
        resp = client.get("/health")
        data = resp.json()
        assert "timestamp" in data

    def test_health_returns_503_when_db_down(self, client):
        """When DB is unreachable, health should return 503."""
        from unittest.mock import MagicMock
        from main import app, health_check
        import inspect

        def broken_get_db():
            mock_session = MagicMock()
            mock_session.execute.side_effect = Exception("DB unreachable")
            try:
                yield mock_session
            finally:
                pass

        # Get the actual function reference used in Depends(get_db)
        dep_func = inspect.signature(health_check).parameters["db"].default.dependency

        saved_overrides = dict(app.dependency_overrides)
        app.dependency_overrides[dep_func] = broken_get_db

        try:
            resp = client.get("/health")
            assert resp.status_code == 503
            assert resp.json()["database"] == "disconnected"
            assert resp.json()["status"] == "degraded"
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(saved_overrides)
