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
  canDelete?: boolean;
  onDelete?: () => Promise<boolean>;
};

type LocalItem = ItemInput & { tempId: string };

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function CotizacionForm({ mode, initial, onSaved, canDelete = false, onDelete }: Props) {
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
  const [modalType, setModalType] = useState<"cliente" | "producto" | null>(null);
  const [clienteDraft, setClienteDraft] = useState({
    nombre_cliente: "",
    num_cliente: "",
    empresa: "",
    telefono: "",
    correo: "",
  });
  const [productoDraft, setProductoDraft] = useState({
    sku: "",
    descripcion: "",
    unidad_medida: "",
    precio_unitario_base: "0",
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
    const subtotal = Number(items.reduce((acc, item) => acc + item.subtotal_item, 0).toFixed(2));
    const totalConIva = Number(items.reduce((acc, item) => acc + item.total_item, 0).toFixed(2));
    const total = mostrarConIva ? totalConIva : subtotal;
    const ivaTotal = total - subtotal;
    return { subtotal, ivaTotal, total };
  }, [items, mostrarConIva]);

  function recalc(item: LocalItem): LocalItem {
    const subtotalItem = Number((item.cantidad * item.precio_unitario).toFixed(2));
    const totalItem = Number((subtotalItem * (1 + item.iva_porcentaje / 100)).toFixed(2));
    return { ...item, subtotal_item: subtotalItem, total_item: totalItem };
  }

  function updateItem(tempId: string, next: Partial<LocalItem>) {
    setItems((prev) => prev.map((item) => (item.tempId === tempId ? recalc({ ...item, ...next }) : item)));
  }

  function openModal(type: "cliente" | "producto") {
    setModalType(type);
    if (type === "cliente") {
      setClienteDraft({
        nombre_cliente: "",
        num_cliente: "",
        empresa: "",
        telefono: "",
        correo: "",
      });
      return;
    }
    setProductoDraft({
      sku: "",
      descripcion: "",
      unidad_medida: "",
      precio_unitario_base: "0",
    });
  }

  function closeModal() {
    if (modalLoading) return;
    setModalType(null);
  }

  async function handleModalSave() {
    setModalLoading(true);
    if (modalType === "cliente") {
      if (!clienteDraft.nombre_cliente.trim()) {
        setModalLoading(false);
        toast.error("El nombre del cliente es obligatorio.");
        return;
      }
      const created = await createCliente({
        nombre_cliente: clienteDraft.nombre_cliente.trim(),
        num_cliente: clienteDraft.num_cliente.trim(),
        empresa: clienteDraft.empresa.trim(),
        telefono: clienteDraft.telefono.trim(),
        correo: clienteDraft.correo.trim(),
      });
      setModalLoading(false);
      if (!created) return toast.error("No se pudo crear cliente.");
      setClientes((prev) => [created, ...prev]);
      setIdCliente(created.id);
      toast.success("Cliente creado.");
      setModalType(null);
      return;
    }

    if (modalType === "producto") {
      if (!productoDraft.descripcion.trim()) {
        setModalLoading(false);
        toast.error("La descripcion del producto es obligatoria.");
        return;
      }
      const precioBase = toNumber(productoDraft.precio_unitario_base);
      const created = await createProducto({
        sku: productoDraft.sku.trim(),
        descripcion: productoDraft.descripcion.trim(),
        unidad_medida: productoDraft.unidad_medida.trim(),
        precio_unitario_base: precioBase,
      });
      setModalLoading(false);
      if (!created) return toast.error("No se pudo crear producto.");
      setProductos((prev) => [created, ...prev]);
      toast.success("Producto creado.");
      setModalType(null);
      return;
    }

    setModalLoading(false);
  }

  async function save() {
    const user = getCurrentUser();
    if (!user) return;
    if (!idSucursal || !idCliente || !items.length) {
      toast.error("Selecciona sucursal, cliente y al menos un item.");
      return;
    }

    const readyItems = items
      .filter((item) => item.id_producto && item.cantidad > 0)
      .map(({ tempId, ...rest }) => {
        const selectedProduct = productos.find((product) => product.id === rest.id_producto);
        return {
          ...rest,
          descripcion_registro: selectedProduct?.descripcion ?? rest.descripcion_registro,
        };
      });
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
          <div className="hidden gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-10">
            <p className="md:col-span-4">Producto (Catalogo)</p>
            <p className="md:col-span-2">Cantidad</p>
            <p className="md:col-span-2">Precio unitario</p>
            <p className="md:col-span-1">IVA</p>
            <p className="md:col-span-1">Accion</p>
          </div>
          {items.map((item) => (
            <div key={item.tempId} className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-10">
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

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" disabled={loading} className="btn-primary disabled:opacity-50" onClick={save}>
          {mode === "create" ? "Registrar Cotizacion" : "Guardar Cambios"}
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          onClick={() => openModal("cliente")}
        >
          + Nuevo cliente
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          onClick={() => openModal("producto")}
        >
          + Nuevo producto
        </button>
        {mode === "edit" && canDelete && onDelete && (
          <button
            type="button"
            className="btn-primary bg-red-600 px-3 py-2 text-sm hover:bg-red-700"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Borrar Cotizacion
          </button>
        )}
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h4 className="text-base font-semibold text-slate-900">
              {modalType === "cliente" ? "Nuevo cliente" : "Nuevo producto"}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {modalType === "cliente"
                ? "Completa los campos del cliente."
                : "Completa los campos del producto."}
            </p>

            {modalType === "cliente" ? (
              <div className="mt-4 grid gap-3">
                <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Nombre del Cliente *
                  <input
                    autoFocus
                    value={clienteDraft.nombre_cliente}
                    onChange={(event) => setClienteDraft((prev) => ({ ...prev, nombre_cliente: event.target.value }))}
                    placeholder="Ej. CEMEX Norte"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Numero de Cliente
                  <input
                    value={clienteDraft.num_cliente}
                    onChange={(event) => setClienteDraft((prev) => ({ ...prev, num_cliente: event.target.value }))}
                    placeholder="Ej. CL-10025"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Empresa
                  <input
                    value={clienteDraft.empresa}
                    onChange={(event) => setClienteDraft((prev) => ({ ...prev, empresa: event.target.value }))}
                    placeholder="Ej. Promexma"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Telefono
                  <input
                    value={clienteDraft.telefono}
                    onChange={(event) => setClienteDraft((prev) => ({ ...prev, telefono: event.target.value }))}
                    placeholder="Ej. 9991234567"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Correo
                  <input
                    type="email"
                    value={clienteDraft.correo}
                    onChange={(event) => setClienteDraft((prev) => ({ ...prev, correo: event.target.value }))}
                    placeholder="Ej. cliente@empresa.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleModalSave();
                      }
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Descripcion del Producto *
                  <input
                    autoFocus
                    value={productoDraft.descripcion}
                    onChange={(event) => setProductoDraft((prev) => ({ ...prev, descripcion: event.target.value }))}
                    placeholder="Ej. Cemento Gris bulto 50kg"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  SKU
                  <input
                    value={productoDraft.sku}
                    onChange={(event) => setProductoDraft((prev) => ({ ...prev, sku: event.target.value }))}
                    placeholder="Ej. CEM-50-GRIS"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Unidad de Medida
                  <input
                    value={productoDraft.unidad_medida}
                    onChange={(event) => setProductoDraft((prev) => ({ ...prev, unidad_medida: event.target.value }))}
                    placeholder="Ej. Bulto, Pieza, m3"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Precio Unitario Base
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productoDraft.precio_unitario_base}
                    onChange={(event) => setProductoDraft((prev) => ({ ...prev, precio_unitario_base: event.target.value }))}
                    placeholder="Ej. 125.50"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case outline-none ring-red-100 focus:border-red-500 focus:ring-2"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleModalSave();
                      }
                    }}
                  />
                </label>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={modalLoading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={() => void handleModalSave()}
                disabled={modalLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {modalLoading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h4 className="text-base font-semibold text-slate-900">Borrar Cotizacion</h4>
            <p className="mt-1 text-sm text-slate-500">Estas seguro que quieres borrar esta Cotizacion?</p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setConfirmDeleteOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={async () => {
                  if (!onDelete) return;
                  setDeleteLoading(true);
                  const ok = await onDelete();
                  setDeleteLoading(false);
                  if (!ok) {
                    toast.error("No se pudo borrar la cotizacion.");
                    return;
                  }
                  toast.success("Cotizacion borrada.");
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? "Borrando..." : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

