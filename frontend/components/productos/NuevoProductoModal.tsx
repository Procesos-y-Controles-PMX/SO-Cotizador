"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_INPUT, FIELD_LABEL } from "@/components/ui/contentStyles";
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
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo producto"
      actions={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={BTN_SECONDARY}>
            Descartar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={BTN_PRIMARY}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </>
      }
    >
      <p className="text-sm text-fg-subtle">
        El precio se define en cada cotización; en catálogo queda en $0.00.
      </p>

      <div className="mt-4 grid gap-3">
        <label className={`space-y-1.5 ${FIELD_LABEL}`}>
          Descripción del producto *
          <input
            autoFocus
            value={draft.descripcion}
            onChange={(event) => setDraft((prev) => ({ ...prev, descripcion: event.target.value }))}
            placeholder="Ej. Cemento Gris bulto 50kg"
            className={`${FIELD_INPUT} normal-case`}
          />
        </label>
        <label className={`space-y-1.5 ${FIELD_LABEL}`}>
          SKU
          <input
            value={draft.sku}
            onChange={(event) => setDraft((prev) => ({ ...prev, sku: event.target.value }))}
            placeholder="Ej. CEM-50-GRIS"
            className={`${FIELD_INPUT} normal-case`}
          />
        </label>
        <label className={`space-y-1.5 ${FIELD_LABEL}`}>
          Unidad de Medida
          <input
            value={draft.unidad_medida}
            onChange={(event) => setDraft((prev) => ({ ...prev, unidad_medida: event.target.value }))}
            placeholder="Ej. Bulto, Pieza, m3"
            className={`${FIELD_INPUT} normal-case`}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSave();
              }
            }}
          />
        </label>
      </div>
    </Modal>
  );
}
