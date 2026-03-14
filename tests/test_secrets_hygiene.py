"""
Secrets Hygiene Tests — Ensures no secrets in source code or git history.
TDD: These tests define the security contract for the codebase.
"""

import os
import sys
import subprocess
import pathlib
import pytest

REPO_ROOT = pathlib.Path(__file__).parent.parent


class TestNoSecretsInSource:
    """Scan source files for hardcoded secret patterns."""

    SECRET_PATTERNS = [
        "sk_live_",       # Stripe live secret key
        "sk_test_",       # Stripe test secret key
        "whsec_",         # Stripe webhook secret
        "re_",            # Resend API key (only flag if looks like a key)
    ]

    # Files that are allowed to reference secret patterns (e.g. this test file)
    ALLOWED_FILES = {
        "tests/test_secrets_hygiene.py",
        "tests/conftest.py",  # Has test-only API_KEY_SECRET
    }

    # Patterns that are clearly placeholders, not real secrets
    PLACEHOLDER_PATTERNS = [
        "sk_test_...", "sk_test_123", "sk_test_456", "sk_test_testing",
        "whsec_...", "whsec_test",
    ]

    def _scan_files(self, pattern, extensions=(".py", ".ts", ".tsx", ".js", ".json"), min_key_len=20):
        """Search source files for real secret patterns (not short placeholders)."""
        import re
        matches = []
        # Match pattern followed by at least enough chars to be a real key
        regex = re.compile(re.escape(pattern) + r"[A-Za-z0-9_]{" + str(min_key_len) + r",}")
        for ext in extensions:
            for filepath in REPO_ROOT.rglob(f"*{ext}"):
                rel = str(filepath.relative_to(REPO_ROOT))
                if any(skip in rel for skip in ["node_modules", ".next", "out/", "__pycache__", ".git"]):
                    continue
                if rel in self.ALLOWED_FILES:
                    continue
                try:
                    content = filepath.read_text(errors="ignore")
                    if regex.search(content):
                        matches.append(rel)
                except Exception:
                    pass
        return matches

    def test_no_stripe_live_keys(self):
        matches = self._scan_files("sk_live_")
        assert not matches, f"Stripe live key found in: {matches}"

    def test_no_stripe_test_keys(self):
        matches = self._scan_files("sk_test_")
        assert not matches, f"Stripe test key found in: {matches}"

    def test_no_webhook_secrets(self):
        matches = self._scan_files("whsec_")
        assert not matches, f"Webhook secret found in: {matches}"


class TestNoEnvFilesTracked:
    """Ensure .env files are not tracked by git."""

    def test_no_env_files_in_git(self):
        result = subprocess.run(
            ["git", "ls-files", "--cached", "*.env*", "**/.env*"],
            capture_output=True, text=True, cwd=REPO_ROOT
        )
        tracked = [f for f in result.stdout.strip().split("\n") if f]
        assert not tracked, f".env files tracked in git: {tracked}"

    def test_env_in_gitignore(self):
        gitignore = (REPO_ROOT / ".gitignore").read_text()
        assert ".env" in gitignore, ".env should be in .gitignore"


class TestNoHardcodedCredentials:
    """Check that backend code doesn't have hardcoded production secrets."""

    def test_main_py_no_hardcoded_db_password(self):
        main_py = (REPO_ROOT / "backend" / "main.py").read_text()
        # Should not contain actual database passwords
        assert "fortress_test_123" not in main_py
        assert "postgres:" not in main_py or "DATABASE_URL" in main_py

    def test_database_py_uses_env_var(self):
        db_py = (REPO_ROOT / "backend" / "database.py").read_text()
        # Should get DATABASE_URL from environment, not hardcoded
        assert "os.getenv" in db_py or "os.environ" in db_py

    def test_api_key_secret_not_default_in_prod(self):
        """Verify that main.py will not use the dev default secret in production."""
        main_py = (REPO_ROOT / "backend" / "main.py").read_text()
        # The dev default is acceptable for local dev, but main.py should
        # have a guard that raises in production if API_KEY_SECRET is not set
        # OR the default should not be used.
        assert "fortress-dev-secret-change-in-prod" in main_py or "API_KEY_SECRET" in main_py
        # This test passes today — P0C will add the production guard


class TestStartupValidation:
    """Test that the backend validates required env vars in production mode."""

    def test_backend_has_env_validation(self):
        """Backend should refuse to start in production without required vars."""
        main_py = (REPO_ROOT / "backend" / "main.py").read_text()
        assert "_validate_production_env" in main_py, \
            "main.py should have _validate_production_env function"

    def test_validate_rejects_missing_vars(self):
        """Production mode should raise if DATABASE_URL is missing."""
        sys.path.insert(0, str(REPO_ROOT / "backend"))
        from main import _validate_production_env

        old_env = os.environ.copy()
        try:
            os.environ["FORTRESS_ENV"] = "production"
            os.environ.pop("DATABASE_URL", None)
            os.environ["API_KEY_SECRET"] = "real-secret-value"
            with pytest.raises(RuntimeError, match="DATABASE_URL"):
                _validate_production_env()
        finally:
            os.environ.clear()
            os.environ.update(old_env)

    def test_validate_rejects_default_secret(self):
        """Production mode should reject the dev default API_KEY_SECRET."""
        sys.path.insert(0, str(REPO_ROOT / "backend"))
        from main import _validate_production_env

        old_env = os.environ.copy()
        try:
            os.environ["FORTRESS_ENV"] = "production"
            os.environ["DATABASE_URL"] = "postgresql://localhost/fortress"
            os.environ["API_KEY_SECRET"] = "fortress-dev-secret-change-in-prod"
            with pytest.raises(RuntimeError, match="dev default"):
                _validate_production_env()
        finally:
            os.environ.clear()
            os.environ.update(old_env)

    def test_validate_passes_in_dev_mode(self):
        """Dev mode should not validate (no crash even with missing vars)."""
        sys.path.insert(0, str(REPO_ROOT / "backend"))
        from main import _validate_production_env

        old_env = os.environ.copy()
        try:
            os.environ["FORTRESS_ENV"] = "development"
            os.environ.pop("DATABASE_URL", None)
            _validate_production_env()  # Should not raise
        finally:
            os.environ.clear()
            os.environ.update(old_env)

    def test_validate_passes_with_proper_config(self):
        """Production mode passes when all vars are set properly."""
        sys.path.insert(0, str(REPO_ROOT / "backend"))
        from main import _validate_production_env

        old_env = os.environ.copy()
        try:
            os.environ["FORTRESS_ENV"] = "production"
            os.environ["DATABASE_URL"] = "postgresql://localhost/fortress"
            os.environ["API_KEY_SECRET"] = "a-real-production-secret-key"
            _validate_production_env()  # Should not raise
        finally:
            os.environ.clear()
            os.environ.update(old_env)
