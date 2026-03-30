import json
import os
import re

import anthropic

# ---------------------------------------------------------------------------
# Classificação de seções
# ---------------------------------------------------------------------------

# Seções de atuação — incluir no texto enviado à Claude
_ACTION_SECTIONS: set[str] = {
    "resumo profissional", "resumo", "sobre mim", "sobre",
    "summary", "about", "perfil profissional", "perfil", "objetivo",
    "experiência profissional", "experiência", "experiências",
    "experience", "experiences", "histórico profissional", "atuação",
    "freelancer", "freelance",
    "projetos", "projects",
    "voluntariado", "voluntário", "volunteer",
}

# Seções estáticas — excluir (listas sem frases descritivas)
_STATIC_SECTIONS: set[str] = {
    "formação", "formação acadêmica", "educação", "education",
    "certificações", "certificados", "certifications", "certificates",
    "habilidades", "habilidades técnicas", "skills", "competências",
    "competencies", "ferramentas", "tecnologias", "tools",
    "idiomas", "línguas", "languages",
    "contato", "contact",
    "interesses", "interests",
    "prêmios", "awards",
    "conquistas", "achievements",
    "publicações", "publications",
}

_ALL_KNOWN_SECTIONS: set[str] = _ACTION_SECTIONS | _STATIC_SECTIONS


# ---------------------------------------------------------------------------
# Extração das seções de atuação
# ---------------------------------------------------------------------------

def _extract_action_text(resume_text: str) -> str:
    """
    Extrai e concatena apenas as seções de atuação do currículo.
    Se não encontrar nenhuma seção conhecida, retorna o texto completo.
    """
    lines = resume_text.split('\n')

    # Mapeia cada linha ao tipo de seção: "action", "static" ou None (sem seção ainda)
    current_type: str | None = None
    action_blocks: list[str] = []
    buffer: list[str] = []
    found_any_section = False

    for line in lines:
        normalized = line.strip().rstrip(':').lower()

        if normalized and normalized in _ALL_KNOWN_SECTIONS:
            # Salvar buffer anterior se estava em seção de atuação
            if current_type == "action" and buffer:
                action_blocks.append('\n'.join(buffer).strip())
            buffer = []
            found_any_section = True
            current_type = "action" if normalized in _ACTION_SECTIONS else "static"
        else:
            if current_type == "action":
                buffer.append(line)

    # Último buffer
    if current_type == "action" and buffer:
        action_blocks.append('\n'.join(buffer).strip())

    if not found_any_section:
        return resume_text.strip()

    result = '\n\n'.join(block for block in action_blocks if block)
    return result if result else resume_text.strip()


# ---------------------------------------------------------------------------
# Claude API — classificação de frases
# ---------------------------------------------------------------------------

def _classify_phrases_via_claude(action_text: str) -> list[dict]:
    """
    Envia o texto de atuação para a Claude API e recebe a classificação
    de cada frase como frase de impacto ou não.
    """
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""Você é um especialista em análise de currículos. Sua tarefa é identificar e classificar TODAS as frases descritivas de um currículo como "frase de impacto" ou não.

## REGRA DE FRASE DE IMPACTO
Uma frase de impacto obrigatoriamente possui os 3 elementos:
1. **Verbo ou substantivo de ação** — demonstra protagonismo (ex: reduzi, desenvolvi, automatizei, implementei, liderei)
2. **Número ou métrica** — valor quantificável (ex: 95%, R$1M, 3 semanas, 40 clientes, 10 horas)
3. **Contexto de impacto** — o que foi impactado/resultado obtido

Se QUALQUER um dos 3 elementos estiver ausente, NÃO é frase de impacto.

## EXEMPLOS COM IMPACTO (is_impact: true)
- "Reduzi o ciclo de 3 semanas para 10 horas" → verbo: reduzi, métrica: 3 semanas/10 horas, contexto: ciclo de processamento
- "Desenvolvi robôs que automatizaram mais de $50M em notas fiscais" → verbo: desenvolvi, métrica: $50M, contexto: emissão de notas
- "Aumentando a conversão em 20%" → verbo: aumentando, métrica: 20%, contexto: conversão

## EXEMPLOS SEM IMPACTO (is_impact: false)
- "Atuei diretamente com clientes" → sem número/métrica
- "Desenvolvi APIs em Python/Node.js" → sem número/métrica de resultado
- "Dominando a integração eficaz entre sistemas" → sem número/métrica
- "Responsável pela gestão de projetos" → sem número/métrica

## INSTRUÇÕES
- Analise TODAS as frases descritivas, sem pular nenhuma
- NÃO avalie: títulos de cargo, nomes de empresa, datas, listas de tecnologias/skills
- Cada bullet point ou parágrafo deve ser avaliado individualmente
- Para frases sem impacto, gere uma sugestão curta e prática de como adicionar métrica
- Seja rigoroso: sem número/métrica = is_impact false
- Responda APENAS com JSON puro, sem markdown, sem texto antes ou depois

## DESDUPLICAÇÃO
Se o currículo menciona a mesma conquista/resultado em seções diferentes (ex: no Resumo e na Experiência), considere apenas UMA ocorrência — a mais completa e detalhada.
- Resumo: "redução de ciclos analíticos em 95%" + Experiência: "reduzindo o ciclo de 3 semanas para 10 horas, resultando em diminuição de 95%" → manter apenas a da Experiência (mais detalhada)
- Se ambas têm o mesmo nível de detalhe, manter a primeira ocorrência
Para frases identificadas como duplicadas, NÃO inclua no array "phrases". Registre-as separadamente em "deduplicated".

## FORMATO DE RESPOSTA
{{
  "phrases": [
    {{
      "text": "frase completa extraída do currículo",
      "verb": "verbo ou substantivo de ação identificado",
      "metric": "número ou métrica encontrada",
      "context": "contexto de impacto",
      "is_impact": true
    }},
    {{
      "text": "frase sem impacto",
      "verb": "verbo identificado",
      "metric": null,
      "context": "contexto",
      "is_impact": false,
      "suggestion": "Adicione uma métrica: ex, quantos X? qual % de melhoria?"
    }}
  ],
  "deduplicated": [
    {{
      "removed": "texto da frase removida",
      "kept": "texto da frase mantida",
      "reason": "mesma conquista descrita no Resumo e na Experiência"
    }}
  ]
}}

## TEXTO DO CURRÍCULO:
{action_text}

JSON:"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    data = json.loads(raw)
    return data.get("phrases", []), data.get("deduplicated", [])


# ---------------------------------------------------------------------------
# Score e status
# ---------------------------------------------------------------------------

def _compute_status(impact: int, total: int) -> str:
    if impact >= 3:
        return "green"
    if impact >= 1:
        return "yellow"
    return "red"


# ---------------------------------------------------------------------------
# Função principal
# ---------------------------------------------------------------------------

def analyze_impact(resume_text: str) -> dict:
    action_text = _extract_action_text(resume_text)
    phrases, deduplicated = _classify_phrases_via_claude(action_text)

    total_phrases = len(phrases)
    impact_phrases = sum(1 for p in phrases if p.get("is_impact") is True)
    no_impact_phrases = total_phrases - impact_phrases
    if impact_phrases == 0:
        score = 0
    elif impact_phrases == 1:
        score = 33
    elif impact_phrases == 2:
        score = 67
    else:
        score = 100

    return {
        "total_phrases": total_phrases,
        "impact_phrases": impact_phrases,
        "no_impact_phrases": no_impact_phrases,
        "score": score,
        "status": _compute_status(impact_phrases, total_phrases),
        "phrases": phrases,
        "deduplicated": deduplicated,
    }
