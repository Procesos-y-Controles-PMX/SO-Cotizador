"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function HomePage() {
  const [message, setMessage] = useState("Cargando...");
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBackendMessage() {
      try {
        const response = await fetch(`${API_URL}/api/message`);
        if (!response.ok) {
          throw new Error(`Respuesta no esperada: ${response.status}`);
        }

        const data = await response.json();
        setMessage(data.message);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "No fue posible conectar con el backend.";
        setError(errorMessage);
      }
    }

    fetchBackendMessage();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">SO Cotizador</h1>
        <p className="mt-4 text-base text-slate-700">
        Estado de conexion con FastAPI:{" "}
          {error ? <span className="font-medium text-red-600">{error}</span> : message}
        </p>
        <p className="mt-3 text-sm text-slate-500">Backend URL: {API_URL}</p>
        <p className="mt-1 text-sm text-slate-500">
          Supabase frontend: {hasSupabaseConfig ? "configurado" : "pendiente de variables .env"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Cliente Supabase listo: {supabase ? "si" : "no"}
        </p>
      </section>
    </main>
  );
}
