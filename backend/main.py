from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from supabase_client import get_supabase_client

app = FastAPI(title="SO Cotizador API")

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
