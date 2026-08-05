"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import ConfirmDeleteSucursalModal from "@/components/sucursales/ConfirmDeleteSucursalModal";
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
import {
  deleteSucursal,
  listSucursales,
  setSucursalActivo,
  sucursalMutationErrorMessage,
} from "@/lib/queries/sucursales";
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
  const [deleteTarget, setDeleteTarget] = useState<CtzSucursal | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setQDebounced(qInput.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [qInput]);

  useEffect(() => {
    if (user?.rol !== "admin") return;
    let cancelled = false;
    setLoading(true);
    void listSucursales({ includeInactive: true }).then((data) => {
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

  async function handleActivoChange(row: CtzSucursal, nextActivo: boolean) {
    const ok = await setSucursalActivo(row.id, nextActivo);
    if (!ok) {
      toast.error("No se pudo actualizar el estado de la sucursal.");
      return;
    }
    setRows((prev) =>
      prev
        .map((s) => (s.id === row.id ? { ...s, activo: nextActivo } : s))
        .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre))
    );
    toast.success(nextActivo ? "Sucursal activada." : "Sucursal desactivada.");
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteSucursal(deleteTarget.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(sucursalMutationErrorMessage(result.error));
      return;
    }
    toast.success("Sucursal borrada.");
    setRows((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  if (user?.rol !== "admin") {
    return <p className={ALERT_WARNING}>Esta sección es solo para administradores.</p>;
  }

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Catálogo"
        title="Sucursales"
        subtitle="Edita dirección y términos del PDF. Desactiva tiendas cerradas para que no afecten los KPIs."
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
        <p className="text-sm text-fg-subtle">Cargando sucursales...</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((row) => (
              <article
                key={row.id}
                className={`${MOBILE_LIST_CARD} ${row.activo ? "" : "opacity-70"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-fg">{row.nombre}</h2>
                    <p className="mt-1 text-xs text-fg-subtle">
                      {[row.centro, row.region, row.ciudad].filter(Boolean).join(" · ") || "Sin región"}
                    </p>
                    <p className="mt-2 text-sm text-fg-strong">{row.direccion ?? "Sin dirección"}</p>
                    {!row.activo ? (
                      <p className="mt-1 text-xs font-medium text-amber-700">Inactiva</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-line-subtle pt-3">
                  <label className="flex items-center gap-2 text-sm text-fg-muted">
                    <input
                      type="checkbox"
                      checked={row.activo}
                      onChange={(event) => void handleActivoChange(row, event.target.checked)}
                    />
                    Activa
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`${BTN_GHOST} flex-1 border border-line`}
                    onClick={() => setEditing(row)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(row)}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700"
                  >
                    Borrar
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className={`hidden md:block ${TABLE_WRAP}`}>
            <table className="min-w-full text-sm">
              <thead className="border-b border-line bg-muted">
                <tr>
                  <th className={TABLE_HEAD_CELL}>Sucursal</th>
                  <th className={TABLE_HEAD_CELL}>Centro</th>
                  <th className={TABLE_HEAD_CELL}>Región</th>
                  <th className={TABLE_HEAD_CELL}>Ciudad</th>
                  <th className={TABLE_HEAD_CELL}>Dirección</th>
                  <th className={TABLE_HEAD_CELL}>Activa</th>
                  <th className={TABLE_HEAD_CELL} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={`${TABLE_BODY_ROW} ${row.activo ? "" : "bg-muted/80 text-fg-muted"}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-fg">{row.nombre}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{row.centro ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{row.region ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{row.ciudad ?? "—"}</td>
                    <td className="max-w-md px-4 py-3 text-fg-strong">{row.direccion ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.activo}
                        title={row.activo ? "Desactivar sucursal" : "Activar sucursal"}
                        onChange={(event) => void handleActivoChange(row, event.target.checked)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={`${BTN_GHOST} border border-line px-2 py-1 text-xs`}
                          onClick={() => setEditing(row)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          className={`${BTN_GHOST} border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50`}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-fg-subtle">No hay sucursales que coincidan con la búsqueda.</p>
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

      <ConfirmDeleteSucursalModal
        open={deleteTarget != null}
        sucursal={deleteTarget}
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </section>
  );
}
