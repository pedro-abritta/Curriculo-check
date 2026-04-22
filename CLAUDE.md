# Currículo Check

## Stack
- Frontend: Next.js 14 (App Router), TypeScript, shadcn/ui, Tailwind CSS
- Backend: FastAPI, Python, pdfplumber, python-docx
- IA: Claude API (claude-sonnet-4-20250514, temperature: 0)
- Banco: Supabase (PostgreSQL + Auth)
- Pagamento: Mercado Pago Checkout Pro (PIX)
- Deploy: Vercel (front) + Railway (back)
- CORS: https://curriculocheck.com.br, https://www.curriculocheck.com.br, https://curriculo-check.vercel.app (fallback), http://localhost:3000 (dev)

## Regras do Projeto
- Scores arredondados com round() (nunca ceil)
- Texto completo do currículo e vaga nas análises (nunca truncar)
- Match de skills é EXATO e case-insensitive (sem sinônimos)
- Respostas da Claude API devem ser JSON puro (sem markdown)
- Mensagens de erro em português
- Sempre consulte tasks/lessons.md antes de iniciar qualquer tarefa

## Estrutura

### Backend (backend/)

app/
├── api/
│   ├── auth.py          — registro, login (email+senha via Supabase Auth)
│   ├── analyze.py       — POST /api/analyze (protegido por JWT)
│   ├── analysis.py      — GET /api/analysis/{id} (resultado salvo)
│   ├── payment.py       — Mercado Pago: criar preferência, webhook, status
│   └── feedback.py      — POST/GET feedback do usuário
├── middleware/
│   └── auth_middleware.py — verificação JWT + usuário ativo
├── services/
│   ├── contact_analyzer.py  — regex + Claude API
│   ├── skills_analyzer.py   — Claude API + regex matching
│   ├── dates_analyzer.py    — 100% regex
│   ├── summary_analyzer.py  — regex + Claude API
│   ├── impact_analyzer.py   — 100% Claude API
│   ├── parser.py            — extração texto PDF/DOCX
│   ├── database.py          — persistência Supabase
│   ├── sanitizer.py         — bloqueio SQL/script/prompt injection
│   ├── section_toggle.py    — ativa/desativa seções (economiza tokens em dev)
│   ├── paywall_toggle.py    — PAYWALL_ENABLED True/False
│   ├── area_classifier.py   — classifica área do usuário e vaga
│   └── resume_validator.py  — pré-validação do currículo (is_resume, is_readable) e da vaga (is_job_description)
│                              Formatting warnings: títulos com espaços entre letras, layout multi-coluna, quebras de linha no meio de frases
└── limiter.py               — rate limiting (slowapi)

### Frontend (frontend/)

src/
├── app/
│   ├── page.tsx                    — landing page (pública, sem auth)
│   ├── login/page.tsx              — tela de login/registro
│   ├── dashboard/page.tsx          — input + loading + resultado (autenticado)
│   └── payment/
│       ├── success/page.tsx        — polling pós-pagamento
│       └── failure/page.tsx        — falha no pagamento
├── components/
│   ├── AuthForm.tsx                — login/registro
│   ├── FeedbackWidget.tsx          — botão flutuante + painel de avaliação (em layout.tsx, aparece em todas as páginas)
│   ├── RoadmapWidget.tsx           — próximas funcionalidades (toggle SHOW_ROADMAP)
│   ├── evidence-card.tsx           — cards expandíveis de resultado
│   ├── progress-bar.tsx            — barra de progresso por seção
│   ├── score-ring.tsx              — círculo SVG do score geral
│   └── ui/
│       ├── analysis-loading-skeleton.tsx — skeleton animado com framer-motion
│       └── ValidationErrorModal.tsx      — modal de erro de validação do currículo/vaga
└── lib/
    ├── config.ts                   — API_URL e SHOW_ROADMAP
    └── supabase.ts                 — client Supabase

## Roteamento
- `/` → landing page (pública). Se logado, redireciona para /dashboard
- `/login` → tela de login/registro. Se logado, redireciona para /dashboard
- `/dashboard` → app autenticado (input → loading → resultado)
- Logout redireciona para `/` (landing), nunca para `/login`

## Pré-Validação
- **Currículo**: `is_resume` (é um currículo?) + `is_readable` (formatação legível?)
- **Vaga**: `is_job_description` (é uma descrição de vaga?)
- Ambas rodam ANTES de qualquer cobrança ou análise completa
- Erros retornam HTTP 400 com mensagem em português
- Frontend exibe `ValidationErrorModal` com dicas de como corrigir
- **Formatting warnings** (array de strings): títulos espaçados letra-a-letra, layout multi-coluna, quebras de linha no meio de frases — exibidos como banner amarelo no dashboard sem bloquear a análise

