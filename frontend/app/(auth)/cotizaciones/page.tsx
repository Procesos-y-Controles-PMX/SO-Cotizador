"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ConfirmDeleteCotizacionModal from "@/components/cotizacion/ConfirmDeleteCotizacionModal";
import DownloadCotizacionesZipModal from "@/components/cotizacion/DownloadCotizacionesZipModal";
import PageHeader from "@/components/ui/PageHeader";
import TablePagination from "@/components/ui/TablePagination";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  EMPTY_STATE,
  FIELD_INPUT,
  MOBILE_LIST_CARD,
  TABLE_BODY_ROW,
  TABLE_HEAD_CELL,
  TABLE_WRAP,
} from "@/components/ui/contentStyles";
import { getCurrentUser } from "@/lib/auth";
import { downloadHistorialCotizacionesExcel } from "@/lib/excel/exportHistorialCotizaciones";
import {
  downloadCotizacionesPdfZip,
  NoCotizacionesForZipError,
  type BulkPdfScope,
} from "@/lib/pdf/exportCotizacionesZip";
import {
  deleteCotizacion,
  listCotizaciones,
  updateVentaCerradaCotizacion,
  type CotizacionWithRelations,
} from "@/lib/queries/cotizaciones";
import { canDuplicateCotizacion } from "@/lib/cotizacion/cotizacionToFormInitial";
import { obraNombreCotizacion } from "@/lib/queries/obras";
import { PAGE_SIZE } from "@/lib/pagination";
import { cn, money } from "@/lib/utils";

