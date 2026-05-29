"use client";

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
  if (!open || !usuario) return null;

  const displayName = usuario.nombre_completo?.trim() || usuario.email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h4 className="text-base font-semibold text-slate-900">Borrar usuario permanentemente</h4>
        <p className="mt-2 text-sm text-slate-600">
          Vas a borrar a <span className="font-medium text-slate-900">{displayName}</span> (
          {usuario.email}). Esta accion <span className="font-semibold text-red-700">no se puede deshacer</span>.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Si el usuario tiene cotizaciones en el historial, el borrado fallara. En ese caso puedes desactivarlo
          desde la tabla.
        </p>
        {isSelf ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No puedes borrar tu propio usuario.
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading || isSelf}
            onClick={() => void onConfirm()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Borrando..." : "Borrar permanentemente"}
          </button>
        </div>
      </div>
    </div>
  );
}
