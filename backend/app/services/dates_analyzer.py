import re
from collections import defaultdict

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

_MM_YYYY = r'(?:0[1-9]|1[0-2])/(?:19|20)\d{2}'
_CURRENT_TERM = r'(?:atual|presente)'

# Correto: mm/yyyy, opcionalmente seguido de range (mm/yyyy ou atual/presente)
_CORRECT_RE = re.compile(
    rf'(?:{_MM_YYYY})(?:\s*[-–]\s*(?:{_MM_YYYY}|{_CURRENT_TERM}))?',
    re.IGNORECASE,
)

# Incorreto: range apenas com anos (ex: "2019 - 2022", "2019–2022")
_YEAR_RANGE_RE = re.compile(
    r'\b((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2})\b'
)

# Incorreto: mês por extenso ou abreviado (ex: "janeiro de 2025", "jan/2023", "jan. 2023")
_PT_MONTHS_PAT = (
    r'(?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|'
    r'setembro|outubro|novembro|dezembro|'
    r'jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)'
)
_WRITTEN_MONTH_RE = re.compile(
    rf'\b{_PT_MONTHS_PAT}[./]?\s*(?:de\s*)?(?:19|20)\d{{2}}\b',
    re.IGNORECASE,
)

# Incorreto: formato americano (ex: "01-2025", "2025/01")
_AMERICAN_RE = re.compile(
    r'\b(?:0[1-9]|1[0-2])-(?:19|20)\d{2}\b'
    r'|\b(?:19|20)\d{2}/(?:0[1-9]|1[0-2])\b'
)

# Incorreto: ano isolado — não precedido nem seguido de "/" ou outro dígito
_ISOLATED_YEAR_RE = re.compile(
    r'(?<![/\d])\b((?:19|20)\d{2})\b(?![/\d])'
)


# ---------------------------------------------------------------------------
# Overlap helper
# ---------------------------------------------------------------------------

def _overlaps(span: tuple[int, int], used: list[tuple[int, int]]) -> bool:
    for s, e in used:
        if span[0] < e and span[1] > s:
            return True
    return False


# ---------------------------------------------------------------------------
# Suggestion generators
# ---------------------------------------------------------------------------

def _suggestion_year_range(original: str) -> str:
    years = re.findall(r'(?:19|20)\d{2}', original)
    if len(years) == 2:
        return f"Use o formato mm/aaaa - mm/aaaa, ex: 01/{years[0]} - 12/{years[1]}"
    return "Use o formato mm/aaaa - mm/aaaa, ex: 01/2019 - 12/2022"


def _suggestion_missing_month(year: str) -> str:
    return f"Use o formato mm/aaaa, ex: 01/{year.strip()}"


# ---------------------------------------------------------------------------
# Extração principal
# ---------------------------------------------------------------------------

def _extract_all_dates(resume_text: str) -> list[dict]:
    """
    Extrai todas as referências temporais do texto.
    Ordem de prioridade garante que padrões mais específicos não sejam
    sobrescritos por padrões mais genéricos.
    """
    results: list[dict] = []
    used_spans: list[tuple[int, int]] = []

    # 1. Corretos — maior prioridade
    for m in _CORRECT_RE.finditer(resume_text):
        span = m.span()
        if not _overlaps(span, used_spans):
            used_spans.append(span)
            results.append({"original": m.group(
                0), "status": "correct", "span": span})

    # 2. Range só com anos (ex: "2019 - 2022")
    for m in _YEAR_RANGE_RE.finditer(resume_text):
        span = m.span()
        if not _overlaps(span, used_spans):
            used_spans.append(span)
            results.append({
                "original": m.group(0),
                "status": "incorrect",
                "error_type": "year_range_only",
                "suggestion": _suggestion_year_range(m.group(0)),
                "span": span,
            })

    # 3. Mês por extenso ou abreviado (ex: "janeiro de 2025", "jan/2023")
    for m in _WRITTEN_MONTH_RE.finditer(resume_text):
        span = m.span()
        if not _overlaps(span, used_spans):
            used_spans.append(span)
            results.append({
                "original": m.group(0),
                "status": "incorrect",
                "error_type": "written_month",
                "suggestion": "Use o formato mm/aaaa, ex: 01/2025",
                "span": span,
            })

    # 4. Formato americano (ex: "01-2025", "2025/01")
    for m in _AMERICAN_RE.finditer(resume_text):
        span = m.span()
        if not _overlaps(span, used_spans):
            used_spans.append(span)
            results.append({
                "original": m.group(0),
                "status": "incorrect",
                "error_type": "wrong_format",
                "suggestion": "Use o formato mm/aaaa, ex: 01/2025",
                "span": span,
            })

    # 5. Ano isolado — processado por último para evitar dupla contagem
    #    Captura tanto anos soltos quanto anos após "–" em certificações
    for m in _ISOLATED_YEAR_RE.finditer(resume_text):
        span = m.span()
        if not _overlaps(span, used_spans):
            used_spans.append(span)
            results.append({
                "original": m.group(0),
                "status": "incorrect",
                "error_type": "missing_month",
                "suggestion": _suggestion_missing_month(m.group(0)),
                "span": span,
            })

    # Ordenar por posição no texto (span é mantido para uso posterior)
    results.sort(key=lambda x: x["span"][0])
    return results


