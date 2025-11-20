"""
Cybersecurity Thesis Context:

We enforce separation of concerns: identities (User), ML artifacts
(BiometricProfile), and audit trails (AuditLog) are isolated. Sensitive raw
payloads in the AuditLog are encrypted with Fernet before persistence.
This satisfies "privacy-preservation at rest" while still enabling forensic
analysis upon authorized decryption.
"""

from __future__ import annotations

from typing import AsyncIterator, Optional

from sqlalchemy import (
    Column,
    Integer,
    String,
    LargeBinary,
    ForeignKey,
    Float,
    DateTime,
    func,
    text,
    select,
)
from sqlalchemy.orm import declarative_base, relationship, Mapped, mapped_column
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)

from app.core.config import settings


Base = declarative_base()


async_engine = create_async_engine(
    settings.DATABASE_URL, echo=False, pool_pre_ping=True
)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)

    profiles: Mapped[list[BiometricProfile]] = relationship("BiometricProfile", back_populates="user")
    logs: Mapped[list[AuditLog]] = relationship("AuditLog", back_populates="user")


class BiometricProfile(Base):
    __tablename__ = "biometric_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    model_blob: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship("User", back_populates="profiles")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    client_id: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    timestamp: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    encrypted_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    user: Mapped[Optional[User]] = relationship("User", back_populates="logs")


async def init_db() -> None:
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session