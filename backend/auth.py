# auth.py — shared-credential session auth for the AGOS command console.
#
# AGOS runs on a single command-center workstation (CDRRMO), not a multi-user
# system, so there's no users table: one municipal code + password pair (from
# env config) gates the console, and a signed cookie tracks the session.
import os
import secrets
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from passlib.context import CryptContext
from pydantic import BaseModel

load_dotenv()

MUNICIPAL_CODE = os.environ["AGOS_MUNICIPAL_CODE"]
PASSWORD_HASH = os.environ["AGOS_PASSWORD_HASH"]
SESSION_SECRET = os.environ["AGOS_SESSION_SECRET"]

SESSION_COOKIE = "agos_session"
SESSION_TTL_SECONDS = 12 * 60 * 60  # one duty shift

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_signer = URLSafeTimedSerializer(SESSION_SECRET, salt="agos-session")

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    municipal_code: str
    password: str


def require_session(request: Request) -> None:
    """FastAPI dependency — raises 401 unless a valid, unexpired session cookie is present."""
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    try:
        _signer.loads(token, max_age=SESSION_TTL_SECONDS)
    except (BadSignature, SignatureExpired):
        raise HTTPException(status_code=401, detail="Session expired or invalid.")


@router.post("/login", summary="Log in with the command console's municipal code + password")
def login(body: LoginRequest, response: Response):
    valid_code = secrets.compare_digest(body.municipal_code, MUNICIPAL_CODE)
    valid_password = bool(body.password) and _pwd_context.verify(body.password, PASSWORD_HASH)
    if not (valid_code and valid_password):
        raise HTTPException(status_code=401, detail="Invalid municipal code or password.")

    token = _signer.dumps({"iat": datetime.now(timezone.utc).isoformat()})
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # flip to True once the console is served over HTTPS
        max_age=SESSION_TTL_SECONDS,
    )
    return {"status": "ok"}


@router.post("/logout", summary="Clear the session cookie")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)
    return {"status": "ok"}


@router.get(
    "/me",
    summary="Check whether the current session is valid",
    dependencies=[Depends(require_session)],
)
def me():
    return {"authenticated": True}
