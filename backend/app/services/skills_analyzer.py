import json
import os
import re

import anthropic


# ---------------------------------------------------------------------------
# Claude API — extração de skills
# ---------------------------------------------------------------------------

def _extract_skills_via_claude(resume_text: str, job_description: str) -> dict:
    """
    Chama a Claude API uma única vez para:
    - Extrair todas as hard skills da vaga (required vs nice_to_have)
    - Extrair todas as hard skills do currículo
    Retorna o JSON bruto parseado.
    """
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""Você é um extrator especializado de habilidades técnicas de currículos e vagas de emprego.

Sua tarefa é extrair hard skills e fazer a classificação descrita abaixo. Siga cada instrução com precisão absoluta.

---

## INSTRUÇÕES

### 1. Extrair skills da VAGA
Analise TODO o texto da vaga (título, descrição, responsabilidades, requisitos, diferenciais) e extraia TODAS as hard skills mencionadas.

Hard skills incluem: linguagens de programação, frameworks, bibliotecas, ferramentas, plataformas, tecnologias, softwares, metodologias técnicas, certificações e automações.

Separe em dois grupos baseando-se no contexto do texto:
- **"required"**: skills em seções de "Requisitos", "Obrigatório", "Necessário", "Responsabilidades", "O que esperamos", "Indispensável" ou sem classificação explícita
- **"nice_to_have"**: skills em seções de "Diferenciais", "Desejável", "Será um diferencial", "Plus", "Diferencial", "Bônus"

Se a vaga não separar claramente obrigatório de diferencial, coloque tudo em "required" e deixe "nice_to_have" vazio.

### 2. Extrair skills do CURRÍCULO
Analise TODO o texto do currículo e extraia TODAS as hard skills mencionadas, incluindo as citadas em experiências, projetos e seção de habilidades.

### 3. Regras obrigatórias
- Extraia TODAS as skills sem exceção — se a vaga mencionar 20 skills, todas as 20 devem aparecer
- NÃO invente skills que não estejam explicitamente no texto
- Mantenha o nome exato como aparece no texto (ex: "IBM RPA", "Power Platform", "Node.js")
- NÃO agrupe skills diferentes (ex: "AWS e Azure" → dois itens separados: "AWS" e "Azure")
- NÃO inclua soft skills (comunicação, liderança, trabalho em equipe, etc.)
- Responda APENAS com JSON puro, sem markdown, sem explicação, sem texto antes ou depois

---

## FORMATO DE RESPOSTA

{{
  "job_skills": {{
    "required": ["skill1", "skill2", "..."],
    "nice_to_have": ["skill3", "..."]
  }},
  "resume_skills": ["skill1", "skill4", "..."]
}}

---

## VAGA:
{job_description}

---

## CURRÍCULO:
{resume_text}

---

JSON:"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    tokens_used = message.usage.input_tokens + message.usage.output_tokens

    raw = message.content[0].text.strip()
    # Remover blocos de markdown defensivamente
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw), tokens_used


# ---------------------------------------------------------------------------
# Matching exato case-insensitive
# ---------------------------------------------------------------------------

# Caracteres que delimitam uma skill no texto: tudo exceto letras (ASCII + latim estendido para PT-BR) e dígitos.
# Usar lookbehind/lookahead explícito em vez de \b porque \b depende da definição de \w do Python
# com Unicode, que pode se comportar de forma imprevisível com texto extraído de PDF (espaços
# não-quebráveis, colons unicode, etc.).
_WORD_BOUNDARY = r'(?<![a-zA-Z0-9À-ÿ])'
_WORD_BOUNDARY_END = r'(?![a-zA-Z0-9À-ÿ])'


def _normalize_plural(text: str) -> str:
    """
    Remove 's' final de palavras para normalização singular/plural em português.
    Ex: "bancos de dados" → "banco de dado", "APIs" → "API", "frameworks" → "framework"
    Só remove 's' precedido de letra (preserva siglas/números como "C++", "3ds").
    """
    return re.sub(r'(?<=[a-zA-ZÀ-ÿ])s\b', '', text)


