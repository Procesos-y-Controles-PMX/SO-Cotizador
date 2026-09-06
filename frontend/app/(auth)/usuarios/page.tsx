"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import ConfirmDeleteUsuarioModal from "@/components/usuarios/ConfirmDeleteUsuarioModal";
import ImportUsuariosModal from "@/components/usuarios/ImportUsuariosModal";
import UsuarioFormModal from "@/components/usuarios/UsuarioFormModal";
import TablePagination from "@/components/ui/TablePagination";
import PageHeader from "@/components/ui/PageHeader";
import {
  ALERT_WARNING,
  BTN_DANGER,
  BTN_GHOST,
  BTN_PRIMARY,
  BTN_SECONDARY,
  FIELD_INPUT,
  MOBILE_LIST_CARD,
  TABLE_BODY_ROW,
  TABLE_HEAD_CELL,
  TABLE_WRAP,
} from "@/components/ui/contentStyles";
import { getCurrentUser } from "@/lib/auth";
import { isOwnerAdminEmail } from "@/lib/owner-admin";
import {
  downloadUsuariosExcelTemplate,
  parseUsuariosExcelFile,
  resolveUsuariosExcelRows,
  type UsuariosExcelImportPreview,
} from "@/lib/excel/importUsuarios";
import { downloadUsuariosExcel } from "@/lib/excel/exportUsuarios";
import { clampPage, PAGE_SIZE } from "@/lib/pagination";
import {
  createUsuariosBulk,
  deleteUsuario,
  getExistingUsuarioEmails,
  listUsuarios,
  updateUsuario,
  usuarioMutationErrorMessage,
  validateUsuarioMutation,
} from "@/lib/queries/usuarios";
import type { CtzUsuario, UserRole } from "@/lib/types/db";

const SEARCH_DEBOUNCE_MS = 350;

function rolLabel(rol: UserRole): string {
  return rol === "admin" ? "Administrador" : "Tienda";
}

