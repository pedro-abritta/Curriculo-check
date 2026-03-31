# ATS Analyzer

## Arquitetura
- Monorepo: /frontend (Next.js 14 + shadcn/ui + Tailwind) e /backend (FastAPI + Python)
- Frontend roda na porta 3000, Backend na porta 8000
- Comunicação via REST API com FormData

## Stack
- Frontend: Next.js 14 (App Router), TypeScript, shadcn/ui, Tailwind CSS
- Backend: FastAPI, Python, pdfplumber, python-docx
- IA: Claude API (claude-sonnet-4-20250514, temperature: 0)

## Regras do Projeto
- Scores sempre arredondados com round() (nunca ceil)
- O texto completo do currículo e da vaga deve ser usado nas análises (nunca truncar)
- Match de skills é EXATO e case-insensitive (sem sinônimos)
- Respostas da Claude API devem ser sempre JSON puro (sem markdown)
- Mensagens de erro em português
- Design clean com shadcn/ui

## Seções de Análise
1. Contato (7 itens): nome, email, telefone, linkedin, endereço, data nascimento, portfólio
2. Skills (hard skills): separadas em required e nice_to_have
3. Datas: formato aceito mm/aaaa
4. Resumo Profissional: 3 pilares (skills, verbo de impacto, métricas)
5. Frases de Impacto: verbo/substantivo + número + contexto

## Cores de Status
- green: bom
- yellow: atenção
- red: crítico
(cada seção tem regras específicas de threshold)

## Estrutura do Backend
- app/api/ → rotas
- app/services/ → lógica de negócio (analyzers)
- app/models/ → schemas

## Supabase
- URL: SUPABASE_URL (env backend) / NEXT_PUBLIC_SUPABASE_URL (env frontend)
- Chave pública: SUPABASE_PUBLIC_KEY (env backend) / NEXT_PUBLIC_SUPABASE_ANON_KEY (env frontend)
- Client backend: `backend/app/services/database.py`
- Client frontend: `frontend/src/lib/supabase.ts`
- Tabelas: `users` (id uuid PK, email, area text, total_tokens_used int, created_at, updated_at), `analyses` (id uuid PK, user_id uuid FK, job_area, tokens_used int, created_at)
- Campo "score" removido da tabela analyses (irrelevante para persistência)
- Funções DB: get_or_create_user, update_user_area, add_tokens, save_analysis
- Classificação de área: `backend/app/services/area_classifier.py`
- Tokens reais contabilizados de todas as chamadas Claude API (input + output tokens)
- Cada analyzer retorna tokens_used no seu resultado
- Backend usa service_role key (bypassa RLS); Frontend usa anon key (apenas para auth)

## Autenticação
- Método: Email + senha via Supabase Auth
- Backend: `backend/app/api/auth.py` → POST /api/auth/register, /login, /logout
- Middleware: `backend/app/middleware/auth_middleware.py` → dependency `require_auth`
- Endpoint protegido: POST /api/analyze (Authorization: Bearer <token>)
- Endpoints públicos: /api/auth/register, /api/auth/login, /health
- Frontend: `AuthForm.tsx` chama endpoints do backend; token armazenado no localStorage (chave: "ats_token")
- Fluxo: auth → input → loading → result; token 401 redireciona para auth
- Frontend tem 4 estados: auth → input → loading → result
- Sessão persiste no navegador (Supabase client gerencia refresh token)
- Login com Google planejado para futuro (depende de Google Cloud Console)
- IMPORTANTE: Desativar confirmação de email no Supabase Dashboard para dev (Authentication → Settings)

## Sistema de Toggle de Seções
- Arquivo: `backend/app/services/section_toggle.py`
- Dicionário `ACTIVE_SECTIONS` controla quais analyzers são executados
- Seções desativadas (False) retornam `{"disabled": true}` no endpoint — sem chamadas à Claude API
- Usar durante desenvolvimento para economizar tokens: ative apenas a seção em que está trabalhando
- Estado atual: contact=False, skills=True, dates=False, summary=False, impact_phrases=False

## Roadmap
- Fase 0: Stack ✅
- Fase 1: Setup ✅
- Fase 2: Upload & Parsing ✅
- Fase 3.1: Seção Contato ✅
- Fase 3.2: Seção Skills ✅
- Fase 3.3: Seção Datas ✅
- Fase 3.4: Seção Resumo Profissional ✅
- Fase 3.5: Seção Frases de Impacto ✅
- Fase 4: Dashboard ✅
- Fase 5: Banco de Dados (Supabase) ✅
- Fase 6: Autenticação & Cadastro ✅
- Fase 7: Monetização
- Fase 8: Polish
- Fase 9: Deploy

## Regras de Trabalho do Claude Code

### Planejamento
- Entrar em plan mode para QUALQUER tarefa com 3+ passos ou decisões de arquitetura
- Se algo der errado, PARE e replaneje imediatamente — não force uma solução quebrada
- Escreva specs detalhadas antes de implementar

### Verificação
- NUNCA marque uma tarefa como completa sem provar que funciona
- Rode testes, verifique logs, demonstre que está correto
- Se pergunte: "Um desenvolvedor sênior aprovaria isso?"

