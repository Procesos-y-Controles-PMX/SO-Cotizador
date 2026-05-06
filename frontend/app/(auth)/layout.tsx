"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { LogOut } from "lucide-react";
import { getCurrentUser, logout, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

function NavItem({ href, label, enabled = true }: { href: string; label: string; enabled?: boolean }) {
  const pathname = usePathname();
  if (!enabled) return null;

  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium",
        pathname === href ? "bg-red-50 text-red-700" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      {label}
    </Link>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const session = getCurrentUser();
    if (!loading && !session) router.replace("/login");
  }, [loading, router]);

  if (loading || !user) return <main className="min-h-screen" />;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 md:flex md:flex-col">
        <div>
          <Image src="/promexma-logo.png" alt="Promexma" width={140} height={36} />
          <p className="mt-2 text-xs text-slate-500">SO Cotizador</p>
        </div>

        <div className="mt-8 space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">General</p>
          <NavItem href="/cotizaciones" label="Historial" />
          <NavItem href="/cotizaciones/nueva" label="Nueva cotizacion" />
          <NavItem href="/inventario" label="Inventario" enabled={user.rol === "admin"} />
        </div>

        <button
          type="button"
          className="mt-auto flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          <LogOut size={16} />
          Cerrar sesion
        </button>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Cotizador Promexma</h1>
            <p className="text-sm text-slate-500">
              {user.nombre_completo ?? user.email} · {user.rol}
            </p>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

