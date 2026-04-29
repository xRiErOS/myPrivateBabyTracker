"""WebAuthn (Passkeys) router — register + login begin/finish, credential management.

Uses py_webauthn for FIDO2/WebAuthn protocol handling.
Challenge stored in session cookie (short-lived, httpOnly).
"""

import json
from base64 import b64decode, b64encode, urlsafe_b64decode, urlsafe_b64encode

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from app.config import get_settings
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.webauthn import WebAuthnCredential

logger = get_logger("webauthn")

router = APIRouter(prefix="/auth/webauthn", tags=["webauthn"])

CHALLENGE_COOKIE = "webauthn_challenge"
RP_NAME = "MyBaby"


def _get_rp_id() -> str:
    """Get relying party ID from settings or default."""
    settings = get_settings()
    # In production, use the domain; in dev, use localhost
    if settings.environment == "prod":
        return "baby.familie-riedel.org"
    return "localhost"


def _get_origin() -> str:
    settings = get_settings()
    if settings.environment == "prod":
        return "https://baby.familie-riedel.org"
    return "http://localhost:5173"


def _require_user(user: User | None) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    return user


# --- Schemas ---

class CredentialResponse(BaseModel):
    id: int
    device_name: str | None
    created_at: str

    model_config = {"from_attributes": True}


class DeviceNameRequest(BaseModel):
    device_name: str = Field(max_length=200)


# --- Registration ---

@router.post("/register/begin")
async def register_begin(
    response: Response,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Start passkey registration — returns PublicKeyCredentialCreationOptions."""
    u = _require_user(user)

    # Get existing credentials to exclude
    result = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.user_id == u.id)
    )
    existing = result.scalars().all()
    exclude_credentials = [
        PublicKeyCredentialDescriptor(id=c.credential_id)
        for c in existing
    ]

    options = generate_registration_options(
        rp_id=_get_rp_id(),
        rp_name=RP_NAME,
        user_id=str(u.id).encode(),
        user_name=u.username,
        user_display_name=u.display_name or u.username,
        exclude_credentials=exclude_credentials,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )

    # Store challenge in cookie
    challenge_b64 = b64encode(options.challenge).decode()
    response.set_cookie(
        key=CHALLENGE_COOKIE,
        value=challenge_b64,
        httponly=True,
        secure=get_settings().environment != "dev",
        samesite="lax",
        max_age=300,  # 5 min
        path="/",
    )

    return json.loads(options_to_json(options))


@router.post("/register/finish")
async def register_finish(
    request: Request,
    response: Response,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Complete passkey registration — verify and store credential."""
    u = _require_user(user)

    challenge_b64 = request.cookies.get(CHALLENGE_COOKIE)
    if not challenge_b64:
        raise HTTPException(status_code=400, detail="Keine Challenge gefunden")

    challenge = b64decode(challenge_b64)
    body = await request.json()

    try:
        verification = verify_registration_response(
            credential=body,
            expected_challenge=challenge,
            expected_rp_id=_get_rp_id(),
            expected_origin=_get_origin(),
        )
    except Exception as e:
        logger.warning("webauthn_register_failed", error=str(e))
        raise HTTPException(status_code=400, detail=f"Registrierung fehlgeschlagen: {e}")

    # Store credential
    cred = WebAuthnCredential(
        user_id=u.id,
        credential_id=verification.credential_id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        device_name=None,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)

    # Clear challenge cookie
    response.delete_cookie(key=CHALLENGE_COOKIE, path="/")

    logger.info("webauthn_registered", user_id=u.id, credential_id=cred.id)
    return {"id": cred.id, "message": "Passkey registriert"}


# --- Authentication ---

@router.post("/login/begin")
async def login_begin(
    response: Response,
    db: AsyncSession = Depends(get_session),
):
    """Start passkey login — returns PublicKeyCredentialRequestOptions."""
    # Allow all credentials (discoverable)
    options = generate_authentication_options(
        rp_id=_get_rp_id(),
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    challenge_b64 = b64encode(options.challenge).decode()
    response.set_cookie(
        key=CHALLENGE_COOKIE,
        value=challenge_b64,
        httponly=True,
        secure=get_settings().environment != "dev",
        samesite="lax",
        max_age=300,
        path="/",
    )

    return json.loads(options_to_json(options))


@router.post("/login/finish")
async def login_finish(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_session),
):
    """Complete passkey login — verify assertion and create session."""
    challenge_b64 = request.cookies.get(CHALLENGE_COOKIE)
    if not challenge_b64:
        raise HTTPException(status_code=400, detail="Keine Challenge gefunden")

    challenge = b64decode(challenge_b64)
    body = await request.json()

    # Find credential by ID
    raw_id = body.get("rawId") or body.get("id", "")
    # rawId is base64url-encoded
    try:
        cred_id_bytes = urlsafe_b64decode(raw_id + "==")
    except Exception:
        raise HTTPException(status_code=400, detail="Ungültige Credential-ID")

    result = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.credential_id == cred_id_bytes)
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=401, detail="Passkey nicht gefunden")

    try:
        verification = verify_authentication_response(
            credential=body,
            expected_challenge=challenge,
            expected_rp_id=_get_rp_id(),
            expected_origin=_get_origin(),
            credential_public_key=cred.public_key,
            credential_current_sign_count=cred.sign_count,
        )
    except Exception as e:
        logger.warning("webauthn_login_failed", error=str(e))
        raise HTTPException(status_code=401, detail=f"Passkey-Verifizierung fehlgeschlagen")

    # Update sign count
    cred.sign_count = verification.new_sign_count
    await db.commit()

    # Find user and create session
    user_result = await db.execute(select(User).where(User.id == cred.user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Benutzer nicht gefunden oder deaktiviert")

    # Create JWT session
    from app.api.auth import _create_token, _set_session_cookie, COOKIE_NAME
    settings = get_settings()
    token = _create_token(user.id, settings.secret_key)
    _set_session_cookie(response, token)

    # Clear challenge cookie
    response.delete_cookie(key=CHALLENGE_COOKIE, path="/")

    logger.info("webauthn_login_success", user_id=user.id)
    from app.schemas.auth import UserResponse
    return {"user": UserResponse.model_validate(user).model_dump()}


# --- Credential Management ---

@router.get("/credentials", response_model=list[CredentialResponse])
async def list_credentials(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List all passkeys for current user."""
    u = _require_user(user)
    result = await db.execute(
        select(WebAuthnCredential)
        .where(WebAuthnCredential.user_id == u.id)
        .order_by(WebAuthnCredential.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/credentials/{credential_id}")
async def rename_credential(
    credential_id: int,
    data: DeviceNameRequest,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Rename a passkey."""
    u = _require_user(user)
    result = await db.execute(
        select(WebAuthnCredential).where(
            WebAuthnCredential.id == credential_id,
            WebAuthnCredential.user_id == u.id,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="Passkey nicht gefunden")

    cred.device_name = data.device_name
    await db.commit()
    return {"message": "Passkey umbenannt"}


@router.delete("/credentials/{credential_id}", status_code=204)
async def delete_credential(
    credential_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a passkey."""
    u = _require_user(user)
    result = await db.execute(
        select(WebAuthnCredential).where(
            WebAuthnCredential.id == credential_id,
            WebAuthnCredential.user_id == u.id,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="Passkey nicht gefunden")

    await db.delete(cred)
    await db.commit()
    logger.info("webauthn_credential_deleted", user_id=u.id, credential_id=credential_id)
