"""Implementation of TokenBucketRateLimiter."""

import math


def _validate_numeric(val: object, name: str) -> float:
    if isinstance(val, bool) or not isinstance(val, (int, float)):
        raise TypeError(f"{name} must be a real number, got {type(val).__name__}")
    val_f = float(val)
    if math.isnan(val_f):
        raise ValueError(f"{name} cannot be NaN")
    return val_f


class TokenBucketRateLimiter:
    def __init__(self, capacity: float, refill_rate: float, initial_timestamp: float = 0.0) -> None:
        cap = _validate_numeric(capacity, "capacity")
        if cap <= 0.0:
            raise ValueError("capacity must be strictly positive")

        rate = _validate_numeric(refill_rate, "refill_rate")
        if rate < 0.0:
            raise ValueError("refill_rate must be non-negative")

        init_ts = _validate_numeric(initial_timestamp, "initial_timestamp")

        self.capacity: float = cap
        self.refill_rate: float = rate
        self.tokens: float = cap
        self.last_timestamp: float = init_ts

    def available_tokens(self, now: float) -> float:
        now_f = _validate_numeric(now, "now")
        elapsed = max(0.0, now_f - self.last_timestamp)
        return min(self.capacity, self.tokens + elapsed * self.refill_rate)

    def try_acquire(self, tokens: float = 1.0, now: float = 0.0) -> bool:
        req_tokens = _validate_numeric(tokens, "tokens")
        if req_tokens <= 0.0:
            raise ValueError("tokens must be strictly positive")

        now_f = _validate_numeric(now, "now")
        elapsed = max(0.0, now_f - self.last_timestamp)
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_timestamp = max(self.last_timestamp, now_f)

        if self.tokens >= req_tokens:
            self.tokens -= req_tokens
            return True
        return False
