import logging
import os
import re
import traceback

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from supabase import create_client

from app.limiter import limiter
from app.services.database import get_or_create_user

logger = logging.getLogger("security")

router = APIRouter()

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def _client():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


class AuthRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
@limiter.limit("5/hour")
def register(request: Request, body: AuthRequest):
    if not _EMAIL_RE.match(body.email):
        raise HTTPException(status_code=400, detail="Formato de email inválido.")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter no mínimo 6 caracteres.")

    client = _client()
    try:
        response = client.auth.sign_up({"email": body.email, "password": body.password})
    except Exception as e:
        print(f"ERRO REGISTER: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail="Erro ao criar conta. Verifique os dados e tente novamente.")

    if not response.user:
        raise HTTPException(status_code=400, detail="Erro ao criar conta.")

    get_or_create_user(body.email, auth_user_id=response.user.id)

    if not response.session:
        raise HTTPException(
            status_code=400,
            detail="Conta criada. Verifique seu email para confirmar o cadastro antes de fazer login.",
        )

    logger.info("New user registered: %s", body.email)
    return {
        "user_id": response.user.id,
        "email": response.user.email,
        "access_token": response.session.access_token,
    }


@router.post("/login")
@limiter.limit("10/hour")
def login(request: Request, body: AuthRequest):
    client = _client()
    try:
        response = client.auth.sign_in_with_password({"email": body.email, "password": body.password})
    except Exception as e:
        logger.warning("Failed login attempt for email: %s (%s)", body.email, type(e).__name__)
        print(f"ERRO LOGIN: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=401, detail="Email ou senha incorretos.")

    if not response.session:
        logger.warning("Failed login attempt for email: %s (no session)", body.email)
        raise HTTPException(status_code=401, detail="Email ou senha incorretos.")

    get_or_create_user(response.user.email, auth_user_id=response.user.id)
    logger.info("Successful login: %s", response.user.email)

    return {
        "user_id": response.user.id,
        "email": response.user.email,
        "access_token": response.session.access_token,
    }


@router.post("/logout")
def logout():
    # JWTs são stateless; o cliente deve descartar o token localmente
    return {"status": "ok"}
