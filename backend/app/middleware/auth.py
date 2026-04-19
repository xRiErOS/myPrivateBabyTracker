"""Authentication middleware and dependencies.

Supports three AUTH_MODE values:
- forward: Reads Remote-User header (set by Authelia after header stripping)
- local: Argon2 password verification with session cookies
- both: Forward-auth first, local as fallback

Provides get_current_user() and require_role() FastAPI dependencies.
"""

from typing import Literal

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_session
from app.logging import get_logger
from app.models.user import User

logger = get_logger("auth")

_ph = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a password with Argon2id."""
    return _ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against an Argon2id hash."""
    try:
        return _ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False


async def _get_or_create_forward_auth_user(
    db: AsyncSession,
    username: str,
    display_name: str | None = None,
    role: str = "caregiver",
) -> User:
    """Find existing user by username or create a new forward-auth user."""
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            username=username,
            display_name=display_name or username,
            auth_type="forward_auth",
            role=role,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("user_auto_created", username=username, auth_type="forward_auth")

    return user


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_session),
) -> User | None:
    """FastAPI dependency: resolve the current user based on AUTH_MODE.

    Returns None only when auth_mode is 'disabled'.
    Raises 401 if authentication fails.
    """
    settings = get_settings()

    # Disabled mode — no auth required (dev only)
    if settings.auth_mode == "disabled":
        return None

    # Forward-auth mode: read headers set by trusted proxy
    if settings.auth_mode in ("forward", "both"):
        trusted_header = settings.auth_trusted_header
        username = request.headers.get(trusted_header)
        if username:
            role_header = request.headers.get("Remote-Groups", "")
            role = "admin" if "admin" in role_header else "caregiver"
            display_name = request.headers.get("Remote-Name", username)
            return await _get_or_create_forward_auth_user(
                db, username, display_name, role
            )

    # Local auth mode: check session/token
    if settings.auth_mode in ("local", "both"):
        # Session-based: user_id stored in request state by login endpoint
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user and user.is_active:
                return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )


def require_role(*roles: str):
    """FastAPI dependency factory: require one of the given roles."""

    async def _check_role(
        user: User | None = Depends(get_current_user),
    ) -> User:
        if user is None:
            # Auth disabled — allow through
            return User(username="anonymous", role="admin", is_active=True)
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' not authorized. Required: {roles}",
            )
        return user

    return _check_role
