"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { loginByEmailPassword } from "@/lib/auth";
import LoginShell from "@/components/login/LoginShell";
import { loginButtonClass, loginInputClass, loginTitleClass } from "@/components/login/loginStyles";

// When the unified portal is configured, /login only forwards there
// (bookmarks keep working); without it the local form still renders.
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (PORTAL_URL) window.location.replace(`${PORTAL_URL}/login?app=cotizador`);
  }, []);

  if (PORTAL_URL) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0d1117]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand" role="status" aria-label="Cargando" />
      </main>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await loginByEmailPassword(email, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      toast.error(result.message);
      return;
    }

    toast.success(`Bienvenido, ${result.user.nombre_completo ?? result.user.email}`);
    router.replace("/cotizaciones");
  }

  return (
    <LoginShell
      productLabel="SO Cotizador"
      heroLine1="Sistema de Gestión"
      heroLine2="de Cotizaciones"
      heroDescription="Plataforma para la administración, seguimiento y gestión de cotizaciones de sucursales CEMEX."
    >
      <div className="mb-6 sm:mb-8">
        <h2 className={loginTitleClass}>Iniciar sesión</h2>
        <p className="mt-2 text-sm sm:text-base text-slate-500">
          Ingresa tus credenciales para acceder al sistema.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email"
            className={loginInputClass}
            placeholder="usuario@promexma.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Contraseña
          </label>
          <input
            type="password"
            className={loginInputClass}
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-lg">
            <AlertCircle size={15} className="text-red-500 shrink-0" />
            <p className="text-xs font-medium text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={loginButtonClass}
        >
          {loading ? "Verificando..." : "Acceder"}
        </button>
      </form>
    </LoginShell>
  );
}
