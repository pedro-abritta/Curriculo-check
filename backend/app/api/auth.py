import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.limiter import limiter
from app.services.database import get_or_create_user

logger = logging.getLogger("security")

router = APIRouter()


class LoginRequest(BaseModel):
    email: str


@router.post("/login")
@limiter.limit("10/hour")
def login(request: Request, body: LoginRequest):
    """Garante que o usuário autenticado via Google existe na tabela users."""
    user = get_or_create_user(body.email)
    if not user.get("active", True):
        logger.warning("Login blocked — inactive account: %s", body.email)
        raise HTTPException(status_code=403, detail="Conta desativada. Entre em contato com o suporte.")

    logger.info("Successful login: %s", body.email)
    return {"success": True}


@router.post("/logout")
def logout():
    # JWTs são stateless; o cliente deve descartar o token localmente
    return {"status": "ok"}
