import io
import logging
import re

import pdfplumber
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from app.limiter import limiter
from app.middleware.auth_middleware import require_auth
from app.services.area_classifier import classify_areas
from app.services.contact_analyzer import analyze_contact
from app.services.database import add_tokens, get_or_create_user, save_analysis, update_user_area
from app.services.dates_analyzer import analyze_dates
from app.services.impact_analyzer import analyze_impact
from app.services.parser import extract_text_from_docx, extract_text_from_pdf
from app.services.paywall_toggle import PAYWALL_ENABLED
from app.services.resume_validator import validate_resume
from app.services.sanitizer import validate_text
from app.services.section_toggle import ACTIVE_SECTIONS
from app.services.skills_analyzer import analyze_skills
from app.services.summary_analyzer import analyze_summary

logger = logging.getLogger("security")

# ---------------------------------------------------------------------------
# Detecção de formatação irregular (títulos/nome com espaços entre letras)
# ---------------------------------------------------------------------------

# Detecta sequências de letras maiúsculas isoladas separadas por espaço(s)
# Ex: "P R O F E S S I O N A L  S U M M A R Y"
_SPACED_TITLE_RE = re.compile(r'\b[A-ZÀ-Ú](?:[ \t]+[A-ZÀ-Ú]){2,}\b')


def _has_spaced_titles(text: str) -> bool:
    """Retorna True se o texto contém títulos de seção com letras espaçadas."""
    return bool(_SPACED_TITLE_RE.search(text))


def _has_spaced_name(resume_text: str) -> bool:
    """Retorna True se a primeira linha não-vazia contém muitas letras isoladas (nome espaçado)."""
    for line in resume_text.split('\n'):
        stripped = line.strip()
        if stripped:
            # Letra isolada = não adjacente a outra letra
            isolated = re.findall(
                r'(?<![A-Za-zÀ-ú])[A-Za-zÀ-ú](?![A-Za-zÀ-ú])', stripped
            )
            return len(isolated) >= 4
    return False


router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_JOB_DESCRIPTION = 10_000

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

DANGEROUS_EXTENSIONS = frozenset({
    ".exe", ".bat", ".cmd", ".sh", ".js", ".py", ".rb",
    ".php", ".pl", ".vbs", ".ps1", ".jar", ".msi", ".scr",
})

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
        score = section.get("overall", {}).get(
            "score", section.get("score", 0))
        status = section.get("overall", {}).get(
            "status", section.get("status", "red"))
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
@limiter.limit("10/hour")
async def analyze(
    request: Request,
    file: UploadFile = File(...),
    job_description: str = Form(...),
    current_user=Depends(require_auth),
):
    # Rejeitar extensões perigosas no nome do arquivo
    filename = (file.filename or "").lower()
    for ext in DANGEROUS_EXTENSIONS:
        if ext in filename:
            logger.warning("Rejected dangerous file extension: %s", filename)
            raise HTTPException(
                status_code=422,
                detail="Formato inválido. Envie um arquivo .pdf ou .docx.",
            )

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
    if len(job_description) > MAX_JOB_DESCRIPTION:
        raise HTTPException(
            status_code=422,
            detail="A descrição da vaga deve ter no máximo 10.000 caracteres.",
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

    # Detecção de formatação irregular (texto original mantido intacto)
    formatting_warnings: list[str] = []
    if _has_spaced_titles(resume_text):
        formatting_warnings.append(
            "Detectamos que seu currículo usa títulos com espaços entre letras "
            "(ex: 'P R O F E S S I O N A L'). Isso pode dificultar a leitura por "
            "sistemas ATS reais. Recomendamos usar formatação padrão."
        )
    if _has_spaced_name(resume_text):
        formatting_warnings.append(
            "O nome no currículo pode estar com formatação irregular. Verifique se está correto."
        )

    # Sanitizar textos antes de qualquer processamento
    print(f">>> SANITIZER: validando resume_text ({len(resume_text)} chars)")
    is_safe, error_msg = validate_text(resume_text)
    print(f">>> SANITIZER resume: safe={is_safe}")
    if not is_safe:
        logger.warning("Malicious content detected in uploaded resume")
        raise HTTPException(status_code=400, detail=error_msg)

    print(
        f">>> SANITIZER: validando job_description ({len(job_description)} chars)")
    is_safe, error_msg = validate_text(job_description)
    print(f">>> SANITIZER job: safe={is_safe}")
    if not is_safe:
        logger.warning("Malicious content detected in job description")
        raise HTTPException(status_code=400, detail=error_msg)

    # Pré-validação: verificar se o arquivo é um currículo legível
    validation = validate_resume(resume_text)
    if not validation["is_resume"]:
        raise HTTPException(
            status_code=400,
            detail="O arquivo enviado não parece ser um currículo. Envie um currículo em formato PDF ou DOCX.",
        )
    if not validation["is_readable"]:
        raise HTTPException(
            status_code=400,
            detail="Seu currículo parece ter problemas de formatação (colunas, imagens sobre texto, etc.) que dificultam a leitura. Recomendamos usar um modelo de coluna única sem elementos gráficos.",
        )

    # Seções de análise (controladas por ACTIVE_SECTIONS)
    contact = analyze_contact(
        resume_text) if ACTIVE_SECTIONS["contact"] else _DISABLED

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

    dates = analyze_dates(
        resume_text) if ACTIVE_SECTIONS["dates"] else _DISABLED
    summary = analyze_summary(
        resume_text, job_skills) if ACTIVE_SECTIONS["summary"] else _DISABLED
    impact = analyze_impact(
        resume_text) if ACTIVE_SECTIONS["impact_phrases"] else _DISABLED

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
        "formatting_warnings": formatting_warnings,
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
    analysis_record = save_analysis(
        user["id"], areas["job_area"], total_tokens, full_result)
    add_tokens(user["id"], total_tokens)

    if not PAYWALL_ENABLED:
        return {**full_result, "paywall_active": False, "analysis_id": analysis_record["id"]}

    return {
        "paywall_active": True,
        "analysis_id": analysis_record["id"],
        "preview": _build_preview(full_result, overall_score),
    }
