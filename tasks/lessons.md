# Lessons Learned

Regras aprendidas com correções do usuário. Revisar antes de implementar qualquer nova feature.

---

## LIÇÃO 001 — Score deve ser inteiro

**Regra:** Todo campo `score` deve ser um número **inteiro**. Usar `round(valor)` sem casas decimais.

**Errado:**
```python
score = round(found / total * 100, 1)  # retorna float: 85.7
```

**Correto:**
```python
score = round(found / total * 100)  # retorna int: 86
```

**Por quê:** O CLAUDE.md já especifica `round()` sem decimais e proíbe `ceil`. Float nos scores gera inconsistência na UI e nos testes.

**Onde aplicar:** Qualquer função que calcule score (contact, skills, datas, resumo, frases de impacto, etc).

---

## LIÇÃO 002 — "Commitar no git" significa subir na nuvem

**Regra:** Quando o usuário pedir para fazer commit, sempre executar `git push` após o `git commit`. Commit local sem push não é suficiente.

**Por quê:** O repositório remoto é `pedro-abritta/ATS-analyzer` no GitHub. Commit local não fica visível na nuvem sem o push.

**Onde aplicar:** Em todo fluxo de commit, sem exceção.
