"use client";


import { GridLoadingScreen, GridThemeToggle, NoiseField, ThemeToggle } from "@promexma/ui";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { logout, useAuth } from "@/lib/auth";
import { displayRol, isOwnerAdminEmail } from "@/lib/owner-admin";
import { cn } from "@/lib/utils";
import {
  AmbientGridProvider,
} from "@/contexts/AmbientGridContext";
import {
  SIDEBAR_NAV_ACTIVE,
  SIDEBAR_NAV_IDLE,
  SIDEBAR_NAV_LIST,
  SIDEBAR_NAV_LIST_COLLAPSED,
  SIDEBAR_SECTION_LABEL,
  SIDEBAR_SHELL,
  SIDEBAR_USER_CARD,
} from "@/components/layout/shellStyles";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

import ModuleTransition from "@/components/common/ModuleTransition";

interface NavItemDef {
  label: string;
  href: string;
  icon: ReactNode;
  roles?: Array<"admin" | "tienda">;
  ownerOnly?: boolean;
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

function AmbientCanvas() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme !== "light";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
      data-ambient-grid-clip
    >
      <NoiseField
        key={mounted ? resolvedTheme : "light"}
        className="absolute inset-0"
        color={isDark ? [255, 255, 255] : [52, 80, 122]}
        maxOpacity={isDark ? 0.5 : 0.7}
      />
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [meshReady, setMeshReady] = useState(false);

  useEffect(() => {
    setMeshReady(true);
  }, []);

  const navGroups: NavGroup[] = useMemo(
    () => [
      {
        title: "General",
        items: [
          {
            label: "Dashboard",
            href: "/dashboard",
            roles: ["admin"],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            ),
          },
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
            label: "Listado de SKUs",
            href: "/inventario",
            roles: ["admin"],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            ),
          },
          {
            label: "Sucursales",
            href: "/sucursales",
            roles: ["admin"],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
          {
            label: "Accesos",
            href: "/accesos",
            roles: ["admin"],
            ownerOnly: true,
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ),
          },
        ],
      },
    ],
    []
  );

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <GridLoadingScreen message="Verificando sesión..." variant="dark" />;
  }

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.ownerOnly && !isOwnerAdminEmail(user.email)) return false;
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

  const roleLabel = displayRol(user.rol, user.email);

  const navContent = (collapsed: boolean, onNavigate?: () => void) => (
    <>
      <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0 pb-2">
        {filteredGroups.map((group) => (
          <div key={group.title} className="mb-3">
            {!collapsed && (
              <div className="mb-2.5 flex items-center gap-2 px-5">
                <span className="h-3.5 w-0.5 shrink-0 rounded-full bg-brand" aria-hidden />
                <p className={SIDEBAR_SECTION_LABEL}>{group.title}</p>
              </div>
            )}
            <ul className={collapsed ? SIDEBAR_NAV_LIST_COLLAPSED : SIDEBAR_NAV_LIST}>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href} className={cn(collapsed && "flex justify-center")}>
                    <Link
                      href={item.href}
                      title={item.label}
                      onClick={onNavigate}
                      className={cn(
                        "relative flex items-center rounded-sm text-sm font-medium",
                        collapsed ? "h-11 w-11 justify-center" : "gap-3 px-3 py-2.5",
                        active ? SIDEBAR_NAV_ACTIVE : SIDEBAR_NAV_IDLE,
                      )}
                    >
                      <span className={cn("relative shrink-0", active ? "text-white" : "text-fg-subtle")}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 px-2 pb-4 pt-2">
        <div className={cn(SIDEBAR_USER_CARD, "flex flex-col gap-2", collapsed && "items-center")}>
          {collapsed ? (
            <GridThemeToggle compact />
          ) : (
            <GridThemeToggle />
          )}
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <span className="truncate text-xs font-semibold text-fg-strong">
                    {user.nombre_completo ?? user.email}
                  </span>
                  <span className="truncate text-xs text-fg-subtle">{roleLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="neu-button rounded-full p-1.5 text-fg-subtle hover:text-fg"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                >
                  <LogoutIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <AmbientGridProvider meshReady={meshReady}>
    <div className="min-h-screen app-canvas">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden transition-[width] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:flex lg:flex-col",
          SIDEBAR_SHELL,
          sidebarCollapsed ? "w-20" : "w-64",
        )}
      >
        <div
          className={cn(
            "relative flex shrink-0 items-center pb-3 pt-5",
            sidebarCollapsed ? "justify-center px-2" : "gap-3 px-5",
          )}
        >
          <Link href="/cotizaciones" className="neu-raised-sm relative block h-9 w-9 shrink-0 overflow-hidden rounded-full">
            <Image
              src="/circulo-promexma.png"
              alt="Promexma"
              fill
              sizes="36px"
              className="rounded-full object-contain"
            />
          </Link>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="whitespace-nowrap text-sm font-bold leading-tight text-white">Promexma</p>
              <p className="mt-0.5 whitespace-nowrap text-xs leading-tight text-slate-500">SO Cotizador</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="neu-button absolute right-0 top-6 z-[60] flex h-7 w-7 translate-x-1/2 items-center justify-center rounded-full text-fg-subtle hover:text-fg"
            aria-label={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
            aria-expanded={!sidebarCollapsed}
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

      <div className={cn("relative min-h-screen min-w-0 overflow-x-hidden transition-all duration-300 lg:ml-[250px]", sidebarCollapsed && "lg:ml-[72px]")}>
        <AmbientCanvas />

        <header className="app-safe-x sticky top-0 z-30 flex items-center gap-3 bg-canvas pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 lg:hidden">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-semibold tracking-tight text-fg sm:text-lg">
              Cotizador
            </h1>
            <p className="truncate text-xs text-fg-subtle">
              {(user.nombre_completo ?? user.email).split(/\s+/)[0]} · {roleLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle className="lg:hidden" />
            <button
              type="button"
              onClick={handleLogout}
              className="neu-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:text-fg-strong lg:hidden"
              aria-label="Cerrar sesión"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="relative z-10 min-w-0 app-main-pad app-safe-x overflow-x-hidden py-3 lg:py-6">
          <ModuleTransition>{children}</ModuleTransition>
        </main>
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
    </AmbientGridProvider>
  );
}

