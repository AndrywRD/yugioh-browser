from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.domain.entities import User
from src.domain.enums import UserRole
from src.infrastructure.security import create_access_token, get_password_hash, verify_password
from src.presentation.api.dependencies import TokenData, get_current_user, get_db, get_user_repository
from src.presentation.api.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from src.shared.config import get_settings
from src.shared.utils import generate_uuid

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    user_repo=Depends(get_user_repository),
):
    existing = user_repo.get_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=generate_uuid(),
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=UserRole.ADMIN if payload.email == get_settings().admin_email else UserRole.VIEWER,
    )
    created = user_repo.create(user)
    db.commit()
    return UserResponse(
        id=created.id,
        email=created.email,
        full_name=created.full_name,
        role=created.role.value,
        is_active=created.is_active,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, user_repo=Depends(get_user_repository)):
    user = user_repo.get_by_email(payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role,
        expires_delta=timedelta(minutes=get_settings().access_token_expire_minutes),
    )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: TokenData = Depends(get_current_user), user_repo=Depends(get_user_repository)):
    user = user_repo.get_by_id(current_user.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_active=user.is_active,
    )
