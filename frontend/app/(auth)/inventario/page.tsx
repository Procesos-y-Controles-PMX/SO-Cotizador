"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { listProductos, updateProducto } from "@/lib/queries/productos";
import type { CtzProducto } from "@/lib/types/db";

export default function InventarioPage() {
  const user = useMemo(() => getCurrentUser(), []);
  const [rows, setRows] = useState<CtzProducto[]>([]);

  useEffect(() => {
    listProductos().then(setRows);
  }, []);

  if (user?.rol !== "admin") {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        Esta seccion es solo para administradores.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">Inventario</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Descripcion</th>
              <th className="px-4 py-3">U.M.</th>
              <th className="px-4 py-3">Precio base</th>
              <th className="px-4 py-3">Activo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.sku ?? "-"}</td>
                <td className="px-4 py-3">{row.descripcion}</td>
                <td className="px-4 py-3">{row.unidad_medida ?? "-"}</td>
                <td className="px-4 py-3">${row.precio_unitario_base.toFixed(2)}</td>
                <td className="px-4 py-3">
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

