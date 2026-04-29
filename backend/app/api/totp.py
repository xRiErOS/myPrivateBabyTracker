"""TOTP 2FA router — setup, verify, disable, backup codes."""

import hashlib
import io
import json
import secrets
from base64 import b64encode

import pyotp
import qrcode  # type: ignore[import-untyped]
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.totp import TotpSecret
from app.models.user import User

logger = get_logger("totp")

router = APIRouter(prefix="/auth/2fa", tags=["2fa"])

ISSUER = "MyBaby"
BACKUP_CODE_COUNT = 8
BACKUP_CODE_LENGTH = 8


# --- Schemas ---

class TotpSetupResponse(BaseModel):
    secret: str
    qr_code_base64: str
    backup_codes: list[str]


class TotpVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class TotpStatusResponse(BaseModel):
    enabled: bool
    verified: bool


class BackupCodeVerifyRequest(BaseModel):
    code: str = Field(min_length=1, max_length=20)


# --- Helpers ---

def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _generate_backup_codes() -> list[str]:
    return [secrets.token_hex(BACKUP_CODE_LENGTH // 2).upper() for _ in range(BACKUP_CODE_COUNT)]


def _make_qr_base64(uri: str) -> str:
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return b64encode(buf.getvalue()).decode()


def _require_user(user: User | None) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    return user


# --- Endpoints ---

@router.get("/status", response_model=TotpStatusResponse)
async def totp_status(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Check if TOTP is enabled for current user."""
    u = _require_user(user)
    result = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == u.id)
    )
    secret = result.scalar_one_or_none()
    return TotpStatusResponse(
        enabled=u.totp_enabled,
        verified=secret.is_verified if secret else False,
    )


@router.post("/setup", response_model=TotpSetupResponse)
async def totp_setup(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Generate TOTP secret + QR code. Must be verified before activation."""
    u = _require_user(user)

    if u.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA ist bereits aktiviert")

    # Delete any unverified secret
    result = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == u.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)

    secret = pyotp.random_base32()
    backup_codes = _generate_backup_codes()

    totp_secret = TotpSecret(
        user_id=u.id,
        secret=secret,
        is_verified=False,
        backup_codes=json.dumps([_hash_code(c) for c in backup_codes]),
    )
    db.add(totp_secret)
    await db.commit()

    uri = pyotp.TOTP(secret).provisioning_uri(name=u.username, issuer_name=ISSUER)
    qr_b64 = _make_qr_base64(uri)

    logger.info("totp_setup_initiated", user_id=u.id)
    return TotpSetupResponse(
        secret=secret,
        qr_code_base64=qr_b64,
        backup_codes=backup_codes,
    )


@router.post("/verify", status_code=204)
async def totp_verify(
    data: TotpVerifyRequest,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Verify TOTP code to complete setup and activate 2FA."""
    u = _require_user(user)

    result = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == u.id)
    )
    secret = result.scalar_one_or_none()
    if not secret:
        raise HTTPException(status_code=400, detail="Kein TOTP-Setup gestartet")

    totp = pyotp.TOTP(secret.secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Ungültiger Code")

    secret.is_verified = True
    u.totp_enabled = True
    await db.commit()

    logger.info("totp_verified", user_id=u.id)


@router.post("/disable", status_code=204)
async def totp_disable(
    data: TotpVerifyRequest,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Disable 2FA (requires current TOTP code)."""
    u = _require_user(user)

    if not u.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA ist nicht aktiviert")

    result = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == u.id)
    )
    secret = result.scalar_one_or_none()
    if not secret:
        raise HTTPException(status_code=400, detail="Kein TOTP-Secret gefunden")

    totp = pyotp.TOTP(secret.secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Ungültiger Code")

    await db.delete(secret)
    u.totp_enabled = False
    await db.commit()

    logger.info("totp_disabled", user_id=u.id)


@router.post("/validate", status_code=204)
async def totp_validate(
    data: TotpVerifyRequest,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Validate a TOTP code during login (called after password auth)."""
    u = _require_user(user)

    if not u.totp_enabled:
        return  # 2FA not enabled, nothing to validate

    result = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == u.id)
    )
    secret = result.scalar_one_or_none()
    if not secret or not secret.is_verified:
        raise HTTPException(status_code=400, detail="TOTP nicht konfiguriert")

    totp = pyotp.TOTP(secret.secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Ungültiger 2FA-Code")


@router.post("/backup-verify", status_code=204)
async def backup_code_verify(
    data: BackupCodeVerifyRequest,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Verify a backup code (one-time use)."""
    u = _require_user(user)

    if not u.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA ist nicht aktiviert")

    result = await db.execute(
        select(TotpSecret).where(TotpSecret.user_id == u.id)
    )
    secret = result.scalar_one_or_none()
    if not secret or not secret.backup_codes:
        raise HTTPException(status_code=400, detail="Keine Backup-Codes vorhanden")

    codes: list[str] = json.loads(secret.backup_codes)
    code_hash = _hash_code(data.code.upper())

    if code_hash not in codes:
        raise HTTPException(status_code=401, detail="Ungültiger Backup-Code")

    # Remove used code
    codes.remove(code_hash)
    secret.backup_codes = json.dumps(codes)
    await db.commit()

    logger.info("backup_code_used", user_id=u.id, remaining=len(codes))
