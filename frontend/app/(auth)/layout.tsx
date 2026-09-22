"use client";

import { GridLoadingScreen, NoiseField } from "@promexma/ui";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, PanelLeftClose, Search, X } from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { logout, useAuth } from "@/lib/auth";
import { displayRol, isOwnerAdminEmail } from "@/lib/owner-admin";
import { cn } from "@/lib/utils";
import { AmbientGridProvider } from "@/contexts/AmbientGridContext";
import { BorradorProvider, useBorrador } from "@/contexts/BorradorContext";
import { DetalleProvider } from "@/contexts/DetalleContext";
import {
  globalSearch,
  GROUP_LABEL_SINGULAR,
  type SearchGroup,
  type SearchHit,
} from "@/lib/queries/globalSearch";
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from "@/lib/search";
import { useAnchoAjustable } from "@/lib/shell/useAnchoAjustable";
import BorradorBar from "@/components/shell/BorradorBar";
import BorradorSheet from "@/components/shell/BorradorSheet";
import DetailPane from "@/components/shell/DetailPane";
import GlobalSearchBar, { type RecentEntry } from "@/components/shell/GlobalSearchBar";
import ResizeHandle from "@/components/shell/ResizeHandle";
import SearchResults from "@/components/shell/SearchResults";
import {
  SIDEBAR_NAV_ACTIVE,
  SIDEBAR_NAV_IDLE,
  SIDEBAR_NAV_LIST,
  SIDEBAR_NAV_LIST_COLLAPSED,
  SIDEBAR_SECTION_LABEL,
} from "@/components/layout/shellStyles";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ModuleTransition from "@/components/common/ModuleTransition";

const RECIENTES_KEY = "so-cotizador-recientes";
const RECIENTES_MAX = 6;
const ANCHO_SIDEBAR_CONTRAIDO = 84;

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

function hitKey(hit: { kind: string; id: string }) {
  return `${hit.kind}:${hit.id}`;
}

