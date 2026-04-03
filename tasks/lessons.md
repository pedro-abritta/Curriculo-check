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

---

## Pontos de Atenção

### dates_analyzer.py - Contexto de datas multilinhas
- **Problema**: Quando uma certificação ocupa 2 linhas no PDF, a função `_extract_context` pode pegar a segunda linha em vez da primeira (ex: "Automation v20.12.x Development" em vez de "Certificação internacional IBM")
- **Causa**: A segunda linha tem mais de 10 caracteres, então a lógica não sobe para a linha anterior
- **Correção futura**: Detectar se a linha atual parece ser continuação (não começa com "•" e a linha anterior sim, ou a linha anterior contém palavras-chave como "Certificação", "Curso", etc)
- **Prioridade**: Baixa (não impacta score, apenas exibição)

## Ambiente
1. PowerShell no Windows usa "curl" como alias de Invoke-WebRequest. Usar sempre "curl.exe" para testes
2. Fonte Geist não existe no Next.js 14.2 — usar Inter do next/font/google
3. Tailwind v3 e shadcn podem conflitar nas diretivas do globals.css — verificar versão antes de configurar
4. VSCode pode não reconhecer imports do venv — resolver com Python: Select Interpreter apontando para o venv
5. Cache do navegador pode mascarar mudanças no frontend — sempre forçar reload (Ctrl+Shift+R)

## Backend
6. Nunca truncar texto enviado aos analyzers — causava falha no matching de skills
7. Texto extraído de PDF pode ter quebras de linha no meio de frases — limpar com regex antes de analisar
8. Certificações em PDF podem ocupar múltiplas linhas, dificultando extração de contexto por linha

## Pontos de Atenção
9. dates_analyzer.py: contexto de certificação IBM multi-linha pega a segunda linha em vez da primeira (prioridade baixa, não impacta score)

## Autenticação & Supabase
10. Variáveis de ambiente devem ter nomes IDÊNTICOS entre .env e código — SUPABASE_KEY vs SUPABASE_PUBLIC_KEY causou KeyError
11. Nomes de colunas no código devem bater EXATAMENTE com o schema do Supabase — "tokens" vs "total_tokens_used" causou APIError
12. Ao criar usuário no Supabase Auth, se o insert na tabela users falhar, o usuário fica "órfão" no Auth — o login deve chamar get_or_create_user para recuperar
13. Desabilitar "Confirm sign up" no Supabase durante desenvolvimento para evitar bloqueio por confirmação de email
14. service_role key vai no backend (.env), anon key vai no frontend (.env.local) — nunca expor service_role no frontend

## Monetização
15. React Strict Mode em dev roda useEffect duas vezes — usar useRef para garantir execução única quando há lógica de localStorage com remoção
16. Credenciais de teste do Mercado Pago não suportam PIX — usar credenciais de produção para testar
17. Mercado Pago exige HTTPS para auto_return — remover em localhost
18. PIX requer chave Pix cadastrada na conta do Mercado Pago do vendedor
19. Não excluir "bank_transfer" dos payment_methods — PIX está nessa categoria
20. result_json salvo no banco evita rodar análise duas vezes (economia de tokens da Claude API)

## Segurança
21. MutableHeaders do Starlette não tem método pop() — usar del response.headers["key"] para remover headers
22. Falha de ownership no GET /api/analysis — SEMPRE comparar user_id do token com user_id da análise antes de retornar dados
23. Rate limit de análises é naturalmente limitado pelo tempo de processamento (~30s), mas o slowapi garante proteção contra abuso
24. validate_text deve rodar TANTO no resume_text quanto no job_description

## Deploy
25. Backend usa nixpacks.toml para configurar build no Railway/Render — especificar python313, pip install -r requirements.txt e uvicorn com PORT dinâmica (${PORT:-8000})
26. Next.js 14 em produção exige Suspense boundary em qualquer página que use useSearchParams() — extrair conteúdo para componente interno e envolver o export default com <Suspense>
27. Nunca hardcodar URLs do backend no frontend — centralizar em src/lib/config.ts com NEXT_PUBLIC_API_URL e fallback para localhost:8000; lembrar de adicionar a URL do frontend no CORS do backend
28. Ao substituir strings com replace_all, verificar se a string resultante precisa de template literal (backticks) — substituir "http://localhost:8000" por "${API_URL}" dentro de aspas duplas não funciona em JS; a interpolação só ocorre com backticks (`${API_URL}/rota`)