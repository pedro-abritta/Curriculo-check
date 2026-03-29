from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.contact_analyzer import analyze_contact
from app.services.dates_analyzer import analyze_dates
from app.services.parser import extract_text_from_docx, extract_text_from_pdf
from app.services.section_toggle import ACTIVE_SECTIONS
from app.services.skills_analyzer import analyze_skills

router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

_DISABLED = {"disabled": True}


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    job_description: str = Form(...),
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
    skills = analyze_skills(resume_text, job_description) if ACTIVE_SECTIONS["skills"] else _DISABLED
    dates = analyze_dates(resume_text) if ACTIVE_SECTIONS["dates"] else _DISABLED

    return {
        "status": "success",
        "resume_text": resume_text,
        "job_description": job_description,
        "resume_length": len(resume_text),
        "job_description_length": len(job_description),
        "contact": contact,
        "skills": skills,
        "dates": dates,
    }
