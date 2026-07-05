"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import {
  ALERT_WARNING,
  CHEVRON_SELECT,
  EMPTY_STATE,
  FIELD_LABEL,
  FIELD_SELECT,
  PANEL_CARD,
} from "@/components/ui/contentStyles";
import {
  listCotizacionesForDashboard,
  type DashboardCotizacionRow,
} from "@/lib/queries/dashboardStats";
import { listSucursales } from "@/lib/queries/sucursales";
import type { CtzSucursal } from "@/lib/types/db";

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

function StatTile({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className={`${PANEL_CARD} p-4`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {sublabel ? <p className="mt-0.5 text-xs text-slate-500">{sublabel}</p> : null}
    </div>
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
    for (const s of sucursales) zonas.add(s.region?.trim() || SIN_REGION);
    for (const row of rows) zonas.add(row.ctz_sucursales?.region?.trim() || SIN_REGION);
    return [...zonas].sort((a, b) => a.localeCompare(b, "es"));
  }, [sucursales, rows]);

  const tiendaOptions = useMemo(() => {
    const list = filterZona
      ? sucursales.filter((s) => (s.region?.trim() || SIN_REGION) === filterZona)
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
      if (filterZona && (row.ctz_sucursales?.region?.trim() || SIN_REGION) !== filterZona) return false;
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
      const region = row.ctz_sucursales?.region?.trim() || SIN_REGION;
      porRegion.set(region, (porRegion.get(region) ?? 0) + 1);
    }

    // Denominador de adopción: tiendas activas dentro de los filtros de zona/tienda
    const universoTiendas = sucursales.filter((s) => {
      if (filterZona && (s.region?.trim() || SIN_REGION) !== filterZona) return false;
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
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className={`mt-1.5 ${FIELD_SELECT} ${CHEVRON_SELECT}`}
          >
            <option value="">Todos</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className={FIELD_LABEL}>
          Mes
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className={`mt-1.5 ${FIELD_SELECT} ${CHEVRON_SELECT}`}
          >
            <option value="">Todos</option>
            {MESES.map((mes, index) => (
              <option key={mes} value={index}>
                {mes}
              </option>
            ))}
          </select>
        </label>
        <label className={FIELD_LABEL}>
          Zona
          <select
            value={filterZona}
            onChange={(e) => {
              setFilterZona(e.target.value);
              setFilterTienda("");
            }}
            className={`mt-1.5 ${FIELD_SELECT} ${CHEVRON_SELECT}`}
          >
            <option value="">Todas</option>
            {zonaOptions.map((zona) => (
              <option key={zona} value={zona}>
                {zona}
              </option>
            ))}
          </select>
        </label>
        <label className={FIELD_LABEL}>
          Tienda
          <select
            value={filterTienda}
            onChange={(e) => setFilterTienda(e.target.value)}
            className={`mt-1.5 ${FIELD_SELECT} ${CHEVRON_SELECT}`}
          >
            <option value="">Todas</option>
            {tiendaOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className={FIELD_LABEL}>
          Usuario
          <select
            value={filterUsuario}
            onChange={(e) => setFilterUsuario(e.target.value)}
            className={`mt-1.5 ${FIELD_SELECT} ${CHEVRON_SELECT}`}
          >
            <option value="">Todos</option>
            {usuarioOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className={EMPTY_STATE}>Cargando métricas...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Cotizaciones" value={String(stats.totalCotizaciones)} sublabel="en el periodo filtrado" />
            <StatTile
              label="Tiendas con actividad"
              value={String(stats.tiendasConUso)}
              sublabel={`de ${stats.totalTiendas} tiendas activas`}
            />
            <StatTile
              label="Adopción"
              value={`${stats.adopcion.toFixed(1)}%`}
              sublabel="tiendas que han cotizado"
            />
            <StatTile
              label="Usuarios distintos"
              value={String(stats.usuariosDistintos)}
              sublabel="que generaron cotizaciones"
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
                  <div key={region} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-xs font-medium text-slate-600 sm:w-44">
                      {region}
                    </span>
                    <div className="h-5 flex-1 rounded-sm bg-slate-100">
                      <div
                        className="h-full rounded-sm bg-brand transition-all"
                        style={{ width: `${maxRegionCount > 0 ? Math.max((count / maxRegionCount) * 100, 2) : 0}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
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
    </section>
  );
}
