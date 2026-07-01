"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { loginByEmailPassword } from "@/lib/auth";
import LoginShell from "@/components/login/LoginShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const user = await loginByEmailPassword(email, password);
    setLoading(false);

    if (!user) {
      const message = "Credenciales inválidas o usuario inactivo.";
      setError(message);
      toast.error(message);
      return;
    }

    toast.success(`Bienvenido, ${user.nombre_completo ?? user.email}`);
    router.replace("/cotizaciones");
  }

  return (
    <LoginShell
      productLabel="SO Cotizador"
      heroLine1="Sistema de Gestión"
      heroLine2="de Cotizaciones"
      heroDescription="Plataforma para la administración, seguimiento y gestión de cotizaciones de sucursales CEMEX."
    >
      <div className="mb-8">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          Iniciar sesión
        </h2>
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
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/15 transition-all"
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
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/15 transition-all"
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
          className="w-full py-3 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover active:bg-brand-active disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Verificando..." : "Acceder"}
        </button>
      </form>
    </LoginShell>
  );
}
