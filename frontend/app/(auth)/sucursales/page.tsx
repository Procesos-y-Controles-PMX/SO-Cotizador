"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import SucursalEditModal from "@/components/sucursales/SucursalEditModal";
import {
  ALERT_WARNING,
  BTN_GHOST,
  FIELD_INPUT,
  MOBILE_LIST_CARD,
  TABLE_BODY_ROW,
  TABLE_HEAD_CELL,
  TABLE_WRAP,
} from "@/components/ui/contentStyles";
import { getCurrentUser } from "@/lib/auth";
import { listSucursales } from "@/lib/queries/sucursales";
import type { CtzSucursal } from "@/lib/types/db";

const SEARCH_DEBOUNCE_MS = 350;

function matchesSearch(sucursal: CtzSucursal, query: string): boolean {
  const haystack = [
    sucursal.nombre,
    sucursal.region,
    sucursal.ciudad,
    sucursal.centro,
    sucursal.direccion,
    sucursal.prefijo_folio,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export default function SucursalesPage() {
  const user = useMemo(() => getCurrentUser(), []);
  const [rows, setRows] = useState<CtzSucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [editing, setEditing] = useState<CtzSucursal | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setQDebounced(qInput.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [qInput]);

  useEffect(() => {
    if (user?.rol !== "admin") return;
    let cancelled = false;
    setLoading(true);
    void listSucursales().then((data) => {
      if (cancelled) return;
      setRows(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.rol]);

  const filtered = useMemo(() => {
    if (!qDebounced) return rows;
    return rows.filter((row) => matchesSearch(row, qDebounced));
  }, [rows, qDebounced]);

  if (user?.rol !== "admin") {
    return <p className={ALERT_WARNING}>Esta sección es solo para administradores.</p>;
  }

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Catálogo"
        title="Sucursales"
        subtitle="Edita dirección y términos que aparecen en el PDF de cotización"
      />

      <div className="max-w-md">
        <input
          className={FIELD_INPUT}
          value={qInput}
          onChange={(event) => setQInput(event.target.value)}
          placeholder="Buscar por nombre, región, ciudad o dirección..."
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando sucursales...</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((row) => (
              <article key={row.id} className={MOBILE_LIST_CARD}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900">{row.nombre}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {[row.centro, row.region, row.ciudad].filter(Boolean).join(" · ") || "Sin región"}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{row.direccion ?? "Sin dirección"}</p>
                  </div>
                  <button type="button" className={BTN_GHOST} onClick={() => setEditing(row)}>
                    Editar
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className={`hidden md:block ${TABLE_WRAP}`}>
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={TABLE_HEAD_CELL}>Sucursal</th>
                  <th className={TABLE_HEAD_CELL}>Centro</th>
                  <th className={TABLE_HEAD_CELL}>Región</th>
                  <th className={TABLE_HEAD_CELL}>Ciudad</th>
                  <th className={TABLE_HEAD_CELL}>Dirección</th>
                  <th className={TABLE_HEAD_CELL} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className={TABLE_BODY_ROW}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{row.nombre}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.centro ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.region ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.ciudad ?? "—"}</td>
                    <td className="max-w-md px-4 py-3 text-slate-700">{row.direccion ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button type="button" className={BTN_GHOST} onClick={() => setEditing(row)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">No hay sucursales que coincidan con la búsqueda.</p>
          ) : null}
        </>
      )}

      <SucursalEditModal
        open={editing !== null}
        sucursal={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        }}
      />
    </section>
  );
}
