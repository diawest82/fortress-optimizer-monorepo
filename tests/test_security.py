"""
Test Suite: Security & Input Fuzzing
Tests that the production API gracefully handles malicious/malformed inputs.
Run against live server:
    FORTRESS_TEST_URL=http://myp-zwp-lb-598798440.us-east-1.elb.amazonaws.com \
    pytest tests/test_security.py -v
"""

import os
import json
import pytest
import httpx

pytestmark = pytest.mark.skipif(
    not os.environ.get("FORTRESS_TEST_URL"),
    reason="Requires live server (set FORTRESS_TEST_URL)"
)

BASE_URL = os.getenv(
    "FORTRESS_TEST_URL",
    "http://myp-zwp-lb-598798440.us-east-1.elb.amazonaws.com",
)


@pytest.fixture(scope="module")
def client():
    return httpx.Client(base_url=BASE_URL, timeout=15.0)


@pytest.fixture(scope="module")
def api_key(client):
    """Register a fresh API key for authenticated tests."""
    resp = client.post("/api/keys/register", json={"name": "security-fuzz-test", "tier": "free"})
    assert resp.status_code == 200, f"Key registration failed: {resp.text}"
    key = resp.json()["api_key"]
    assert key.startswith("fk_")
    return key


def auth(key):
    return {"Authorization": f"Bearer {key}"}


def optimize(client, key, prompt):
    """Helper: POST /api/optimize with the given prompt."""
    return client.post(
        "/api/optimize",
        json={"prompt": prompt, "model": "gpt-4"},
        headers=auth(key),
    )


# ─── 1. SQL Injection in Prompt ──────────────────────────────────────────────


SQL_INJECTIONS = [
    "'; DROP TABLE api_keys; --",
    '" OR 1=1 --',
    "UNION SELECT * FROM api_keys",
    "1; UPDATE api_keys SET tier='enterprise' WHERE 1=1; --",
    "Robert'); DROP TABLE api_keys;--",
]


class TestSQLInjection:
    """Verify SQL injection payloads in prompts are processed normally."""

    @pytest.mark.parametrize("payload", SQL_INJECTIONS)
    def test_sql_injection_in_prompt(self, client, api_key, payload):
        resp = optimize(client, api_key, payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["status"] == "success"


# ─── 2. XSS Payloads ────────────────────────────────────────────────────────


XSS_PAYLOADS = [
    "<script>alert('xss')</script>",
    '<img onerror=alert(1) src="x">',
    "<svg onload=alert(1)>",
    "javascript:alert(document.cookie)",
    '<div style="background:url(javascript:alert(1))">',
]


class TestXSS:
    """Verify XSS payloads don't reflect unescaped HTML in responses."""

    @pytest.mark.parametrize("payload", XSS_PAYLOADS)
    def test_xss_in_prompt(self, client, api_key, payload):
        resp = optimize(client, api_key, payload)
        assert resp.status_code == 200
        body = resp.text
        # The raw script tag should not appear unescaped in non-prompt fields
        # (it may appear in optimized_prompt/original_prompt since that's the user's input)
        data = resp.json()
        # Script tags should not appear in non-prompt metadata fields
        for field in ("request_id", "status", "technique", "timestamp"):
            if field in data:
                assert "<script>" not in str(data[field]), (
                    f"Unescaped <script> found in response field '{field}'"
                )


# ─── 3. Null Bytes and Control Characters ────────────────────────────────────


CONTROL_CHAR_PROMPTS = [
    "Hello\x00World",
    "Line1\r\nLine2\r\nLine3",
    "Tabs\there\tand\there",
    "Mixed\x00\r\n\t\x01\x02\x03control",
    "Null at end\x00",
]


class TestControlChars:
    """Verify null bytes and control characters don't crash the API."""

    @pytest.mark.parametrize("payload", CONTROL_CHAR_PROMPTS)
    def test_control_chars_in_prompt(self, client, api_key, payload):
        resp = optimize(client, api_key, payload)
        assert resp.status_code in (200, 400, 422), (
            f"Unexpected status {resp.status_code} for control char input"
        )


# ─── 4. Oversized Unicode ────────────────────────────────────────────────────


UNICODE_PROMPTS = [
    # Emoji spam
    "\U0001F600" * 500,
    # RTL override characters
    "\u202E" + "This text is reversed" + "\u202C",
    # Zero-width joiners
    "a\u200Db\u200Dc\u200Dd\u200De" * 100,
    # Combining diacriticals (Zalgo text)
    "".join(chr(0x0300 + i % 112) for i in range(200)),
    # Mixed emoji + ZWJ sequences
    "\U0001F468\u200D\U0001F469\u200D\U0001F467\u200D\U0001F466" * 50,
    # Byte-order marks
    "\uFEFF" * 100 + "actual prompt",
]


class TestOversizedUnicode:
    """Verify exotic Unicode doesn't crash the API."""

    @pytest.mark.parametrize("payload", UNICODE_PROMPTS)
    def test_unicode_prompt(self, client, api_key, payload):
        resp = optimize(client, api_key, payload)
        assert resp.status_code in (200, 400, 422), (
            f"Unexpected status {resp.status_code} for unicode input"
        )


# ─── 5. Header Injection ────────────────────────────────────────────────────


class TestHeaderInjection:
    """Verify header injection via API key value is not possible."""

    def test_crlf_in_api_key(self, client):
        """API key containing CRLF should be rejected at client or server level."""
        injected_key = "fk_test\r\nX-Injected: true"
        try:
            resp = client.post(
                "/api/optimize",
                json={"prompt": "test prompt", "model": "gpt-4"},
                headers={"Authorization": f"Bearer {injected_key}"},
            )
            # If it reaches the server, should be rejected
            assert resp.status_code in (400, 401, 403, 422)
        except (httpx.LocalProtocolError, httpx.InvalidURL):
            # HTTP client correctly rejects illegal header — this is safe
            pass

    def test_null_byte_in_api_key(self, client):
        try:
            resp = client.post(
                "/api/optimize",
                json={"prompt": "test", "model": "gpt-4"},
                headers={"Authorization": "Bearer fk_\x00malicious"},
            )
            assert resp.status_code in (400, 401, 403, 422)
        except (httpx.LocalProtocolError, httpx.InvalidURL):
            pass


# ─── 6. Auth Bypass Attempts ────────────────────────────────────────────────


class TestAuthBypass:
    """Verify various authentication bypass attempts are rejected."""

    def test_empty_bearer_token(self, client):
        try:
            resp = client.post(
                "/api/optimize",
                json={"prompt": "test", "model": "gpt-4"},
                headers={"Authorization": "Bearer "},
            )
            assert resp.status_code in (401, 403, 422)
        except (httpx.LocalProtocolError, httpx.InvalidURL):
            pass

    def test_bearer_with_spaces(self, client):
        try:
            resp = client.post(
                "/api/optimize",
                json={"prompt": "test", "model": "gpt-4"},
                headers={"Authorization": "Bearer    "},
            )
            assert resp.status_code in (401, 403, 422)
        except (httpx.LocalProtocolError, httpx.InvalidURL):
            pass

    def test_no_auth_header(self, client):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test", "model": "gpt-4"},
        )
        assert resp.status_code in (401, 403, 422)

    def test_wrong_auth_scheme(self, client):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test", "model": "gpt-4"},
            headers={"Authorization": "Basic dXNlcjpwYXNz"},
        )
        assert resp.status_code in (401, 403, 422)

    def test_extremely_long_api_key(self, client):
        """10KB API key should be rejected without crashing."""
        long_key = "fk_" + "a" * 10240
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test", "model": "gpt-4"},
            headers={"Authorization": f"Bearer {long_key}"},
        )
        assert resp.status_code in (400, 401, 403, 413, 422)

    def test_bearer_case_sensitivity(self, client, api_key):
        """'bearer' (lowercase) may or may not be accepted — just shouldn't crash."""
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test", "model": "gpt-4"},
            headers={"Authorization": f"bearer {api_key}"},
        )
        assert resp.status_code in (200, 401, 403, 422)


