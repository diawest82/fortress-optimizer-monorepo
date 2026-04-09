"""
CI Contract Tests — Verify that CI infrastructure requirements are met.
TDD: Tests written before backend-ci.yml implementation.
"""

import pathlib
import re

import pytest

REPO_ROOT = pathlib.Path(__file__).parent.parent


class TestRequirements:
    """Test that requirements.txt is valid and pinned."""

    def test_requirements_file_exists(self):
        assert (REPO_ROOT / "backend" / "requirements.txt").exists()

    def test_all_packages_are_pinned(self):
        req_file = REPO_ROOT / "backend" / "requirements.txt"
        for line in req_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("-"):
                continue
            has_pin = any(op in line for op in ("==", ">=", "~="))
            assert has_pin, f"Unpinned dependency: {line}"

    def test_pytest_in_requirements(self):
        text = (REPO_ROOT / "backend" / "requirements.txt").read_text()
        assert "pytest" in text


class TestCIWorkflow:
    """Test that the backend CI workflow exists and has required steps."""

    def test_backend_ci_workflow_exists(self):
        ci = REPO_ROOT / ".github" / "workflows" / "backend-ci.yml"
        assert ci.exists(), "Missing .github/workflows/backend-ci.yml"

    def test_ci_runs_pytest(self):
        ci = REPO_ROOT / ".github" / "workflows" / "backend-ci.yml"
        text = ci.read_text()
        assert "pytest" in text

    def test_ci_has_coverage_gate(self):
        ci = REPO_ROOT / ".github" / "workflows" / "backend-ci.yml"
        text = ci.read_text()
        assert "cov-fail-under" in text or "coverage" in text.lower()

    def test_ci_uses_python_311(self):
        ci = REPO_ROOT / ".github" / "workflows" / "backend-ci.yml"
        text = ci.read_text()
        assert "3.11" in text

    def test_ci_triggers_on_pr(self):
        ci = REPO_ROOT / ".github" / "workflows" / "backend-ci.yml"
        text = ci.read_text()
        assert "pull_request" in text


class TestDeployWorkflow:
    """Test that deploy workflows have test gates."""

    def test_backend_deploy_workflow_exists(self):
        deploy = REPO_ROOT / ".github" / "workflows" / "backend-deploy.yml"
        assert deploy.exists()

    def test_backend_deploy_runs_tests_first(self):
        deploy = REPO_ROOT / ".github" / "workflows" / "backend-deploy.yml"
        text = deploy.read_text()
        assert "pytest" in text
        assert "needs: test" in text

    def test_vercel_deploy_has_test_step(self):
        """Tests run pre-merge in website-pr.yml; deploy runs post-deploy QA."""
        pr = REPO_ROOT / ".github" / "workflows" / "website-pr.yml"
        assert pr.exists(), "Missing website-pr.yml (pre-merge test gate)"
        pr_text = pr.read_text()
        assert "npm test" in pr_text or "jest" in pr_text.lower()
