"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { BTN_PRIMARY, BTN_SECONDARY, CHEVRON_SELECT, FIELD_SELECT } from "@/components/ui/contentStyles";
import { uniqueRegionsFromRows, uniqueSucursalesFromRows } from "@/lib/cotizacion/groupByRegion";
import type { BulkPdfScope } from "@/lib/pdf/exportCotizacionesZip";
import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";

export type DownloadZipScopeMode = BulkPdfScope["mode"];

type Props = {
  open: boolean;
  loading?: boolean;
  progress?: { current: number; total: number } | null;
  rows: CotizacionWithRelations[];
  onClose: () => void;
  onConfirm: (scope: BulkPdfScope) => void | Promise<void>;
};

export default function DownloadCotizacionesZipModal({
  open,
  loading = false,
  progress = null,
  rows,
  onClose,
  onConfirm,
}: Props) {
  const [mode, setMode] = useState<DownloadZipScopeMode>("all");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedSucursal, setSelectedSucursal] = useState("");

  const regionOptions = useMemo(() => uniqueRegionsFromRows(rows), [rows]);
  const sucursalOptions = useMemo(
    () => uniqueSucursalesFromRows(rows, mode === "region" ? selectedRegion : undefined),
    [rows, mode, selectedRegion]
  );

  useEffect(() => {
    if (!open) return;
    setMode("all");
    setSelectedRegion(regionOptions[0] ?? "");
    setSelectedSucursal(uniqueSucursalesFromRows(rows)[0] ?? "");
  }, [open, regionOptions, rows]);

  useEffect(() => {
    if (mode !== "region") return;
    if (!regionOptions.includes(selectedRegion)) {
      setSelectedRegion(regionOptions[0] ?? "");
    }
  }, [mode, regionOptions, selectedRegion]);

  useEffect(() => {
    if (mode !== "sucursal") return;
    if (!sucursalOptions.includes(selectedSucursal)) {
      setSelectedSucursal(sucursalOptions[0] ?? "");
    }
  }, [mode, sucursalOptions, selectedSucursal]);

  function buildScope(): BulkPdfScope {
    if (mode === "region") {
      return { mode: "region", region: selectedRegion };
    }
    if (mode === "sucursal") {
      return { mode: "sucursal", sucursalNombre: selectedSucursal };
    }
    return { mode: "all" };
  }

  const progressLabel =
    progress && progress.total > 0 ? `Generando PDF ${progress.current}/${progress.total}...` : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Descargar PDFs (ZIP)"
      actions={
        <>
          <button type="button" disabled={loading} onClick={onClose} className={BTN_SECONDARY}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={
              loading ||
              !rows.length ||
              (mode === "region" && !selectedRegion) ||
              (mode === "sucursal" && !selectedSucursal)
            }
            onClick={() => void onConfirm(buildScope())}
            className={BTN_PRIMARY}
          >
            {loading ? "Generando..." : "Descargar"}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-500">
        Se incluyen las cotizaciones que coinciden con la búsqueda actual del historial.
      </p>

      <div className="mt-4 space-y-3">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Alcance</legend>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="zip-scope"
              checked={mode === "all"}
              disabled={loading}
              onChange={() => setMode("all")}
            />
            Todas las regiones
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="zip-scope"
              checked={mode === "region"}
              disabled={loading}
              onChange={() => setMode("region")}
            />
            Una región
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="zip-scope"
              checked={mode === "sucursal"}
              disabled={loading}
              onChange={() => setMode("sucursal")}
            />
            Una tienda
          </label>
        </fieldset>

        {mode === "region" ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Región</span>
            <select
              className={`${FIELD_SELECT} ${CHEVRON_SELECT} disabled:opacity-50`}
              value={selectedRegion}
              disabled={loading || !regionOptions.length}
              onChange={(event) => setSelectedRegion(event.target.value)}
            >
              {regionOptions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === "sucursal" ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Tienda</span>
            <select
              className={`${FIELD_SELECT} ${CHEVRON_SELECT} disabled:opacity-50`}
              value={selectedSucursal}
              disabled={loading || !sucursalOptions.length}
              onChange={(event) => setSelectedSucursal(event.target.value)}
            >
              {sucursalOptions.map((sucursal) => (
                <option key={sucursal} value={sucursal}>
                  {sucursal}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {progressLabel ? <p className="text-sm text-slate-600">{progressLabel}</p> : null}
      </div>
    </Modal>
  );
}
