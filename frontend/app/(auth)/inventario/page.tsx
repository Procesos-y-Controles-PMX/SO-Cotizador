"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import NuevoProductoModal from "@/components/productos/NuevoProductoModal";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Inventario</h2>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={() => setProductModalOpen(true)}
        >
          + Nuevo producto
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <label className="block flex-1 text-sm font-medium text-slate-700">
          Buscar (SKU, descripción, U.M. o precio base exacto)
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={`Mínimo ${INVENTARIO_SEARCH_MIN_CHARS} caracteres para buscar`}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
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

      <div className="overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">SKU</th>
              <th className="min-w-[200px] px-4 py-3">Descripción</th>
              <th className="whitespace-nowrap px-4 py-3">U.M.</th>
              <th className="whitespace-nowrap px-4 py-3">Precio base</th>
              <th className="whitespace-nowrap px-4 py-3">Activo</th>
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
                  className={`border-t border-slate-100 ${row.activo ? "" : "bg-slate-50 text-slate-600"}`}
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
