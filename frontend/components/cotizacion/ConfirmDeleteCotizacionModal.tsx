"use client";

import Modal from "@/components/ui/Modal";
import { BTN_DANGER, BTN_SECONDARY } from "@/components/ui/contentStyles";

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmDeleteCotizacionModal({ open, loading = false, onClose, onConfirm }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Borrar cotización"
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
            {loading ? "Borrando..." : "Aceptar"}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-500">¿Estás seguro de que quieres borrar esta cotización?</p>
    </Modal>
  );
}
