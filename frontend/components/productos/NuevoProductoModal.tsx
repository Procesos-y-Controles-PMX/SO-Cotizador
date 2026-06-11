"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createProducto } from "@/lib/queries/productos";
import type { CtzProducto } from "@/lib/types/db";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Se llama tras insertar en BD con éxito (antes de cerrar). */
  onCreated: (producto: CtzProducto) => void | Promise<void>;
};

export default function NuevoProductoModal({ open, onClose, onCreated }: Props) {
  const [draft, setDraft] = useState({
    sku: "",
    descripcion: "",
    unidad_medida: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft({ sku: "", descripcion: "", unidad_medida: "" });
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    if (saving) return;
    if (!draft.descripcion.trim()) {
      toast.error("La descripción del producto es obligatoria.");
      return;
    }
    setSaving(true);
    const created = await createProducto({
      sku: draft.sku.trim(),
      descripcion: draft.descripcion.trim(),
      unidad_medida: draft.unidad_medida.trim(),
    });
    setSaving(false);
    if (!created) {
      toast.error("No se pudo crear producto.");
      return;
    }
    await onCreated(created);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h4 className="text-base font-semibold text-slate-900">Nuevo producto</h4>
        <p className="mt-1 text-sm text-slate-500">
          El precio se define en cada cotización; en catálogo queda en $0.00.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Descripción del producto *
            <input
              autoFocus
              value={draft.descripcion}
              onChange={(event) => setDraft((prev) => ({ ...prev, descripcion: event.target.value }))}
              placeholder="Ej. Cemento Gris bulto 50kg"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
            />
          </label>
          <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            SKU
            <input
              value={draft.sku}
              onChange={(event) => setDraft((prev) => ({ ...prev, sku: event.target.value }))}
              placeholder="Ej. CEM-50-GRIS"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
            />
          </label>
          <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Unidad de Medida
            <input
              value={draft.unidad_medida}
              onChange={(event) => setDraft((prev) => ({ ...prev, unidad_medida: event.target.value }))}
              placeholder="Ej. Bulto, Pieza, m3"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSave();
                }
              }}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