## Seções de Análise
1. **Contato** (7 itens): nome, email, telefone, linkedin, endereço, data nascimento, portfólio. Detecção de títulos suporta variações grudadas (ex: CONTACTINFO), espaçadas (C O N T A C T) e normais, em PT e EN
2. **Skills**: hard skills separadas em required (peso 70%) e nice_to_have (peso 30%). Match em 3 etapas: 1) exato case-insensitive contra lista da IA, 2) full-text search com word boundary em todo o resume_text, 3) normalização singular/plural (remove "s" final de cada palavra) para cobrir variações como "bancos de dados" vs "Banco de Dados". Detecção de títulos suporta variações grudadas, espaçadas e normais, em PT e EN
3. **Datas**: formato aceito mm/aaaa. Error groups agrupam datas com mesmo tipo de erro. Detecção de títulos suporta variações grudadas, espaçadas e normais, em PT e EN
4. **Resumo Profissional**: 3 pilares (métricas via regex, skills reutiliza lista do skills_analyzer, verbos de impacto via Claude API). Detecção de títulos suporta variações grudadas (ex: RESUMOPROFISSIONAL), espaçadas (R E S U M O) e normais, em PT e EN
5. **Frases de Impacto**: score baseado em quantidade (0=0%, 1=33%, 2=67%, 3+=100%). Desduplicação entre Resumo e Experiência. Detecção de títulos suporta variações grudadas, espaçadas e normais, em PT e EN

## Score Geral
Skills 40% + Resumo 25% + Impacto 20% + Datas 10% + Contato 5% (calculado no backend, salvo em result_json["overall_score"]; frontend usa como fallback com mesmos pesos)

## Banco de Dados (Supabase)
### Tabelas
- **users**: id, email, area, total_tokens_used, active (bool), created_at, updated_at
- **analyses**: id, user_id, job_area, tokens_used, paid (bool), result_json (JSONB), created_at
- **feedbacks**: id, user_id, analysis_id, rating (0-10), comment, created_at

### Variáveis de ambiente
- Backend (.env): SUPABASE_URL, SUPABASE_KEY (service_role), ANTHROPIC_API_KEY, MP_ACCESS_TOKEN, PAYMENT_ENABLED (default: "true"), FRONTEND_URL (default: "http://localhost:3000")
- Frontend (.env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MP_PUBLIC_KEY
- `.env` e `.env.local` estão no `.gitignore`. Usar `.env.example` com placeholders para onboarding

## Toggles
- **section_toggle.py**: ativa/desativa analyzers individualmente (economiza tokens em dev). Em produção: todas True. Mesmo com skills=False, skills_analyzer roda internamente para o summary_analyzer
- **paywall_toggle.py**: PAYWALL_ENABLED lido de `os.environ` (default "true"). False = resultado completo sem pagamento. True = salva no banco, retorna preview, paywall no frontend. Alterado via env, sem commit de código
- **config.ts**: SHOW_ROADMAP. True = mostra widget de funcionalidades futuras

## Segurança
- Sanitizer: bloqueia SQL injection, script injection, prompt injection (PT/EN). Valida magic bytes de PDF/DOCX
- Rate limiting: 60 req/min global, 10 análises/hora por usuário, 3 registros/hora por IP, 10 logins/hora por IP
- Domínios de email bloqueados: example.local, mailinator.com, etc
- Verificação de ownership em todos os endpoints que acessam dados
- Campo active na tabela users para desativar contas
- Headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- Pré-validação de currículo e vaga antes de qualquer cobrança (resume_validator.py)
- `.env.example` com placeholders no repositório; `.env`/`.env.local` no `.gitignore`. Nunca commitar tokens reais

## Monetização
- Mercado Pago Checkout Pro, PIX apenas, R$ 9,90/análise
- Fluxo: análise grátis → resultado salvo em result_json → paywall → PIX → paid=true → resultado liberado
- Credenciais de teste NÃO suportam PIX (usar produção)
- Webhook configurado no painel do MP: `https://ats-analyzer-production.up.railway.app/api/payment/webhook` (público, sem autenticação)
- back_urls dinâmicas via variável de ambiente `FRONTEND_URL`
- PIX exige dados do payer (email) na preferência enviada ao MP
- MP não permite que o dono da conta compre de si mesmo — testar em aba anônima ou conta diferente
- Frontend: polling em /payment/success até paid=true

## FeedbackWidget
- Montado em `layout.tsx` — aparece em todas as páginas (landing, dashboard, pagamento)
- Funciona sem `analysisId` e sem token autenticado (feedback geral)
- Botão sempre clicável, nunca `disabled`

## Persistência de Sessão
- Token JWT em localStorage (ats_token)
- analysis_id em localStorage (ats_current_analysis) — recupera resultado ao recarregar
- ats_pending_result — resultado pós-pagamento transitório
- useRef initialized evita execução dupla do React Strict Mode
- Estado inicial "loading_session" evita flash de tela de login

## Regras de Trabalho
- Entrar em plan mode para tarefas com 3+ passos
- Se algo der errado, PARE e replaneje
- NUNCA marque tarefa como completa sem provar que funciona
- Simplicidade primeiro, impacto mínimo, sem correções temporárias
- Após correção do usuário: registre em tasks/lessons.md
- Usar conventional commits: feat:, fix:, docs:, refactor:
