import json
import os
import re

import anthropic


# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

_EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)

_PHONE_RE = re.compile(
    r"""
    (?:
        (?:\+55[\s\-]?)?            # DDI Brasil opcional
        (?:\(?\d{2}\)?[\s\-]?)      # DDD (XX) ou XX
        (?:9[\s\-]?\d{4}[\s\-]?\d{4}   # celular com 9 + 8 dígitos
        |\d{4}[\s\-]?\d{4})         # fixo 8 dígitos
    )
    |
    (?:\+\d{1,3}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{3,5}[\s\-]?\d{4,9})  # internacional
    """,
    re.VERBOSE,
)

_LINKEDIN_RE = re.compile(
    r"(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9\-_%]+/?",
    re.IGNORECASE,
)

_URL_RE = re.compile(
    r"https?://[^\s\)\]\>\"\']+",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Regex extractors
# ---------------------------------------------------------------------------

def _extract_email(text: str) -> str | None:
    match = _EMAIL_RE.search(text)
    return match.group(0).lower() if match else None


def _extract_phone(text: str) -> str | None:
    for match in _PHONE_RE.finditer(text):
        value = match.group(0).strip()
        # Descartar matches com dígitos demais (falso positivo de datas/CEPs)
        digits = re.sub(r"\D", "", value)
        if 8 <= len(digits) <= 15:
            return value
    return None


def _extract_linkedin(text: str) -> str | None:
    match = _LINKEDIN_RE.search(text)
    if not match:
        return None
    url = match.group(0).rstrip("/")
    # Normalizar para sem esquema
    url = re.sub(r"^https?://(?:www\.)?", "", url)
    return url


def _extract_portfolio_urls(text: str) -> list[str]:
    """Retorna todas as URLs que não são LinkedIn nem email."""
    urls = _URL_RE.findall(text)
    portfolio = []
    seen: set[str] = set()
    for url in urls:
        url = url.rstrip(".,;)")
        if "linkedin.com" in url.lower():
            continue
        if url in seen:
            continue
        seen.add(url)
        portfolio.append(url)
    return portfolio


# ---------------------------------------------------------------------------
# Claude API — campos ambíguos
# ---------------------------------------------------------------------------

def _extract_ambiguous_fields(resume_text: str) -> dict:
    """Chama a Claude API para extrair nome, endereço e data de nascimento."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""Você é um extrator de dados de currículos. Analise o currículo abaixo e extraia exatamente os três campos solicitados.

Responda SOMENTE com JSON puro, sem markdown, sem explicação.

Campos a extrair:
- "nome": nome completo do candidato (null se não encontrado)
- "endereco": endereço, cidade, estado, CEP ou qualquer indicação de localização (null se não encontrado)
- "data_nascimento": data de nascimento no formato encontrado (null se não encontrado)

CURRÍCULO:
{resume_text}

JSON de resposta:"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    # Remover blocos de markdown caso Claude insista em adicioná-los
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


# ---------------------------------------------------------------------------
# Score e status
# ---------------------------------------------------------------------------

def _compute_score_and_status(found_items: int, total_items: int) -> tuple[int, str]:
    absent = total_items - found_items
    score = round(found_items / total_items * 100)

    if absent == 0:
        status = "green"
    elif absent >= 4:
        status = "red"
    else:
        status = "yellow"

    return score, status


# ---------------------------------------------------------------------------
# Função principal
# ---------------------------------------------------------------------------

def analyze_contact(resume_text: str) -> dict:
    # --- Regex ---
    email = _extract_email(resume_text)
    phone = _extract_phone(resume_text)
    linkedin = _extract_linkedin(resume_text)
    portfolio_urls = _extract_portfolio_urls(resume_text)

    # --- Claude API ---
    ambiguous = _extract_ambiguous_fields(resume_text)
    nome = ambiguous.get("nome") or None
    endereco = ambiguous.get("endereco") or None
    data_nascimento = ambiguous.get("data_nascimento") or None

    # --- Monta items ---
    items = {
        "nome":            {"found": nome is not None,            "value": nome},
        "email":           {"found": email is not None,           "value": email},
        "telefone":        {"found": phone is not None,           "value": phone},
        "linkedin":        {"found": linkedin is not None,        "value": linkedin},
        "endereco":        {"found": endereco is not None,        "value": endereco},
        "data_nascimento": {"found": data_nascimento is not None, "value": data_nascimento},
        "portfolio":       {"found": len(portfolio_urls) > 0,     "value": portfolio_urls if portfolio_urls else None},
    }

    found_items = sum(1 for v in items.values() if v["found"])
    total_items = len(items)
    score, status = _compute_score_and_status(found_items, total_items)

    return {
        "items": items,
        "total_items": total_items,
        "found_items": found_items,
        "score": score,
        "status": status,
    }
