"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  FIELD_INPUT,
  FIELD_LABEL,
  PANEL_INSET,
} from "@/components/ui/contentStyles";
import { updateSucursal } from "@/lib/queries/sucursales";
import type { CtzSucursal } from "@/lib/types/db";

type Props = {
  open: boolean;
  sucursal: CtzSucursal | null;
  onClose: () => void;
  onSaved: (sucursal: CtzSucursal) => void;
};

export default function SucursalEditModal({ open, sucursal, onClose, onSaved }: Props) {
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [terminosAdicionales, setTerminosAdicionales] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !sucursal) return;
    setDireccion(sucursal.direccion ?? "");
    setCiudad(sucursal.ciudad ?? "");
    setTerminosAdicionales(sucursal.terminos_adicionales ?? "");
    setSaving(false);
  }, [open, sucursal]);

  async function handleSave() {
    if (!sucursal || saving) return;

    const direccionTrimmed = direccion.trim();
    const ciudadTrimmed = ciudad.trim();
    const terminosTrimmed = terminosAdicionales.trim();

    if (!direccionTrimmed) {
      toast.error("La dirección es obligatoria.");
      return;
    }

    setSaving(true);
    const ok = await updateSucursal(sucursal.id, {
      direccion: direccionTrimmed,
      ciudad: ciudadTrimmed || null,
      terminos_adicionales: terminosTrimmed || null,
    });
    setSaving(false);

    if (!ok) {
      toast.error("No se pudo guardar la sucursal.");
      return;
    }

    onSaved({
      ...sucursal,
      direccion: direccionTrimmed,
      ciudad: ciudadTrimmed || null,
      terminos_adicionales: terminosTrimmed || null,
    });
    toast.success("Sucursal actualizada.");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sucursal ? `Editar ${sucursal.nombre}` : "Editar sucursal"}
      wide
      actions={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={BTN_SECONDARY}>
            Cancelar
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className={BTN_PRIMARY}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </>
      }
    >
      {sucursal ? (
        <div className="space-y-4">
          <div className={`grid gap-3 p-3 text-sm sm:grid-cols-2 ${PANEL_INSET}`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Centro</p>
              <p className="mt-1 font-medium text-slate-900">{sucursal.centro ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Región</p>
              <p className="mt-1 font-medium text-slate-900">{sucursal.region ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prefijo folio</p>
              <p className="mt-1 font-medium text-slate-900">{sucursal.prefijo_folio}</p>
            </div>
          </div>

          <label className={FIELD_LABEL}>
            Ciudad
            <input
              className={`mt-1.5 ${FIELD_INPUT}`}
              value={ciudad}
              onChange={(event) => setCiudad(event.target.value)}
              placeholder="Ej. Monterrey"
            />
          </label>

          <label className={FIELD_LABEL}>
            Dirección (PDF)
            <textarea
              className={`mt-1.5 min-h-[96px] ${FIELD_INPUT}`}
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
              placeholder="Calle, colonia, CP, estado..."
            />
          </label>

          <label className={FIELD_LABEL}>
            Términos adicionales (PDF)
            <textarea
              className={`mt-1.5 min-h-[96px] ${FIELD_INPUT}`}
              value={terminosAdicionales}
              onChange={(event) => setTerminosAdicionales(event.target.value)}
              placeholder="Condiciones especiales de esta tienda..."
            />
          </label>

          <p className="text-xs text-slate-500">
            La dirección y los términos se muestran en el PDF de las cotizaciones de esta sucursal.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