# ─── 7. Request Body Attacks ────────────────────────────────────────────────


class TestRequestBodyAttacks:
    """Verify malformed request bodies are handled gracefully."""

    def test_deeply_nested_json(self, client, api_key):
        """Deeply nested JSON should not cause stack overflow."""
        # Build 200-level deep nested dict
        payload = {"prompt": "test", "model": "gpt-4"}
        nested = payload
        for i in range(200):
            nested["nested"] = {"level": i}
            nested = nested["nested"]
        resp = client.post(
            "/api/optimize",
            json=payload,
            headers=auth(api_key),
        )
        # Should either process or reject, not crash
        assert resp.status_code in (200, 400, 413, 422)

    def test_oversized_json_body(self, client, api_key):
        """1MB+ JSON body should be rejected or handled."""
        large_prompt = "A" * (1024 * 1024)  # 1MB
        resp = client.post(
            "/api/optimize",
            json={"prompt": large_prompt, "model": "gpt-4"},
            headers=auth(api_key),
        )
        assert resp.status_code in (200, 400, 413, 422)

    def test_non_json_content_type(self, client, api_key):
        """Sending non-JSON with application/xml content-type."""
        resp = client.post(
            "/api/optimize",
            content=b"<xml>not json</xml>",
            headers={
                **auth(api_key),
                "Content-Type": "application/xml",
            },
        )
        assert resp.status_code in (400, 415, 422)

    def test_missing_content_type(self, client, api_key):
        """Sending JSON without Content-Type header."""
        resp = client.post(
            "/api/optimize",
            content=json.dumps({"prompt": "test", "model": "gpt-4"}).encode(),
            headers={
                **auth(api_key),
                "Content-Type": "",
            },
        )
        # Should reject or handle gracefully
        assert resp.status_code in (200, 400, 415, 422)

    def test_empty_body(self, client, api_key):
        """Empty request body."""
        resp = client.post(
            "/api/optimize",
            content=b"",
            headers={
                **auth(api_key),
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code in (400, 422)

    def test_array_instead_of_object(self, client, api_key):
        """JSON array instead of object."""
        resp = client.post(
            "/api/optimize",
            content=b'[{"prompt": "test"}]',
            headers={
                **auth(api_key),
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code in (400, 422)


# ─── 8. API Key Leakage in Prompt ────────────────────────────────────────────


class TestAPIKeyLeakage:
    """Verify that an API key in a prompt doesn't leak into metadata fields."""

    def test_key_in_prompt_not_in_metadata(self, client, api_key):
        """If a user accidentally puts their API key in a prompt, it should
        only appear in prompt-related fields, not in metadata/logging fields."""
        prompt_with_key = f"Please use this key: {api_key} to authenticate"
        resp = optimize(client, api_key, prompt_with_key)
        assert resp.status_code == 200
        data = resp.json()

        # Key should not appear in metadata-only fields
        metadata_fields = ("request_id", "status", "technique", "timestamp")
        for field in metadata_fields:
            if field in data:
                assert api_key not in str(data[field]), (
                    f"API key leaked into metadata field '{field}'"
                )
        # Verify the tokens dict doesn't contain the key text
        if "tokens" in data:
            assert api_key not in str(data["tokens"])
