# Currículo Check

Monorepo com frontend (Next.js) e backend (FastAPI).

## Estrutura

```
/backend   → FastAPI (porta 8000)
/frontend  → Next.js (porta 3000)
```

## Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```
