import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.middleware.auth_middleware import require_auth
from app.services.database import get_analysis, get_feedback, get_or_create_user, save_feedback

logger = logging.getLogger(__name__)

router = APIRouter()


def _is_valid_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


class FeedbackRequest(BaseModel):
    analysis_id: str
    rating: int
    comment: str = ""

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
async def post_feedback(
    body: FeedbackRequest,
    current_user=Depends(require_auth),
):
    if not _is_valid_uuid(body.analysis_id):
        raise HTTPException(status_code=400, detail="ID de análise inválido.")

    user = get_or_create_user(current_user.email)

    analysis = get_analysis(body.analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Análise não encontrada.")
    if analysis["user_id"] != user["id"]:
        logger.warning(
            "Unauthorized feedback attempt: user %s tried to review analysis %s owned by %s",
            user["id"], body.analysis_id, analysis["user_id"],
        )
        raise HTTPException(status_code=403, detail="Acesso negado.")

    existing = get_feedback(body.analysis_id, user["id"])
    if existing is not None:
        raise HTTPException(status_code=409, detail="Você já enviou um feedback para esta análise.")

    save_feedback(user["id"], body.analysis_id, body.rating, body.comment)
    return {"success": True}


@router.get("/feedback/{analysis_id}")
async def fetch_feedback(
    analysis_id: str,
    current_user=Depends(require_auth),
):
    if not _is_valid_uuid(analysis_id):
        raise HTTPException(status_code=400, detail="ID de análise inválido.")

    user = get_or_create_user(current_user.email)
    feedback = get_feedback(analysis_id, user["id"])
    return feedback  # None → returns null in JSON
