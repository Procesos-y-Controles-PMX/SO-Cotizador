"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { getCurrentUser, logout, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_NAV_ACTIVE,
  SIDEBAR_NAV_IDLE,
  SIDEBAR_SECTION_LABEL,
  SIDEBAR_SHELL,
  SIDEBAR_USER_CARD,
} from "@/components/layout/shellStyles";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

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

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
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
            label: "Nueva cotización",
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
          {
            label: "Usuarios",
            href: "/usuarios",
            roles: ["admin"],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

  const flatNavItems = filteredGroups.flatMap((group) => group.items);

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
    logout();
    router.replace("/login");
  }

  const navContent = (collapsed: boolean, onNavigate?: () => void) => (
    <>
      <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4">
        {filteredGroups.map((group) => (
          <div key={group.title} className="mb-5">
            {!collapsed && (
              <div className="mb-2 flex items-center gap-2 px-3">
                <span className="h-3.5 w-0.5 shrink-0 rounded-full bg-brand" aria-hidden />
                <p className={SIDEBAR_SECTION_LABEL}>{group.title}</p>
              </div>
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
                      "relative flex items-center gap-3 rounded-sm text-[13px] font-medium transition-all duration-200",
                      collapsed ? "justify-center px-3 py-2.5" : "px-3 py-2.5",
                      active ? SIDEBAR_NAV_ACTIVE : SIDEBAR_NAV_IDLE
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

      <div className={cn("shrink-0 border-t border-white/10 px-3 py-3", SIDEBAR_USER_CARD)}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Usuario</p>
                <p className="truncate text-xs font-semibold text-slate-200">{user.nombre_completo ?? user.email}</p>
                <p className="text-[10px] text-slate-500">{user.rol}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-sm p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
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
    <div className="min-h-screen app-canvas">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden shadow-lg transition-all duration-300 ease-in-out lg:flex lg:flex-col",
          SIDEBAR_SHELL,
          sidebarCollapsed ? "w-[72px]" : "w-[250px]"
        )}
      >
        <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <Link href="/cotizaciones" className="flex items-center gap-2.5 overflow-hidden">
            <Image
              src="/circulo-promexma.png"
              alt="Promexma"
              width={30}
              height={30}
              className="shrink-0 rounded-full"
            />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold leading-none text-white">Promexma</p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-500">SO Cotizador</p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-slate-400 transition-all hover:border-slate-500 hover:bg-slate-800 hover:text-slate-200"
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

      <div className={cn("min-h-screen transition-all duration-300 lg:ml-[250px]", sidebarCollapsed && "lg:ml-[72px]")}>
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm lg:px-6 lg:py-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold tracking-tight text-slate-900 lg:text-xl">
              Cotizador Promexma
            </h1>
            <p className="truncate text-xs text-slate-500 lg:text-sm">
              {user.nombre_completo ?? user.email} · {user.rol}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 lg:hidden"
            aria-label="Cerrar sesión"
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        </header>
        <main className="app-main-pad overflow-x-hidden p-3 lg:p-6">{children}</main>
      </div>

      <MobileBottomNav
        items={flatNavItems.map((item) => ({
          label: item.label,
          href: item.href,
          icon: item.icon,
          active: isActive(item.href),
        }))}
      />
    </div>
  );
}

