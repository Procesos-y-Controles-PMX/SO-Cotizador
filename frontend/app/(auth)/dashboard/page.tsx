"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import {
  ALERT_WARNING,
  EMPTY_STATE,
  FIELD_LABEL,
  FIELD_SELECT_TRIGGER,
  PANEL_CARD,
  PANEL_INSET,
} from "@/components/ui/contentStyles";
import FilterSelect from "@/components/common/FilterSelect";
import { displayRegionLabel, matchesDisplayRegion, sortRegionKeys } from "@/lib/cotizacion/groupByRegion";
import {
  listCotizacionesForDashboard,
  type DashboardCotizacionRow,
} from "@/lib/queries/dashboardStats";
import { listSucursales } from "@/lib/queries/sucursales";
import type { CtzSucursal } from "@/lib/types/db";
import { cn } from "@/lib/utils";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const SIN_REGION = "Sin región";

type BreakdownKind = "cotizaciones" | "tiendas" | "adopcion" | "usuarios";

const BREAKDOWN_TITLES: Record<BreakdownKind, string> = {
  cotizaciones: "Desglose de cotizaciones",
  tiendas: "Tiendas con actividad",
  adopcion: "Desglose de adopción",
  usuarios: "Usuarios que cotizaron",
};

type BreakdownRow = { label: string; count: number };

