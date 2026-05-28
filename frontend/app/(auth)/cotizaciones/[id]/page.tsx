"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CotizacionForm from "@/components/cotizacion/CotizacionForm";
import { getCurrentUser } from "@/lib/auth";
import {
  canDuplicateCotizacion,
  cotizacionToFormInitial,
  type CotizacionFormInitial,
} from "@/lib/cotizacion/cotizacionToFormInitial";
import { deleteCotizacion, getCotizacionById } from "@/lib/queries/cotizaciones";

export default function CotizacionDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useMemo(() => getCurrentUser(), []);
  const [initial, setInitial] = useState<CotizacionFormInitial>();
  const [folio, setFolio] = useState<string>("");
  const [allowed, setAllowed] = useState(false);
  const [canDuplicate, setCanDuplicate] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!params.id || !user) return;
    getCotizacionById(params.id).then((data) => {
      setLoaded(true);
      if (!data) return;
      setFolio(data.folio);
      const canEdit = user.rol === "admin" || data.id_usuario === user.id;
      setAllowed(canEdit);
      setCanDuplicate(canDuplicateCotizacion(user, data));
      setInitial(cotizacionToFormInitial(data));
    });
  }, [params.id, user]);

  if (!loaded) return <p className="text-sm text-slate-500">Cargando detalle...</p>;
  if (!initial) return <p className="text-sm text-slate-500">Cotizacion no encontrada.</p>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">Detalle de cotizacion</h2>
        <div className="flex flex-wrap items-center gap-2">
          {canDuplicate ? (
            <Link
              href={`/cotizaciones/nueva?copiar=${params.id}`}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Duplicar cotizacion
            </Link>
          ) : null}
          <Link href={`/cotizaciones/${params.id}/pdf`} className="btn-primary">
            Ver PDF
          </Link>
        </div>
      </div>

      {allowed ? (
        <CotizacionForm
          mode="edit"
          initial={initial}
          onSaved={(id) => router.push(`/cotizaciones/${id}`)}
          canDelete={user?.rol === "admin"}
          onDelete={async () => {
            if (!initial.id) return false;
            const ok = await deleteCotizacion(initial.id);
            if (ok) router.push("/cotizaciones");
            return ok;
          }}
        />
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Solo puedes editar tus propias cotizaciones.
          {canDuplicate ? (
            <>
              {" "}
              Puedes crear una copia editable con el boton &quot;Duplicar cotizacion&quot; (folio {folio}).
            </>
          ) : null}
        </p>
      )}
    </section>
  );
}
