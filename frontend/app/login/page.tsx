"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginByEmail } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const user = await loginByEmail(email);
    setLoading(false);

    if (!user) {
      toast.error("No se encontro un usuario activo con ese correo.");
      return;
    }

    toast.success(`Bienvenido, ${user.nombre_completo ?? user.email}`);
    router.replace("/cotizaciones");
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <section className="hidden bg-(--color-navy) p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <Image src="/promexma-logo.png" alt="Promexma" width={220} height={52} />
          <h1 className="mt-20 max-w-sm text-5xl font-semibold leading-tight">Cotizador Promexma</h1>
          <p className="mt-5 max-w-md text-lg text-slate-300">
            Genera, gestiona y exporta cotizaciones de tus sucursales.
          </p>
        </div>
        <p className="text-sm text-slate-400">Uso exclusivo interno de Promexma.</p>
      </section>

      <section className="flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-semibold text-slate-900">Iniciar sesion</h2>
          <p className="mt-2 text-sm text-slate-500">Ingresa tu correo asignado para acceder al sistema.</p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Correo electronico
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-red-100 focus:border-red-500 focus:ring-2"
                type="email"
                value={email}
                placeholder="usuario@promexma.com"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <button disabled={loading} type="submit" className="btn-primary w-full disabled:opacity-50">
              {loading ? "Accediendo..." : "Acceder"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Acceso restringido a personal autorizado. Promexma.
          </p>
        </div>
      </section>
    </main>
  );
}

