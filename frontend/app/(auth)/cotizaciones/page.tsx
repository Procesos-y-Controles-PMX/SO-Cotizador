"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { listCotizaciones, type CotizacionWithRelations } from "@/lib/queries/cotizaciones";
import { money } from "@/lib/utils";

export default function CotizacionesPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CotizacionWithRelations[]>([]);
  const user = useMemo(() => getCurrentUser(), []);

  useEffect(() => {
    if (!user) return;
    listCotizaciones(user, search).then(setRows);
  }, [search, user]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">Historial de cotizaciones</h2>
        <Link href="/cotizaciones/nueva" className="btn-primary">
          Nueva cotizacion
        </Link>
      </div>

      <input
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-red-100 focus:border-red-500 focus:ring-2"
        placeholder="Buscar por folio o nombre de obra"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
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
              <th className="whitespace-nowrap px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-4 py-3 font-medium">{row.folio}</td>
                <td className="px-4 py-3">{row.ctz_clientes?.nombre_cliente ?? "-"}</td>
                <td className="px-4 py-3">{row.nombre_obra ?? "-"}</td>
                <td className="whitespace-nowrap px-4 py-3">{row.ctz_sucursales?.nombre ?? "-"}</td>
                <td className="whitespace-nowrap px-4 py-3">{money(row.total)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link href={`/cotizaciones/${row.id}`} className="text-red-700 hover:underline">
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                  No hay cotizaciones para mostrar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

