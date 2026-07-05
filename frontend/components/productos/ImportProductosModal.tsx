"use client";

import Modal from "@/components/ui/Modal";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/contentStyles";
import type { ProductosExcelImportPreview } from "@/lib/excel/importProductos";

const LIST_CAP = 15;

type Props = {
  open: boolean;
  preview: ProductosExcelImportPreview | null;
  importing?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

function listSuffix(total: number): string {
  if (total <= LIST_CAP) return "";
  return ` (y ${total - LIST_CAP} más…)`;
}

export default function ImportProductosModal({
  open,
  preview,
  importing = false,
  onClose,
  onConfirm,
}: Props) {
  if (!preview) return null;

  const okSlice = preview.ok.slice(0, LIST_CAP);
  const skippedSlice = preview.skipped.slice(0, LIST_CAP);
  const failedSlice = preview.failed.slice(0, LIST_CAP);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importar SKUs desde Excel"
      actions={
        <>
          <button type="button" disabled={importing} onClick={onClose} className={BTN_SECONDARY}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={importing || preview.ok.length === 0}
            onClick={() => void onConfirm()}
            className={BTN_PRIMARY}
          >
            {importing
              ? "Importando..."
              : `Importar ${preview.ok.length} producto${preview.ok.length === 1 ? "" : "s"}`}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-500">
        Primera fila: <strong>SKU</strong>, <strong>Descripción</strong>, <strong>U.M.</strong> y{" "}
        <strong>Precio base</strong>. Solo la descripción es obligatoria. Se crearán como{" "}
        <strong>activos</strong> y los SKUs ya registrados se omiten.
      </p>

      <div className="mt-4 space-y-4 text-sm">
        {preview.ok.length > 0 ? (
          <div>
            <p className="mb-2 font-semibold text-emerald-800">
              Listos para crear ({preview.ok.length}){listSuffix(preview.ok.length)}
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-emerald-100 bg-emerald-50/50 p-2 text-xs text-slate-800">
              {okSlice.map((row) => (
                <li key={`ok-${row.excelRowIndex}`}>
                  Fila {row.excelRowIndex}: {row.sku ? `${row.sku} · ` : ""}
                  {row.descripcion}
                  {row.precio_unitario_base ? ` · $${row.precio_unitario_base.toFixed(2)}` : ""}
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
                <li key={`skip-${row.excelRowIndex}-${row.sku}`}>
                  Fila {row.excelRowIndex}: {row.sku}
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
                <li key={`fail-${row.excelRowIndex}-${row.label}`}>
                  Fila {row.excelRowIndex}: {row.label} — {row.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
