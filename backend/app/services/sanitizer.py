import logging
import re

logger = logging.getLogger("security")

MAX_TEXT_SIZE = 50_000

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

# SQL injection: require injection syntax, not just SQL keywords in normal context
_SQL_INJECTION: list[tuple[str, str]] = [
    (
        r"';\s*(DROP|DELETE|INSERT|UPDATE|ALTER|TRUNCATE|CREATE)\s+(TABLE|DATABASE|FROM|INTO|INDEX)\b",
        "SQL DDL injection",
    ),
    (
        r"\b(DROP|TRUNCATE|ALTER)\s+(TABLE|DATABASE|INDEX)\s+\w+",
        "SQL DDL direto",
    ),
    (
        r"\b(DELETE|INSERT|UPDATE)\s+(FROM|INTO|SET)\s+\w+",
        "SQL DML direto",
    ),
    (r"\bUNION\s+(?:ALL\s+)?SELECT\b", "UNION SELECT"),
    (r"\bOR\s+1\s*=\s*1\b", "OR 1=1"),
    (r"\bOR\s+'[^']*'\s*=\s*'[^']*'", "OR string tautology"),
    (r"/\*.*?\*/", "SQL block comment"),
    (r"\bxp_cmdshell\b", "xp_cmdshell"),
]

# Script injection
_SCRIPT_INJECTION: list[tuple[str, str]] = [
    (r"<script[\s>]", "script tag"),
    (r"javascript\s*:", "javascript URI"),
    (r"\beval\s*\(", "eval()"),
    (r"\bexec\s*\(", "exec()"),
]

# Prompt injection — English and Portuguese variants
_PROMPT_INJECTION: list[tuple[str, str]] = [
    (r"ignore\s+(previous|above|prior|all)\s+(instructions?|prompts?|context)", "ignore instructions EN"),
    (r"ignore\s+(as\s+)?instru[çc][õo]es\s+(anteriores|acima|pr[eé]vias)", "ignore instructions PT"),
    (r"\bsystem\s+prompt\b", "system prompt"),
    (r"you\s+are\s+now\s+(?:a\s+)?(?:different|new|unrestricted)", "identity override EN"),
    (r"voc[eê]\s+[eé]\s+agora", "identity override PT"),
    (r"\bdisregard\s+(?:all|the|previous|above|prior)", "disregard"),
    (r"\bdesconsider[ae]\s+(?:todas?|as?|os?)", "desconsidere PT"),
    (r"(?:act|pretend)\s+as\s+(?:a\s+)?(?:different|new|unrestricted|evil)", "act as"),
    (r"from\s+now\s+on\s+you\s+(?:are|will)", "from now on"),
    (r"new\s+(?:instructions?|role|persona)\s*:", "new role"),
]

_MALICIOUS_MSG = (
    "Informações maliciosas detectadas. Documentos com instruções de código, "
    "SQL ou manipulação de IA não serão avaliados."
)


def validate_text(text: str) -> tuple[bool, str]:
    """
    Returns (True, "") if the text is safe to process.
    Returns (False, error_message) if malicious content is detected.
    Control characters are stripped before pattern matching.
    """
    cleaned = _CONTROL_CHARS.sub("", text)

    if len(cleaned) > MAX_TEXT_SIZE:
        return False, "Texto excede o tamanho máximo permitido."

    for pattern, label in _SQL_INJECTION:
        m = re.search(pattern, cleaned, re.IGNORECASE | re.DOTALL)
        if m:
            logger.warning("SQL injection blocked [%s]: %r", label, m.group(0)[:80])
            return False, _MALICIOUS_MSG

    for pattern, label in _SCRIPT_INJECTION:
        m = re.search(pattern, cleaned, re.IGNORECASE)
        if m:
            logger.warning("Script injection blocked [%s]: %r", label, m.group(0)[:80])
            return False, _MALICIOUS_MSG

    for pattern, label in _PROMPT_INJECTION:
        m = re.search(pattern, cleaned, re.IGNORECASE)
        if m:
            logger.warning("Prompt injection blocked [%s]: %r", label, m.group(0)[:80])
            return False, _MALICIOUS_MSG

    return True, ""
