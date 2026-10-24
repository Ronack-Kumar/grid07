import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Any, Union
import jwt
from app.core.config import settings

ALGORITHM = "HS256"

def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def get_fernet() -> Any:
    from cryptography.fernet import Fernet
    return Fernet(settings.encryption_key_bytes)


def encrypt_credential(raw_key: str) -> str:
    """Encrypt a secret API key at rest using AES-128-CBC + HMAC-SHA256 (Fernet)."""
    if not raw_key:
        return ""
    f = get_fernet()
    return f.encrypt(raw_key.strip().encode("utf-8")).decode("utf-8")


def decrypt_credential(encrypted_key: str) -> str:
    """Decrypt an encrypted API key."""
    if not encrypted_key:
        return ""
    f = get_fernet()
    return f.decrypt(encrypted_key.strip().encode("utf-8")).decode("utf-8")


def mask_credential(raw_key: str) -> dict:
    """Produce safe prefix, suffix, and masked representation for display without exposing secrets."""
    clean = raw_key.strip()
    if not clean:
        return {"prefix": "", "suffix": "", "masked": ""}
    if len(clean) >= 8:
        prefix = clean[:4]
        suffix = clean[-4:]
        masked = f"{prefix}...{suffix}"
    else:
        prefix = clean[:2] if len(clean) >= 2 else clean
        suffix = clean[-2:] if len(clean) >= 2 else ""
        masked = "••••••••"
    return {"prefix": prefix, "suffix": suffix, "masked": masked}

