import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator

from app.limiter import limiter
from app.middleware.auth_middleware import require_auth
from app.services.database import get_analysis, get_feedback, get_or_create_user, save_feedback
from app.utils import is_valid_uuid

logger = logging.getLogger(__name__)

router = APIRouter()


class FeedbackRequest(BaseModel):
    analysis_id: Optional[str] = None
    rating: int
    comment: str = ""

    @field_validator("analysis_id")
    @classmethod
    def validate_analysis_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not is_valid_uuid(v):
            raise ValueError("ID de análise inválido")
        return v

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: int) -> int:
        if v < 0 or v > 10:
            raise ValueError("Rating deve ser entre 0 e 10")
        return v

    @field_validator("comment")
    @classmethod
    def comment_length(cls, v: str) -> str:
        if len(v) > 500:
            raise ValueError("Comentário não pode ter mais de 500 caracteres")
        return v


@router.post("/feedback")
@limiter.limit("10/hour")
async def post_feedback(
    request: Request,
    body: FeedbackRequest,
    current_user=Depends(require_auth),
):
    user = get_or_create_user(current_user.email)

    if body.analysis_id is not None:
        analysis = get_analysis(body.analysis_id)
        if analysis is None:
            raise HTTPException(status_code=404, detail="Análise não encontrada.")
        if analysis["user_id"] != user["id"]:
            logger.warning(
                "Unauthorized feedback attempt: user %s tried to review analysis %s owned by %s",
                user["id"], body.analysis_id, analysis["user_id"],
            )
            raise HTTPException(status_code=403, detail="Acesso negado.")

    save_feedback(user["id"], body.analysis_id, body.rating, body.comment)
    return {"success": True}


@router.get("/feedback/{analysis_id}")
async def fetch_feedback(
    analysis_id: str,
    current_user=Depends(require_auth),
):
    if not is_valid_uuid(analysis_id):
        raise HTTPException(status_code=400, detail="ID de análise inválido.")

    user = get_or_create_user(current_user.email)
    feedback = get_feedback(analysis_id, user["id"])
    return feedback  # None → returns null in JSON
