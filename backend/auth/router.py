from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import bcrypt
from datetime import date

from database.connection import get_db
from database.models import User, UserRole
from auth.jwt import create_access_token
from auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

def hash_password(password: str) -> str:
    # bcrypt.hashpw expects bytes. gensalt defaults to 12 rounds.
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


# ── Schemas ──────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    dob: str          # "YYYY-MM-DD"
    email: EmailStr
    phone: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    role: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    dob: str
    role: str
    created_at: str

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    dob: str | None = None


# ── Routes ───────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=req.name,
        dob=req.dob,
        email=req.email,
        phone=req.phone,
        password_hash=hash_password(req.password),
        role=UserRole.citizen,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token, user_id=user.id, name=user.name, role=user.role.value)


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token, user_id=user.id, name=user.name, role=user.role.value)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        phone=current_user.phone,
        dob=current_user.dob,
        role=current_user.role.value,
        created_at=str(current_user.created_at),
    )


@router.patch("/me", response_model=UserOut)
def update_me(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if req.name:
        current_user.name = req.name
    if req.phone:
        current_user.phone = req.phone
    if req.dob:
        current_user.dob = req.dob
    db.commit()
    db.refresh(current_user)
    return UserOut(
        id=current_user.id, name=current_user.name, email=current_user.email,
        phone=current_user.phone, dob=current_user.dob,
        role=current_user.role.value, created_at=str(current_user.created_at),
    )
