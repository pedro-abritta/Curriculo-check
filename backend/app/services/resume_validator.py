import json
import os
import re

import anthropic

# ---------------------------------------------------------------------------
# Fallback quando a API falha: não bloqueia o usuário
# ---------------------------------------------------------------------------

_FALLBACK_VALID = {
    "is_resume": True,
    "is_readable": True,
    "is_job_description": True,
    "issues": [],
    "confidence": 50,
}


# ---------------------------------------------------------------------------
# Validação combinada: currículo + descrição de vaga em uma única chamada
# ---------------------------------------------------------------------------

def validate_inputs(resume_text: str, job_description: str) -> dict:
    """
    Verifica em uma única chamada Claude API:
      1. Se o texto extraído é um currículo profissional válido e legível.
      2. Se a descrição da vaga é de fato uma descrição de vaga.

    Returns:
        dict com:
          - is_resume        (bool) — o documento é um currículo?
          - is_readable      (bool) — o texto está legível e estruturado?
          - is_job_description (bool) — o texto é uma descrição de vaga?
          - issues           (list) — lista de problemas encontrados
          - confidence       (int)  — 0-100
    """
    resume_stripped = resume_text.strip()
    job_stripped = job_description.strip()

    # Fast-path: cheques locais antes de chamar a API
    fast_issues: list[str] = []
    resume_too_short = len(resume_stripped) < 100
    job_too_short = len(job_stripped) < 50

    if resume_too_short:
        fast_issues.append("Texto do currículo muito curto (menos de 100 caracteres).")
    if job_too_short:
        fast_issues.append("Descrição da vaga muito curta (menos de 50 caracteres).")

    if resume_too_short or job_too_short:
        return {
            "is_resume": not resume_too_short,
            "is_readable": not resume_too_short,
            "is_job_description": not job_too_short,
            "issues": fast_issues,
            "confidence": 0,
        }

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # Trunca para economizar tokens: 1500 chars do currículo, 800 da vaga
    resume_excerpt = resume_stripped[:1500]
    job_excerpt = job_stripped[:800]

    prompt = f"""Analise dois textos e responda com JSON puro (sem markdown).

═══ TEXTO 1: CURRÍCULO (extraído de PDF/DOCX) ═══
{resume_excerpt}

═══ TEXTO 2: DESCRIÇÃO DA VAGA ═══
{job_excerpt}

AVALIE O CURRÍCULO (is_resume / is_readable):

is_resume = false quando:
- Não contém elementos típicos de currículo (nome, experiência, formação ou contato)
- É claramente outro tipo de documento: conta de luz, receita, artigo científico, contrato, nota fiscal, manual, bula, etc.

is_readable = false quando:
- Texto embaralhado (colunas misturadas, palavras sem sentido, quebras no meio de palavras)
- Excesso de caracteres especiais ou lixo tipográfico que impede a leitura
- Conteúdo insuficiente para análise

Seja TOLERANTE com: currículos simples, sem títulos de seção, em outros idiomas, com pequenos erros de encoding.

AVALIE A DESCRIÇÃO DA VAGA (is_job_description):

is_job_description = false quando:
- Não contém elementos típicos de vaga (cargo, responsabilidades, requisitos ou qualificações)
- É claramente outro tipo de conteúdo: receita, letra de música, texto aleatório, artigo, conversa, etc.
- Texto muito genérico sem qualquer indicação de contexto profissional

Seja TOLERANTE com: vagas curtas, informais, em outros idiomas, sem estrutura explícita.

Responda APENAS com este JSON:
{{
  "is_resume": true,
  "is_readable": true,
  "is_job_description": true,
  "issues": [],
  "confidence": 85
}}

JSON:"""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = message.content[0].text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)

        result = json.loads(raw)
        return {
            "is_resume": bool(result.get("is_resume", True)),
            "is_readable": bool(result.get("is_readable", True)),
            "is_job_description": bool(result.get("is_job_description", True)),
            "issues": list(result.get("issues", [])),
            "confidence": int(result.get("confidence", 50)),
        }

    except Exception:
        # Falha na API ou parse: não bloqueia o usuário
        return _FALLBACK_VALID