def _skill_found_in_text(
    skill_lower: str,
    resume_text_lower: str,
    resume_text_normalized: str | None = None,
) -> bool:
    """
    Busca a skill como substring com boundary no texto completo do currículo.
    Cobre todos os formatos: listas, 'Categoria: item1, item2', '(item)', etc.

    Etapa 2: full-text search exato.
    Etapa 3 (fallback): normaliza plural/singular e repete o match.
      Ex: "bancos de dados" (vaga) encontra "Banco de Dados" (currículo)
    """
    pattern = _WORD_BOUNDARY + re.escape(skill_lower) + _WORD_BOUNDARY_END
    if re.search(pattern, resume_text_lower):
        return True

    # Etapa 3: match com normalização de plural → singular
    if resume_text_normalized is not None:
        skill_normalized = _normalize_plural(skill_lower)
        # Só tenta se a skill realmente mudou após normalização
        if skill_normalized != skill_lower:
            norm_pattern = _WORD_BOUNDARY + re.escape(skill_normalized) + _WORD_BOUNDARY_END
            if re.search(norm_pattern, resume_text_normalized):
                return True

    return False


def _match_skills(job_skills: list[str], resume_skills: list[str], resume_text: str) -> tuple[list[str], list[str]]:
    """
    Retorna (matched, missing).
    Tenta match em 3 etapas:
    1. Match exato case-insensitive contra a lista de skills extraídas pelo Claude
    2. Se não encontrou, full-text search com boundary explícito em TODO o resume_text
       — encontra skills em qualquer formato: sub-categorias ('Banco de Dados: SQL'),
         listas entre parênteses ('Pacote Office (Excel, Word)'), itens após vírgulas, etc.
    3. Se ainda não encontrou, repete o full-text search com texto normalizado (plural→singular)
       — encontra "bancos de dados" no texto "Banco de Dados", "APIs" no texto "API", etc.
    """
    resume_lower = {s.lower(): s for s in resume_skills}
    resume_text_lower = resume_text.lower()
    resume_text_normalized = _normalize_plural(resume_text_lower)
    matched = []
    missing = []
    for skill in job_skills:
        skill_lower = skill.lower()
        # Etapa 1: match exato contra lista extraída pelo Claude
        if skill_lower in resume_lower:
            matched.append(skill)
        # Etapas 2 e 3: full-text search (exato e normalizado)
        elif _skill_found_in_text(skill_lower, resume_text_lower, resume_text_normalized):
            matched.append(skill)
        else:
            missing.append(skill)
    return matched, missing


# ---------------------------------------------------------------------------
# Score e status
# ---------------------------------------------------------------------------

def _compute_score(
    found_required: int,
    total_required: int,
    found_nice: int,
    total_nice: int,
) -> int:
    if total_required == 0 and total_nice == 0:
        return 0

    if total_nice > 0:
        req_ratio = found_required / total_required if total_required > 0 else 0.0
        nice_ratio = found_nice / total_nice
        raw = req_ratio * 0.7 + nice_ratio * 0.3
    else:
        raw = found_required / total_required if total_required > 0 else 0.0

    return round(raw * 100)


def _status(score: int) -> str:
    if score >= 70:
        return "green"
    if score >= 50:
        return "yellow"
    return "red"


# ---------------------------------------------------------------------------
# Função principal
# ---------------------------------------------------------------------------

def analyze_skills(resume_text: str, job_description: str) -> dict:
    extracted, tokens_used = _extract_skills_via_claude(resume_text, job_description)

    job_required: list[str] = extracted.get("job_skills", {}).get("required", [])
    job_nice: list[str] = extracted.get("job_skills", {}).get("nice_to_have", [])
    resume_skills: list[str] = extracted.get("resume_skills", [])

    matched_req, missing_req = _match_skills(job_required, resume_skills, resume_text)
    matched_nice, missing_nice = _match_skills(job_nice, resume_skills, resume_text)

    total_required = len(job_required)
    found_required = len(matched_req)
    total_nice = len(job_nice)
    found_nice = len(matched_nice)

    score_req = round(found_required / total_required * 100) if total_required > 0 else 0
    score_nice = round(found_nice / total_nice * 100) if total_nice > 0 else 0
    overall_score = _compute_score(found_required, total_required, found_nice, total_nice)

    return {
        "hard_skills": {
            "required": {
                "skills": job_required,
                "matched": matched_req,
                "missing": missing_req,
                "total": total_required,
                "found": found_required,
                "score": score_req,
            },
            "nice_to_have": {
                "skills": job_nice,
                "matched": matched_nice,
                "missing": missing_nice,
                "total": total_nice,
                "found": found_nice,
                "score": score_nice,
            },
        },
        "overall": {
            "total_required": total_required,
            "found_required": found_required,
            "total_nice_to_have": total_nice,
            "found_nice_to_have": found_nice,
            "score": overall_score,
            "status": _status(overall_score),
        },
        "tokens_used": tokens_used,
    }
