"""
Shared pytest fixtures for Fortress Optimizer test suite.

Provides a FastAPI TestClient backed by an in-memory SQLite database,
so tests run without a live server or external database.
"""

import os
import sys
import pathlib
import pytest
import pytest_asyncio

# Force test environment BEFORE any app imports
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_fortress_shared.db")
os.environ.setdefault("API_KEY_SECRET", "test-secret-key-for-ci")
os.environ.pop("FORTRESS_ENV", None)

# Add backend to path
BACKEND_DIR = str(pathlib.Path(__file__).parent.parent / "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import database
import models  # noqa: F401
from main import app
from fastapi.testclient import TestClient

# Create a test engine specific to this conftest
_TEST_DB_PATH = pathlib.Path("./test_fortress_shared.db")
_TEST_DB_URL = f"sqlite:///{_TEST_DB_PATH}"
_test_engine = create_engine(_TEST_DB_URL, connect_args={"check_same_thread": False})
_TestSession = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)


def _override_get_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


def _reset_main_module_state():
    """Reset module-level rate-limit + tracking state in main.py.

    Without this, the in-memory rate limiter, registration tracker, and
    key-sharing detector accumulate state across the test session and
    cause cascading 429s. Test isolation requires resetting them before
    every test, regardless of which test file we're in.
    """
    import main
    if hasattr(main, "_registration_tracker"):
        main._registration_tracker.clear()
    if hasattr(main, "rate_limiter"):
        rl = main.rate_limiter
        if hasattr(rl, "_minute_buckets"):
            rl._minute_buckets.clear()
        if hasattr(rl, "_day_buckets"):
            rl._day_buckets.clear()
    if hasattr(main, "key_sharing_detector") and hasattr(main.key_sharing_detector, "_tracking"):
        main.key_sharing_detector._tracking.clear()


@pytest.fixture(autouse=True)
def _setup_test_db(request):
    """Create tables before each test, drop after. Only for tests/ directory."""
    # Always reset rate-limit/tracking state, regardless of test file
    _reset_main_module_state()

    # Skip in live mode — when hitting a real server we don't touch the local DB
    if os.environ.get("FORTRESS_TEST_URL"):
        yield
        return
    # Skip for backend/ tests and migration tests which have their own setup
    test_path = str(request.fspath)
    if os.sep + "backend" + os.sep in test_path or test_path.endswith("backend/test_api.py"):
        yield
        return
    if "test_migrations" in test_path:
        yield
        return

    # Patch database module for this test
    original_engine = database.engine
    original_session = database.SessionLocal
    original_get_db = database.get_db

    database.engine = _test_engine
    database.SessionLocal = _TestSession
    database.get_db = _override_get_db
    app.dependency_overrides[original_get_db] = _override_get_db

    _TEST_DB_PATH.unlink(missing_ok=True)
    _test_engine.dispose()
    database.Base.metadata.create_all(bind=_test_engine)

    yield

    database.Base.metadata.drop_all(bind=_test_engine)
    _test_engine.dispose()
    _TEST_DB_PATH.unlink(missing_ok=True)

    # Restore originals
    database.engine = original_engine
    database.SessionLocal = original_session
    database.get_db = original_get_db
    if original_get_db in app.dependency_overrides:
        del app.dependency_overrides[original_get_db]


@pytest.fixture
def client():
    """HTTP client — defaults to FastAPI TestClient (no live server needed).

    Default mode: returns TestClient(app). Tests run against the in-process
    FastAPI app with an isolated in-memory SQLite database. Fast, no network,
    safe for CI. This is what runs in backend-ci.yml and backend-deploy.yml.

    Live mode: set FORTRESS_TEST_URL=https://api.example.com to make the
    same tests hit a real server (httpx.Client). Used for manual post-deploy
    smoke verification. Requires the live server to be running and reachable.

    Test code uses the same `.get(path)` / `.post(path, json=...)` API in
    both modes — TestClient is httpx-compatible.
    """
    live_url = os.environ.get("FORTRESS_TEST_URL")
    if live_url:
        import httpx
        with httpx.Client(base_url=live_url, timeout=15.0) as c:
            yield c
    else:
        yield TestClient(app)


@pytest_asyncio.fixture
async def async_client():
    """Async HTTP client — for concurrency / load tests.

    Default mode: httpx.AsyncClient with ASGITransport bound to the
    in-process FastAPI app. Real concurrency at the FastAPI layer (no
    network), so concurrency-correctness tests like "50 simultaneous
    requests should produce 50 unique request_ids" still run in CI.

    Live mode: when FORTRESS_TEST_URL is set, hits the live server and
    measures real network concurrency.

    Note: must use @pytest_asyncio.fixture, not @pytest.fixture, because
    pytest-asyncio 0.21.x requires the explicit decorator for async
    fixtures. With @pytest.fixture the yield turns into an async_generator
    that the test sees as a non-awaitable object → "AttributeError:
    'async_generator' object has no attribute 'post'".

    Tests using it must be `async def` and decorated with `@pytest.mark.asyncio`.
    """
    import httpx
    live_url = os.environ.get("FORTRESS_TEST_URL")
    if live_url:
        async with httpx.AsyncClient(base_url=live_url, timeout=30.0) as c:
            yield c
    else:
        from httpx import ASGITransport
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver", timeout=30.0) as c:
            yield c


@pytest.fixture
def api_key(client):
    """Register and return a fresh API key."""
    resp = client.post("/api/keys/register", json={"name": "test-key", "tier": "free"})
    assert resp.status_code == 200
    return resp.json()["api_key"]


@pytest.fixture
def pro_key(client):
    """Create a pro-tier API key directly in DB (bypasses self-service free-only restriction)."""
    import uuid, hashlib
    from main import API_KEY_SECRET
    from models import ApiKey

    raw_key = f"fk_{uuid.uuid4().hex}"
    key_hash = hashlib.sha256(f"{API_KEY_SECRET}:{raw_key}".encode()).hexdigest()
    db = _TestSession()
    db.add(ApiKey(key_hash=key_hash, name="pro-key", tier="pro"))
    db.commit()
    db.close()
    return raw_key


@pytest.fixture
def auth_headers(api_key):
    """Bearer auth headers for the default test key."""
    return {"Authorization": f"Bearer {api_key}"}
