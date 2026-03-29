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