function leerRecientes(): RecentEntry[] {
  try {
    const raw = window.localStorage.getItem(RECIENTES_KEY);
    return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

function AmbientCanvas({ animated }: { animated: boolean }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme !== "light";

  if (!animated) {
    return (
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[var(--ambient-flat)]"
        aria-hidden
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
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
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <GridLoadingScreen message="Verificando sesión..." variant="dark" />;
  }

  // El provider queda dentro del guard: sin sesión no hay cotización que guardar.
  return (
    <BorradorProvider>
      <Shell>{children}</Shell>
    </BorradorProvider>
  );
}

function DetalleVacio({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-fg-faint">Detalle</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="neu-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Search className="h-6 w-6 text-fg-faint" aria-hidden />
        <p className="text-sm text-fg-subtle">
          Busca arriba y elige un resultado: su detalle aparece aquí.
        </p>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  const { borrador, expandido, guardando, setExpandido, aplicar, empezar, descartar, guardar } =
    useBorrador();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const reduceMotion = useReducedMotion();
  const [meshReady, setMeshReady] = useState(false);
  const ambientAnimated = isOwnerAdminEmail(user?.email);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const [recientes, setRecientes] = useState<RecentEntry[]>([]);

  /** `selected` sobrevive al cierre del panel: la pestaña del borde lo reabre. */
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  const sidebar = useAnchoAjustable({
    clave: "so-cotizador-ancho-sidebar",
    inicial: 256,
    min: 208,
    max: 400,
    lado: "izquierda",
  });
  const detalle = useAnchoAjustable({
    clave: "so-cotizador-ancho-detalle",
    inicial: 380,
    min: 320,
    max: 620,
    lado: "derecha",
  });

  useEffect(() => setMeshReady(true), []);
  useEffect(() => setRecientes(leerRecientes()), []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const buscando = debounced.trim().length >= SEARCH_MIN_CHARS;

  useEffect(() => {
    if (!user || !buscando) {
      setGroups([]);
      return;
    }
    const signal = { cancelled: false };
    setSearching(true);
    void globalSearch(user, debounced)
      .then((result) => {
        if (!signal.cancelled) setGroups(result);
      })
      .catch(() => {
        if (!signal.cancelled) toast.error("Falló la búsqueda.");
      })
      .finally(() => {
        if (!signal.cancelled) setSearching(false);
      });
    return () => {
      signal.cancelled = true;
    };
  }, [user, debounced, buscando]);

  const seleccionar = useCallback((hit: SearchHit) => {
    setSelected(hit);
    setDetalleAbierto(true);
    setDropdownOpen(false);
    setRecientes((prev) => {
      const entry: RecentEntry = {
        kind: hit.kind,
        id: hit.id,
        titulo: hit.titulo,
        subtitulo: hit.subtitulo,
      };
      const next = [entry, ...prev.filter((item) => hitKey(item) !== hitKey(entry))].slice(0, RECIENTES_MAX);
      try {
        window.localStorage.setItem(RECIENTES_KEY, JSON.stringify(next));
      } catch {
        /* modo privado: los recientes son un lujo, no rompen nada */
      }
      return next;
    });
  }, []);

  /**
   * Un reciente guarda sólo lo mínimo. Si sigue en los resultados se abre; si
   * no, se rellena la búsqueda con su nombre en vez de inventar el registro.
   */
  const abrirReciente = useCallback(
    (entry: RecentEntry) => {
      const enResultados = groups.flatMap((group) => group.hits).find((hit) => hitKey(hit) === hitKey(entry));
      if (enResultados) {
        seleccionar(enResultados);
        return;
      }
      setQuery(entry.titulo);
      setDropdownOpen(true);
    },
    [groups, seleccionar],
  );

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
    [],
  );

  if (!user) return null;

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

  const nombre = user.nombre_completo ?? user.email;
  const iniciales =
    nombre
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const roleLabel = displayRol(user.rol, user.email);
  const selectedKey = selected ? hitKey(selected) : null;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

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
          {collapsed ? <GridThemeToggle compact /> : <GridThemeToggle />}
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {iniciales}
            </div>
            {!collapsed && (
              <>
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <span className="truncate text-xs font-semibold text-fg-strong">{nombre}</span>
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
    <AmbientGridProvider meshReady={meshReady} animated={ambientAnimated}>
      <div className="relative isolate flex h-dvh flex-col overflow-hidden app-canvas p-2">
        <AmbientCanvas animated={ambientAnimated} />
        <header className="app-safe-x flex shrink-0 items-center gap-3 pb-2 lg:hidden">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-semibold tracking-tight text-fg">Cotizador</h1>
            <p className="truncate text-xs text-fg-subtle">
              {nombre.split(/\s+/)[0]} · {roleLabel}
            </p>
          </div>
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="neu-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:text-fg-strong"
            aria-label="Cerrar sesión"
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        </header>

        <GlobalSearchBar
          value={query}
          onValue={setQuery}
          open={dropdownOpen}
          onOpen={setDropdownOpen}
          recientes={recientes}
          onPickReciente={abrirReciente}
          onHome={() => {
            setQuery("");
            setSelected(null);
            setDetalleAbierto(false);
            router.push("/cotizaciones");
          }}
          iniciales={iniciales}
        />

        <div className="flex min-h-0 flex-1 gap-2">
          <aside
            className={cn(
              "neu-dark-canvas relative hidden min-h-0 shrink-0 flex-col overflow-hidden rounded-lg lg:flex",
              "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.65)]",
              // Sin transición mientras se arrastra: si no, el panel persigue al cursor.
              !sidebar.arrastrando &&
                "transition-[width] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
            )}
            style={{ width: sidebarCollapsed ? ANCHO_SIDEBAR_CONTRAIDO : sidebar.ancho }}
          >
            <div
              className={cn(
                "flex h-16 shrink-0 items-center gap-3",
                sidebarCollapsed ? "justify-center px-3" : "px-4",
              )}
            >
              <Link href="/cotizaciones" className="neu-raised-sm relative block h-9 w-9 shrink-0 overflow-hidden rounded-full">
                <Image src="/circulo-promexma.png" alt="Promexma" fill sizes="36px" className="rounded-full object-contain" />
              </Link>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-bold leading-tight text-white">Promexma</p>
                  <p className="truncate text-xs leading-tight text-slate-500">SO Cotizador</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="neu-button flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:text-fg"
                aria-label={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
                aria-expanded={!sidebarCollapsed}
              >
                <PanelLeftClose className={cn("h-3.5 w-3.5 transition-transform duration-300", sidebarCollapsed && "rotate-180")} />
              </button>
            </div>

            {navContent(sidebarCollapsed)}
          </aside>

          {!sidebarCollapsed ? (
            <ResizeHandle
              etiqueta="Ancho del menú"
              ancho={sidebar.ancho}
              min={sidebar.min}
              max={sidebar.max}
              arrastrando={sidebar.arrastrando}
              {...sidebar.tiradorProps}
            />
          ) : null}

          <main className="neu-raised flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg">
            <div className="min-h-0 flex-1 overflow-y-auto app-main-pad app-safe-x py-4">
              {buscando ? (
                <SearchResults
                  groups={groups}
                  loading={searching}
                  query={debounced.trim()}
                  selectedKey={selectedKey}
                  onSelect={seleccionar}
                />
              ) : (
                <DetalleProvider
                  value={{ abrir: seleccionar, seleccionadoKey: selectedKey, abierto: detalleAbierto }}
                >
                  <ModuleTransition>{children}</ModuleTransition>
                </DetalleProvider>
              )}
            </div>
          </main>

          {detalleAbierto ? (
            <ResizeHandle
              etiqueta="Ancho del detalle"
              ancho={detalle.ancho}
              min={detalle.min}
              max={detalle.max}
              arrastrando={detalle.arrastrando}
              {...detalle.tiradorProps}
            />
          ) : null}

          {/* Ancho animado con el contenido fijo adentro: el texto no se re-acomoda al abrir. */}
          <div
            className={cn(
              "neu-dark-canvas hidden min-h-0 shrink-0 overflow-hidden rounded-lg lg:block",
              "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.65)]",
              !detalle.arrastrando &&
                "transition-[width] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
            )}
            style={{ width: detalleAbierto ? detalle.ancho : 0 }}
            aria-hidden={!detalleAbierto}
          >
            <div className="h-full" style={{ width: detalle.ancho }}>
              {selected ? (
                <DetailPane
                  hit={selected}
                  onClose={() => setDetalleAbierto(false)}
                  onSelectHit={seleccionar}
                />
              ) : (
                <DetalleVacio onClose={() => setDetalleAbierto(false)} />
              )}
            </div>
          </div>

          {/* Columna de altura completa, no un botón flotante: es el panel cerrado.
              Siempre presente, con o sin selección: si desaparece cuando no hay
              nada abierto, nadie descubre que el panel existe. */}
          {!detalleAbierto ? (
            <button
              type="button"
              onClick={() => setDetalleAbierto(true)}
              title={selected?.titulo ?? "Panel de detalle"}
              aria-label={selected ? `Abrir detalle de ${selected.titulo}` : "Abrir panel de detalle"}
              className={cn(
                "neu-dark-canvas hidden w-7 shrink-0 flex-col items-center justify-center gap-2 rounded-lg lg:flex",
                "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.65)]",
                "text-fg-faint transition-colors duration-200 hover:text-brand motion-reduce:transition-none",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="max-h-[40%] overflow-hidden text-[10px] font-semibold uppercase tracking-[0.18em] [writing-mode:vertical-rl]">
                {selected ? GROUP_LABEL_SINGULAR[selected.kind] : "Detalle"}
              </span>
            </button>
          ) : null}
        </div>

        <div className="hidden lg:contents">
          <BorradorBar
            borrador={borrador}
            onNuevo={empezar}
            onDescartar={descartar}
            onExpandir={() => setExpandido(true)}
          />

          <AnimatePresence>
            {expandido && borrador ? (
              <motion.div
                key="borrador-sheet"
                className="absolute inset-x-2 bottom-2 z-40"
                initial={reduceMotion ? false : { y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduceMotion ? undefined : { y: "100%", opacity: 0 }}
                // Misma curva y duración que el colapso de las columnas.
                transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
              >
                <BorradorSheet
                  borrador={borrador}
                  onCambio={aplicar}
                  onColapsar={() => setExpandido(false)}
                  onGuardar={guardar}
                  guardando={guardando}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {selected && detalleAbierto ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="Cerrar detalle"
              className="absolute inset-0 bg-black/60"
              onClick={() => setDetalleAbierto(false)}
            />
            <div className="neu-dark-canvas absolute inset-2 top-10 overflow-hidden rounded-lg">
              <DetailPane hit={selected} onClose={() => setDetalleAbierto(false)} onSelectHit={seleccionar} />
            </div>
          </div>
        ) : null}

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
