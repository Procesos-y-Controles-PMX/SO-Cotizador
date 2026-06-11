"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ConfirmDeleteCotizacionModal from "@/components/cotizacion/ConfirmDeleteCotizacionModal";
import DownloadCotizacionesZipModal from "@/components/cotizacion/DownloadCotizacionesZipModal";
import TablePagination from "@/components/ui/TablePagination";
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
import { PAGE_SIZE } from "@/lib/pagination";
import { money } from "@/lib/utils";

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

  const emptyColSpan = isAdmin ? 8 : 7;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">Historial de cotizaciones</h2>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
              disabled={zipLoading}
              onClick={() => setZipModalOpen(true)}
            >
              Descargar PDFs (ZIP)
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
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
          <Link href="/cotizaciones/nueva" className="btn-primary">
            Nueva cotización
          </Link>
        </div>
      </div>

      <input
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-red-100 focus:border-red-500 focus:ring-2"
        placeholder="Buscar por folio, obra, cliente o sucursal"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />

      <div className="overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">Folio</th>
              <th className="whitespace-nowrap px-4 py-3">Cliente</th>
              <th className="whitespace-nowrap px-4 py-3">Obra</th>
              <th className="whitespace-nowrap px-4 py-3">Sucursal</th>
              <th className="whitespace-nowrap px-4 py-3">Total</th>
              <th className="whitespace-nowrap px-4 py-3 text-center">Venta cerrada</th>
              <th className="whitespace-nowrap px-4 py-3 text-right"></th>
              {isAdmin ? <th className="whitespace-nowrap px-4 py-3 text-right">Borrar</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={emptyColSpan}>
                  Cargando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={emptyColSpan}>
                  No hay cotizaciones para mostrar.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-4 py-3 font-medium">{row.folio}</td>
                <td className="px-4 py-3">{row.ctz_clientes?.nombre_cliente ?? "-"}</td>
                <td className="px-4 py-3">{row.nombre_obra ?? "-"}</td>
                <td className="whitespace-nowrap px-4 py-3">{row.ctz_sucursales?.nombre ?? "-"}</td>
                <td className="whitespace-nowrap px-4 py-3">{money(row.total)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={row.venta_cerrada}
                    disabled={Boolean(updatingVenta[row.id]) || (!isAdmin && row.id_usuario !== user?.id)}
                    onChange={(event) => void handleVentaCerradaToggle(row, event.target.checked)}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                    <Link href={`/cotizaciones/${row.id}`} className="text-red-700 hover:underline">
                      Ver detalle
                    </Link>
                    {user && canDuplicateCotizacion(user, row) ? (
                      <Link
                        href={`/cotizaciones/nueva?copiar=${row.id}`}
                        className="text-red-700 hover:underline"
                      >
                        Duplicar
                      </Link>
                    ) : null}
                  </div>
                </td>
                {isAdmin ? (
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-red-700 hover:underline"
                      onClick={() => setDeleteTarget(row)}
                    >
                      Borrar
                    </button>
                  </td>
                ) : null}
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
