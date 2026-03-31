import os
import traceback

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client

from app.services.database import get_or_create_user

router = APIRouter()


def _client():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


class AuthRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(body: AuthRequest):
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

    return {
        "user_id": response.user.id,
        "email": response.user.email,
        "access_token": response.session.access_token,
    }


@router.post("/login")
def login(body: AuthRequest):
    client = _client()
    try:
        response = client.auth.sign_in_with_password({"email": body.email, "password": body.password})
    except Exception as e:
        print(f"ERRO LOGIN: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=401, detail="Email ou senha incorretos.")

    if not response.session:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos.")

    get_or_create_user(response.user.email, auth_user_id=response.user.id)

    return {
        "user_id": response.user.id,
        "email": response.user.email,
        "access_token": response.session.access_token,
    }


@router.post("/logout")
def logout():
    # JWTs são stateless; o cliente deve descartar o token localmente
    return {"status": "ok"}
