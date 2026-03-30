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
- Fase 4: Dashboard 
- Fase 5: Banco de Dados (Supabase)
- Fase 6: Autenticação
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
- Revise lessons.md no início de cada sessão

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
- Sempre rodar testes antes de commitar
