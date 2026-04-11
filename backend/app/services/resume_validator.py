import json
import os
import re

import anthropic

# ---------------------------------------------------------------------------
# Resultado de validação
# ---------------------------------------------------------------------------

_FALLBACK_VALID = {
    "is_resume": True,
    "is_readable": True,
    "issues": [],
    "confidence": 50,
}


# ---------------------------------------------------------------------------
# Validação principal
# ---------------------------------------------------------------------------

def validate_resume(resume_text: str) -> dict:
    """
    Verifica se o texto extraído é um currículo profissional válido e legível.

    Returns:
        dict com:
          - is_resume   (bool)  — o documento é um currículo?
          - is_readable (bool)  — o texto está legível e estruturado?
          - issues      (list)  — lista de problemas encontrados
          - confidence  (int)   — 0-100
    """
    stripped = resume_text.strip()

    # Fast-path: texto muito curto — não vale chamar a API
    if len(stripped) < 100:
        return {
            "is_resume": False,
            "is_readable": False,
            "issues": ["Texto extraído muito curto (menos de 100 caracteres)."],
            "confidence": 0,
        }

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # Envia apenas os primeiros 1500 chars para economizar tokens
    excerpt = stripped[:1500]

    prompt = f"""Analise o texto extraído de um arquivo PDF ou DOCX e determine se é um currículo profissional válido e legível.

CRITÉRIOS PARA is_resume = false:
- O texto não contém elementos típicos de currículo (nome de pessoa, experiência profissional, formação acadêmica ou dados de contato)
- O documento é claramente outro tipo: conta de luz, receita culinária, artigo científico, contrato jurídico, nota fiscal, manual técnico, bula de remédio, etc.

CRITÉRIOS PARA is_readable = false:
- O texto está embaralhado (colunas misturadas, palavras grudadas sem sentido, quebras de linha no meio de palavras)
- Texto incoerente com excesso de caracteres especiais, símbolos ou lixo tipográfico
- Conteúdo insuficiente para análise (menos de 100 caracteres significativos)

SEJA TOLERANTE COM:
- Currículos simples ou com pouco conteúdo
- Ausência de seções explícitas (sem títulos como "Experiência", "Formação")
- Currículos em outros idiomas (inglês, espanhol, francês, etc.)
- Pequenos erros de encoding ou acentuação incorreta
- Formatação não convencional

Responda APENAS com JSON puro, sem markdown, sem texto adicional:
{{
  "is_resume": true,
  "is_readable": true,
  "issues": [],
  "confidence": 85
}}

TEXTO EXTRAÍDO:
{excerpt}

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
            "issues": list(result.get("issues", [])),
            "confidence": int(result.get("confidence", 50)),
        }

    except Exception:
        # Em caso de falha da API ou parse, não bloqueia o usuário
        return _FALLBACK_VALID
