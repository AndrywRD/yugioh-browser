from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware


class AuthMiddleware(BaseHTTPMiddleware):
    """Placeholder middleware for custom auth hooks."""

    async def dispatch(self, request, call_next):
        return await call_next(request)
