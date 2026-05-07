"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { getCurrentUser, logout, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface NavItemDef {
  label: string;
  href: string;
  icon: ReactNode;
  roles?: Array<"admin" | "tienda">;
}

interface NavGroup {
  title: string;
  items: NavItemDef[];
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navGroups: NavGroup[] = useMemo(
    () => [
      {
        title: "General",
        items: [
          {
            label: "Historial",
            href: "/cotizaciones",
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            label: "Nueva cotizacion",
            href: "/cotizaciones/nueva",
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            ),
          },
          {
            label: "Inventario",
            href: "/inventario",
            roles: ["admin"],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            ),
          },
        ],
      },
    ],
    []
  );

  useEffect(() => {
    const session = getCurrentUser();
    if (!loading && !session) router.replace("/login");
  }, [loading, router]);

  if (loading || !user) return <main className="min-h-screen" />;

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.roles) return true;
        return item.roles.includes(user.rol as "admin" | "tienda");
      }),
    }))
    .filter((group) => group.items.length > 0);

  const isActive = (href: string) => {
    if (href === "/cotizaciones") return pathname.startsWith("/cotizaciones");
    return pathname === href;
  };

  const initials = user.nombre_completo
    ? user.nombre_completo
        .split(" ")
        .map((word) => word[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-gray-100 bg-white shadow-sm transition-all duration-300 ease-in-out md:flex",
          sidebarCollapsed ? "w-[72px]" : "w-[250px]"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-5">
          <Link href="/cotizaciones" className="flex items-center gap-2.5 overflow-hidden">
            <Image src="/promexma-logo.png" alt="Promexma" width={30} height={30} className="shrink-0 object-contain" />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold leading-none text-slate-800">Promexma</p>
                <p className="mt-0.5 text-[10px] font-medium text-blue-500">SO Cotizador</p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-all hover:bg-gray-50 hover:text-gray-600"
            aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={cn("h-3.5 w-3.5 transition-transform duration-300", sidebarCollapsed && "rotate-180")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4">
          {filteredGroups.map((group) => (
            <div key={group.title} className="mb-5">
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">{group.title}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200",
                        sidebarCollapsed ? "justify-center px-3 py-2.5" : "px-3 py-2.5",
                        active ? "bg-red-50 text-red-600" : "text-slate-500 hover:bg-gray-50 hover:text-slate-700"
                      )}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-gray-100 px-3 py-3">
          <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-sm">
              {initials}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Usuario</p>
                  <p className="truncate text-xs font-semibold text-slate-800">{user.nombre_completo ?? user.email}</p>
                  <p className="text-[10px] text-gray-400">{user.rol}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.replace("/login");
                  }}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Cerrar sesion"
                  aria-label="Cerrar sesion"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className={cn("min-h-screen transition-all duration-300 md:ml-[250px]", sidebarCollapsed && "md:ml-[72px]")}>
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

