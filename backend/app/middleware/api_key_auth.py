"""API Key authentication for machine-to-machine access.

Coexists with forward-auth (auth.py). API Key auth is only used for
dedicated M2M endpoints, not for existing user-facing routes.
"""

import json
import secrets
from datetime import datetime, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.logging import get_logger
from app.models.api_key import ApiKey

logger = get_logger("api_key_auth")

_ph = PasswordHasher()

# Prefix shown to users for key identification
KEY_PREFIX_DISPLAY = "mbk_"


def generate_api_key() -> tuple[str, str, str]:
    """Generate a new API key.

    Returns:
        Tuple of (plain_text_key, key_hash, key_prefix).
        The prefix is the first 8 chars of the random part.
    """
    raw = secrets.token_urlsafe(32)
    plain_key = f"{KEY_PREFIX_DISPLAY}{raw}"
    key_hash = _ph.hash(plain_key)
    key_prefix = raw[:8]
    return plain_key, key_hash, key_prefix


def verify_api_key_hash(plain_key: str, key_hash: str) -> bool:
    """Verify a plain API key against its Argon2 hash."""
    try:
        return _ph.verify(key_hash, plain_key)
    except VerifyMismatchError:
        return False


async def get_api_key_optional(
    request: Request,
    db: AsyncSession = Depends(get_session),
) -> ApiKey | None:
    """Read X-API-Key header and return the matching ApiKey or None."""
    api_key_header = request.headers.get("X-API-Key")
    if not api_key_header:
        return None

    # Extract prefix for DB lookup (skip "mbk_" prefix, take first 8 chars)
    if api_key_header.startswith(KEY_PREFIX_DISPLAY):
        raw_part = api_key_header[len(KEY_PREFIX_DISPLAY):]
        prefix = raw_part[:8]
    else:
        return None

    # Find candidate by prefix
    result = await db.execute(
        select(ApiKey).where(ApiKey.key_prefix == prefix, ApiKey.is_active.is_(True))
    )
    candidate = result.scalar_one_or_none()
    if candidate is None:
        return None

    # Verify full key against hash
    if not verify_api_key_hash(api_key_header, candidate.key_hash):
        return None

    # Update last_used_at
    await db.execute(
        update(ApiKey)
        .where(ApiKey.id == candidate.id)
        .values(last_used_at=datetime.now(timezone.utc))
    )
    await db.commit()

    return candidate


def require_api_key(scopes: list[str]):
    """FastAPI dependency factory: require API key with matching scopes."""

    async def _check_api_key(
        api_key: ApiKey | None = Depends(get_api_key_optional),
    ) -> ApiKey:
        if api_key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Valid API key required",
            )

        # Parse scopes from JSON
        try:
            key_scopes = json.loads(api_key.scopes)
        except (json.JSONDecodeError, TypeError):
            key_scopes = []

        # Check if key has all required scopes
        # "admin" scope grants access to everything
        if "admin" not in key_scopes:
            missing = set(scopes) - set(key_scopes)
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing scopes: {', '.join(sorted(missing))}",
                )

        return api_key

    return _check_api_key


def require_scope(scope: str):
    """Convenience: require a single scope."""
    return require_api_key([scope])
