# ATS Analyzer

## Stack
- Frontend: Next.js 14 (App Router), TypeScript, shadcn/ui, Tailwind CSS
- Backend: FastAPI, Python, pdfplumber, python-docx
- IA: Claude API (claude-sonnet-4-20250514, temperature: 0)
- Banco: Supabase (PostgreSQL + Auth)
- Pagamento: Mercado Pago Checkout Pro (PIX)
- Deploy: Vercel (front) + Railway (back)

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
│   └── area_classifier.py   — classifica área do usuário e vaga
└── limiter.py               — rate limiting (slowapi)

### Frontend (frontend/)

src/
├── app/
│   ├── page.tsx                    — telas: auth → input → loading → result
│   └── payment/
│       ├── success/page.tsx        — polling pós-pagamento
│       └── failure/page.tsx        — falha no pagamento
├── components/
│   ├── AuthForm.tsx                — login/registro
│   ├── FeedbackWidget.tsx          — botão flutuante + painel de avaliação
│   ├── RoadmapWidget.tsx           — próximas funcionalidades (toggle SHOW_ROADMAP)
│   ├── evidence-card.tsx           — cards expandíveis de resultado
│   ├── progress-bar.tsx            — barra de progresso por seção
│   └── score-ring.tsx              — círculo SVG do score geral
└── lib/
├── config.ts                   — API_URL e SHOW_ROADMAP
└── supabase.ts                 — client Supabase

## Seções de Análise
1. **Contato** (7 itens): nome, email, telefone, linkedin, endereço, data nascimento, portfólio
2. **Skills**: hard skills separadas em required (peso 70%) e nice_to_have (peso 30%). Match exato case-insensitive com busca em 2 etapas: lista da IA + word boundary no texto
3. **Datas**: formato aceito mm/aaaa. Error groups agrupam datas com mesmo tipo de erro
4. **Resumo Profissional**: 3 pilares (métricas via regex, skills reutiliza lista do skills_analyzer, verbos de impacto via Claude API)
5. **Frases de Impacto**: score baseado em quantidade (0=0%, 1=33%, 2=67%, 3+=100%). Desduplicação entre Resumo e Experiência

## Score Geral
Skills 40% + Resumo 25% + Datas 10% + Impacto 15% + Contato 10% (calculado no frontend)

## Banco de Dados (Supabase)
### Tabelas
- **users**: id, email, area, total_tokens_used, active (bool), created_at, updated_at
- **analyses**: id, user_id, job_area, tokens_used, paid (bool), result_json (JSONB), created_at
- **feedbacks**: id, user_id, analysis_id, rating (0-10), comment, created_at

### Variáveis de ambiente
- Backend (.env): SUPABASE_URL, SUPABASE_KEY (service_role), ANTHROPIC_API_KEY, MP_ACCESS_TOKEN
- Frontend (.env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MP_PUBLIC_KEY

## Toggles
- **section_toggle.py**: ativa/desativa analyzers individualmente (economiza tokens em dev). Em produção: todas True. Mesmo com skills=False, skills_analyzer roda internamente para o summary_analyzer
- **paywall_toggle.py**: PAYWALL_ENABLED. False = resultado completo sem pagamento. True = salva no banco, retorna preview, paywall no frontend
- **config.ts**: SHOW_ROADMAP. True = mostra widget de funcionalidades futuras

## Segurança
- Sanitizer: bloqueia SQL injection, script injection, prompt injection (PT/EN). Valida magic bytes de PDF/DOCX
- Rate limiting: 60 req/min global, 10 análises/hora por usuário, 3 registros/hora por IP, 10 logins/hora por IP
- Domínios de email bloqueados: example.local, mailinator.com, etc
- Verificação de ownership em todos os endpoints que acessam dados
- Campo active na tabela users para desativar contas
- Headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

## Monetização
- Mercado Pago Checkout Pro, PIX apenas, R$ 9,90/análise
- Fluxo: análise grátis → resultado salvo em result_json → paywall → PIX → paid=true → resultado liberado
- Credenciais de teste NÃO suportam PIX (usar produção)
- Webhook /api/payment/webhook (público) recebe confirmação
- Frontend: polling em /payment/success até paid=true

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