import json
import os
import re

import anthropic

# ---------------------------------------------------------------------------
# Section header sets
# ---------------------------------------------------------------------------

_SUMMARY_HEADERS: set[str] = {
    # Português
    "resumo", "resumo profissional",
    "sobre", "sobre mim",
    "perfil", "perfil profissional",
    "objetivo", "objetivo profissional",
    "apresentação",
    "síntese", "síntese profissional",
    "qualificações",
    "sumário", "sumário profissional",
    # Inglês
    "summary", "professional summary", "career summary", "executive summary",
    "about", "about me",
    "profile", "professional profile",
    "objective", "career objective",
    "overview",
    "personal statement",
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

# Padrões de linha de contato — usados no fallback
_CONTACT_LINE_RE = re.compile(
    r'@|https?://|linkedin\.com|github\.com|\+\d{1,3}[\s(]|\(\d{2}\)\s*\d',
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Extração do parágrafo de resumo
# ---------------------------------------------------------------------------

def _fallback_first_paragraph(lines: list[str]) -> str | None:
    """
    Fallback para currículos sem título de seção explícito.
    Agrupa as linhas em blocos separados por linha vazia e retorna o primeiro
    bloco que pareça um parágrafo descritivo (não nome, contato ou título de seção).
    Um bloco é considerado descritivo se tiver >= 10 palavras no total.
    """
    blocks: list[list[str]] = []
    current: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current:
                blocks.append(current)
                current = []
        else:
            current.append(stripped)
    if current:
        blocks.append(current)

    for block in blocks:
        # Rejeita blocos com linhas de contato (e-mail, URL, telefone)
        if any(_CONTACT_LINE_RE.search(ln) for ln in block):
            continue
        # Rejeita blocos que sejam apenas um título de seção conhecido
        if any(ln.rstrip(':').lower() in _ALL_SECTION_HEADERS for ln in block):
            continue
        text = re.sub(r'\s+', ' ', ' '.join(block)).strip()
        # Parágrafo descritivo: pelo menos 10 palavras
        if len(text.split()) >= 10:
            return text

    return None


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
        # Nenhum título de seção reconhecido — usa o primeiro parágrafo descritivo
        return _fallback_first_paragraph(lines)

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


# ---------------------------------------------------------------------------
# Pilar 2 — Skills da vaga no resumo (regex, sem API)
# ---------------------------------------------------------------------------

def _match_skills_in_summary(
    summary_text: str, job_skills: list[str]
) -> tuple[list[str], list[str]]:
    """Retorna (found_values, missing_values) — apenas strings, sem contexto ainda."""
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
# Pilares 1+2+3 — Única chamada Claude API
# ---------------------------------------------------------------------------

def _analyze_with_claude(
    summary_text: str,
    metrics: list[str],
    skills_found: list[str],
) -> dict:
    """
    Uma única chamada à Claude API que retorna:
    - impact_verbs: verbos de ação identificados no resumo
    - metrics_context: descrição curta (≤5 palavras) para cada métrica
    - skills_context: descrição curta (≤5 palavras) para cada skill encontrada
    - verbs_context: descrição curta (≤5 palavras) para cada verbo de impacto
    """
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""Analise o resumo profissional abaixo e execute as 4 tarefas.

TAREFA 1 — Identifique os verbos de ação e impacto presentes no resumo.
- ACEITOS: "liderei", "desenvolvi", "reduzi", "transformei", "implementei", "automatizei", "otimizei", "alcancei", "viabilizei", "aumentei", "gerenciei", "criando", "eliminando", "entregando", "conectando", "construí", "estruturei"
- REJEITADOS (genéricos): "tenho", "sou", "possuo", "trabalho", "faço", "fui", "estou", "busco", "gosto", "atuo", "sendo"

TAREFA 2 — Para cada métrica da lista abaixo, gere uma descrição de até 5 palavras em português explicando o que ela representa no resumo. Não repita a métrica na descrição.
Métricas: {json.dumps(metrics, ensure_ascii=False)}

TAREFA 3 — Para cada skill da lista abaixo, gere uma descrição de até 5 palavras em português explicando como ela aparece no resumo. Não repita a skill na descrição.
Skills: {json.dumps(skills_found, ensure_ascii=False)}

TAREFA 4 — Para cada verbo de impacto identificado na TAREFA 1, gere uma descrição de até 5 palavras em português explicando o que ele representa no resumo.

Responda APENAS com JSON puro, sem markdown, sem explicação:
{{
  "impact_verbs": ["verbo1", "verbo2"],
  "metrics_context": {{"metrica1": "descricao curta", "metrica2": "descricao curta"}},
  "skills_context": {{"skill1": "descricao curta", "skill2": "descricao curta"}},
  "verbs_context": {{"verbo1": "descricao curta", "verbo2": "descricao curta"}}
}}

RESUMO:
{summary_text}

JSON:"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    tokens_used = message.usage.input_tokens + message.usage.output_tokens

    raw = message.content[0].text.strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw), tokens_used


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
            "tokens_used": 0,
        }

    # Pilares 1 e 2 — detecção via regex (sem API)
    metric_values = _METRIC_RE.findall(summary_text)
    skills_found_values, _skills_missing = _match_skills_in_summary(summary_text, job_skills)

    # Única chamada Claude API — verbos + contextos
    claude, tokens_used = _analyze_with_claude(summary_text, metric_values, skills_found_values)

    metrics_context: dict = claude.get("metrics_context", {})
    skills_context: dict = claude.get("skills_context", {})
    verbs_context: dict = claude.get("verbs_context", {})
    verb_list: list[str] = claude.get("impact_verbs", [])

    metrics_found = [{"value": v, "context": metrics_context.get(v, "")} for v in metric_values]
    skills_found = [{"value": s, "context": skills_context.get(s, "")} for s in skills_found_values]
    impact_verbs = [{"value": v, "context": verbs_context.get(v, "")} for v in verb_list]

    metrics_status = _pillar_status(len(metrics_found))
    skills_status = _pillar_status(len(skills_found))
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
        "tokens_used": tokens_used,
    }
