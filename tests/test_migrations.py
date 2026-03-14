"""
Migration Tests — Tests that Alembic migrations work correctly.
"""

import os
import sys
import pathlib
import pytest

REPO_ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))


class TestAlembicSetup:
    """Test that Alembic is properly configured."""

    def test_alembic_ini_exists(self):
        assert (REPO_ROOT / "alembic.ini").exists()

    def test_migrations_directory_exists(self):
        assert (REPO_ROOT / "backend" / "migrations").is_dir()

    def test_versions_directory_has_migrations(self):
        versions = REPO_ROOT / "backend" / "migrations" / "versions"
        py_files = list(versions.glob("*.py"))
        assert len(py_files) >= 1, "No migration files found"


class TestMigrationUpgradeDowngrade:
    """Test that migrations can be applied and reverted."""

    def test_upgrade_head_succeeds(self, tmp_path):
        """Upgrade to head on a fresh database."""
        from alembic.config import Config
        from alembic import command

        db_path = tmp_path / "test_migrate.db"
        cfg = Config(str(REPO_ROOT / "alembic.ini"))
        cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")

        command.upgrade(cfg, "head")

        # Verify tables exist
        from sqlalchemy import create_engine, inspect
        engine = create_engine(f"sqlite:///{db_path}")
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "api_keys" in tables
        assert "optimization_logs" in tables
        engine.dispose()

    def test_downgrade_and_upgrade_is_idempotent(self, tmp_path):
        from alembic.config import Config
        from alembic import command

        db_path = tmp_path / "test_idem.db"
        cfg = Config(str(REPO_ROOT / "alembic.ini"))
        cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")

        command.upgrade(cfg, "head")
        command.downgrade(cfg, "base")
        command.upgrade(cfg, "head")

        from sqlalchemy import create_engine, inspect
        engine = create_engine(f"sqlite:///{db_path}")
        tables = inspect(engine).get_table_names()
        assert "api_keys" in tables
        engine.dispose()

    def test_monthly_columns_exist_after_migration(self, tmp_path):
        from alembic.config import Config
        from alembic import command

        db_path = tmp_path / "test_cols.db"
        cfg = Config(str(REPO_ROOT / "alembic.ini"))
        cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")

        command.upgrade(cfg, "head")

        from sqlalchemy import create_engine, inspect
        engine = create_engine(f"sqlite:///{db_path}")
        columns = [c["name"] for c in inspect(engine).get_columns("api_keys")]
        assert "monthly_tokens_used" in columns
        assert "monthly_reset_at" in columns
        engine.dispose()

    def test_models_match_latest_migration(self, tmp_path):
        """Verify no drift between models.py and migration head."""
        from alembic.config import Config
        from alembic import command
        from alembic.autogenerate import compare_metadata
        from alembic.runtime.migration import MigrationContext
        from sqlalchemy import create_engine
        from database import Base

        db_path = tmp_path / "test_drift.db"
        cfg = Config(str(REPO_ROOT / "alembic.ini"))
        cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")

        command.upgrade(cfg, "head")

        engine = create_engine(f"sqlite:///{db_path}")
        with engine.connect() as conn:
            mc = MigrationContext.configure(conn)
            diff = compare_metadata(mc, Base.metadata)

        # Filter out index diffs (SQLite doesn't track all index types)
        table_diffs = [d for d in diff if d[0] in ("add_table", "remove_table", "add_column", "remove_column")]
        assert len(table_diffs) == 0, f"Model/migration drift detected: {table_diffs}"
        engine.dispose()
