"""Auth router — login, logout, me, auth status.

JWT stored in httpOnly cookie for SPA compatibility.
CSRF protection already handled by CSRFMiddleware.
"""

from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import (
    AuthStatusResponse,
    ChangePasswordRequest,
    LoginRequest,
    UserResponse,
)

logger = get_logger("auth_api")

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7  # 1 week
COOKIE_NAME = "mybaby_session"


def _create_token(user_id: int, secret_key: str) -> str:
    """Create a JWT token for the given user."""
    payload = {
        "sub": str(user_id),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, secret_key, algorithm=JWT_ALGORITHM)


def _set_session_cookie(response: Response, token: str) -> None:
    """Set httpOnly session cookie."""
    settings = get_settings()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.environment != "dev",
        samesite="lax",
        max_age=JWT_EXPIRY_HOURS * 3600,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    """Clear session cookie."""
    response.delete_cookie(key=COOKIE_NAME, path="/")


@router.post("/login", response_model=UserResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_session),
):
    """Authenticate with username + password. Sets session cookie."""
    settings = get_settings()

    if settings.auth_mode not in ("local", "both"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lokales Login ist im aktuellen Auth-Modus nicht verfuegbar",
        )

    result = await db.execute(
        select(User).where(User.username == data.username)
    )
    user = result.scalar_one_or_none()

    if user is None or not user.password_hash:
        logger.warning("login_failed", username=data.username, reason="user_not_found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Benutzername oder Passwort falsch",
        )

    if not verify_password(data.password, user.password_hash):
        logger.warning("login_failed", username=data.username, reason="wrong_password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Benutzername oder Passwort falsch",
        )

    if not user.is_active:
        logger.warning("login_failed", username=data.username, reason="inactive")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Benutzerkonto ist deaktiviert",
        )

    token = _create_token(user.id, settings.secret_key)
    _set_session_cookie(response, token)

    logger.info("login_success", user_id=user.id, username=user.username)
    return user


@router.post("/logout", status_code=204)
async def logout(response: Response):
    """Clear session cookie."""
    _clear_session_cookie(response)
    logger.info("logout")


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User | None = Depends(get_current_user),
):
    """Get current authenticated user."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nicht authentifiziert",
        )
    return user


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status(
    request: Request,
    db: AsyncSession = Depends(get_session),
):
    """Get current auth mode and authentication state (no 401 on failure)."""
    settings = get_settings()

    # Try to resolve user without raising
    user = None
    try:
        user = await get_current_user(request, db)
    except HTTPException:
        pass

    return AuthStatusResponse(
        auth_mode=settings.auth_mode,
        authenticated=user is not None,
        user=UserResponse.model_validate(user) if user else None,
    )


@router.post("/change-password", status_code=204)
async def change_password(
    data: ChangePasswordRequest,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Change own password (local auth users only)."""
    if user is None:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")

    if user.auth_type != "local":
        raise HTTPException(
            status_code=400,
            detail="Passwort-Aenderung nur fuer lokale Benutzer",
        )

    if not user.password_hash or not verify_password(
        data.current_password, user.password_hash
    ):
        raise HTTPException(status_code=401, detail="Aktuelles Passwort falsch")

    user.password_hash = hash_password(data.new_password)
    await db.commit()
    logger.info("password_changed", user_id=user.id)
