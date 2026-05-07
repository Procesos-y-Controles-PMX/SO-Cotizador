"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CotizacionForm from "@/components/cotizacion/CotizacionForm";
import { getCurrentUser } from "@/lib/auth";
import { deleteCotizacion, getCotizacionById } from "@/lib/queries/cotizaciones";

export default function CotizacionDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useMemo(() => getCurrentUser(), []);
  const [initial, setInitial] = useState<Parameters<typeof CotizacionForm>[0]["initial"]>();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!params.id || !user) return;
    getCotizacionById(params.id).then((data) => {
      if (!data) return;
      const canEdit = user.rol === "admin" || data.id_usuario === user.id;
      setAllowed(canEdit);
      setInitial({
        id: data.id,
        id_sucursal: data.id_sucursal,
        id_cliente: data.id_cliente,
        nombre_obra: data.nombre_obra,
        tipo_pago: data.tipo_pago,
        referencia_pago: data.referencia_pago,
        comentarios: data.comentarios,
        mostrar_con_iva: data.mostrar_con_iva,
        items: data.ctz_cotizacion_items.map((row) => ({
          id_producto: row.id_producto,
          descripcion_registro: row.descripcion_registro,
          cantidad: row.cantidad,
          unidad_medida: row.unidad_medida,
          precio_unitario: row.precio_unitario,
          iva_porcentaje: row.iva_porcentaje,
          subtotal_item: row.subtotal_item,
          total_item: row.total_item,
        })),
      });
    });
  }, [params.id, user]);

  if (!initial) return <p className="text-sm text-slate-500">Cargando detalle...</p>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Detalle de cotizacion</h2>
        <Link href={`/cotizaciones/${params.id}/pdf`} className="btn-primary">
          Ver PDF
        </Link>
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
        </p>
      )}
    </section>
  );
}

