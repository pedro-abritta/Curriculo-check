import json
import os
import re

import anthropic

# ---------------------------------------------------------------------------
# Section header sets
# ---------------------------------------------------------------------------

_SUMMARY_HEADERS: set[str] = {
    "resumo profissional", "resumo", "sobre mim", "sobre",
    "summary", "about", "perfil profissional", "perfil", "objetivo",
}

# Todos os títulos de seção conhecidos — usados para detectar o fim do resumo
_ALL_SECTION_HEADERS: set[str] = _SUMMARY_HEADERS | {
    "experiência", "experiências", "experience", "experiences",
    "formação", "formação acadêmica", "educação", "education",
    "habilidades", "habilidades técnicas", "skills", "competências", "competencies",
    "certificações", "certificados", "certifications", "certificates",
    "idiomas", "línguas", "languages",
    "projetos", "projects",
    "conquistas", "achievements",
    "contato", "contact",
    "tecnologias", "ferramentas", "tools",
    "voluntariado", "voluntário", "volunteer",
    "publicações", "publications",
    "prêmios", "awards",
    "interesses", "interests",
}


# ---------------------------------------------------------------------------
# Extração do parágrafo de resumo
# ---------------------------------------------------------------------------

def _extract_summary_text(resume_text: str) -> str | None:
    """Localiza e extrai o parágrafo de resumo/sobre mim do currículo."""
    lines = resume_text.split('\n')

    summary_start: int | None = None
    for i, line in enumerate(lines):
        normalized = line.strip().rstrip(':').lower()
        if normalized in _SUMMARY_HEADERS:
            summary_start = i + 1
            break

    if summary_start is None:
        return None

    summary_lines: list[str] = []
    for line in lines[summary_start:]:
        normalized = line.strip().rstrip(':').lower()
        # Para na próxima seção (linha não-vazia que é um título conhecido)
        if normalized and normalized in _ALL_SECTION_HEADERS:
            break
        summary_lines.append(line)

    text = '\n'.join(summary_lines).strip()
    text = re.sub(r'\s+', ' ', text).strip()
    return text if text else None


# ---------------------------------------------------------------------------
# Pilar 1 — Métricas (regex)
# ---------------------------------------------------------------------------

_METRIC_RE = re.compile(
    r'(?:'
    r'\d+[\.,]\d+\s*%'                   # decimal %: 16,5% ou 16.5%
    r'|\d+\s*%'                           # inteiro %: 80%
    r'|R\$\s*[\d\.]+(?:,\d+)?'           # BRL: R$1.000,00
    r'|\$\s*[\d\.]+(?:[MKBmkb])?'        # USD: $50M
    r'|\d+\s*anos?'                       # 4 anos
    r'|\d+\s*meses?'                      # 6 meses
    r'|\d+\s*horas?'                      # 10 horas
    r'|\d+\s*semanas?'                    # 3 semanas
    r')',
    re.IGNORECASE,
)


def _extract_metrics(summary_text: str) -> list[str]:
    return _METRIC_RE.findall(summary_text)


# ---------------------------------------------------------------------------
# Pilar 2 — Skills da vaga no resumo (regex, sem API)
# ---------------------------------------------------------------------------

def _match_skills_in_summary(
    summary_text: str, job_skills: list[str]
) -> tuple[list[str], list[str]]:
    """
    Busca cada skill da vaga no parágrafo de resumo como palavra inteira,
    case-insensitive. Mesma lógica do _match_skills do skills_analyzer.
    """
    text_lower = summary_text.lower()
    found: list[str] = []
    missing: list[str] = []
    for skill in job_skills:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found.append(skill)
        else:
            missing.append(skill)
    return found, missing


# ---------------------------------------------------------------------------
# Pilar 3 — Verbos de impacto (Claude API)
# ---------------------------------------------------------------------------

def _extract_impact_verbs(summary_text: str) -> list[str]:
    """Chama a Claude API para identificar verbos de ação/impacto no resumo."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""Analise o resumo profissional abaixo e identifique os verbos de ação e impacto.

Verbos de impacto demonstram protagonismo e resultado. Exemplos:
- ACEITOS: "liderei", "desenvolvi", "reduzi", "transformei", "implementei", "automatizei", "otimizei", "alcancei", "viabilizei", "aumentei", "gerenciei", "criando", "eliminando", "entregando", "conectando", "construí", "estruturei"
- REJEITADOS (genéricos): "tenho", "sou", "possuo", "trabalho", "faço", "fui", "estou", "busco", "gosto", "atuo", "sendo"

Responda APENAS com JSON puro, sem markdown, sem explicação:
{{"impact_verbs": ["verbo1", "verbo2", ...]}}

Se não houver nenhum verbo de impacto, retorne: {{"impact_verbs": []}}

RESUMO:
{summary_text}

JSON:"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    data = json.loads(raw)
    return data.get("impact_verbs", [])


# ---------------------------------------------------------------------------
# Score e status
# ---------------------------------------------------------------------------

def _pillar_status(count: int) -> str:
    return "pass" if count >= 2 else "fail"


def _compute_status(pillars_passed: int) -> str:
    failed = 3 - pillars_passed
    if failed == 0:
        return "green"
    if failed == 1:
        return "yellow"
    return "red"


# ---------------------------------------------------------------------------
# Função principal
# ---------------------------------------------------------------------------

def analyze_summary(resume_text: str, job_skills: list[str]) -> dict:
    summary_text = _extract_summary_text(resume_text)

    if not summary_text:
        return {
            "summary_text": None,
            "error": "Nenhuma seção de resumo encontrada no currículo.",
            "pillars": None,
            "pillars_passed": 0,
            "total_pillars": 3,
            "score": 0,
            "status": "red",
        }

    # Pilar 1 — Métricas
    metrics_found = _extract_metrics(summary_text)
    metrics_status = _pillar_status(len(metrics_found))

    # Pilar 2 — Skills
    skills_found, _skills_missing = _match_skills_in_summary(summary_text, job_skills)
    skills_status = _pillar_status(len(skills_found))

    # Pilar 3 — Verbos de impacto
    impact_verbs = _extract_impact_verbs(summary_text)
    verbs_status = _pillar_status(len(impact_verbs))

    pillars_passed = sum(
        1 for s in (metrics_status, skills_status, verbs_status) if s == "pass"
    )
    score = round(pillars_passed / 3 * 100)

    return {
        "summary_text": summary_text,
        "pillars": {
            "metrics": {
                "found": metrics_found,
                "count": len(metrics_found),
                "status": metrics_status,
            },
            "skills": {
                "found": skills_found,
                "count": len(skills_found),
                "status": skills_status,
            },
            "impact_verbs": {
                "found": impact_verbs,
                "count": len(impact_verbs),
                "status": verbs_status,
            },
        },
        "pillars_passed": pillars_passed,
        "total_pillars": 3,
        "score": score,
        "status": _compute_status(pillars_passed),
    }
