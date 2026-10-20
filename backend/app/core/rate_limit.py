"""In-process sliding-window rate limiter.

Suitable for a single API instance. For horizontal scaling, swap the storage for Redis
(the `RateLimiter.hit` contract stays the same).
"""

import math
import threading
import time
from collections import defaultdict, deque

from app.core.errors import RateLimitError


class RateLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_seconds: int, message: str | None = None) -> None:
        if limit <= 0:
            return
        now = time.monotonic()
        with self._lock:
            events = self._events[key]
            while events and events[0] <= now - window_seconds:
                events.popleft()
            if len(events) >= limit:
                retry_after = max(1, math.ceil(events[0] + window_seconds - now))
                raise RateLimitError(
                    message or "Too many requests. Please wait and try again.",
                    details={"retry_after_seconds": retry_after},
                    headers={"Retry-After": str(retry_after)},
                )
            events.append(now)

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


rate_limiter = RateLimiter()
