"""
Fortress Token Optimizer - Middleware

Request ID middleware for tracing and structured logging.
"""

import uuid
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("fortress")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Adds a unique request ID to every request/response for tracing."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 1)

        response.headers["X-Request-Id"] = request_id

        # Log request (sanitized — no auth headers or prompt content)
        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
        )

        return response
