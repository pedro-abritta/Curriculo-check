import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth_middleware import require_auth
from app.services.database import get_analysis, get_or_create_user
from app.services.paywall_toggle import PAYWALL_ENABLED

logger = logging.getLogger("security")

router = APIRouter()

SECTION_WEIGHTS = {
    "skills": 0.40,
    "summary": 0.25,
    "impact": 0.20,
    "dates": 0.10,
    "contact": 0.05,
}


def _is_valid_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def _section_score(section: dict) -> int:
    if not section or section.get("disabled"):
        return 0
    if "overall" in section:
        return section["overall"].get("score", 0)
    return section.get("score", 0)


def _build_preview(result_json: dict) -> dict:
    def section_preview(section: dict) -> dict:
        if not section or section.get("disabled"):
            return {"score": 0, "disabled": True}
        score = section.get("overall", {}).get("score", section.get("score", 0))
        return {"score": score}

    # Usa overall_score já calculado no backend; fallback para registros antigos
    overall_score = result_json.get("overall_score") or round(
        _section_score(result_json.get("skills", {})) * SECTION_WEIGHTS["skills"] +
        _section_score(result_json.get("summary", {})) * SECTION_WEIGHTS["summary"] +
        _section_score(result_json.get("impact", {})) * SECTION_WEIGHTS["impact"] +
        _section_score(result_json.get("dates", {})) * SECTION_WEIGHTS["dates"] +
        _section_score(result_json.get("contact", {})) * SECTION_WEIGHTS["contact"]
    )

    return {
        "status": "success",
        "overall_score": overall_score,
        "user_area": result_json.get("user_area"),
        "job_area": result_json.get("job_area"),
        "formatting_warnings": result_json.get("formatting_warnings", []),
        "sections": {
            "contact": section_preview(result_json.get("contact", {})),
            "skills": section_preview(result_json.get("skills", {})),
            "dates": section_preview(result_json.get("dates", {})),
            "summary": section_preview(result_json.get("summary", {})),
            "impact": section_preview(result_json.get("impact", {})),
        },
    }


@router.get("/analysis/{analysis_id}")
async def get_analysis_result(
    analysis_id: str,
    current_user=Depends(require_auth),
):
    if not _is_valid_uuid(analysis_id):
        raise HTTPException(status_code=400, detail="ID de análise inválido.")

    print(f">>> AUTH USER EMAIL: {current_user.email}")
    print(f">>> AUTH USER ID (from JWT): {current_user.id}")
    user = get_or_create_user(current_user.email)
    print(f">>> USER ID (from users table): {user['id']}")
    print(f">>> JWT ID == DB ID: {current_user.id == user['id']}")

    record = get_analysis(analysis_id)
    print(f">>> RECORD USER_ID: {record['user_id'] if record else 'NOT FOUND'}")
    print(f">>> MATCH: {record['user_id'] == user['id'] if record else False}")

    if record is None:
        raise HTTPException(status_code=404, detail="Análise não encontrada.")

    # Guard: se user["id"] for None, algo está errado na tabela users
    if not user.get("id"):
        logger.warning("get_or_create_user returned record without id for email: %s", current_user.email)
        raise HTTPException(status_code=403, detail="Acesso negado.")

    if record["user_id"] != user["id"]:
        logger.warning(
            "Unauthorized access attempt: user %s (email: %s) tried to access analysis %s owned by %s",
            user["id"], current_user.email, analysis_id, record["user_id"],
        )
        raise HTTPException(status_code=403, detail="Acesso negado.")

    result_json = record.get("result_json") or {}
    paid = record.get("paid", False)

    print(f">>> GET /analysis/{analysis_id}: paid={paid}, PAYWALL_ENABLED={PAYWALL_ENABLED}")

    if paid or not PAYWALL_ENABLED:
        print(f">>> Returning: FULL result (keys: {list(result_json.keys())})")
        return {**result_json, "paywall_active": False, "analysis_id": analysis_id}

    preview = _build_preview(result_json)
    print(f">>> Returning: PREVIEW only (overall_score={preview.get('overall_score')}, sections={list(preview['sections'].keys())})")
    return {
        "paywall_active": True,
        "analysis_id": analysis_id,
        "preview": preview,
    }
