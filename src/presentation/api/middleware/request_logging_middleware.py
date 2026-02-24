from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware

from src.infrastructure.monitoring import get_logger, request_id_var

logger = get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())
        request_id_var.set(request_id)

        logger.info("request_started", method=request.method, path=request.url.path, request_id=request_id)

        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        logger.info(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration=duration,
            request_id=request_id,
        )

        response.headers["X-Request-ID"] = request_id
        return response
