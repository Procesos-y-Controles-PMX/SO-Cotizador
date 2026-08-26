"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CotizacionForm from "@/components/cotizacion/CotizacionForm";
import PageHeader from "@/components/ui/PageHeader";
import { ALERT_WARNING, BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/contentStyles";
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

  if (!loaded) return <p className="text-sm text-fg-subtle">Cargando detalle...</p>;
  if (!initial) return <p className="text-sm text-fg-subtle">Cotizacion no encontrada.</p>;

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Cotizador"
        title="Detalle de cotización"
        subtitle={folio ? `Folio ${folio}` : undefined}
        actions={
          <>
            <Link href="/cotizaciones" className={BTN_SECONDARY}>
              Volver al historial
            </Link>
            {canDuplicate ? (
              <Link href={`/cotizaciones/nueva?copiar=${params.id}`} className={BTN_SECONDARY}>
                Duplicar cotización
              </Link>
            ) : null}
            <Link href={`/cotizaciones/${params.id}/pdf`} className={BTN_PRIMARY}>
              Ver PDF
            </Link>
          </>
        }
      />

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
        <p className={ALERT_WARNING}>
          Solo puedes editar tus propias cotizaciones.
          {canDuplicate ? (
            <>
              {" "}
              Puedes crear una copia editable con el botón &quot;Duplicar cotización&quot; (folio {folio}).
            </>
          ) : null}
        </p>
      )}
    </section>
  );
}
