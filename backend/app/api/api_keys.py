"""API Key CRUD router for managing machine-to-machine authentication keys."""

import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.api_key_schemas import (
    ApiKeyCreate,
    ApiKeyCreateResponse,
    ApiKeyResponse,
    ApiKeyUpdate,
)
from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.api_key_auth import generate_api_key
from app.middleware.auth import get_current_user
from app.models.api_key import ApiKey
from app.models.user import User

logger = get_logger("api_keys")

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.post("/", response_model=ApiKeyCreateResponse, status_code=201)
async def create_api_key(
    data: ApiKeyCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new API key. The plain-text key is returned ONLY in this response."""
    plain_key, key_hash, key_prefix = generate_api_key()

    api_key = ApiKey(
        name=data.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        scopes=json.dumps(data.scopes),
        is_active=True,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    logger.info("api_key_created", key_id=api_key.id, name=api_key.name, prefix=key_prefix)

    # Build response with scopes as list and include the plain key
    return ApiKeyCreateResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=f"mbk_{key_prefix}",
        scopes=data.scopes,
        is_active=api_key.is_active,
        last_used_at=api_key.last_used_at,
        created_at=api_key.created_at,
        key=plain_key,
    )


@router.get("/", response_model=list[ApiKeyResponse])
async def list_api_keys(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List all API keys (without plain-text key)."""
    result = await db.execute(select(ApiKey).order_by(ApiKey.created_at.desc()))
    keys = result.scalars().all()

    return [
        ApiKeyResponse(
            id=k.id,
            name=k.name,
            key_prefix=f"mbk_{k.key_prefix}",
            scopes=json.loads(k.scopes) if k.scopes else ["read"],
            is_active=k.is_active,
            last_used_at=k.last_used_at,
            created_at=k.created_at,
        )
        for k in keys
    ]


@router.patch("/{key_id}", response_model=ApiKeyResponse)
async def update_api_key(
    key_id: int,
    data: ApiKeyUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update an API key (name, scopes, is_active)."""
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise NotFoundError(f"API key with id {key_id} not found")

    update_data = data.model_dump(exclude_unset=True)

    if "scopes" in update_data and update_data["scopes"] is not None:
        update_data["scopes"] = json.dumps(update_data["scopes"])

    for field, value in update_data.items():
        setattr(api_key, field, value)

    await db.commit()
    await db.refresh(api_key)

    logger.info("api_key_updated", key_id=api_key.id, fields=list(update_data.keys()))

    return ApiKeyResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=f"mbk_{api_key.key_prefix}",
        scopes=json.loads(api_key.scopes) if api_key.scopes else ["read"],
        is_active=api_key.is_active,
        last_used_at=api_key.last_used_at,
        created_at=api_key.created_at,
    )


@router.delete("/{key_id}", status_code=204)
async def delete_api_key(
    key_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete an API key."""
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise NotFoundError(f"API key with id {key_id} not found")

    await db.delete(api_key)
    await db.commit()
    logger.info("api_key_deleted", key_id=key_id)
