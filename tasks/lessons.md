# Lessons Learned

Revisar antes de implementar qualquer nova feature.

---

## Regras Críticas
1. **Scores sempre inteiros**: usar `round(valor)` sem casas decimais, nunca ceil, nunca float
2. **Nunca truncar texto**: texto completo do currículo e vaga deve ir pros analyzers
3. **Nomes de colunas/variáveis**: devem bater EXATAMENTE com o schema do Supabase e o .env
4. **Ownership obrigatório**: SEMPRE comparar user_id do token com user_id do registro antes de retornar dados
5. **validate_text em ambos**: rodar sanitizer TANTO no resume_text quanto no job_description
6. **Git push sempre**: commit sem push não sobe pra nuvem

## Backend
7. Texto de PDF pode ter quebras de linha no meio de frases — limpar com regex antes de analisar
8. Certificações em PDF podem ocupar múltiplas linhas — _extract_context do dates_analyzer pode pegar linha errada (prioridade baixa, não impacta score)
9. MutableHeaders do Starlette não tem pop() — usar `del response.headers["key"]`
10. Usuário órfão: se insert na tabela users falhar após criar no Supabase Auth, o login deve chamar get_or_create_user pra recuperar
11. Rate limit de análises é naturalmente limitado pelo tempo de processamento (~30s), mas o slowapi garante proteção contra abuso automatizado

## Frontend
12. React Strict Mode roda useEffect 2x — usar useRef pra execução única quando há localStorage com remoção
13. Next.js 14 produção exige Suspense boundary em páginas com useSearchParams()
14. Nunca hardcodar URLs — usar config.ts com NEXT_PUBLIC_API_URL
15. Template literals: substituições com variáveis exigem backticks, não aspas duplas
16. Cache do navegador pode mascarar mudanças — Ctrl+Shift+R pra forçar reload

## Setup & Ambiente
17. Fonte Geist não existe no Next.js 14.2 — usar Inter do next/font/google
18. Tailwind v3 e shadcn podem conflitar nas diretivas do globals.css — verificar versão antes de configurar
19. VSCode pode não reconhecer imports do venv — resolver com Python: Select Interpreter apontando para o venv
20. PowerShell no Windows: usar curl.exe (curl é alias de Invoke-WebRequest)

## Supabase
21. service_role key no backend (.env), anon key no frontend (.env.local) — nunca expor service_role no front
22. Desabilitar "Confirm sign up" em dev (Authentication → Sign In / Providers → Email)

## Mercado Pago
23. Credenciais de teste NÃO suportam PIX — usar produção pra testar
24. auto_return exige HTTPS — remover em localhost
25. PIX requer chave Pix cadastrada na conta do vendedor
26. Não excluir "bank_transfer" dos payment_methods — PIX está nessa categoria
27. result_json no banco evita rodar análise 2x (economia de tokens)

## Deploy
28. Railway: nixpacks.toml com python313, PORT dinâmica (${PORT:-8000})
29. Vercel: adicionar URL do frontend no CORS do backend (sem barra no final da URL)