export default function UsuariosPage() {
  const user = useMemo(() => getCurrentUser(), []);
  const [qInput, setQInput] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [allRows, setAllRows] = useState<CtzUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingUsuario, setEditingUsuario] = useState<CtzUsuario | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CtzUsuario | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<UsuariosExcelImportPreview | null>(null);
  const [excelParsing, setExcelParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setQDebounced(qInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [qDebounced]);

  const visibleRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return allRows.slice(start, start + PAGE_SIZE);
  }, [allRows, page]);

  useEffect(() => {
    if (user?.rol !== "admin") return;
    let cancelled = false;
    setLoading(true);
    void listUsuarios(qDebounced).then((data) => {
      if (cancelled) return;
      setAllRows(data);
      setPage((prev) => clampPage(prev, data.length));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [qDebounced, user?.rol]);

  async function refreshRows() {
    const data = await listUsuarios(qDebounced);
    setAllRows(data);
    setPage((prev) => clampPage(prev, data.length));
  }

  function openCreate() {
    setFormMode("create");
    setEditingUsuario(null);
    setFormOpen(true);
  }

  async function handleExcelFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setExcelParsing(true);
    try {
      const [rows, existingEmails] = await Promise.all([
        parseUsuariosExcelFile(file),
        getExistingUsuarioEmails(),
      ]);
      const { preview, error } = resolveUsuariosExcelRows(rows, existingEmails);
      if (error) {
        toast.error(error);
        return;
      }
      setImportPreview(preview);
      setImportModalOpen(true);
    } catch {
      toast.error("No se pudo leer el Excel. Usa .xlsx con fila de encabezados Correo y Nombre.");
    } finally {
      setExcelParsing(false);
    }
  }

  async function handleConfirmImport() {
    if (!importPreview?.ok.length) return;
    setImporting(true);
    const result = await createUsuariosBulk(
      importPreview.ok.map((r) => ({ email: r.email, nombre_completo: r.nombre_completo }))
    );
    setImporting(false);
    if (result.inserted === 0 && result.failed > 0) {
      toast.error("No se pudo importar ningún usuario.");
      return;
    }
    const parts: string[] = [];
    if (result.inserted) parts.push(`${result.inserted} creado(s)`);
    if (result.failed) parts.push(`${result.failed} fallido(s)`);
    toast.success(`Importacion completada: ${parts.join(", ")}.`);
    setImportModalOpen(false);
    setImportPreview(null);
    await refreshRows();
  }

  function openEdit(usuario: CtzUsuario) {
    setFormMode("edit");
    setEditingUsuario(usuario);
    setFormOpen(true);
  }

  async function handleRolChange(row: CtzUsuario, nextRol: UserRole) {
    if (!user || nextRol === row.rol) return;
    const guardError = await validateUsuarioMutation(row, user.id, { rol: nextRol });
    if (guardError) {
      toast.error(usuarioMutationErrorMessage(guardError));
      return;
    }
    const result = await updateUsuario(row.id, { rol: nextRol }, { currentUserId: user.id, target: row });
    if (!result.ok) {
      toast.error(usuarioMutationErrorMessage(result.error));
      return;
    }
    setAllRows((prev) => prev.map((u) => (u.id === row.id ? result.usuario : u)));
    toast.success("Rol actualizado.");
  }

  async function handleActivoChange(row: CtzUsuario, nextActivo: boolean) {
    if (!user) return;
    const guardError = await validateUsuarioMutation(row, user.id, { activo: nextActivo });
    if (guardError) {
      toast.error(usuarioMutationErrorMessage(guardError));
      return;
    }
    const result = await updateUsuario(row.id, { activo: nextActivo }, { currentUserId: user.id, target: row });
    if (!result.ok) {
      toast.error(usuarioMutationErrorMessage(result.error));
      return;
    }
    setAllRows((prev) => prev.map((u) => (u.id === row.id ? result.usuario : u)));
    toast.success(nextActivo ? "Usuario activado." : "Usuario desactivado.");
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !user) return;
    if (deleteTarget.id === user.id) {
      toast.error(usuarioMutationErrorMessage("self_modify"));
      return;
    }
    const guardError = await validateUsuarioMutation(deleteTarget, user.id, {
      activo: false,
      rol: "tienda",
    });
    if (guardError === "last_admin") {
      toast.error(usuarioMutationErrorMessage("last_admin"));
      return;
    }

    setDeleting(true);
    const result = await deleteUsuario(deleteTarget.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(usuarioMutationErrorMessage(result.error));
      return;
    }
    toast.success("Usuario borrado.");
    const wasLastOnPage = visibleRows.length === 1;
    setDeleteTarget(null);
    const data = await listUsuarios(qDebounced);
    setAllRows(data);
    if (wasLastOnPage && page > 1) {
      setPage((prev) => clampPage(prev - 1, data.length));
    } else {
      setPage((prev) => clampPage(prev, data.length));
    }
  }

  const isGeneralAdmin = isOwnerAdminEmail(user?.email);

  if (user?.rol !== "admin") {
    return <p className={ALERT_WARNING}>Esta sección es solo para administradores.</p>;
  }

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Cotizador"
        title="Usuarios"
        actions={
          <>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => void handleExcelFileChange(e)}
            />
            {isGeneralAdmin ? (
              <button
                type="button"
                disabled={exportLoading}
                className={BTN_SECONDARY}
                onClick={async () => {
                  setExportLoading(true);
                  try {
                    const rows = await listUsuarios("");
                    await downloadUsuariosExcel(rows);
                    toast.success("Excel descargado.");
                  } catch {
                    toast.error("No se pudo generar el Excel de usuarios.");
                  } finally {
                    setExportLoading(false);
                  }
                }}
              >
                {exportLoading ? "Generando..." : "Descargar Usuarios"}
              </button>
            ) : null}
            <button
              type="button"
              className={BTN_SECONDARY}
              onClick={() => void downloadUsuariosExcelTemplate().catch(() => toast.error("No se pudo descargar la plantilla."))}
            >
              Descargar Plantilla
            </button>
            <button
              type="button"
              disabled={excelParsing || importing}
              className={BTN_SECONDARY}
              onClick={() => excelInputRef.current?.click()}
            >
              {excelParsing ? "Leyendo..." : "Importar Excel"}
            </button>
            <button type="button" className={BTN_PRIMARY} onClick={openCreate}>
              + Nuevo usuario
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <label className="block flex-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Buscar (correo o nombre)
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Ej. garcia@empresa.com"
            className={`mt-1.5 ${FIELD_INPUT}`}
          />
        </label>
        {loading ? (
          <span className="text-sm text-fg-subtle sm:pb-2">Cargando...</span>
        ) : (
          <span className="text-sm text-fg-subtle sm:pb-2">{allRows.length} usuario(s)</span>
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="text-center text-sm text-fg-subtle">Cargando...</p>
        ) : allRows.length === 0 ? (
          <p className="text-center text-sm text-fg-subtle">{qDebounced ? "Sin resultados." : "Sin usuarios."}</p>
        ) : (
          visibleRows.map((row) => {
            const isSelf = row.id === user.id;
            return (
              <article key={row.id} className={MOBILE_LIST_CARD}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-fg">{row.email}</p>
                    <p className="mt-0.5 text-sm text-fg-muted">{row.nombre_completo?.trim() || "—"}</p>
                    {isSelf ? <p className="mt-1 text-xs text-amber-700">Tu cuenta (no editable)</p> : null}
                  </div>
                  <span className="shrink-0 rounded-lg border border-line bg-muted px-2 py-1 text-xs font-semibold text-fg-muted">
                    {rolLabel(row.rol)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-line-subtle pt-3">
                  <label className="flex items-center gap-2 text-sm text-fg-muted">
                    <input
                      type="checkbox"
                      checked={row.activo}
                      disabled={isSelf}
                      onChange={(event) => void handleActivoChange(row, event.target.checked)}
                    />
                    Activo
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => openEdit(row)}
                    className={`${BTN_SECONDARY} flex-1`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => setDeleteTarget(row)}
                    className={`${BTN_DANGER} flex-1 disabled:opacity-50`}
                  >
                    Borrar
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className={`hidden md:block ${TABLE_WRAP}`}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className={`${TABLE_HEAD_CELL} min-w-[200px]`}>Correo</th>
              <th className={`${TABLE_HEAD_CELL} min-w-[160px]`}>Nombre</th>
              <th className={TABLE_HEAD_CELL}>Rol</th>
              <th className={TABLE_HEAD_CELL}>Activo</th>
              <th className={TABLE_HEAD_CELL}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-fg-subtle">
                  Cargando...
                </td>
              </tr>
            ) : allRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-fg-subtle">
                  {qDebounced ? "Sin resultados." : "Sin usuarios."}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const isSelf = row.id === user.id;
                return (
                  <tr
                    key={row.id}
                    className={`${TABLE_BODY_ROW} ${row.activo ? "" : "bg-muted/80 text-fg-muted"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg">{row.email}</div>
                      {isSelf ? (
                        <span className="text-xs text-amber-700">Tu cuenta (no editable)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{row.nombre_completo?.trim() || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <select
                        value={row.rol}
                        disabled={isSelf}
                        title={isSelf ? "No puedes modificar tu propio acceso" : undefined}
                        onChange={(event) => void handleRolChange(row, event.target.value as UserRole)}
                        className="rounded-lg border border-line bg-card px-2 py-1 text-sm disabled:bg-muted disabled:text-fg-subtle"
                      >
                        <option value="tienda">{rolLabel("tienda")}</option>
                        <option value="admin">{rolLabel("admin")}</option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.activo}
                        disabled={isSelf}
                        title={isSelf ? "No puedes modificar tu propio acceso" : undefined}
                        onChange={(event) => void handleActivoChange(row, event.target.checked)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => openEdit(row)}
                          className={`${BTN_GHOST} border border-line px-2 py-1 text-xs disabled:opacity-50`}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => setDeleteTarget(row)}
                          className={`${BTN_DANGER} min-h-8 px-2 py-1 text-xs disabled:opacity-50`}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        total={allRows.length}
        loading={loading}
        onPageChange={setPage}
      />

      <UsuarioFormModal
        open={formOpen}
        mode={formMode}
        initial={editingUsuario}
        currentUserId={user.id}
        onClose={() => setFormOpen(false)}
        onSaved={async (saved) => {
          toast.success(formMode === "create" ? "Usuario creado." : "Usuario actualizado.");
          setFormOpen(false);
          setEditingUsuario(saved);
          await refreshRows();
        }}
      />

      <ConfirmDeleteUsuarioModal
        open={deleteTarget != null}
        usuario={deleteTarget}
        loading={deleting}
        isSelf={deleteTarget?.id === user.id}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      <ImportUsuariosModal
        open={importModalOpen}
        preview={importPreview}
        importing={importing}
        onClose={() => {
          if (!importing) {
            setImportModalOpen(false);
            setImportPreview(null);
          }
        }}
        onConfirm={handleConfirmImport}
      />
    </section>
  );
}
