import os
from typing import Optional

from fastapi import Header, HTTPException
from supabase import create_client


async def require_auth(authorization: Optional[str] = Header(None)):
    """FastAPI dependency que verifica o token JWT do Supabase."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação não fornecido")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
        response = client.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Token inválido ou expirado")
        return response.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
