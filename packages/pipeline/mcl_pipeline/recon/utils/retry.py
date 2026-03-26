"""Retry utilities for network operations.

Ported from GVB recon/utils/retry.py.
"""
from __future__ import annotations
import asyncio
import functools
from typing import TypeVar, Callable

T = TypeVar("T")


def retry(max_retries: int = 3, backoff: float = 1.0, exceptions: tuple = (Exception,)):
    """Decorator for retrying a function with exponential backoff."""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exc = None
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    if attempt < max_retries:
                        import time
                        time.sleep(backoff * (2 ** attempt))
            raise last_exc
        return wrapper
    return decorator


def async_retry(max_retries: int = 3, backoff: float = 1.0, exceptions: tuple = (Exception,)):
    """Decorator for retrying an async function with exponential backoff."""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    if attempt < max_retries:
                        await asyncio.sleep(backoff * (2 ** attempt))
            raise last_exc
        return wrapper
    return decorator
