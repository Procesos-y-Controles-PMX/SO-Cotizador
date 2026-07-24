"use client";

import Modal from "@/components/ui/Modal";
import { ALERT_WARNING, BTN_DANGER, BTN_SECONDARY } from "@/components/ui/contentStyles";
import type { CtzUsuario } from "@/lib/types/db";

type Props = {
  open: boolean;
  usuario: CtzUsuario | null;
  loading?: boolean;
  isSelf: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmDeleteUsuarioModal({
  open,
  usuario,
  loading = false,
  isSelf,
  onClose,
  onConfirm,
}: Props) {
  if (!usuario) return null;

  const displayName = usuario.nombre_completo?.trim() || usuario.email;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Borrar usuario permanentemente"
      actions={
        <>
          <button type="button" disabled={loading} onClick={onClose} className={BTN_SECONDARY}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading || isSelf}
            onClick={() => void onConfirm()}
            className={BTN_DANGER}
          >
            {loading ? "Borrando..." : "Borrar permanentemente"}
          </button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">
        Vas a borrar a <span className="font-medium text-fg">{displayName}</span> (
        {usuario.email}). Esta accion <span className="font-semibold text-red-700">no se puede deshacer</span>.
      </p>
      <p className="mt-2 text-sm text-fg-subtle">
        Si el usuario tiene cotizaciones en el historial, el borrado fallará. En ese caso puedes desactivarlo
        desde la tabla.
      </p>
      {isSelf ? (
        <p className={`mt-3 ${ALERT_WARNING}`}>No puedes borrar tu propio usuario.</p>
      ) : null}
    </Modal>
  );
}
