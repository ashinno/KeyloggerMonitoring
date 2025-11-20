"""
Cybersecurity Thesis Context:

Entry point for SENTINEL // CORE FastAPI backend.

- Real-time behavioral analytics are performed locally to avoid sending
  sensitive telemetry to third parties.
- Isolation Forest is used for unsupervised anomaly detection, with additional
  bot heuristics. This better captures distribution irregularities than simple
  averages, which are vulnerable to evasion and lack robust statistical power.
- All raw event batches are encrypted at rest (Fernet) before storage in the
  audit log, preserving privacy while enabling authorized forensic review.
"""

from __future__ import annotations

import asyncio
from typing import Annotated, Optional, List

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi import Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
try:
    from redis.asyncio import from_url as redis_from_url, Redis
except Exception:  # pragma: no cover
    redis_from_url = None  # type: ignore
    Redis = None  # type: ignore
from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, decode_token, verify_password, get_password_hash, get_fernet
from app.core.logging import setup_logging, get_logger
from app.db.models import init_db, get_session, User, BiometricProfile, AuditLog, AsyncSessionLocal
from app.services.ml_engine import BiometricEngine
from app.api.websocket import router as ws_router


app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security dependency
bearer = HTTPBearer(auto_error=True)


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    try:
        payload = decode_token(creds.credentials)
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")
        result = await session.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user not found")
        return user
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")


# Include WebSocket router
app.include_router(ws_router)


@app.on_event("startup")
async def on_startup() -> None:
    from pathlib import Path
    root = Path(".").resolve()
    screenshots_dir = (root / "screenshots")
    logs_dir = (root / "logs")
    screenshots_dir.mkdir(parents=True, exist_ok=True)
    logs_dir.mkdir(parents=True, exist_ok=True)
    app.state.screenshots_dir = screenshots_dir
    setup_logging(logs_dir)
    app.state.logger = get_logger()
    await init_db()
    # Initialize trust store (Redis if available, else in-memory)
    class InMemoryTrust:
        def __init__(self) -> None:
            self._store: dict[str, int] = {}

        async def get(self, key: str):
            return self._store.get(key)

        async def set(self, key: str, value: int):
            self._store[key] = value

        async def delete(self, key: str):
            self._store.pop(key, None)

        async def scan_iter(self, match: str):
            prefix = match.rstrip("*")
            for k in list(self._store.keys()):
                if k.startswith(prefix):
                    yield k

        async def aclose(self):
            return

    if redis_from_url is not None:
        try:
            url = settings.REDIS_URL
            if settings.REDIS_PASSWORD and "@" not in url:
                # inject password for local URLs like redis://localhost:6379/0
                url = url.replace("redis://", f"redis://:{settings.REDIS_PASSWORD}@")
            app.state.redis = redis_from_url(url, encoding="utf-8", decode_responses=True)
        except Exception:
            app.state.redis = InMemoryTrust()
    else:
        app.state.redis = InMemoryTrust()
    # Initialize ML engine and load per-user profiles if available
    engine = BiometricEngine()
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(BiometricProfile))
        profiles = res.scalars().all()
        # For simplicity, if any profile exists, load the most recent
        if profiles:
            engine.load_model_blob(profiles[-1].model_blob)
        else:
            engine.fit_baseline()
    app.state.engine = engine
    # Ensure Fernet is initialized
    get_fernet()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    redis = app.state.redis
    try:
        await redis.aclose()
    except Exception:
        pass


# REST: Authentication
@app.post("/auth/login")
async def login(payload: dict, session: Annotated[AsyncSession, Depends(get_session)]):
    username = str(payload.get("username", ""))
    password = str(payload.get("password", ""))
    if not username or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="missing credentials")
    res = await session.execute(select(User).where(User.username == username))
    user = res.scalar_one_or_none()
    if not user:
        # Optional: auto-provision for demo/dev
        user = User(username=username, password_hash=get_password_hash(password))
        session.add(user)
        await session.commit()
        await session.refresh(user)
    else:
        if not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")

    token = create_access_token(subject=username)
    return {"access_token": token, "token_type": "bearer"}


# REST: History (encrypted logs; optionally decrypted)
@app.get("/stats/history")
async def history(
    decrypt: bool = False,
    limit: int = 50,
    user: Annotated[User, Depends(get_current_user)] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    res = await session.execute(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    )
    logs = res.scalars().all()
    out = []
    fernet = get_fernet()
    for row in logs:
        item = {
            "id": row.id,
            "timestamp": str(row.timestamp),
            "risk_score": row.risk_score,
            "client_id": row.client_id,
        }
        if decrypt:
            try:
                plaintext = fernet.decrypt(row.encrypted_data)
                item["raw"] = plaintext.decode("utf-8")
            except Exception:
                item["raw"] = None
        else:
            item["encrypted"] = row.encrypted_data.hex()
        out.append(item)
    return {"items": out}


# REST: Reset trust score
@app.post("/system/reset")
async def reset(
    client_id: Optional[str] = None,
    user: Annotated[User, Depends(get_current_user)] = None,
):
    redis = app.state.redis
    if client_id:
        await redis.delete(f"trust:{client_id}")
    else:
        # Non-destructive partial flush of trust keys only
        # Scan keys to avoid flushing all Redis contents
        async for key in redis.scan_iter(match="trust:*"):
            await redis.delete(key)
    return {"ok": True}


@app.post("/media/screenshot")
async def save_screenshot(
    payload: dict = Body(...),
):
    import base64
    import re
    from datetime import datetime
    fmt = str(payload.get("format", "png")).lower()
    image: str = str(payload.get("image", ""))
    if not image:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="missing image")
    m = re.match(r"^data:image/(png|jpeg|jpg);base64,(.*)$", image)
    data_b64 = image
    if m:
        fmt = "jpg" if m.group(1) in ("jpeg", "jpg") else "png"
        data_b64 = m.group(2)
    try:
        data = base64.b64decode(data_b64)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid base64")
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    ext = ".jpg" if fmt == "jpg" else ".png"
    base = ts + ext
    path = app.state.screenshots_dir / base
    idx = 1
    while path.exists():
        base = f"{ts}-{idx}{ext}"
        path = app.state.screenshots_dir / base
        idx += 1
    try:
        with open(path, "wb") as f:
            f.write(data)
        get_logger().info(f"screenshot_saved filename={base}")
        return {"ok": True, "filename": base}
    except Exception as e:
        get_logger().error(f"screenshot_error error={e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="save failed")


@app.post("/media/upload")
async def upload_screenshot(payload: dict = Body(...)):
    return await save_screenshot(payload)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=5051, reload=False)