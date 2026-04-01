from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.middleware.auth_middleware import require_auth
from app.services.area_classifier import classify_areas
from app.services.contact_analyzer import analyze_contact
from app.services.database import add_tokens, get_or_create_user, save_analysis, update_user_area
from app.services.dates_analyzer import analyze_dates
from app.services.impact_analyzer import analyze_impact
from app.services.parser import extract_text_from_docx, extract_text_from_pdf
from app.services.paywall_toggle import PAYWALL_ENABLED
from app.services.section_toggle import ACTIVE_SECTIONS
from app.services.skills_analyzer import analyze_skills
from app.services.summary_analyzer import analyze_summary

router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

_DISABLED = {"disabled": True}

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


def _build_preview(full_result: dict, overall_score: int) -> dict:
    def section_preview(section: dict) -> dict:
        if not section or section.get("disabled"):
            return {"score": 0, "status": "red", "disabled": True}
        score = section.get("overall", {}).get("score", section.get("score", 0))
        status = section.get("overall", {}).get("status", section.get("status", "red"))
        return {"score": score, "status": status}

    return {
        "overall_score": overall_score,
        "user_area": full_result["user_area"],
        "job_area": full_result["job_area"],
        "sections": {
            "skills": section_preview(full_result["skills"]),
            "summary": section_preview(full_result["summary"]),
            "dates": section_preview(full_result["dates"]),
            "impact": section_preview(full_result["impact"]),
            "contact": section_preview(full_result["contact"]),
        },
    }


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    current_user=Depends(require_auth),
):
    # Validar tipo do arquivo
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail="Formato inválido. Envie um arquivo .pdf ou .docx.",
        )

    # Ler conteúdo e validar tamanho
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=422,
            detail="O arquivo excede o limite de 5MB.",
        )

    # Validar descrição da vaga
    job_description = job_description.strip()
    if not job_description:
        raise HTTPException(
            status_code=422,
            detail="A descrição da vaga não pode estar vazia.",
        )

    # Extrair texto
    try:
        if file.content_type == "application/pdf":
            resume_text = extract_text_from_pdf(file_bytes)
        else:
            resume_text = extract_text_from_docx(file_bytes)
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="Não foi possível extrair o texto do arquivo. Verifique se o arquivo não está corrompido.",
        )

    if not resume_text:
        raise HTTPException(
            status_code=422,
            detail="Nenhum texto encontrado no arquivo. O documento pode estar vazio ou protegido.",
        )

    # Seções de análise (controladas por ACTIVE_SECTIONS)
    contact = analyze_contact(resume_text) if ACTIVE_SECTIONS["contact"] else _DISABLED

    # Skills roda antes do summary para fornecer job_skills
    if ACTIVE_SECTIONS["skills"]:
        skills = analyze_skills(resume_text, job_description)
        job_skills = (
            skills["hard_skills"]["required"]["skills"]
            + skills["hard_skills"]["nice_to_have"]["skills"]
        )
    else:
        skills = _DISABLED
        job_skills = []

    dates = analyze_dates(resume_text) if ACTIVE_SECTIONS["dates"] else _DISABLED
    summary = analyze_summary(resume_text, job_skills) if ACTIVE_SECTIONS["summary"] else _DISABLED
    impact = analyze_impact(resume_text) if ACTIVE_SECTIONS["impact_phrases"] else _DISABLED

    # Classificação de áreas (usuário e vaga)
    areas = classify_areas(resume_text, job_description)

    # Total de tokens consumidos em todas as chamadas Claude API
    total_tokens = sum([
        contact.get("tokens_used", 0),
        skills.get("tokens_used", 0),
        dates.get("tokens_used", 0),
        summary.get("tokens_used", 0),
        impact.get("tokens_used", 0),
        areas.get("tokens_used", 0),
    ])

    # Resultado completo
    full_result = {
        "status": "success",
        "resume_text": resume_text,
        "job_description": job_description,
        "resume_length": len(resume_text),
        "job_description_length": len(job_description),
        "user_area": areas["user_area"],
        "job_area": areas["job_area"],
        "total_tokens_used": total_tokens,
        "contact": contact,
        "skills": skills,
        "dates": dates,
        "summary": summary,
        "impact": impact,
    }

    # Score geral (mesmos pesos do frontend)
    overall_score = round(
        _section_score(skills) * SECTION_WEIGHTS["skills"] +
        _section_score(summary) * SECTION_WEIGHTS["summary"] +
        _section_score(dates) * SECTION_WEIGHTS["dates"] +
        _section_score(impact) * SECTION_WEIGHTS["impact"] +
        _section_score(contact) * SECTION_WEIGHTS["contact"]
    )

    # Persistência no banco
    user = get_or_create_user(current_user.email)
    update_user_area(user["id"], areas["user_area"])
    analysis_record = save_analysis(user["id"], areas["job_area"], total_tokens, full_result)
    add_tokens(user["id"], total_tokens)

    if not PAYWALL_ENABLED:
        return {**full_result, "paywall_active": False}

    return {
        "paywall_active": True,
        "analysis_id": analysis_record["id"],
        "preview": _build_preview(full_result, overall_score),
    }
