"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import CotizacionForm from "@/components/cotizacion/CotizacionForm";
import PageHeader from "@/components/ui/PageHeader";
import { ALERT_WARNING, BTN_SECONDARY } from "@/components/ui/contentStyles";
import { getCurrentUser } from "@/lib/auth";
import {
  canDuplicateCotizacion,
  cotizacionToFormInitial,
  type CotizacionFormInitial,
} from "@/lib/cotizacion/cotizacionToFormInitial";
import { getCotizacionById } from "@/lib/queries/cotizaciones";

type CopyLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; initial: CotizacionFormInitial; sourceFolio: string }
  | { status: "denied" }
  | { status: "not_found" };

function NuevaCotizacionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copiarId = searchParams.get("copiar");
  const user = useMemo(() => getCurrentUser(), []);
  const [copyState, setCopyState] = useState<CopyLoadState>({ status: "idle" });

  useEffect(() => {
    if (!copiarId) {
      setCopyState({ status: "idle" });
      return;
    }
    if (!user) {
      setCopyState({ status: "denied" });
      return;
    }

    let cancelled = false;
    setCopyState({ status: "loading" });

    void getCotizacionById(copiarId).then((data) => {
      if (cancelled) return;
      if (!data) {
        setCopyState({ status: "not_found" });
        return;
      }
      if (!canDuplicateCotizacion(user, data)) {
        setCopyState({ status: "denied" });
        return;
      }
      setCopyState({
        status: "ready",
        initial: cotizacionToFormInitial(data, { includeId: false }),
        sourceFolio: data.folio,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [copiarId, user]);

  if (copiarId && copyState.status === "loading") {
    return <p className="text-sm text-fg-subtle">Cargando cotización a copiar...</p>;
  }

  if (copiarId && copyState.status === "denied") {
    return (
      <div className="space-y-3">
        <p className={ALERT_WARNING}>No tienes permiso para duplicar esta cotización.</p>
        <Link href="/cotizaciones" className={`${BTN_SECONDARY} inline-flex`}>
          Volver al historial
        </Link>
      </div>
    );
  }

  if (copiarId && copyState.status === "not_found") {
    return (
      <div className="space-y-3">
        <p className={ALERT_WARNING}>No se encontró la cotización a copiar.</p>
        <Link href="/cotizaciones" className={`${BTN_SECONDARY} inline-flex`}>
          Volver al historial
        </Link>
      </div>
    );
  }

  const isCopy = copyState.status === "ready";

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Cotizador"
        title={isCopy ? "Duplicar cotización" : "Nueva cotización"}
        subtitle={isCopy ? `Basada en ${copyState.sourceFolio}` : "Completa los datos para generar una nueva cotización"}
      />
      <CotizacionForm
        mode="create"
        initial={isCopy ? copyState.initial : undefined}
        copySourceFolio={isCopy ? copyState.sourceFolio : undefined}
        onSaved={(id) => router.push(`/cotizaciones/${id}`)}
      />
    </section>
  );
}

export default function NuevaCotizacionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-fg-subtle">Cargando...</p>}>
      <NuevaCotizacionContent />
    </Suspense>
  );
}
