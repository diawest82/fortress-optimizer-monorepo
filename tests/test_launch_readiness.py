"""
Launch Readiness Tests — Verifies production launch requirements.
Run this as the final gate before go-live.
"""

import os
import sys
import pathlib
import re
import pytest

REPO_ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))


class TestAPIContract:
    """Test that all required endpoints exist and respond correctly."""

    def test_health_endpoint(self, client):
        assert client.get("/health").status_code == 200

    def test_pricing_public(self, client):
        resp = client.get("/api/pricing")
        assert resp.status_code == 200
        data = resp.json()
        assert "tiers" in data
        assert "free" in data["tiers"]
        assert "pro" in data["tiers"]

    def test_key_registration(self, client):
        resp = client.post("/api/keys/register", json={"name": "launch-test"})
        assert resp.status_code == 200
        assert "api_key" in resp.json()
        assert resp.json()["api_key"].startswith("fk_")

    def test_optimize_with_valid_key(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Launch readiness test prompt"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "tokens" in data
        assert data["tokens"]["savings"] >= 0

    def test_usage_with_valid_key(self, client, api_key):
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "tier" in data
        assert "tokens_optimized" in data
        assert "tokens_remaining" in data

    def test_providers_with_valid_key(self, client, api_key):
        resp = client.get("/api/providers", headers={"Authorization": f"Bearer {api_key}"})
        assert resp.status_code == 200


class TestSecurityRequirements:
    """Test security requirements for launch."""

    def test_protected_endpoints_require_auth(self, client):
        assert client.get("/api/usage").status_code == 401
        assert client.post("/api/optimize", json={"prompt": "test"}).status_code == 401
        assert client.get("/api/providers").status_code == 401

    def test_public_endpoints_no_auth(self, client):
        assert client.get("/health").status_code == 200
        assert client.get("/api/pricing").status_code == 200

    def test_cors_configured(self, client):
        resp = client.get(
            "/health",
            headers={"Origin": "https://www.fortress-optimizer.com"},
        )
        assert "access-control-allow-origin" in resp.headers

    def test_cors_rejects_unknown_origin(self, client):
        resp = client.get(
            "/health",
            headers={"Origin": "https://evil-site.com"},
        )
        assert resp.headers.get("access-control-allow-origin") != "https://evil-site.com"

    def test_request_id_on_every_response(self, client):
        resp = client.get("/health")
        assert "x-request-id" in resp.headers


class TestInfrastructureRequirements:
    """Test that infrastructure files are in place."""

    def test_ci_workflow_exists(self):
        assert (REPO_ROOT / ".github" / "workflows" / "backend-ci.yml").exists()

    def test_deploy_workflow_exists(self):
        assert (REPO_ROOT / ".github" / "workflows" / "backend-deploy.yml").exists()

    def test_dockerfile_exists(self):
        assert (REPO_ROOT / "backend" / "Dockerfile").exists()

    def test_requirements_pinned(self):
        req_file = REPO_ROOT / "backend" / "requirements.txt"
        for line in req_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("-"):
                continue
            assert "==" in line, f"Unpinned: {line}"

    def test_alembic_configured(self):
        assert (REPO_ROOT / "alembic.ini").exists()
        assert (REPO_ROOT / "backend" / "migrations" / "versions").is_dir()

    def test_gitignore_excludes_env(self):
        gitignore = REPO_ROOT / ".gitignore"
        if gitignore.exists():
            text = gitignore.read_text()
            assert ".env" in text


class TestMonthlyQuotaReady:
    """Test that monthly quota system is working."""

    def test_free_tier_has_token_limit(self, client):
        resp = client.get("/api/pricing")
        free = resp.json()["tiers"]["free"]
        assert free["tokens_per_month"] == 50000

    def test_usage_shows_monthly_fields(self, client, api_key):
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        data = resp.json()
        assert "tokens_optimized" in data
        assert "tokens_remaining" in data
        assert "reset_date" in data


class TestRateLimitingReady:
    """Test that rate limiting is functional."""

    def test_rate_limit_info_in_usage(self, client, api_key):
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        data = resp.json()
        assert "rate_limit" in data
        assert "rpm_limit" in data["rate_limit"]
        assert "rpd_limit" in data["rate_limit"]
