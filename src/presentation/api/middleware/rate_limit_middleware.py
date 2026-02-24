from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 120) -> None:
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.storage: dict[str, list[float]] = {}

    async def dispatch(self, request, call_next):
        key = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - 60

        history = [ts for ts in self.storage.get(key, []) if ts >= window_start]
        if len(history) >= self.requests_per_minute:
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})

        history.append(now)
        self.storage[key] = history
        return await call_next(request)
