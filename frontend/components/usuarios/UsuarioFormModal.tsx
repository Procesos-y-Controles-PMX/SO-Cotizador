"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import {
  ALERT_WARNING,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CHEVRON_SELECT,
  FIELD_INPUT,
  FIELD_LABEL,
  FIELD_SELECT,
} from "@/components/ui/contentStyles";
import { MIN_USUARIO_PASSWORD_LENGTH } from "@/lib/usuarioPassword";
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
  const [draft, setDraft] = useState({
    email: "",
    nombre_completo: "",
    rol: "tienda" as UserRole,
    password: "",
    passwordConfirm: "",
  });
  const [saving, setSaving] = useState(false);

  const isSelf = mode === "edit" && initial?.id === currentUserId;

  useEffect(() => {
    if (open) {
      setDraft({
        email: initial?.email ?? "",
        nombre_completo: initial?.nombre_completo ?? "",
        rol: initial?.rol ?? "tienda",
        password: "",
        passwordConfirm: "",
      });
      setSaving(false);
    }
  }, [open, initial]);

  async function handleSave() {
    if (saving || isSelf) return;
    const email = draft.email.trim().toLowerCase();
    if (!email) {
      toast.error("El correo es obligatorio.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      toast.error("Ingresa un correo válido.");
      return;
    }

    setSaving(true);
    if (mode === "create") {
      const pwd = draft.password.trim();
      if (pwd.length < MIN_USUARIO_PASSWORD_LENGTH) {
        setSaving(false);
        toast.error(`La contraseña debe tener al menos ${MIN_USUARIO_PASSWORD_LENGTH} caracteres.`);
        return;
      }
      if (pwd !== draft.passwordConfirm.trim()) {
        setSaving(false);
        toast.error("Las contraseñas no coinciden.");
        return;
      }
      const result = await createUsuario({
        email,
        nombre_completo: draft.nombre_completo.trim(),
        rol: draft.rol,
        password: pwd,
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

    const pwd = draft.password.trim();
    if (pwd) {
      if (pwd.length < MIN_USUARIO_PASSWORD_LENGTH) {
        setSaving(false);
        toast.error(`La contraseña debe tener al menos ${MIN_USUARIO_PASSWORD_LENGTH} caracteres.`);
        return;
      }
      if (pwd !== draft.passwordConfirm.trim()) {
        setSaving(false);
        toast.error("Las contraseñas no coinciden.");
        return;
      }
    }

    const patch: Parameters<typeof updateUsuario>[1] = {
      email,
      nombre_completo: draft.nombre_completo.trim(),
      rol: draft.rol,
    };
    if (pwd) patch.password = pwd;

    const result = await updateUsuario(initial.id, patch, { currentUserId, target: initial });
    setSaving(false);
    if (!result.ok) {
      toast.error(usuarioMutationErrorMessage(result.error));
      return;
    }
    await onSaved(result.usuario);
  }

  const title =
    mode === "create" ? "Nuevo usuario" : isSelf ? "Tu cuenta" : "Editar usuario";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={BTN_SECONDARY}>
            {isSelf ? "Cerrar" : "Cancelar"}
          </button>
          {!isSelf ? (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className={BTN_PRIMARY}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          ) : null}
        </>
      }
    >
      <p className="text-sm text-fg-subtle">
        {mode === "create"
          ? "El usuario iniciará sesión con este correo y contraseña."
          : isSelf
            ? "Estos datos no se pueden cambiar desde esta pantalla."
            : "Deja la contraseña vacía si no quieres cambiarla."}
      </p>

      <div className="mt-4 grid gap-3">
        <label className={`space-y-1.5 ${FIELD_LABEL}`}>
          Correo *
          <input
            autoFocus={!isSelf}
            type="email"
            value={draft.email}
            disabled={isSelf}
            onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="usuario@empresa.com"
            className={`${FIELD_INPUT} normal-case disabled:bg-muted disabled:text-fg-subtle`}
          />
        </label>
        <label className={`space-y-1.5 ${FIELD_LABEL}`}>
          Nombre completo
          <input
            value={draft.nombre_completo}
            disabled={isSelf}
            onChange={(event) => setDraft((prev) => ({ ...prev, nombre_completo: event.target.value }))}
            placeholder="Nombre Apellido"
            className={`${FIELD_INPUT} normal-case disabled:bg-muted disabled:text-fg-subtle`}
          />
        </label>
        {!isSelf ? (
          <>
            <label className={`space-y-1.5 ${FIELD_LABEL}`}>
              {mode === "create" ? "Contraseña *" : "Nueva contraseña"}
              <input
                type="password"
                value={draft.password}
                onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={mode === "create" ? "Mín. 4 caracteres" : "Dejar vacío = sin cambio"}
                autoComplete="new-password"
                className={`${FIELD_INPUT} normal-case`}
              />
            </label>
            <label className={`space-y-1.5 ${FIELD_LABEL}`}>
              {mode === "create" ? "Confirmar contraseña *" : "Confirmar nueva contraseña"}
              <input
                type="password"
                value={draft.passwordConfirm}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, passwordConfirm: event.target.value }))
                }
                placeholder="Repetir contraseña"
                autoComplete="new-password"
                className={`${FIELD_INPUT} normal-case`}
              />
            </label>
          </>
        ) : null}
        <label className={`space-y-1.5 ${FIELD_LABEL}`}>
          Rol
          <select
            value={draft.rol}
            disabled={isSelf}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, rol: event.target.value as UserRole }))
            }
            className={`${FIELD_SELECT} ${CHEVRON_SELECT} normal-case disabled:bg-muted disabled:text-fg-subtle`}
          >
            <option value="tienda">Tienda</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        {isSelf ? (
          <p className={ALERT_WARNING}>
            No puedes modificar tu propio correo, nombre, contraseña ni rol desde aquí.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
