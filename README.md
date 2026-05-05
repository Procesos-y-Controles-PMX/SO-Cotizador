# SO Cotizador

Proyecto base con:
- Backend: FastAPI
- Frontend: Next.js + TypeScript
- Base de datos objetivo: Supabase

## Requisitos

- Node.js 20 (`nvm use 20`)
- Python 3

## Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Frontend (Next.js)

```bash
cd frontend
nvm use 20
npm install
cp .env.local.example .env.local
npm run dev
```

## Conexion frontend -> backend

El frontend consume `GET /api/message` usando `NEXT_PUBLIC_API_URL`.

## Variables para Supabase

- Frontend (`frontend/.env.local`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Backend (`backend/.env`):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Endpoints utiles

- `GET /api/health`
- `GET /api/message`
- `GET /api/supabase-status`
