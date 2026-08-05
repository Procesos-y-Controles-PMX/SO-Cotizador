"use client";

import Modal from "@/components/ui/Modal";
import { BTN_DANGER, BTN_SECONDARY } from "@/components/ui/contentStyles";
import type { CtzSucursal } from "@/lib/types/db";

type Props = {
  open: boolean;
  sucursal: CtzSucursal | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmDeleteSucursalModal({
  open,
  sucursal,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  if (!sucursal) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Borrar sucursal permanentemente"
      actions={
        <>
          <button type="button" disabled={loading} onClick={onClose} className={BTN_SECONDARY}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className={BTN_DANGER}
          >
            {loading ? "Borrando..." : "Borrar permanentemente"}
          </button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">
        Vas a borrar <span className="font-medium text-fg">{sucursal.nombre}</span>
        {sucursal.centro ? (
          <>
            {" "}
            (<span className="font-medium text-fg">{sucursal.centro}</span>)
          </>
        ) : null}
        . Esta acción <span className="font-semibold text-red-700">no se puede deshacer</span>.
      </p>
      <p className="mt-2 text-sm text-fg-subtle">
        Si la sucursal tiene clientes o cotizaciones en el historial, el borrado fallará. En ese caso
        desactívala desde la tabla para que deje de contar en los KPIs.
      </p>
    </Modal>
  );
}
