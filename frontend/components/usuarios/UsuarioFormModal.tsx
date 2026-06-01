"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createUsuario, updateUsuario, usuarioMutationErrorMessage } from "@/lib/queries/usuarios";
import type { CtzUsuario, UserRole } from "@/lib/types/db";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial: CtzUsuario | null;
  currentUserId: string;
  onClose: () => void;
  onSaved: (usuario: CtzUsuario) => void | Promise<void>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UsuarioFormModal({ open, mode, initial, currentUserId, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState({ email: "", nombre_completo: "", rol: "tienda" as UserRole });
  const [saving, setSaving] = useState(false);

  const isSelf = mode === "edit" && initial?.id === currentUserId;

  useEffect(() => {
    if (open) {
      setDraft({
        email: initial?.email ?? "",
        nombre_completo: initial?.nombre_completo ?? "",
        rol: initial?.rol ?? "tienda",
      });
      setSaving(false);
    }
  }, [open, initial]);

  if (!open) return null;

  async function handleSave() {
    if (saving || isSelf) return;
    const email = draft.email.trim().toLowerCase();
    if (!email) {
      toast.error("El correo es obligatorio.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      toast.error("Ingresa un correo valido.");
      return;
    }

    setSaving(true);
    if (mode === "create") {
      const result = await createUsuario({
        email,
        nombre_completo: draft.nombre_completo.trim(),
        rol: draft.rol,
      });
      setSaving(false);
      if (!result.ok) {
        toast.error(usuarioMutationErrorMessage(result.error));
        return;
      }
      await onSaved(result.usuario);
      return;
    }

    if (!initial) {
      setSaving(false);
      return;
    }

    const result = await updateUsuario(
      initial.id,
      {
        email,
        nombre_completo: draft.nombre_completo.trim(),
        rol: draft.rol,
      },
      { currentUserId, target: initial }
    );
    setSaving(false);
    if (!result.ok) {
      toast.error(usuarioMutationErrorMessage(result.error));
      return;
    }
    await onSaved(result.usuario);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h4 className="text-base font-semibold text-slate-900">
          {mode === "create" ? "Nuevo usuario" : isSelf ? "Tu cuenta" : "Editar usuario"}
        </h4>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "create"
            ? "El usuario podra iniciar sesion con su correo."
            : isSelf
              ? "Estos datos no se pueden cambiar desde esta pantalla."
              : "Actualiza los datos del usuario."}
        </p>

        <div className="mt-4 grid gap-3">
          <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Correo *
            <input
              autoFocus={!isSelf}
              type="email"
              value={draft.email}
              disabled={isSelf}
              onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="usuario@empresa.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </label>
          <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Nombre completo
            <input
              value={draft.nombre_completo}
              disabled={isSelf}
              onChange={(event) => setDraft((prev) => ({ ...prev, nombre_completo: event.target.value }))}
              placeholder="Nombre Apellido"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </label>
          <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Rol
            <select
              value={draft.rol}
              disabled={isSelf}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, rol: event.target.value as UserRole }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="tienda">Tienda</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          {isSelf ? (
            <p className="text-xs text-amber-700">
              No puedes modificar tu propio correo, nombre ni rol desde aqui.
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {isSelf ? "Cerrar" : "Cancelar"}
          </button>
          {!isSelf ? (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
