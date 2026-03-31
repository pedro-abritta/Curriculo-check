import json
import os
import re

import anthropic


def classify_areas(resume_text: str, job_description: str) -> dict:
    """
    Classifica a área de atuação do candidato e a área da vaga usando Claude API.
    Retorna {"user_area": "...", "job_area": "..."}.
    """
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""Com base nos textos abaixo, gere duas classificações curtas (máximo 4 palavras cada) em português:

1. "user_area": área de atuação do candidato com base no currículo (ex: "Desenvolvedor RPA", "Engenheiro Civil", "Analista de Dados")
2. "job_area": área da vaga com base na descrição (ex: "Desenvolvedor Backend", "Gestor de Projetos")

Responda APENAS com JSON puro, sem markdown:
{{"user_area": "...", "job_area": "..."}}

CURRÍCULO:
{resume_text[:3000]}

DESCRIÇÃO DA VAGA:
{job_description[:2000]}

JSON:"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=64,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    tokens_used = message.usage.input_tokens + message.usage.output_tokens

    raw = message.content[0].text.strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    data = json.loads(raw)
    return {
        "user_area": data.get("user_area", ""),
        "job_area": data.get("job_area", ""),
        "tokens_used": tokens_used,
    }
