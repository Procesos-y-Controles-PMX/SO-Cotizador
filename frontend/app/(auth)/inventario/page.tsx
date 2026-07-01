"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import NuevoProductoModal from "@/components/productos/NuevoProductoModal";
import PageHeader from "@/components/ui/PageHeader";
import { BTN_SECONDARY, FIELD_INPUT, TABLE_BODY_ROW, TABLE_HEAD_CELL, TABLE_WRAP } from "@/components/ui/contentStyles";
import {
  INVENTARIO_SEARCH_MIN_CHARS,
  listInventarioProductos,
  updateProducto,
} from "@/lib/queries/productos";
import type { CtzProducto } from "@/lib/types/db";

const SEARCH_DEBOUNCE_MS = 350;

export default function InventarioPage() {
  const user = useMemo(() => getCurrentUser(), []);
  const [qInput, setQInput] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [rows, setRows] = useState<CtzProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [productModalOpen, setProductModalOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setQDebounced(qInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [qInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listInventarioProductos(qDebounced).then((data) => {
      if (cancelled) return;
      setRows(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [qDebounced]);

  async function refreshRows() {
    const data = await listInventarioProductos(qDebounced);
    setRows(data);
  }

  if (user?.rol !== "admin") {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        Esta sección es solo para administradores.
      </p>
    );
  }

  const qTrim = qInput.trim();
  const showMinCharsHint = qTrim.length > 0 && qTrim.length < INVENTARIO_SEARCH_MIN_CHARS;

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Cotizador"
        title="Inventario"
        actions={
          <button type="button" className={BTN_SECONDARY} onClick={() => setProductModalOpen(true)}>
            + Nuevo producto
          </button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <label className="block flex-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Buscar (SKU, descripción, U.M. o precio base exacto)
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={`Mínimo ${INVENTARIO_SEARCH_MIN_CHARS} caracteres para buscar`}
            className={`mt-1.5 ${FIELD_INPUT}`}
          />
        </label>
        {loading ? (
          <span className="text-sm text-slate-500 sm:pb-2">Cargando...</span>
        ) : (
          <span className="text-sm text-slate-500 sm:pb-2">
            {qDebounced ? `${rows.length} resultado(s)` : "Primeros 10 (activos primero)"}
          </span>
        )}
      </div>
      {showMinCharsHint ? (
        <p className="text-sm text-amber-800">
          Escribe al menos {INVENTARIO_SEARCH_MIN_CHARS} caracteres para buscar en el catálogo.
        </p>
      ) : null}

      <div className={TABLE_WRAP}>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className={TABLE_HEAD_CELL}>SKU</th>
              <th className={`${TABLE_HEAD_CELL} min-w-[200px]`}>Descripción</th>
              <th className={TABLE_HEAD_CELL}>U.M.</th>
              <th className={TABLE_HEAD_CELL}>Precio base</th>
              <th className={TABLE_HEAD_CELL}>Activo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  {qDebounced.length >= INVENTARIO_SEARCH_MIN_CHARS ? "Sin resultados." : "Sin datos."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`${TABLE_BODY_ROW} ${row.activo ? "" : "bg-slate-50/80 text-slate-600"}`}
                >
                  <td className="whitespace-nowrap px-4 py-3">{row.sku ?? "-"}</td>
                  <td className="px-4 py-3">{row.descripcion}</td>
                  <td className="whitespace-nowrap px-4 py-3">{row.unidad_medida ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3">${row.precio_unitario_base.toFixed(2)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <input
                      type="checkbox"
                      checked={row.activo}
                      onChange={async (event) => {
                        const next = event.target.checked;
                        const ok = await updateProducto(row.id, { activo: next });
                        if (!ok) return toast.error("No se pudo actualizar.");
                        setRows((prev) => prev.map((p) => (p.id === row.id ? { ...p, activo: next } : p)));
                      }}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NuevoProductoModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onCreated={async () => {
          toast.success("Producto creado.");
          setProductModalOpen(false);
          await refreshRows();
        }}
      />
    </section>
  );
}
