"""
Cybersecurity Thesis Context:

This WebSocket ingests real-time keystroke and mouse telemetry. The trust score
is kept in Redis for low-latency updates visible across the stack. We enforce
privacy by encrypting raw payloads in the audit log using Fernet so that even
if the database is compromised, sensitive behavior remains protected.

Additionally, a trust-decay loop penalizes idle connections to reduce the risk
that unattended sessions retain elevated privileges.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert

from app.core.config import settings
from app.core.security import get_fernet
from app.db.models import AsyncSessionLocal, AuditLog
from app.services.ml_engine import BiometricEngine


router = APIRouter()


async def _get_trust(redis, client_id: str) -> int:
    val = await redis.get(f"trust:{client_id}")
    if val is None:
        return settings.TRUST_INITIAL_SCORE
    try:
        return int(val)
    except Exception:
        return settings.TRUST_INITIAL_SCORE


async def _set_trust(redis, client_id: str, value: int) -> int:
    value = max(settings.TRUST_MIN_SCORE, min(settings.TRUST_MAX_SCORE, value))
    await redis.set(f"trust:{client_id}", value)
    return value


async def _adjust_trust(redis, client_id: str, delta: int) -> int:
    current = await _get_trust(redis, client_id)
    return await _set_trust(redis, client_id, current + delta)


@router.websocket("/ws/stream/{client_id}")
async def stream(websocket: WebSocket, client_id: str) -> None:
    await websocket.accept()

    redis = websocket.app.state.redis
    engine: BiometricEngine = websocket.app.state.engine
    fernet = get_fernet()

    # Initialize trust score for this client
    await _set_trust(redis, client_id, settings.TRUST_INITIAL_SCORE)

    last_rx = asyncio.Event()
    last_rx.set()

    async def trust_decay_loop() -> None:
        try:
            while True:
                await asyncio.sleep(settings.TRUST_DECAY_SECONDS)
                if not last_rx.is_set():
                    # No data received within the window; decay trust
                    await _adjust_trust(redis, client_id, -settings.TRUST_DECAY_POINTS)
                # Reset the window for the next interval
                last_rx.clear()
        except asyncio.CancelledError:
            return

    decay_task = asyncio.create_task(trust_decay_loop())

    try:
        while True:
            data = await websocket.receive_text()
            last_rx.set()
            try:
                payload: Dict[str, Any] = json.loads(data)
            except json.JSONDecodeError:
                # Malformed input: penalize trust slightly
                new_trust = await _adjust_trust(redis, client_id, -2)
                await websocket.send_json({
                    "ok": False,
                    "error": "invalid_json",
                    "trustScore": new_trust,
                })
                continue

            X, extras = engine.extract_features(payload)
            label, risk = engine.predict(X)
            is_bot = engine.detect_bot(extras)

            prev_trust = await _get_trust(redis, client_id)
            usb_event = payload.get("usbEvent")
            if usb_event:
                delta = -20 if usb_event.get("isSuspicious") else -5
            elif is_bot:
                delta = -30
            elif label == -1:
                delta = -10
            else:
                delta = +1
            trust = await _adjust_trust(redis, client_id, delta)

            # Encrypt and store audit log
            ciphertext = fernet.encrypt(json.dumps(payload).encode("utf-8"))
            async with AsyncSessionLocal() as session:  # type: AsyncSession
                await session.execute(
                    insert(AuditLog).values(
                        user_id=None,
                        client_id=client_id,
                        risk_score=float(risk),
                        encrypted_data=ciphertext,
                    )
                )
                await session.commit()

            focus_level = (
                "High" if risk < 30 else "Medium" if risk < 60 else "Distracted"
            )
            await websocket.send_json({
                "ok": True,
                "currentActivity": "Monitoring",
                "focusLevel": focus_level,
                "riskScore": float(risk),
                "trustScore": int(trust),
                "trustScoreAdjustment": int(trust - prev_trust),
                "summary": "processed",
                "isBotDetected": bool(is_bot),
                "detectedApps": [],
                "features": extras,
            })
    except WebSocketDisconnect:
        pass
    finally:
        decay_task.cancel()