### Aprendizado
- Após QUALQUER correção do usuário, registre o padrão em tasks/lessons.md
- Escreva regras para si mesmo que previnam o mesmo erro
- **SEMPRE consulte tasks/lessons.md no início de cada tarefa para evitar repetir erros já documentados**
- Ruthlessly iterate on these lessons until mistake rate drops

### Princípios
- Simplicidade primeiro: faça cada mudança o mais simples possível
- Sem preguiça: encontre causas raiz, sem correções temporárias
- Impacto mínimo: mudanças devem tocar apenas o necessário
- Não introduza bugs em código que já funciona

### Correção de Bugs
- Quando receber um bug: apenas corrija. Não peça ajuda desnecessária
- Aponte logs, erros, testes falhando — e resolva
- Zero troca de contexto necessária do usuário

## Convenções Git
- Usar conventional commits: feat:, fix:, docs:, refactor:
- Manter mensagens com menos de 72 caracteres
- Sempre rodar testes antes de commitar~

## Lições Aprendidas
**IMPORTANTE:** Sempre consulte tasks/lessons.md antes de iniciar qualquer tarefa. Este arquivo contém erros já cometidos e padrões aprendidos durante o desenvolvimento. Ignorá-lo resulta em retrabalho.

## "Decisões de Arquitetura":


### Análise Híbrida
- Contato: regex para email/telefone/linkedin/portfolio, Claude API para nome/endereço/data nascimento
- Skills: Claude API extrai skills, matching é regex com word boundary no texto completo
- Datas: 100% regex, sem API
- Resumo Profissional: regex para métricas, regex para skills (reutiliza lista do skills_analyzer), Claude API para verbos de impacto e contexto das métricas
- Frases de Impacto: 100% Claude API

### Score Geral
- Pesos: Skills 30%, Resumo 25%, Datas 15%, Frases de Impacto 15%, Contato 15%
- Calculado no frontend com Math.round()

### Section Toggle
- Arquivo backend/app/services/section_toggle.py controla quais seções rodam
- Usado durante desenvolvimento para economizar tokens
- Em produção: todas as seções = True
- Mesmo com toggle False, skills_analyzer roda internamente para fornecer lista ao summary_analyzer

### Skills
- Match exato case-insensitive (sem sinônimos)
- Busca em 2 etapas: lista extraída da IA + word boundary no texto completo
- Separação required vs nice_to_have com peso 70/30
- Divisão por zero tratada quando não há nice_to_have

### Frases de Impacto
- Score baseado em quantidade absoluta: 0=0%, 1=33%, 2=67%, 3+=100%
- Status: >=3 green, 1-2 yellow, 0 red
- Desduplicação entre Resumo e Experiência

### Autenticação
- Supabase Auth com email/senha
- JWT token enviado no header Authorization: Bearer <token>
- Endpoints protegidos: /api/analyze
- Endpoints públicos: /api/auth/register, /api/auth/login, /health
- Sessão persiste no navegador (Supabase client gerencia refresh token)
- Frontend tem 4 estados: auth → input → loading → result
- Login com Google planejado para futuro (depende de Google Cloud Console)

### Banco de Dados (Supabase)
- Tabela users: id, email, area, total_tokens_used, created_at, updated_at
- Tabela analyses: id, user_id, job_area, tokens_used, created_at
- Campo "score" removido da tabela analyses (irrelevante para persistência)
- Tokens reais contabilizados de todas as chamadas Claude API (input + output tokens)
- Cada analyzer retorna tokens_used no seu resultado
- Backend usa service_role key (bypassa RLS)
- Frontend usa anon key (apenas para auth)

### Services (analyzers)
- contact_analyzer.py — híbrido regex + Claude API
- skills_analyzer.py — Claude API + regex matching
- dates_analyzer.py — 100% regex
- summary_analyzer.py — híbrido regex + Claude API
- impact_analyzer.py — 100% Claude API
- section_toggle.py — controle de seções ativas
- parser.py — extração de texto de PDF/DOCX

### Frontend
- 3 telas: input → loading → result
- Componentes de design baseados no padrão EvidenceCard
- Cores: emerald (success), amber (warning), red (error)
- RadialScore SVG para score geral
- TabBar em pill style para navegação entre seções

## "Estrutura do Backend":

### Services (analyzers)
- contact_analyzer.py — híbrido regex + Claude API
- skills_analyzer.py — Claude API + regex matching
- dates_analyzer.py — 100% regex
- summary_analyzer.py — híbrido regex + Claude API
- impact_analyzer.py — 100% Claude API
- section_toggle.py — controle de seções ativas
- parser.py — extração de texto de PDF/DOCX
- database.py — funções de persistência no Supabase

### Auth & Middleware
- app/api/auth.py — endpoints de register e login
- app/middleware/auth_middleware.py — verificação JWT

### Frontend
- 3 telas: input → loading → result
- Componentes de design baseados no padrão EvidenceCard
- Cores: emerald (success), amber (warning), red (error)
- RadialScore SVG para score geral
- TabBar em pill style para navegação entre seções
