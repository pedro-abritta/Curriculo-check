"""
Shared rate limiter instance.
Key function uses the JWT subject (user ID) when a Bearer token is present,
falling back to the client IP for unauthenticated requests.
This gives per-user limits on authenticated routes and per-IP limits on public routes.
"""
import jwt as pyjwt
from slowapi import Limiter
from slowapi.util import get_remote_address


def _smart_key(request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = pyjwt.decode(
                auth[7:],
                options={"verify_signature": False},
                algorithms=["HS256", "RS256"],
            )
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
    return get_remote_address(request)


limiter = Limiter(key_func=_smart_key)
