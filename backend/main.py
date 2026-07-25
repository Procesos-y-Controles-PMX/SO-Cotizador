import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from supabase_client import get_supabase_client

# Disable interactive API docs in production (endpoint/schema recon on a
# service that talks to Supabase with the service-role key). ON locally.
_IS_PRODUCTION = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID"))
_DOCS_ENABLED = (
    os.getenv("ENABLE_API_DOCS", "").strip().lower() in ("1", "true", "yes")
    or not _IS_PRODUCTION
)

app = FastAPI(
    title="SO Cotizador API",
    docs_url="/docs" if _DOCS_ENABLED else None,
    redoc_url="/redoc" if _DOCS_ENABLED else None,
    openapi_url="/openapi.json" if _DOCS_ENABLED else None,
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/message")
def message() -> dict[str, str]:
    return {"message": "Backend FastAPI conectado correctamente."}


@app.get("/api/supabase-status")
def supabase_status() -> dict[str, str]:
    return {
        "status": "configured" if get_supabase_client() else "missing_env",
        "provider": "supabase",
    }
