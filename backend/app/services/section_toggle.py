# Controla quais seções de análise estão ativas.
# Seções desativadas retornam {"disabled": true} no endpoint /api/analyze.
# Isso economiza tokens durante o desenvolvimento.

ACTIVE_SECTIONS: dict[str, bool] = {
    "contact": True,
    "skills": True,
    "dates": True,
    "summary": True,
    "impact_phrases": True,
}