export default function CotizacionesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<CotizacionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CotizacionWithRelations | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updatingVenta, setUpdatingVenta] = useState<Record<string, boolean>>({});
  const [excelLoading, setExcelLoading] = useState(false);
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);
  const user = useMemo(() => getCurrentUser(), []);
  const isAdmin = user?.rol === "admin";

  const loadRows = useCallback(async (signal?: { cancelled: boolean }) => {
    if (!user) return;
    setLoading(true);
    const result = await listCotizaciones(user, search, { page, pageSize: PAGE_SIZE });
    if (signal?.cancelled) return;
    setRows(result.rows);
    setTotal(result.total);
    setLoading(false);
  }, [search, user, page]);

  useEffect(() => {
    const signal = { cancelled: false };
    void loadRows(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadRows]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const ok = await deleteCotizacion(deleteTarget.id);
    setDeleteLoading(false);
    if (!ok) {
      toast.error("No se pudo borrar la cotización.");
      return;
    }
    toast.success("Cotización borrada.");
    const wasLastOnPage = rows.length === 1;
    setDeleteTarget(null);
    if (wasLastOnPage && page > 1) {
      setPage((prev) => prev - 1);
    } else {
      await loadRows();
    }
  }

  async function handleVentaCerradaToggle(row: CotizacionWithRelations, nextValue: boolean) {
    if (!user) return;
    const canEdit = user.rol === "admin" || row.id_usuario === user.id;
    if (!canEdit) {
      toast.error("No tienes permiso para cambiar esta cotización.");
      return;
    }

    setUpdatingVenta((prev) => ({ ...prev, [row.id]: true }));
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, venta_cerrada: nextValue } : r)));

    const result = await updateVentaCerradaCotizacion(user, row.id, nextValue);
    setUpdatingVenta((prev) => ({ ...prev, [row.id]: false }));
    if (!result.ok) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, venta_cerrada: !nextValue } : r)));
      if (result.error === "forbidden") {
        toast.error("No tienes permiso para cambiar esta cotización.");
      } else {
        toast.error("No se pudo actualizar el estado de cierre.");
      }
      return;
    }
    toast.success("Estado de venta actualizado.");
  }

  async function handleDownloadZip(scope: BulkPdfScope) {
    if (!user) return;
    setZipLoading(true);
    setZipProgress(null);
    try {
      const exportRows = await listCotizaciones(user, search, { unlimited: true });
      await downloadCotizacionesPdfZip(exportRows, scope, (current, total) => {
        setZipProgress({ current, total });
      });
      toast.success("ZIP descargado correctamente.");
      setZipModalOpen(false);
    } catch (error) {
      if (error instanceof NoCotizacionesForZipError) {
        toast.error(error.message);
      } else {
        toast.error("No se pudo generar el ZIP de PDFs.");
      }
    } finally {
      setZipLoading(false);
      setZipProgress(null);
    }
  }

  const emptyColSpan = 7;

  function renderRowActions(row: CotizacionWithRelations, stacked = false) {
    const linkClass = stacked
      ? "inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-line bg-muted px-3 text-sm font-semibold text-brand"
      : "text-xs font-semibold text-brand hover:text-brand-hover";

    return (
      <div className={stacked ? "flex flex-wrap gap-2" : "flex flex-col items-end gap-0.5"}>
        <Link href={`/cotizaciones/${row.id}`} className={linkClass}>
          Ver detalle
        </Link>
        {user && canDuplicateCotizacion(user, row) ? (
          <Link href={`/cotizaciones/nueva?copiar=${row.id}`} className={linkClass}>
            Duplicar
          </Link>
        ) : null}
        {isAdmin ? (
          <button
            type="button"
            className={
              stacked
                ? "inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700"
                : "text-xs font-semibold text-red-600 hover:text-red-500"
            }
            onClick={() => setDeleteTarget(row)}
          >
            Borrar
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <section className="min-w-0 space-y-4">
      <PageHeader
        eyebrow="Cotizador"
        title="Historial de cotizaciones"
        actions={
          <>
            {isAdmin ? (
              <button
                type="button"
                className={BTN_SECONDARY}
                disabled={zipLoading}
                onClick={() => setZipModalOpen(true)}
              >
                Descargar PDFs (ZIP)
              </button>
            ) : null}
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={excelLoading}
              onClick={async () => {
                if (!user) return;
                setExcelLoading(true);
                try {
                  const exportRows = await listCotizaciones(user, search, { unlimited: true });
                  await downloadHistorialCotizacionesExcel(exportRows);
                } catch {
                  toast.error("No se pudo generar el Excel del historial.");
                } finally {
                  setExcelLoading(false);
                }
              }}
            >
              {excelLoading ? "Generando Excel..." : "Descargar Excel"}
            </button>
            <Link href="/cotizaciones/nueva" className={BTN_PRIMARY}>
              Nueva cotización
            </Link>
          </>
        }
      />

      <input
        className={FIELD_INPUT}
        placeholder="Buscar por folio, obra, cliente o sucursal"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />

      {/* Mobile — card list */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className={EMPTY_STATE}>Cargando...</div>
        ) : rows.length === 0 ? (
          <div className={EMPTY_STATE}>No hay cotizaciones para mostrar.</div>
        ) : (
          rows.map((row) => (
            <article key={row.id} className={MOBILE_LIST_CARD}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-fg">{row.folio}</p>
                  <p className="mt-0.5 truncate text-sm text-fg-muted">
                    {row.ctz_clientes?.nombre_cliente ?? "-"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-fg">{money(row.total)}</p>
              </div>

              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-fg-faint">Obra</dt>
                  <dd className="text-fg-strong">{obraNombreCotizacion(row)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-fg-faint">Sucursal</dt>
                  <dd className="text-fg-strong">{row.ctz_sucursales?.nombre ?? "-"}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-subtle pt-3">
                <label className="flex items-center gap-2 text-sm text-fg-muted">
                  <input
                    type="checkbox"
                    checked={row.venta_cerrada}
                    disabled={Boolean(updatingVenta[row.id]) || (!isAdmin && row.id_usuario !== user?.id)}
                    onChange={(event) => void handleVentaCerradaToggle(row, event.target.checked)}
                  />
                  Venta cerrada
                </label>
              </div>

              <div className="mt-3">{renderRowActions(row, true)}</div>
            </article>
          ))
        )}
      </div>

      <div className={cn(TABLE_WRAP, "hidden min-w-0 overflow-x-hidden md:block")}>
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className={`${TABLE_HEAD_CELL} w-[16%]`}>Folio</th>
              <th className={`${TABLE_HEAD_CELL} w-[18%]`}>Cliente</th>
              <th className={`${TABLE_HEAD_CELL} w-[20%]`}>Obra</th>
              <th className={`${TABLE_HEAD_CELL} w-[12%]`}>Sucursal</th>
              <th className={`${TABLE_HEAD_CELL} w-[10%]`}>Total</th>
              <th className={`${TABLE_HEAD_CELL} w-[10%] whitespace-normal text-center`}>Venta cerrada</th>
              <th className={`${TABLE_HEAD_CELL} w-[14%] text-right`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-center text-fg-subtle" colSpan={emptyColSpan}>
                  Cargando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-fg-subtle" colSpan={emptyColSpan}>
                  No hay cotizaciones para mostrar.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
              <tr key={row.id} className={TABLE_BODY_ROW}>
                <td className="overflow-hidden break-words px-3 py-3 align-top font-medium">{row.folio}</td>
                <td className="overflow-hidden break-words px-3 py-3 align-top">{row.ctz_clientes?.nombre_cliente ?? "-"}</td>
                <td className="overflow-hidden break-words px-3 py-3 align-top">{obraNombreCotizacion(row)}</td>
                <td className="overflow-hidden break-words px-3 py-3 align-top">{row.ctz_sucursales?.nombre ?? "-"}</td>
                <td className="px-3 py-3 align-top">{money(row.total)}</td>
                <td className="px-3 py-3 text-center align-top">
                  <input
                    type="checkbox"
                    checked={row.venta_cerrada}
                    disabled={Boolean(updatingVenta[row.id]) || (!isAdmin && row.id_usuario !== user?.id)}
                    onChange={(event) => void handleVentaCerradaToggle(row, event.target.checked)}
                  />
                </td>
                <td className="px-3 py-3 text-right align-top">
                  {renderRowActions(row)}
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        total={total}
        loading={loading}
        onPageChange={setPage}
      />

      <ConfirmDeleteCotizacionModal
        open={deleteTarget !== null}
        loading={deleteLoading}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <DownloadCotizacionesZipModal
        open={zipModalOpen}
        loading={zipLoading}
        progress={zipProgress}
        rows={rows}
        onClose={() => {
          if (!zipLoading) setZipModalOpen(false);
        }}
        onConfirm={handleDownloadZip}
      />
    </section>
  );
}
