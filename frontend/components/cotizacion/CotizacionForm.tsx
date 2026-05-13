"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import {
  buildSkuProductMap,
  downloadCotizacionItemsExcelTemplate,
  parseExcelFile,
  previewOkToItemInputs,
  resolveExcelRowsToImport,
  type ExcelImportPreview,
} from "@/lib/excel/importCotizacionItems";
import { generarFolio } from "@/lib/folio";
import { createCliente, listClientes } from "@/lib/queries/clientes";
import { createCotizacion, updateCotizacion, type ItemInput } from "@/lib/queries/cotizaciones";
import { listAllProductosActivos } from "@/lib/queries/productos";
import { listSucursales } from "@/lib/queries/sucursales";
import type { CtzCliente, CtzProducto, CtzSucursal } from "@/lib/types/db";
import NuevoProductoModal from "@/components/productos/NuevoProductoModal";

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
  const [modalLoading, setModalLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [importExcelOpen, setImportExcelOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ExcelImportPreview | null>(null);
  const [excelParsing, setExcelParsing] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
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
    setCatalogLoading(true);
    Promise.all([listSucursales(), listClientes(), listAllProductosActivos()]).then(([s, c, p]) => {
      setSucursales(s);
      setClientes(c);
      setProductos(p);
      if (!idSucursal && s[0]) setIdSucursal(s[0].id);
      setCatalogLoading(false);
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

  async function handleExcelFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (catalogLoading) {
      toast.error("Espera a que termine de cargar el catalogo.");
      return;
    }
    if (!productos.length) {
      toast.error("No hay productos en el catalogo.");
      return;
    }
    setExcelParsing(true);
    try {
      const rows = await parseExcelFile(file);
      const skuMap = buildSkuProductMap(productos);
      const { preview, error } = resolveExcelRowsToImport(rows, skuMap);
      if (error) {
        toast.error(error);
        return;
      }
      setImportPreview(preview);
      setImportExcelOpen(true);
    } catch {
      toast.error("No se pudo leer el Excel. Usa .xlsx con fila de encabezados.");
    } finally {
      setExcelParsing(false);
    }
  }

  function confirmExcelImport() {
    if (!importPreview?.ok.length) {
      toast.error("No hay filas validas para importar.");
      return;
    }
    const inputs = previewOkToItemInputs(importPreview.ok);
    const newRows: LocalItem[] = inputs.map((item) => ({ ...item, tempId: crypto.randomUUID() }));
    setItems((prev) => {
      const kept = prev.filter((i) => i.id_producto);
      return [...kept, ...newRows];
    });
    const nOk = importPreview.ok.length;
    const nFail = importPreview.failed.length;
    setImportExcelOpen(false);
    setImportPreview(null);
    toast.success(`Se agregaron ${nOk} renglon(es) a Items.`);
    if (nFail) toast.warning(`${nFail} fila(s) no se encontraron en el catalogo.`);
  }

  function cancelExcelImport() {
    setImportExcelOpen(false);
    setImportPreview(null);
  }

  async function handleDownloadItemsTemplate() {
    setTemplateDownloading(true);
    try {
      await downloadCotizacionItemsExcelTemplate();
    } catch {
      toast.error("No se pudo generar la plantilla.");
    } finally {
      setTemplateDownloading(false);
    }
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
    }
  }

  function closeModal() {
    if (modalLoading) return;
    setModalType(null);
  }

  async function handleModalSave() {
    if (modalType !== "cliente") return;
    setModalLoading(true);
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
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => void handleExcelFileChange(e)}
            />
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
              disabled={templateDownloading}
              onClick={() => void handleDownloadItemsTemplate()}
            >
              {templateDownloading ? "Generando..." : "Descargar plantilla"}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
              disabled={catalogLoading || excelParsing || !productos.length}
              onClick={() => excelInputRef.current?.click()}
            >
              {excelParsing ? "Leyendo..." : "Importar Excel"}
            </button>
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

      {modalType === "cliente" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h4 className="text-base font-semibold text-slate-900">Nuevo cliente</h4>
            <p className="mt-1 text-sm text-slate-500">Completa los campos del cliente.</p>

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

      <NuevoProductoModal
        open={modalType === "producto"}
        onClose={() => setModalType(null)}
        onCreated={async () => {
          const refreshed = await listAllProductosActivos();
          setProductos(refreshed);
          toast.success("Producto creado.");
          setModalType(null);
        }}
      />

      {importExcelOpen && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h4 className="text-base font-semibold text-slate-900">Importar desde Excel</h4>
              <p className="mt-1 text-sm text-slate-500">
                Primera fila: encabezados. Obligatorio: <strong>SKU</strong> o <strong>SKU (obligatorio)</strong>.
                Opcional: Cantidad / Cantidad (opcional), Precio / Precio (opcional), IVA / IVA (opcional). La unidad de medida siempre viene del catalogo (no se lee del Excel).
                Puedes usar el botón <strong>Descargar plantilla</strong> en Items para obtener un .xlsx con esos títulos.
              </p>
            </div>
            <div className="max-h-[50vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
              {importPreview.ok.length > 0 && (
                <div>
                  <p className="mb-2 font-semibold text-emerald-800">Listos para agregar ({importPreview.ok.length})</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-emerald-100 bg-emerald-50/50 p-2 text-xs text-slate-800">
                    {importPreview.ok.map((row, i) => (
                      <li key={`ok-${row.excelRowIndex}-${i}`}>
                        Fila {row.excelRowIndex}: {row.skuRaw} · {row.product.descripcion.slice(0, 40)}
                        {row.product.descripcion.length > 40 ? "…" : ""} — Cant. {row.cantidad}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {importPreview.failed.length > 0 && (
                <div>
                  <p className="mb-2 font-semibold text-red-800">Sin match ({importPreview.failed.length})</p>
                  <ul className="max-h-32 space-y-1 overflow-y-auto rounded border border-red-100 bg-red-50/50 p-2 text-xs text-red-900">
                    {importPreview.failed.map((row) => (
                      <li key={`f-${row.excelRowIndex}-${row.skuRaw}`}>
                        Fila {row.excelRowIndex}: SKU &quot;{row.skuRaw}&quot; — {row.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={cancelExcelImport}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Descartar
              </button>
              <button
                type="button"
                disabled={!importPreview.ok.length}
                onClick={confirmExcelImport}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Agregar a Items
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

