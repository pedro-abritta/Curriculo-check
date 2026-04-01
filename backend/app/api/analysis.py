from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth_middleware import require_auth
from app.services.database import get_analysis, get_or_create_user
from app.services.paywall_toggle import PAYWALL_ENABLED

router = APIRouter()

SECTION_WEIGHTS = {
    "skills": 0.30,
    "summary": 0.25,
    "dates": 0.15,
    "impact": 0.15,
    "contact": 0.15,
}


def _section_score(section: dict) -> int:
    if not section or section.get("disabled"):
        return 0
    if "overall" in section:
        return section["overall"].get("score", 0)
    return section.get("score", 0)


def _build_preview(result_json: dict) -> dict:
    def section_preview(section: dict) -> dict:
        if not section or section.get("disabled"):
            return {"score": 0, "status": "red", "disabled": True}
        score = section.get("overall", {}).get("score", section.get("score", 0))
        status = section.get("overall", {}).get("status", section.get("status", "red"))
        return {"score": score, "status": status}

    overall_score = round(
        _section_score(result_json.get("skills", {})) * SECTION_WEIGHTS["skills"] +
        _section_score(result_json.get("summary", {})) * SECTION_WEIGHTS["summary"] +
        _section_score(result_json.get("dates", {})) * SECTION_WEIGHTS["dates"] +
        _section_score(result_json.get("impact", {})) * SECTION_WEIGHTS["impact"] +
        _section_score(result_json.get("contact", {})) * SECTION_WEIGHTS["contact"]
    )

    return {
        "overall_score": overall_score,
        "user_area": result_json.get("user_area"),
        "job_area": result_json.get("job_area"),
        "sections": {
            "skills": section_preview(result_json.get("skills", {})),
            "summary": section_preview(result_json.get("summary", {})),
            "dates": section_preview(result_json.get("dates", {})),
            "impact": section_preview(result_json.get("impact", {})),
            "contact": section_preview(result_json.get("contact", {})),
        },
    }


@router.get("/analysis/{analysis_id}")
async def get_analysis_result(
    analysis_id: str,
    current_user=Depends(require_auth),
):
    user = get_or_create_user(current_user.email)
    record = get_analysis(analysis_id)

    if record is None:
        raise HTTPException(status_code=404, detail="Análise não encontrada.")
    if record["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Acesso negado.")

    result_json = record.get("result_json") or {}

    if record.get("paid") or not PAYWALL_ENABLED:
        return {**result_json, "paywall_active": False}

    return {
        "paywall_active": True,
        "analysis_id": analysis_id,
        "preview": _build_preview(result_json),
    }
