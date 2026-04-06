# Backlog de Melhorias

## Prioridade Alta

### 1. Email quebrado por linha do PDF
- **Problema**: PDF quebra email em 2 linhas ("hotmail.\ncom") e regex não junta
- **Impacto**: Email não detectado na seção Contato
- **Solução**: Antes de rodar regex de email, normalizar texto removendo \n entre partes de URLs/emails

### 2. Seção de resumo não reconhecida
- **Problema**: summary_analyzer não reconhece "PERFIL E OBJETIVOS" como seção de resumo
- **Impacto**: Score de resumo = 0 mesmo com conteúdo presente
- **Solução**: Adicionar variações ao _SUMMARY_HEADERS: "perfil e objetivos", "objetivo profissional", "objetivo", "profile", "career objective"

### 3. Datas no formato "Mês/AA" não capturadas
- **Problema**: Formato "Dezembro/25", "Outubro/23" não é reconhecido pelo regex de datas
- **Impacto**: Datas desaparecem da análise (nem corretas, nem incorretas)
- **Solução**: Adicionar padrão regex para mês por extenso + / + ano 2 dígitos. Classificar como "incorrect" com sugestão de usar mm/aaaa

## Prioridade Média

### 4. "Mensal" contando como métrica de impacto
- **Problema**: A IA aceita "mensal" como métrica em frases de impacto
- **Impacto**: Frases sem número real de resultado são marcadas como impacto
- **Solução**: Ajustar prompt da Claude API para ser mais rigoroso — métricas devem ser números concretos (%, R$, quantidades), não frequências genéricas (mensal, semanal, diário)