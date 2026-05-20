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

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

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
    if (href === "/cotizaciones") {
      if (pathname === "/cotizaciones/nueva") return false;
      return pathname === "/cotizaciones" || pathname.startsWith("/cotizaciones/");
    }
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

  function handleLogout() {
    setMobileNavOpen(false);
    logout();
    router.replace("/login");
  }

  const navContent = (collapsed: boolean, onNavigate?: () => void) => (
    <>
      <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4">
        {filteredGroups.map((group) => (
          <div key={group.title} className="mb-5">
            {!collapsed && (
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
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200",
                      collapsed ? "justify-center px-3 py-2.5" : "px-3 py-2.5",
                      active ? "bg-red-50 text-red-600" : "text-slate-500 hover:bg-gray-50 hover:text-slate-700"
                    )}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-gray-100 px-3 py-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Usuario</p>
                <p className="truncate text-xs font-semibold text-slate-800">{user.nombre_completo ?? user.email}</p>
                <p className="text-[10px] text-gray-400">{user.rol}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
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
    </>
  );

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Cerrar menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[min(280px,88vw)] flex-col border-r border-gray-100 bg-white shadow-lg transition-transform duration-300 ease-in-out md:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
        aria-hidden={!mobileNavOpen}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-4">
          <Link href="/cotizaciones" className="flex items-center gap-2.5" onClick={() => setMobileNavOpen(false)}>
            <Image
              src="/promexma-logo.png"
              alt="Promexma"
              width={2640}
              height={554}
              className="h-7 w-auto max-w-[30px] shrink-0"
              style={{ width: "auto", height: "auto" }}
            />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-none text-slate-800">Promexma</p>
              <p className="mt-0.5 text-[10px] font-medium text-blue-500">SO Cotizador</p>
            </div>
          </Link>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label="Cerrar menu"
            onClick={() => setMobileNavOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {navContent(false, () => setMobileNavOpen(false))}
      </aside>

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-gray-100 bg-white shadow-sm transition-all duration-300 ease-in-out md:flex",
          sidebarCollapsed ? "w-[72px]" : "w-[250px]"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-5">
          <Link href="/cotizaciones" className="flex items-center gap-2.5 overflow-hidden">
            <Image
              src="/promexma-logo.png"
              alt="Promexma"
              width={2640}
              height={554}
              className="h-7 w-auto max-w-[30px] shrink-0"
              style={{ width: "auto", height: "auto" }}
            />
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

        {navContent(sidebarCollapsed)}
      </aside>

      <div className={cn("min-h-screen transition-all duration-300 md:ml-[250px]", sidebarCollapsed && "md:ml-[72px]")}>
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6 md:py-4">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
            aria-label="Abrir menu de navegacion"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900 md:text-xl">Cotizador Promexma</h1>
            <p className="truncate text-xs text-slate-500 md:text-sm">
              {user.nombre_completo ?? user.email} · {user.rol}
            </p>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

