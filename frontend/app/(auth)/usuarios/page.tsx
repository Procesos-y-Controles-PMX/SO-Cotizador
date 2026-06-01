"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import ConfirmDeleteUsuarioModal from "@/components/usuarios/ConfirmDeleteUsuarioModal";
import ImportUsuariosModal from "@/components/usuarios/ImportUsuariosModal";
import UsuarioFormModal from "@/components/usuarios/UsuarioFormModal";
import TablePagination from "@/components/ui/TablePagination";
import { getCurrentUser } from "@/lib/auth";
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
      toast.error("No se pudo importar ningun usuario.");
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

  if (user?.rol !== "admin") {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        Esta seccion es solo para administradores.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Usuarios</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => void handleExcelFileChange(e)}
          />
          <button
            type="button"
            disabled={exportLoading}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
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
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => void downloadUsuariosExcelTemplate().catch(() => toast.error("No se pudo descargar la plantilla."))}
          >
            Descargar Plantilla
          </button>
          <button
            type="button"
            disabled={excelParsing || importing}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={() => excelInputRef.current?.click()}
          >
            {excelParsing ? "Leyendo..." : "Importar Excel"}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={openCreate}
          >
            + Nuevo usuario
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <label className="block flex-1 text-sm font-medium text-slate-700">
          Buscar (correo o nombre)
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Ej. garcia@empresa.com"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </label>
        {loading ? (
          <span className="text-sm text-slate-500 sm:pb-2">Cargando...</span>
        ) : (
          <span className="text-sm text-slate-500 sm:pb-2">{allRows.length} usuario(s)</span>
        )}
      </div>

      <div className="overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="min-w-[200px] px-4 py-3">Correo</th>
              <th className="min-w-[160px] px-4 py-3">Nombre</th>
              <th className="whitespace-nowrap px-4 py-3">Rol</th>
              <th className="whitespace-nowrap px-4 py-3">Activo</th>
              <th className="whitespace-nowrap px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            ) : allRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  {qDebounced ? "Sin resultados." : "Sin usuarios."}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const isSelf = row.id === user.id;
                return (
                  <tr
                    key={row.id}
                    className={`border-t border-slate-100 ${row.activo ? "" : "bg-slate-50 text-slate-600"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.email}</div>
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
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-500"
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
                          title={isSelf ? "No puedes editar tu propia cuenta" : undefined}
                          onClick={() => openEdit(row)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => setDeleteTarget(row)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
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
