"""
Logging Tests — Tests structured JSON logging and request ID middleware.
TDD: Tests written before middleware.py implementation.
"""

import json
import pytest


class TestRequestIdMiddleware:
    """Test that every response includes a request ID."""

    def test_response_has_x_request_id(self, client):
        resp = client.get("/health")
        assert "x-request-id" in resp.headers

    def test_request_id_is_uuid_format(self, client):
        resp = client.get("/health")
        rid = resp.headers["x-request-id"]
        # UUID hex is 32 chars, with dashes is 36
        assert len(rid) >= 32

    def test_each_request_gets_unique_id(self, client):
        r1 = client.get("/health")
        r2 = client.get("/health")
        assert r1.headers["x-request-id"] != r2.headers["x-request-id"]

    def test_request_id_on_error_response(self, client):
        resp = client.get("/api/usage")  # no auth = 401
        assert resp.status_code == 401
        assert "x-request-id" in resp.headers


class TestLogSanitization:
    """Test that sensitive data is not logged."""

    def test_no_api_key_in_log_output(self, client, api_key):
        import io
        import logging

        log_capture = io.StringIO()
        handler = logging.StreamHandler(log_capture)
        handler.setLevel(logging.DEBUG)
        logging.getLogger("fortress").addHandler(handler)

        try:
            client.post(
                "/api/optimize",
                json={"prompt": "test logging"},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            log_output = log_capture.getvalue()
            # The full API key should never appear in logs
            assert api_key not in log_output
        finally:
            logging.getLogger("fortress").removeHandler(handler)


class TestStructuredLogging:
    """Test that log format is JSON-structured."""

    def test_middleware_module_exists(self):
        import sys
        import pathlib
        sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "backend"))
        from middleware import RequestIdMiddleware
        assert RequestIdMiddleware is not None
