SECTION_WEIGHTS = {
    "skills": 0.40,
    "summary": 0.25,
    "impact": 0.20,
    "dates": 0.10,
    "contact": 0.05,
}


def _section_score(section: dict) -> int:
    if not section or section.get("disabled"):
        return 0
    if "overall" in section:
        return section["overall"].get("score", 0)
    return section.get("score", 0)
