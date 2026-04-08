import hashlib
import json

import redis

from backend.app.config import settings


class RedisCache:
    def __init__(self):
        try:
            self._client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            self._client.ping()
            self._available = True
        except Exception:
            self._available = False
            self._client = None

    def get(self, key: str) -> dict | None:
        if not self._available:
            return None
        data = self._client.get(key)
        return json.loads(data) if data else None

    def set(self, key: str, value: dict, ttl_seconds: int = 86400):
        if not self._available:
            return
        self._client.setex(key, ttl_seconds, json.dumps(value))


cache = RedisCache()


def hash_scenario(race_id: str, scenario_input: dict) -> str:
    raw = json.dumps({"race_id": race_id, **scenario_input}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]
