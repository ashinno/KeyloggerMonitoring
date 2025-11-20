"""
Cybersecurity Thesis Context:

We use two layers of security primitives:

1) JWT for stateless authentication: A signed token (HS256) asserts identity
   without persisting session material server-side, reducing attack surface.
2) Fernet for at-rest encryption of raw behavioral payloads: Even if an attacker
   gains database access, they only see ciphertext. This is a concrete
   privacy-preserving measure mandated by the thesis: sensitive inputs
   (keystrokes/mouse telemetry) must be unreadable without the encryption key.

We also rely on strong password hashing (bcrypt via passlib) to ensure
password material is never stored in reversible form.
"""

import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import jwt
from cryptography.fernet import Fernet
from passlib.context import CryptContext

from .config import settings


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    """
    Create a signed JWT access token with a minimal claim set.

    Cybersecurity Thesis: We avoid embedding sensitive PII in the token.
    Only the subject and exp are included, limiting exposure if a token is
    intercepted.
    """
    expire_delta = timedelta(minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    now = datetime.utcnow()
    payload: Dict[str, Any] = {
        "sub": subject,
        "iat": int(time.mktime(now.timetuple())),
        "exp": int(time.mktime((now + expire_delta).timetuple())),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


_fernet: Optional[Fernet] = None


def get_fernet() -> Fernet:
    """
    Return a process-wide Fernet instance. If no key is provided via env,
    a random key is generated, which is suitable for ephemeral dev sessions.

    Cybersecurity Thesis: In production, FERNET_KEY must be supplied via a
    secret management system (vault/KMS). Keys must be rotated periodically
    to minimize the window of exposure.
    """
    global _fernet
    if _fernet is not None:
        return _fernet
    if settings.FERNET_KEY:
        key = settings.FERNET_KEY.encode()
    else:
        key = Fernet.generate_key()
    _fernet = Fernet(key)
    return _fernet