"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { generarFolio } from "@/lib/folio";
import { createCliente, listClientes } from "@/lib/queries/clientes";
import { createCotizacion, updateCotizacion, type ItemInput } from "@/lib/queries/cotizaciones";
import { createProducto, listProductos } from "@/lib/queries/productos";
import { listSucursales } from "@/lib/queries/sucursales";
import type { CtzCliente, CtzProducto, CtzSucursal } from "@/lib/types/db";

type Props = {
  mode: "create" | "edit";
  initial?: {
    id: string;
    id_sucursal: string;
    id_cliente: string | null;
    nombre_obra: string | null;
    tipo_pago: "Contado" | "Credito" | null;
    referencia_pago: string | null;
    comentarios: string | null;
    mostrar_con_iva: boolean;
    items: ItemInput[];
  };
  onSaved: (id: string) => void;
};

type LocalItem = ItemInput & { tempId: string };

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function CotizacionForm({ mode, initial, onSaved }: Props) {
  const [sucursales, setSucursales] = useState<CtzSucursal[]>([]);
  const [clientes, setClientes] = useState<CtzCliente[]>([]);
  const [productos, setProductos] = useState<CtzProducto[]>([]);
  const [loading, setLoading] = useState(false);

  const [idSucursal, setIdSucursal] = useState(initial?.id_sucursal ?? "");
  const [idCliente, setIdCliente] = useState(initial?.id_cliente ?? "");
  const [nombreObra, setNombreObra] = useState(initial?.nombre_obra ?? "");
  const [tipoPago, setTipoPago] = useState<"Contado" | "Credito">(initial?.tipo_pago ?? "Contado");
  const [referenciaPago, setReferenciaPago] = useState(initial?.referencia_pago ?? "");
  const [comentarios, setComentarios] = useState(initial?.comentarios ?? "");
  const [mostrarConIva, setMostrarConIva] = useState(initial?.mostrar_con_iva ?? true);
  const [items, setItems] = useState<LocalItem[]>(
    initial?.items.map((item, index) => ({ ...item, tempId: `temp-${index}` })) ?? [
      {
        tempId: crypto.randomUUID(),
        id_producto: null,
        descripcion_registro: "",
        cantidad: 1,
        unidad_medida: null,
        precio_unitario: 0,
        iva_porcentaje: 16,
        subtotal_item: 0,
        total_item: 0,
      },
    ]
  );

  useEffect(() => {
    Promise.all([listSucursales(), listClientes(), listProductos()]).then(([s, c, p]) => {
      setSucursales(s);
      setClientes(c);
      setProductos(p);
      if (!idSucursal && s[0]) setIdSucursal(s[0].id);
    });
  }, [idSucursal]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + item.subtotal_item, 0);
    const total = items.reduce((acc, item) => acc + item.total_item, 0);
    const ivaTotal = total - subtotal;
    return { subtotal, ivaTotal, total };
  }, [items]);

  function recalc(item: LocalItem): LocalItem {
    const subtotalItem = Number((item.cantidad * item.precio_unitario).toFixed(2));
    const totalItem = Number((subtotalItem * (1 + item.iva_porcentaje / 100)).toFixed(2));
    return { ...item, subtotal_item: subtotalItem, total_item: totalItem };
  }

  function updateItem(tempId: string, next: Partial<LocalItem>) {
    setItems((prev) => prev.map((item) => (item.tempId === tempId ? recalc({ ...item, ...next }) : item)));
  }

  async function save() {
    const user = getCurrentUser();
    if (!user) return;
    if (!idSucursal || !idCliente || !items.length) {
      toast.error("Selecciona sucursal, cliente y al menos un item.");
      return;
    }

    const readyItems = items
      .filter((item) => item.descripcion_registro && item.cantidad > 0)
      .map(({ tempId, ...rest }) => rest);
    if (!readyItems.length) {
      toast.error("Agrega al menos un item valido.");
      return;
    }

    setLoading(true);
    if (mode === "create") {
      const sucursal = sucursales.find((row) => row.id === idSucursal);
      if (!sucursal) {
        toast.error("Sucursal invalida.");
        setLoading(false);
        return;
      }
      const folio = generarFolio(sucursal.prefijo_folio);
      const id = await createCotizacion({
        cotizacion: {
          folio,
          id_usuario: user.id,
          id_sucursal: idSucursal,
          id_cliente: idCliente,
          nombre_obra: nombreObra || null,
          tipo_pago: tipoPago,
          referencia_pago: referenciaPago || null,
          comentarios: comentarios || null,
          mostrar_con_iva: mostrarConIva,
          subtotal: totals.subtotal,
          iva_total: totals.ivaTotal,
          total: totals.total,
        },
        items: readyItems,
      });
      setLoading(false);
      if (!id) return toast.error("No fue posible registrar la cotizacion.");
      toast.success("Cotizacion registrada.");
      onSaved(id);
      return;
    }

    if (!initial?.id) {
      setLoading(false);
      return;
    }
    const ok = await updateCotizacion(
      initial.id,
      {
        id_sucursal: idSucursal,
        id_cliente: idCliente,
        nombre_obra: nombreObra || null,
        tipo_pago: tipoPago,
        referencia_pago: referenciaPago || null,
        comentarios: comentarios || null,
        mostrar_con_iva: mostrarConIva,
        subtotal: totals.subtotal,
        iva_total: totals.ivaTotal,
        total: totals.total,
      },
      readyItems
    );
    setLoading(false);
    if (!ok) return toast.error("No fue posible actualizar.");
    toast.success("Cotizacion actualizada.");
    onSaved(initial.id);
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Sucursal
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={idSucursal}
            onChange={(event) => setIdSucursal(event.target.value)}
          >
            {sucursales.map((row) => (
              <option key={row.id} value={row.id}>
                {row.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Cliente
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={idCliente}
            onChange={(event) => setIdCliente(event.target.value)}
          >
            <option value="">Selecciona cliente</option>
            {clientes.map((row) => (
              <option key={row.id} value={row.id}>
                {row.nombre_cliente}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Nombre de la obra
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={nombreObra}
            onChange={(event) => setNombreObra(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Tipo de pago
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={tipoPago}
            onChange={(event) => setTipoPago(event.target.value as "Contado" | "Credito")}
          >
            <option value="Contado">Contado</option>
            <option value="Credito">Credito</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Referencia de pago
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={referenciaPago}
            onChange={(event) => setReferenciaPago(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Comentarios
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={comentarios}
            onChange={(event) => setComentarios(event.target.value)}
          />
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Items</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">
              Mostrar con IVA
              <input
                type="checkbox"
                className="ml-2"
                checked={mostrarConIva}
                onChange={(event) => setMostrarConIva(event.target.checked)}
              />
            </label>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1 text-sm"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  {
                    tempId: crypto.randomUUID(),
                    id_producto: null,
                    descripcion_registro: "",
                    cantidad: 1,
                    unidad_medida: null,
                    precio_unitario: 0,
                    iva_porcentaje: 16,
                    subtotal_item: 0,
                    total_item: 0,
                  },
                ])
              }
            >
              + Item
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.tempId} className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-12">
              <select
                className="md:col-span-4 rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={item.id_producto ?? ""}
                onChange={(event) => {
                  const product = productos.find((p) => p.id === event.target.value);
                  if (!product) return;
                  updateItem(item.tempId, {
                    id_producto: product.id,
                    descripcion_registro: product.descripcion,
                    unidad_medida: product.unidad_medida,
                    precio_unitario: product.precio_unitario_base,
                  });
                }}
              >
                <option value="">Selecciona producto</option>
                {productos.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.sku ? `${row.sku} · ` : ""}
                    {row.descripcion}
                  </option>
                ))}
              </select>
              <input
                className="md:col-span-2 rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="Cantidad"
                value={item.cantidad}
                onChange={(event) => updateItem(item.tempId, { cantidad: toNumber(event.target.value) })}
              />
              <input
                className="md:col-span-2 rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="Precio unit."
                value={item.precio_unitario}
                onChange={(event) => updateItem(item.tempId, { precio_unitario: toNumber(event.target.value) })}
              />
              <select
                className="md:col-span-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={item.iva_porcentaje}
                onChange={(event) => updateItem(item.tempId, { iva_porcentaje: toNumber(event.target.value) })}
              >
                <option value={16}>16%</option>
                <option value={8}>8%</option>
                <option value={0}>0%</option>
              </select>
              <input
                className="md:col-span-2 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-sm"
                value={item.descripcion_registro}
                onChange={(event) => updateItem(item.tempId, { descripcion_registro: event.target.value })}
              />
              <button
                type="button"
                className="md:col-span-1 rounded-md border border-slate-300 px-2 text-sm text-red-600"
                onClick={() => setItems((prev) => prev.filter((row) => row.tempId !== item.tempId))}
              >
                X
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
          <p>Subtotal: ${totals.subtotal.toFixed(2)}</p>
          <p>IVA: ${totals.ivaTotal.toFixed(2)}</p>
          <p className="font-semibold">Total: ${totals.total.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={loading} className="btn-primary disabled:opacity-50" onClick={save}>
          {mode === "create" ? "Registrar cotizacion" : "Guardar cambios"}
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          onClick={async () => {
            const nombre = prompt("Nombre del cliente");
            if (!nombre) return;
            const created = await createCliente({ nombre_cliente: nombre });
            if (!created) return toast.error("No se pudo crear cliente.");
            setClientes((prev) => [created, ...prev]);
            setIdCliente(created.id);
          }}
        >
          + Nuevo cliente
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          onClick={async () => {
            const descripcion = prompt("Descripcion del producto");
            if (!descripcion) return;
            const created = await createProducto({ descripcion, precio_unitario_base: 0 });
            if (!created) return toast.error("No se pudo crear producto.");
            setProductos((prev) => [created, ...prev]);
          }}
        >
          + Nuevo producto
        </button>
      </div>
    </section>
  );
}

