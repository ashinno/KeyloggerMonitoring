"""
Cybersecurity Thesis Context:

Configuration is centralized and environment-driven to keep secrets out of
source control and to enable privacy-preserving deployments. JWT secrets,
Fernet keys, and database/Redis URLs are injected via environment variables.
This approach aligns with the principle of least exposure and reduces the
risk of accidental credential leakage.
"""

import os
from typing import List, Optional


def _get_env(key: str, default: str) -> str:
    return os.environ.get(key, default)


def _get_env_int(key: str, default: int) -> int:
    try:
        return int(os.environ.get(key, str(default)))
    except Exception:
        return default


def _get_env_float(key: str, default: float) -> float:
    try:
        return float(os.environ.get(key, str(default)))
    except Exception:
        return default


def _get_env_list(key: str, default: List[str]) -> List[str]:
    raw = os.environ.get(key)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


class Settings:
    APP_NAME: str = _get_env("APP_NAME", "SENTINEL // CORE")
    DATABASE_URL: str = _get_env("DATABASE_URL", "sqlite+aiosqlite:///./sentinel_core.db")
    REDIS_URL: str = _get_env("REDIS_URL", "redis://localhost:6379/0")
    REDIS_PASSWORD: Optional[str] = os.environ.get("REDIS_PASSWORD")
    JWT_SECRET: str = _get_env("JWT_SECRET", "change-me-in-prod")
    JWT_ALGORITHM: str = _get_env("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = _get_env_int("ACCESS_TOKEN_EXPIRE_MINUTES", 60)
    FERNET_KEY: Optional[str] = os.environ.get("FERNET_KEY")
    CORS_ORIGINS: List[str] = _get_env_list(
        "CORS_ORIGINS",
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
    )
    TRUST_INITIAL_SCORE: int = _get_env_int("TRUST_INITIAL_SCORE", 80)
    TRUST_DECAY_SECONDS: float = _get_env_float("TRUST_DECAY_SECONDS", 2.0)
    TRUST_DECAY_POINTS: int = _get_env_int("TRUST_DECAY_POINTS", 5)
    TRUST_MIN_SCORE: int = _get_env_int("TRUST_MIN_SCORE", 0)
    TRUST_MAX_SCORE: int = _get_env_int("TRUST_MAX_SCORE", 100)
    BOT_LINEAR_MOUSE_VELOCITY_THRESHOLD: float = _get_env_float("BOT_LINEAR_MOUSE_VELOCITY_THRESHOLD", 800.0)
    BOT_ANGULAR_VELOCITY_EPSILON: float = _get_env_float("BOT_ANGULAR_VELOCITY_EPSILON", 0.05)


settings = Settings()