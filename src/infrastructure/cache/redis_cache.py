from __future__ import annotations

import hashlib
import json
import time
from functools import wraps
from typing import Any, Callable

import redis

from src.infrastructure.monitoring.logger import get_logger
from src.shared.config import get_settings

logger = get_logger()


class InMemoryCache:
    def __init__(self) -> None:
        self._data: dict[str, tuple[Any, float | None]] = {}

    def get(self, key: str) -> Any:
        item = self._data.get(key)
        if item is None:
            return None
        value, expiration = item
        if expiration is not None and expiration < time.time():
            del self._data[key]
            return None
        return value

    def setex(self, key: str, ttl: int, value: str) -> None:
        self._data[key] = (value, time.time() + ttl)

    def delete(self, *keys: str) -> None:
        for key in keys:
            self._data.pop(key, None)

    def keys(self, pattern: str) -> list[str]:
        if pattern.endswith("*"):
            prefix = pattern[:-1]
            return [key for key in self._data if key.startswith(prefix)]
        return [key for key in self._data if key == pattern]


class RedisCacheService:
    def __init__(self) -> None:
        settings = get_settings()
        self._enabled = settings.cache_enabled
        self._backend: redis.Redis | InMemoryCache

        if not self._enabled:
            self._backend = InMemoryCache()
            return

        try:
            client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
            client.ping()
            self._backend = client
        except Exception:
            logger.warning("redis_unavailable_falling_back_to_memory")
            self._backend = InMemoryCache()

    def get(self, key: str) -> Any | None:
        payload = self._backend.get(key)
        if payload is None:
            return None
        if isinstance(payload, str):
            try:
                return json.loads(payload)
            except json.JSONDecodeError:
                return payload
        return payload

    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        self._backend.setex(key, ttl, json.dumps(value, default=str))

    def delete(self, key: str) -> None:
        self._backend.delete(key)

    def invalidate_pattern(self, pattern: str) -> None:
        keys = self._backend.keys(pattern)
        if keys:
            self._backend.delete(*keys)

    @staticmethod
    def generate_query_hash(query: str, params: dict) -> str:
        payload = f"{query}:{json.dumps(params, sort_keys=True)}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()


cache_service = RedisCacheService()


def cached(key_pattern: str, ttl: int = 300, key_builder: Callable | None = None):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = key_builder(*args, **kwargs) if key_builder else key_pattern.format(**kwargs)

            cached_data = cache_service.get(cache_key)
            if cached_data is not None:
                logger.debug("cache_hit", key=cache_key)
                return cached_data

            result = func(*args, **kwargs)
            cache_service.set(cache_key, result, ttl)
            logger.debug("cache_store", key=cache_key, ttl=ttl)
            return result

        return wrapper

    return decorator


class CacheInvalidationService:
    def __init__(self, cache: RedisCacheService) -> None:
        self.cache = cache

    def on_dashboard_updated(self, dashboard_id: str) -> None:
        self.cache.delete(f"dashboard:{dashboard_id}")
        self.cache.delete(f"dashboard:data:{dashboard_id}")
        self.cache.invalidate_pattern("widget:data:*")

    def on_data_source_synced(self, data_source_id: str, widgets: list[dict]) -> None:
        for widget in widgets:
            self.cache.delete(f"widget:data:{widget['id']}")
            self.cache.delete(f"dashboard:data:{widget['dashboard_id']}")