# ---------------------------------------------------------------------------
# Error groups
# ---------------------------------------------------------------------------

_ERROR_GROUP_META: dict[str, dict] = {
    "missing_month": {
        "message": "Adicione o mês para estas datas",
        "suggestion": "Use o formato mm/aaaa, ex: 01/2018",
    },
    "written_month": {
        "message": "Substitua o mês por extenso pelo formato numérico",
        "suggestion": "Use o formato mm/aaaa, ex: 01/2025",
    },
    "year_range_only": {
        "message": "Ranges com apenas ano precisam incluir o mês",
        "suggestion": "Use o formato mm/aaaa - mm/aaaa, ex: 01/2019 - 12/2022",
    },
    "wrong_format": {
        "message": "Formato de data inválido",
        "suggestion": "Use o formato mm/aaaa, ex: 01/2025",
    },
}


def _extract_context(resume_text: str, span_start: int, date_original: str) -> str:
    """Encontra contexto da data: usa a linha atual, se vazia sobe UMA linha."""
    lines = resume_text.split('\n')
    pos = 0
    line_index = -1

    # Encontrar qual linha contém a data
    for i, line in enumerate(lines):
        line_end = pos + len(line)
        if pos <= span_start < line_end:
            line_index = i
            break
        pos = line_end + 1

    if line_index == -1:
        return ""

    # Tentar a linha atual primeiro
    context = lines[line_index]
    context = context.replace(date_original, '', 1)
    context = context.strip(' \t•–-|·:')
    context = re.sub(r'\s+', ' ', context).strip()

    # Se a linha atual não tem contexto útil (< 10 chars), pegar a linha anterior
    if len(context) < 10 and line_index > 0:
        context = lines[line_index - 1]
        context = context.strip(' \t•–-|·:')
        context = re.sub(r'\s+', ' ', context).strip()

    # Se AINDA não tem contexto (< 10 chars), concatenar as 2 linhas anteriores
    if len(context) < 10 and line_index > 1:
        context = lines[line_index - 2].strip() + ' ' + \
            lines[line_index - 1].strip()
        context = context.strip(' \t•–-|·:')
        context = re.sub(r'\s+', ' ', context).strip()

    # Limpeza final
    context = context.strip(' \t•–-|·:')
    return context


def _build_error_groups(dates: list[dict], resume_text: str) -> list[dict]:
    groups: dict[str, list[str]] = defaultdict(list)
    for d in dates:
        if d["status"] == "incorrect":
            context = _extract_context(
                resume_text, d["span"][0], d["original"])
            entry = f"{d['original']} (em: {context})" if context else d["original"]
            groups[d["error_type"]].append(entry)

    return [
        {
            "type": error_type,
            "message": _ERROR_GROUP_META[error_type]["message"],
            "dates": date_list,
            "suggestion": _ERROR_GROUP_META[error_type]["suggestion"],
        }
        for error_type, date_list in groups.items()
    ]


# ---------------------------------------------------------------------------
# Score e status
# ---------------------------------------------------------------------------

def _compute_status(correct: int, total: int) -> str:
    incorrect = total - correct
    if incorrect == 0:
        return "green"
    if incorrect > total / 2:
        return "red"
    return "yellow"


# ---------------------------------------------------------------------------
# Função principal
# ---------------------------------------------------------------------------

def analyze_dates(resume_text: str) -> dict:
    all_dates = _extract_all_dates(resume_text)

    total = len(all_dates)
    correct = sum(1 for d in all_dates if d["status"] == "correct")
    incorrect = total - correct
    score = round(correct / total * 100) if total > 0 else 0

    dates_output = []
    for d in all_dates:
        entry: dict = {"original": d["original"], "status": d["status"]}
        if d["status"] == "incorrect":
            entry["suggestion"] = d["suggestion"]
        dates_output.append(entry)

    return {
        "dates": dates_output,
        "total": total,
        "correct": correct,
        "incorrect": incorrect,
        "score": score,
        "status": _compute_status(correct, total),
        "error_groups": _build_error_groups(all_dates, resume_text),
        "tokens_used": 0,
    }