function StatTile({
  label,
  value,
  sublabel,
  onClick,
}: {
  label: string;
  value: string;
  sublabel?: string;
  onClick?: () => void;
}) {
  const className = cn(
    PANEL_CARD,
    "p-4 text-left transition-all",
    onClick &&
      "cursor-pointer hover:border-brand/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 active:scale-[0.99]"
  );

  const content = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {sublabel ? <p className="mt-0.5 text-xs text-slate-500">{sublabel}</p> : null}
      {onClick ? (
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-brand/80">Ver desglose</p>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function BreakdownBars({
  rows,
  total,
  emptyMessage = "Sin datos para mostrar.",
}: {
  rows: BreakdownRow[];
  total: number;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  const max = rows[0]?.count ?? 0;

  return (
    <div className="space-y-3">
      {rows.map(({ label, count }) => (
        <div
          key={label}
          className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] sm:gap-3"
        >
          <span className="truncate text-xs font-medium text-slate-600" title={label}>
            {label}
          </span>
          <div className="min-w-0 overflow-hidden rounded-sm bg-slate-100">
            <div
              className="h-4 max-w-full rounded-sm bg-brand transition-all"
              style={{ width: `${max > 0 ? Math.max((count / max) * 100, 2) : 0}%` }}
            />
          </div>
          <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
            {count}
            {total > 0 ? (
              <span className="ml-1 font-normal text-slate-400">({((count / total) * 100).toFixed(0)}%)</span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

function BreakdownList({
  rows,
  total,
  emptyMessage = "Sin datos para mostrar.",
}: {
  rows: BreakdownRow[];
  total: number;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {rows.map(({ label, count }) => (
        <li key={label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span className="min-w-0 truncate text-slate-700" title={label}>
            {label}
          </span>
          <span className="shrink-0 tabular-nums text-slate-500">
            {count}
            {total > 0 ? (
              <span className="ml-1 text-slate-400">({((count / total) * 100).toFixed(0)}%)</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const user = useMemo(() => getCurrentUser(), []);
  const [rows, setRows] = useState<DashboardCotizacionRow[]>([]);
  const [sucursales, setSucursales] = useState<CtzSucursal[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterZona, setFilterZona] = useState("");
  const [filterTienda, setFilterTienda] = useState("");
  const [filterUsuario, setFilterUsuario] = useState("");
  const [breakdownOpen, setBreakdownOpen] = useState<BreakdownKind | null>(null);

  useEffect(() => {
    if (user?.rol !== "admin") return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([listCotizacionesForDashboard(), listSucursales()]).then(
      ([cotizaciones, sucs]) => {
        if (cancelled) return;
        setRows(cotizaciones);
        setSucursales(sucs);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [user?.rol]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    for (const row of rows) years.add(new Date(row.created_at).getFullYear());
    return [...years].sort((a, b) => b - a);
  }, [rows]);

  const zonaOptions = useMemo(() => {
    const zonas = new Set<string>();
    for (const s of sucursales) zonas.add(displayRegionLabel(s.region?.trim() || SIN_REGION));
    for (const row of rows) {
      zonas.add(displayRegionLabel(row.ctz_sucursales?.region?.trim() || SIN_REGION));
    }
    return sortRegionKeys([...zonas]);
  }, [sucursales, rows]);

  const tiendaOptions = useMemo(() => {
    const list = filterZona
      ? sucursales.filter((s) => matchesDisplayRegion(s.region, filterZona))
      : sucursales;
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [sucursales, filterZona]);

  const usuarioOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of rows) {
      if (byId.has(row.id_usuario)) continue;
      byId.set(row.id_usuario, row.ctz_usuarios?.nombre_completo || row.ctz_usuarios?.email || row.id_usuario);
    }
    return [...byId.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const date = new Date(row.created_at);
      if (filterYear && date.getFullYear() !== Number(filterYear)) return false;
      if (filterMonth && date.getMonth() !== Number(filterMonth)) return false;
      if (filterZona && !matchesDisplayRegion(row.ctz_sucursales?.region, filterZona)) return false;
      if (filterTienda && row.id_sucursal !== filterTienda) return false;
      if (filterUsuario && row.id_usuario !== filterUsuario) return false;
      return true;
    });
  }, [rows, filterYear, filterMonth, filterZona, filterTienda, filterUsuario]);

  const stats = useMemo(() => {
    const tiendasConUso = new Set<string>();
    const usuariosDistintos = new Set<string>();
    const porRegion = new Map<string, number>();

    for (const row of filtered) {
      tiendasConUso.add(row.id_sucursal);
      usuariosDistintos.add(row.id_usuario);
      const region = displayRegionLabel(row.ctz_sucursales?.region?.trim() || SIN_REGION);
      porRegion.set(region, (porRegion.get(region) ?? 0) + 1);
    }

    // Denominador de adopción: tiendas activas dentro de los filtros de zona/tienda
    const universoTiendas = sucursales.filter((s) => {
      if (filterZona && !matchesDisplayRegion(s.region, filterZona)) return false;
      if (filterTienda && s.id !== filterTienda) return false;
      return true;
    });

    const adopcion =
      universoTiendas.length > 0 ? (tiendasConUso.size / universoTiendas.length) * 100 : 0;

    const regiones = [...porRegion.entries()]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalCotizaciones: filtered.length,
      tiendasConUso: tiendasConUso.size,
      totalTiendas: universoTiendas.length,
      adopcion,
      usuariosDistintos: usuariosDistintos.size,
      regiones,
    };
  }, [filtered, sucursales, filterZona, filterTienda]);

  const breakdowns = useMemo(() => {
    const porRegion = new Map<string, number>();
    const porTienda = new Map<string, { nombre: string; count: number }>();
    const porUsuario = new Map<string, { label: string; count: number }>();
    const porMes = new Map<string, { year: number; month: number; count: number }>();
    let ventasCerradas = 0;

    for (const row of filtered) {
      const region = displayRegionLabel(row.ctz_sucursales?.region?.trim() || SIN_REGION);
      porRegion.set(region, (porRegion.get(region) ?? 0) + 1);

      const tiendaNombre = row.ctz_sucursales?.nombre?.trim() || "Sin tienda";
      const tiendaEntry = porTienda.get(row.id_sucursal) ?? { nombre: tiendaNombre, count: 0 };
      tiendaEntry.count += 1;
      porTienda.set(row.id_sucursal, tiendaEntry);

      const usuarioLabel =
        row.ctz_usuarios?.nombre_completo?.trim() ||
        row.ctz_usuarios?.email?.trim() ||
        row.id_usuario;
      const usuarioEntry = porUsuario.get(row.id_usuario) ?? { label: usuarioLabel, count: 0 };
      usuarioEntry.count += 1;
      porUsuario.set(row.id_usuario, usuarioEntry);

      const date = new Date(row.created_at);
      const mesLabel = `${MESES[date.getMonth()]} ${date.getFullYear()}`;
      const mesEntry = porMes.get(mesLabel) ?? {
        year: date.getFullYear(),
        month: date.getMonth(),
        count: 0,
      };
      mesEntry.count += 1;
      porMes.set(mesLabel, mesEntry);

      if (row.venta_cerrada) ventasCerradas += 1;
    }

    const regiones: BreakdownRow[] = [...porRegion.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const tiendas: BreakdownRow[] = [...porTienda.values()]
      .map(({ nombre, count }) => ({ label: nombre, count }))
      .sort((a, b) => b.count - a.count);

    const usuarios: BreakdownRow[] = [...porUsuario.values()]
      .map(({ label, count }) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const meses: BreakdownRow[] = [...porMes.entries()]
      .map(([label, { year, month, count }]) => ({ label, count, year, month }))
      .sort((a, b) => b.year - a.year || b.month - a.month)
      .map(({ label, count }) => ({ label, count }));

    const universoTiendas = sucursales.filter((s) => {
      if (filterZona && !matchesDisplayRegion(s.region, filterZona)) return false;
      if (filterTienda && s.id !== filterTienda) return false;
      return true;
    });

    const tiendasConUsoIds = new Set(porTienda.keys());
    const conActividad: BreakdownRow[] = universoTiendas
      .filter((s) => tiendasConUsoIds.has(s.id))
      .map((s) => ({
        label: s.nombre,
        count: porTienda.get(s.id)?.count ?? 0,
      }))
      .sort((a, b) => b.count - a.count);

    const sinActividad: BreakdownRow[] = universoTiendas
      .filter((s) => !tiendasConUsoIds.has(s.id))
      .map((s) => ({ label: s.nombre, count: 0 }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));

    return {
      regiones,
      tiendas,
      usuarios,
      meses,
      ventasCerradas,
      ventasPendientes: filtered.length - ventasCerradas,
      conActividad,
      sinActividad,
      totalTiendasUniverso: universoTiendas.length,
    };
  }, [filtered, sucursales, filterZona, filterTienda]);

  if (user?.rol !== "admin") {
    return <p className={ALERT_WARNING}>Esta sección es solo para administradores.</p>;
  }

  const maxRegionCount = stats.regiones[0]?.count ?? 0;

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Cotizador"
        title="Dashboard"
        subtitle="Uso del cotizador por zona, tienda y usuario"
      />

      <div className={`${PANEL_CARD} grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5`}>
        <label className={FIELD_LABEL}>
          Año
          <div className="mt-1.5">
            <FilterSelect
              value={filterYear}
              onChange={setFilterYear}
              options={[
                { value: "", label: "Todos" },
                ...yearOptions.map((year) => ({ value: String(year), label: String(year) })),
              ]}
              inputClassName={FIELD_SELECT_TRIGGER}
            />
          </div>
        </label>
        <label className={FIELD_LABEL}>
          Mes
          <div className="mt-1.5">
            <FilterSelect
              value={filterMonth}
              onChange={setFilterMonth}
              options={[
                { value: "", label: "Todos" },
                ...MESES.map((mes, index) => ({ value: String(index), label: mes })),
              ]}
              inputClassName={FIELD_SELECT_TRIGGER}
            />
          </div>
        </label>
        <label className={FIELD_LABEL}>
          Zona
          <div className="mt-1.5">
            <FilterSelect
              value={filterZona}
              onChange={(value) => {
                setFilterZona(value);
                setFilterTienda("");
              }}
              options={[
                { value: "", label: "Todas" },
                ...zonaOptions.map((zona) => ({ value: zona, label: zona })),
              ]}
              inputClassName={FIELD_SELECT_TRIGGER}
            />
          </div>
        </label>
        <label className={FIELD_LABEL}>
          Tienda
          <div className="mt-1.5">
            <FilterSelect
              value={filterTienda}
              onChange={setFilterTienda}
              options={[
                { value: "", label: "Todas" },
                ...tiendaOptions.map((s) => ({ value: String(s.id), label: s.nombre })),
              ]}
              inputClassName={FIELD_SELECT_TRIGGER}
            />
          </div>
        </label>
        <label className={FIELD_LABEL}>
          Usuario
          <div className="mt-1.5">
            <FilterSelect
              value={filterUsuario}
              onChange={setFilterUsuario}
              options={[
                { value: "", label: "Todos" },
                ...usuarioOptions.map((u) => ({ value: String(u.id), label: u.label })),
              ]}
              inputClassName={FIELD_SELECT_TRIGGER}
            />
          </div>
        </label>
      </div>

      {loading ? (
        <div className={EMPTY_STATE}>Cargando métricas...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Cotizaciones"
              value={String(stats.totalCotizaciones)}
              sublabel="en el periodo filtrado"
              onClick={() => setBreakdownOpen("cotizaciones")}
            />
            <StatTile
              label="Tiendas con actividad"
              value={String(stats.tiendasConUso)}
              sublabel={`de ${stats.totalTiendas} tiendas activas`}
              onClick={() => setBreakdownOpen("tiendas")}
            />
            <StatTile
              label="Adopción"
              value={`${stats.adopcion.toFixed(1)}%`}
              sublabel="tiendas que han cotizado"
              onClick={() => setBreakdownOpen("adopcion")}
            />
            <StatTile
              label="Usuarios distintos"
              value={String(stats.usuariosDistintos)}
              sublabel="que generaron cotizaciones"
              onClick={() => setBreakdownOpen("usuarios")}
            />
          </div>

          <div className={`${PANEL_CARD} p-4`}>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Cotizaciones por región</h2>
            {stats.regiones.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No hay cotizaciones con los filtros aplicados.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.regiones.map(({ region, count }) => (
                  <div
                    key={region}
                    className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:gap-3"
                  >
                    <span className="truncate text-xs font-medium text-slate-600" title={region}>
                      {region}
                    </span>
                    <div className="min-w-0 overflow-hidden rounded-sm bg-slate-100">
                      <div
                        className="h-5 max-w-full rounded-sm bg-brand transition-all"
                        style={{ width: `${maxRegionCount > 0 ? Math.max((count / maxRegionCount) * 100, 2) : 0}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
                      {count}
                      <span className="ml-1 font-normal text-slate-400">
                        {stats.totalCotizaciones > 0
                          ? `(${((count / stats.totalCotizaciones) * 100).toFixed(0)}%)`
                          : ""}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={breakdownOpen !== null}
        onClose={() => setBreakdownOpen(null)}
        title={breakdownOpen ? BREAKDOWN_TITLES[breakdownOpen] : ""}
        wide
      >
        {breakdownOpen === "cotizaciones" ? (
          <div className="space-y-6">
            <section>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Por región</h4>
              <BreakdownBars rows={breakdowns.regiones} total={stats.totalCotizaciones} />
            </section>
            <section>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Por mes</h4>
              <BreakdownBars rows={breakdowns.meses} total={stats.totalCotizaciones} />
            </section>
            <section>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Estado de venta</h4>
              <div className={`${PANEL_INSET} grid grid-cols-2 gap-3 p-3`}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cerradas</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{breakdowns.ventasCerradas}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">En proceso</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{breakdowns.ventasPendientes}</p>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {breakdownOpen === "tiendas" ? (
          <BreakdownBars rows={breakdowns.tiendas} total={stats.totalCotizaciones} emptyMessage="Ninguna tienda con cotizaciones en este periodo." />
        ) : null}

        {breakdownOpen === "adopcion" ? (
          <div className="space-y-6">
            <section>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                Con actividad ({breakdowns.conActividad.length})
              </h4>
              <p className="mb-3 text-xs text-slate-500">
                {breakdowns.conActividad.length} de {breakdowns.totalTiendasUniverso} tiendas han cotizado
              </p>
              <BreakdownBars rows={breakdowns.conActividad} total={stats.totalCotizaciones} />
            </section>
            {breakdowns.sinActividad.length > 0 ? (
              <section>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Sin actividad ({breakdowns.sinActividad.length})
                </h4>
                <BreakdownList rows={breakdowns.sinActividad} total={breakdowns.totalTiendasUniverso} />
              </section>
            ) : null}
          </div>
        ) : null}

        {breakdownOpen === "usuarios" ? (
          <BreakdownBars rows={breakdowns.usuarios} total={stats.totalCotizaciones} emptyMessage="Ningún usuario con cotizaciones en este periodo." />
        ) : null}
      </Modal>
    </section>
  );
}
