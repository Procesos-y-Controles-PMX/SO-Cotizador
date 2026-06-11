"use client";

import type { UsuariosExcelImportPreview } from "@/lib/excel/importUsuarios";

const LIST_CAP = 15;

type Props = {
  open: boolean;
  preview: UsuariosExcelImportPreview | null;
  importing?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

function listSuffix(total: number): string {
  if (total <= LIST_CAP) return "";
  return ` (y ${total - LIST_CAP} más…)`;
}

export default function ImportUsuariosModal({
  open,
  preview,
  importing = false,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !preview) return null;

  const okSlice = preview.ok.slice(0, LIST_CAP);
  const skippedSlice = preview.skipped.slice(0, LIST_CAP);
  const failedSlice = preview.failed.slice(0, LIST_CAP);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h4 className="text-base font-semibold text-slate-900">Importar usuarios desde Excel</h4>
        <p className="mt-1 text-sm text-slate-500">
          Primera fila: <strong>Correo</strong> y <strong>Nombre</strong>. Se crearán con rol{" "}
          <strong>Tienda</strong> y una <strong>contraseña generada</strong> (cámbiala después en Editar).
          Los correos ya registrados se omiten.
        </p>
        </div>

        <div className="max-h-[50vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {preview.ok.length > 0 ? (
            <div>
              <p className="mb-2 font-semibold text-emerald-800">
                Listos para crear ({preview.ok.length}){listSuffix(preview.ok.length)}
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-emerald-100 bg-emerald-50/50 p-2 text-xs text-slate-800">
                {okSlice.map((row) => (
                  <li key={`ok-${row.excelRowIndex}-${row.email}`}>
                    Fila {row.excelRowIndex}: {row.email}
                    {row.nombre_completo ? ` · ${row.nombre_completo}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.skipped.length > 0 ? (
            <div>
              <p className="mb-2 font-semibold text-amber-800">
                Omitidos, ya en BD ({preview.skipped.length}){listSuffix(preview.skipped.length)}
              </p>
              <ul className="max-h-32 space-y-1 overflow-y-auto rounded border border-amber-100 bg-amber-50/50 p-2 text-xs text-amber-900">
                {skippedSlice.map((row) => (
                  <li key={`skip-${row.excelRowIndex}-${row.email}`}>
                    Fila {row.excelRowIndex}: {row.email}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.failed.length > 0 ? (
            <div>
              <p className="mb-2 font-semibold text-red-800">
                Con error ({preview.failed.length}){listSuffix(preview.failed.length)}
              </p>
              <ul className="max-h-32 space-y-1 overflow-y-auto rounded border border-red-100 bg-red-50/50 p-2 text-xs text-red-900">
                {failedSlice.map((row) => (
                  <li key={`fail-${row.excelRowIndex}-${row.emailRaw}`}>
                    Fila {row.excelRowIndex}: {row.emailRaw || "(vacio)"} — {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            disabled={importing}
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={importing || preview.ok.length === 0}
            onClick={() => void onConfirm()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {importing
              ? "Importando..."
              : `Importar ${preview.ok.length} usuario${preview.ok.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
