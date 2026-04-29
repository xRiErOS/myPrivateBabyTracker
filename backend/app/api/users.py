"""User management router — admin CRUD for users."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user, hash_password, require_role
from app.models.user import User
from app.schemas.user import (
    SetPasswordRequest,
    UserAdminResponse,
    UserCreate,
    UserUpdate,
)

logger = get_logger("users")

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=list[UserAdminResponse])
async def list_users(
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_session),
):
    """List all users (admin only)."""
    result = await db.execute(select(User).order_by(User.username))
    return result.scalars().all()


@router.post("/", response_model=UserAdminResponse, status_code=201)
async def create_user(
    data: UserCreate,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_session),
):
    """Create a new local user (admin only)."""
    # Check uniqueness
    existing = await db.execute(
        select(User).where(User.username == data.username)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Benutzername '{data.username}' existiert bereits",
        )

    new_user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        display_name=data.display_name or data.username,
        auth_type="local",
        role=data.role,
        locale=data.locale,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info("user_created", user_id=new_user.id, username=new_user.username, by=user.username)
    return new_user


@router.get("/{user_id}", response_model=UserAdminResponse)
async def get_user(
    user_id: int,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_session),
):
    """Get a user by ID (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return target


@router.patch("/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_session),
):
    """Update user fields (admin only, partial update)."""
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(target, field, value)

    await db.commit()
    await db.refresh(target)

    logger.info("user_updated", user_id=user_id, fields=list(update_data.keys()), by=user.username)
    return target


@router.post("/{user_id}/set-password", status_code=204)
async def set_user_password(
    user_id: int,
    data: SetPasswordRequest,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_session),
):
    """Set password for a user (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    target.password_hash = hash_password(data.password)
    target.auth_type = "local"
    await db.commit()

    logger.info("user_password_set", user_id=user_id, by=user.username)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_session),
):
    """Delete a user (admin only). Cannot delete yourself."""
    if user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Eigenen Account kann nicht gelöscht werden",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    await db.delete(target)
    await db.commit()

    logger.info("user_deleted", user_id=user_id, username=target.username, by=user.username)
