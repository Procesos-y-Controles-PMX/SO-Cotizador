"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { getUsuarioByEmail } from "@/lib/queries/usuarios";
import {
  buildSkuProductMap,
  downloadCotizacionProductosExcelTemplate,
  parseExcelFile,
  previewOkToProductoInputs,
  resolveExcelRowsToImport,
  type ExcelImportPreview,
} from "@/lib/excel/importCotizacionProductos";
import { generarFolio } from "@/lib/folio";
import CotizacionProductoPickers from "@/components/cotizacion/CotizacionProductoPickers";
import ConfirmDeleteCotizacionModal from "@/components/cotizacion/ConfirmDeleteCotizacionModal";
import NuevoProductoModal from "@/components/productos/NuevoProductoModal";
import SearchCombobox, { type SearchComboboxOption } from "@/components/ui/SearchCombobox";
import FilterSelect from "@/components/common/FilterSelect";
import {
  ALERT_INFO,
  BTN_GHOST,
  BTN_PRIMARY,
  BTN_SECONDARY,
  FIELD_INPUT,
  FIELD_LABEL,
  FIELD_SELECT_TRIGGER,
  PANEL_CARD,
  PANEL_INSET,
} from "@/components/ui/contentStyles";
import { matchesSearch } from "@/lib/search";
import { createCliente, getClienteById, listClientes } from "@/lib/queries/clientes";
import { createObra, getObraById, listObras, obraToOption } from "@/lib/queries/obras";
import {
  createCotizacion,
  toProductoInput,
  updateCotizacion,
  type CreateCotizacionError,
  type ProductoInput,
} from "@/lib/queries/cotizaciones";
import { getProductosByIds, listAllProductosActivos } from "@/lib/queries/productos";
import { listSucursales } from "@/lib/queries/sucursales";
import {
  calcLineAmounts,
  normalizeIvaPct,
  precioCapturadoFromStored,
  type IvaPct,
} from "@/lib/cotizacion/calcImportes";
import { normalizeTipoPago, toDbTipoPago } from "@/lib/cotizacion/tipoPago";
import type { CtzCliente, CtzObra, CtzProducto, CtzSucursal } from "@/lib/types/db";
import type { CotizacionFormInitial } from "@/lib/cotizacion/cotizacionToFormInitial";
import {
  formatCantidadDisplay,
  formatQuantity,
  money,
  parseDecimalInput,
  QUANTITY_INPUT_DRAFT_RE,
  roundQuantity,
} from "@/lib/utils";

type Props = {
  mode: "create" | "edit";
  initial?: CotizacionFormInitial;
  copySourceFolio?: string;
  onSaved: (id: string) => void;
  canDelete?: boolean;
  onDelete?: () => Promise<boolean>;
};

type ProductoLocal = ProductoInput & {
  tempId: string;
  productoSku: string;
  productoDescripcion: string;
  /** Valor del input; no cambia al alternar «Precios con IVA incluido». */
  precioCapturado: number;
};

function initialIvaFromProps(initial: Props["initial"]): IvaPct {
  return normalizeIvaPct(initial?.iva_porcentaje ?? initial?.productos?.[0]?.iva_porcentaje ?? 16);
}

function recalcProductoFromCapturado(producto: ProductoLocal, ivaPct: IvaPct, preciosIncluyenIva: boolean): ProductoLocal {
  const amounts = calcLineAmounts(producto.cantidad, producto.precioCapturado, ivaPct, preciosIncluyenIva);
  return { ...producto, iva_porcentaje: ivaPct, ...amounts };
}

function productoFromCatalogo(
  product: CtzProducto,
  base: Omit<ProductoLocal, keyof ProductoInput | "productoSku" | "productoDescripcion" | "precioCapturado"> &
    Partial<ProductoLocal>,
  ivaPct: IvaPct,
  preciosIncluyenIva: boolean
): ProductoLocal {
  const cantidad = base.cantidad ?? 1;
  const precioCapturado = base.precioCapturado ?? base.precio_unitario ?? 0;
  const unidad_medida =
    base.unidad_medida !== undefined ? base.unidad_medida : product.unidad_medida ?? null;
  const amounts = calcLineAmounts(cantidad, precioCapturado, ivaPct, preciosIncluyenIva);
  return {
    tempId: base.tempId,
    id_producto: product.id,
    descripcion_registro: product.descripcion,
    cantidad,
    unidad_medida,
    iva_porcentaje: ivaPct,
    precioCapturado,
    ...amounts,
    productoSku: product.sku?.trim() ?? "",
    productoDescripcion: product.descripcion,
  };
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const DECIMAL_DRAFT_RE = /^\d*\.?\d*$/;

function formatPrecioDisplay(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return String(value);
}

function parsePrecioFromDraft(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === ".") return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export default function CotizacionForm({
  mode,
  initial,
  copySourceFolio,
  onSaved,
  canDelete = false,
  onDelete,
}: Props) {
  const [sucursales, setSucursales] = useState<CtzSucursal[]>([]);
  const [productos, setProductos] = useState<CtzProducto[]>([]);
  const [sucursalSelected, setSucursalSelected] = useState<SearchComboboxOption | null>(null);
  const [clienteSelected, setClienteSelected] = useState<SearchComboboxOption | null>(null);
  const [clientesSucursal, setClientesSucursal] = useState<CtzCliente[]>([]);
  const [loadingClientesSucursal, setLoadingClientesSucursal] = useState(false);
  const [obraSelected, setObraSelected] = useState<SearchComboboxOption | null>(null);
  const [obrasCliente, setObrasCliente] = useState<CtzObra[]>([]);
  const [loadingObrasCliente, setLoadingObrasCliente] = useState(false);
  const [loading, setLoading] = useState(false);

  const [idSucursal, setIdSucursal] = useState(initial?.id_sucursal ?? "");
  const [idCliente, setIdCliente] = useState(initial?.id_cliente ?? "");
  const [idObra, setIdObra] = useState(initial?.id_obra ?? "");
  const [obraTouched, setObraTouched] = useState(false);
  const [tipoPago, setTipoPago] = useState<"Contado" | "Crédito">(
    () => normalizeTipoPago(initial?.tipo_pago) ?? "Contado"
  );
  const [referenciaPago, setReferenciaPago] = useState(initial?.referencia_pago ?? "");
  const [preciosIncluyenIva, setPreciosIncluyenIva] = useState(initial?.mostrar_con_iva ?? false);
  const [ivaCotizacion, setIvaCotizacion] = useState<IvaPct>(() => initialIvaFromProps(initial));
  const [modalType, setModalType] = useState<"cliente" | "producto" | "obra" | null>(null);
  const [clienteDraft, setClienteDraft] = useState({
    nombre_cliente: "",
    num_cliente: "",
    empresa: "",
    telefono: "",
    correo: "",
  });
  const [obraDraft, setObraDraft] = useState({
    nombre_obra: "",
    num_obra: "",
    referencia_pago: "",
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
  const [terminosDraft, setTerminosDraft] = useState(initial?.terminos_adicionales ?? "");
  const [precioUnitarioDraft, setPrecioUnitarioDraft] = useState<Record<string, string>>({});
  const [cantidadDraft, setCantidadDraft] = useState<Record<string, string>>({});
  const [productosCotizacion, setProductosCotizacion] = useState<ProductoLocal[]>(() => {
    const iva0 = initialIvaFromProps(initial);
    const incluyenIva = initial?.mostrar_con_iva ?? false;
    if (initial?.productos?.length) {
      return initial.productos.map((producto, index) => {
        const precioCapturado = precioCapturadoFromStored(producto, incluyenIva);
        const amounts = calcLineAmounts(producto.cantidad, precioCapturado, iva0, incluyenIva);
        return {
          ...producto,
          tempId: `temp-${index}`,
          iva_porcentaje: iva0,
          precioCapturado,
          ...amounts,
          productoSku: "",
          productoDescripcion: producto.descripcion_registro,
        };
      });
    }
    return [
      {
        tempId: crypto.randomUUID(),
        id_producto: null,
        descripcion_registro: "",
        cantidad: 1,
        unidad_medida: null,
        precio_unitario: 0,
        precioCapturado: 0,
        iva_porcentaje: iva0,
        subtotal_item: 0,
        total_item: 0,
        productoSku: "",
        productoDescripcion: "",
      },
    ];
  });

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    void (async () => {
      const [s, p] = await Promise.all([listSucursales(), listAllProductosActivos()]);
      if (cancelled) return;
      setSucursales(s);
      setProductos(p);

      const sid = initial?.id_sucursal ?? idSucursal;
      const suc = sid ? s.find((row) => row.id === sid) : undefined;
      if (suc) {
        setIdSucursal(suc.id);
        setSucursalSelected(sucursalToOption(suc));
      }

      const cotSucursalId = suc?.id ?? sid;
      if (initial?.id_cliente && cotSucursalId) {
        const cliente = await getClienteById(initial.id_cliente);
        if (cliente && !cancelled) {
          if (cliente.id_sucursal !== cotSucursalId) {
            toast.warning("El cliente de esta cotización no coincide con la sucursal seleccionada.");
          } else {
            setIdCliente(cliente.id);
            setClienteSelected({
              id: cliente.id,
              label: cliente.nombre_cliente,
              sublabel: cliente.num_cliente ?? cliente.empresa ?? undefined,
            });
          }
        }
      }

      if (initial?.id_obra && !cancelled) {
        const obra = await getObraById(initial.id_obra);
        if (obra) {
          if (initial.id_cliente && obra.id_cliente !== initial.id_cliente) {
            toast.warning("La obra de esta cotización no coincide con el cliente seleccionado.");
          } else {
            setIdObra(obra.id);
            setObraSelected(obraToOption(obra));
          }
        }
      }

      const productIds = [
        ...new Set(
          (initial?.productos ?? [])
            .map((row) => row.id_producto)
            .filter((id): id is string => Boolean(id))
        ),
      ];
      if (productIds.length) {
        const catalog = await getProductosByIds(productIds);
        const byId = new Map(catalog.map((row) => [row.id, row]));
        if (!cancelled) {
          setProductosCotizacion((prev) =>
            prev.map((row) => {
              if (!row.id_producto) return row;
              const product = byId.get(row.id_producto);
              if (!product) return row;
              return {
                ...row,
                productoSku: product.sku?.trim() ?? "",
                productoDescripcion: product.descripcion,
                descripcion_registro: product.descripcion,
              };
            })
          );
        }
      }

      if (!cancelled) setCatalogLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial una vez
  }, []);

  useEffect(() => {
    if (mode !== "create" || !idSucursal || !sucursales.length) return;
    const s = sucursales.find((row) => row.id === idSucursal);
    if (!s) return;
    const newIva = normalizeIvaPct(s.iva_predeterminado);
    setIvaCotizacion(newIva);
    setPrecioUnitarioDraft({});
    setProductosCotizacion((prev) => prev.map((producto) => recalcProductoFromCapturado(producto, newIva, preciosIncluyenIva)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al elegir sucursal en alta
  }, [mode, idSucursal, sucursales]);

  useEffect(() => {
    if (!idSucursal) {
      setClientesSucursal([]);
      return;
    }
    let cancelled = false;
    setLoadingClientesSucursal(true);
    void listClientes("", idSucursal).then((rows) => {
      if (!cancelled) {
        setClientesSucursal(rows);
        setLoadingClientesSucursal(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [idSucursal]);

  useEffect(() => {
    if (!idCliente) {
      setObrasCliente([]);
      return;
    }
    let cancelled = false;
    setLoadingObrasCliente(true);
    void listObras("", idCliente).then((rows) => {
      if (!cancelled) {
        setObrasCliente(rows);
        setLoadingObrasCliente(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [idCliente]);

  useEffect(() => {
    // En edición los términos ya están congelados en la cotización.
    if (mode !== "create") return;
    if (!idSucursal) {
      setTerminosDraft("");
      return;
    }
    const s = sucursales.find((row) => row.id === idSucursal);
    setTerminosDraft(s?.terminos_adicionales ?? "");
  }, [idSucursal, sucursales, mode]);

  const totals = useMemo(() => {
    const subtotal = Number(productosCotizacion.reduce((acc, producto) => acc + producto.subtotal_item, 0).toFixed(2));
    const total = Number(productosCotizacion.reduce((acc, producto) => acc + producto.total_item, 0).toFixed(2));
    const ivaTotal = Number((total - subtotal).toFixed(2));
    return { subtotal, ivaTotal, total };
  }, [productosCotizacion]);

  const precioUnitarioLabel = preciosIncluyenIva
    ? "Precio unitario (IVA incluido)"
    : "Precio unitario (antes de IVA)";

  const selectedSucursalNombre = useMemo(
    () => sucursales.find((row) => row.id === idSucursal)?.nombre ?? null,
    [sucursales, idSucursal]
  );

  function setProductoFromCapturedPrice(tempId: string, precioCapturado: number, cantidad?: number) {
    setProductosCotizacion((prev) =>
      prev.map((producto) => {
        if (producto.tempId !== tempId) return producto;
        const qty = cantidad ?? producto.cantidad;
        const amounts = calcLineAmounts(qty, precioCapturado, ivaCotizacion, preciosIncluyenIva);
        return { ...producto, cantidad: qty, precioCapturado, iva_porcentaje: ivaCotizacion, ...amounts };
      })
    );
  }

  function updateProducto(tempId: string, next: Partial<ProductoLocal>) {
    setProductosCotizacion((prev) =>
      prev.map((producto) => {
        if (producto.tempId !== tempId) return producto;
        const merged = { ...producto, ...next };
        if (next.cantidad !== undefined) {
          return recalcProductoFromCapturado(
            { ...merged, cantidad: merged.cantidad, precioCapturado: producto.precioCapturado },
            ivaCotizacion,
            preciosIncluyenIva
          );
        }
        return { ...merged, iva_porcentaje: ivaCotizacion };
      })
    );
  }

  function handlePreciosIncluyenIvaChange(incluyenIva: boolean) {
    if (incluyenIva === preciosIncluyenIva) return;
    setPreciosIncluyenIva(incluyenIva);
    setProductosCotizacion((prev) => prev.map((producto) => recalcProductoFromCapturado(producto, ivaCotizacion, incluyenIva)));
  }

  function handleIvaCotizacionChange(nextIva: IvaPct) {
    if (nextIva === ivaCotizacion) return;
    setPrecioUnitarioDraft({});
    setCantidadDraft({});
    setIvaCotizacion(nextIva);
    setProductosCotizacion((prev) => prev.map((producto) => recalcProductoFromCapturado(producto, nextIva, preciosIncluyenIva)));
  }

  function clearPrecioDraft(tempId: string) {
    setPrecioUnitarioDraft((prev) => {
      if (!(tempId in prev)) return prev;
      const { [tempId]: _removed, ...rest } = prev;
      return rest;
    });
  }

  function clearCantidadDraft(tempId: string) {
    setCantidadDraft((prev) => {
      if (!(tempId in prev)) return prev;
      const { [tempId]: _removed, ...rest } = prev;
      return rest;
    });
  }

  function clearProductoInputDrafts(tempId: string) {
    clearPrecioDraft(tempId);
    clearCantidadDraft(tempId);
  }

  function handleCantidadChange(tempId: string, raw: string) {
    if (!QUANTITY_INPUT_DRAFT_RE.test(raw)) return;
    setCantidadDraft((prev) => ({ ...prev, [tempId]: raw }));
    const parsed = raw !== "" && raw !== "." ? parseDecimalInput(raw) : null;
    if (parsed === null || parsed <= 0) return;
    const qty = roundQuantity(parsed);
    setProductosCotizacion((prev) =>
      prev.map((producto) => {
        if (producto.tempId !== tempId) return producto;
        return recalcProductoFromCapturado(
          { ...producto, cantidad: qty, precioCapturado: producto.precioCapturado },
          ivaCotizacion,
          preciosIncluyenIva
        );
      })
    );
  }

  function handleCantidadBlur(tempId: string) {
    const raw = cantidadDraft[tempId];
    if (raw === undefined) return;
    const parsed = parseDecimalInput(raw);
    if (parsed === null || parsed <= 0) {
      toast.error("La cantidad debe ser mayor a 0.");
      clearCantidadDraft(tempId);
      return;
    }
    const qty = roundQuantity(parsed);
    if (qty <= 0) {
      toast.error("La cantidad debe ser mayor a 0.");
      clearCantidadDraft(tempId);
      return;
    }
    updateProducto(tempId, { cantidad: qty });
    clearCantidadDraft(tempId);
  }

  function handlePrecioChange(tempId: string, raw: string) {
    if (!DECIMAL_DRAFT_RE.test(raw)) return;
    setPrecioUnitarioDraft((prev) => ({ ...prev, [tempId]: raw }));
    const precioCapturado = raw !== "" && raw !== "." ? parsePrecioFromDraft(raw) : 0;
    setProductoFromCapturedPrice(tempId, precioCapturado);
  }

  function handlePrecioBlur(tempId: string) {
    const raw = precioUnitarioDraft[tempId];
    if (raw === undefined) return;
    setProductoFromCapturedPrice(tempId, parsePrecioFromDraft(raw));
    clearPrecioDraft(tempId);
  }

  function applyProductoCotizacion(tempId: string, product: CtzProducto) {
    setProductosCotizacion((prev) =>
      prev.map((producto) => {
        if (producto.tempId !== tempId) return producto;
        const sameProduct = producto.id_producto === product.id;
        return productoFromCatalogo(
          product,
          {
            tempId: producto.tempId,
            cantidad: producto.cantidad,
            unidad_medida: sameProduct ? producto.unidad_medida : product.unidad_medida ?? null,
            precioCapturado: sameProduct ? producto.precioCapturado : 0,
          },
          ivaCotizacion,
          preciosIncluyenIva
        );
      })
    );
    clearProductoInputDrafts(tempId);
  }

  function clearProductoCotizacion(tempId: string) {
    clearProductoInputDrafts(tempId);
    setProductoFromCapturedPrice(tempId, 0);
    updateProducto(tempId, {
      id_producto: null,
      descripcion_registro: "",
      unidad_medida: null,
      productoSku: "",
      productoDescripcion: "",
    });
  }

  function sucursalToOption(s: CtzSucursal): SearchComboboxOption {
    const label = s.centro ? `${s.nombre} (${s.centro})` : s.nombre;
    return { id: s.id, label, sublabel: s.region ?? undefined };
  }

  const searchSucursales = useMemo(
    () => async (query: string) => {
      const filtered = query.trim()
        ? sucursales.filter(
            (s) =>
              matchesSearch(s.nombre, query) ||
              (s.centro ? matchesSearch(s.centro, query) : false) ||
              (s.region ? matchesSearch(s.region, query) : false)
          )
        : sucursales;
      return filtered.map(sucursalToOption);
    },
    [sucursales]
  );

  const searchClientesCb = useMemo(
    () => async (query: string) => {
      if (!idSucursal) return [];
      const filtered = query.trim()
        ? clientesSucursal.filter(
            (c) =>
              matchesSearch(c.nombre_cliente, query) ||
              (c.num_cliente ? matchesSearch(c.num_cliente, query) : false) ||
              (c.empresa ? matchesSearch(c.empresa, query) : false)
          )
        : clientesSucursal;
      return filtered.map((c) => ({
        id: c.id,
        label: c.nombre_cliente,
        sublabel: c.num_cliente ?? c.empresa ?? undefined,
      }));
    },
    [idSucursal, clientesSucursal]
  );

  const searchObrasCb = useMemo(
    () => async (query: string) => {
      if (!idCliente) return [];
      const filtered = query.trim()
        ? obrasCliente.filter(
            (obra) =>
              matchesSearch(obra.nombre_obra, query) ||
              (obra.num_obra ? matchesSearch(obra.num_obra, query) : false) ||
              (obra.referencia_pago ? matchesSearch(obra.referencia_pago, query) : false)
          )
        : obrasCliente;
      return filtered.map(obraToOption);
    },
    [idCliente, obrasCliente]
  );

  const clienteNombre = useMemo(
    () => clientesSucursal.find((row) => row.id === idCliente)?.nombre_cliente ?? clienteSelected?.label ?? "",
    [clientesSucursal, idCliente, clienteSelected]
  );

  const sucursalNombre = useMemo(
    () => sucursales.find((row) => row.id === idSucursal)?.nombre ?? "",
    [sucursales, idSucursal]
  );

  async function handleExcelFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (catalogLoading) {
      toast.error("Espera a que termine de cargar el catálogo.");
      return;
    }
    if (!productos.length) {
      toast.error("No hay productos en el catálogo.");
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
      toast.error("No hay filas válidas para importar.");
      return;
    }
    const newRows: ProductoLocal[] = importPreview.ok.map((row) => {
      const precioCapturado = row.precio_unitario;
      const [productoImportado] = previewOkToProductoInputs([row], ivaCotizacion, preciosIncluyenIva);
      return {
        ...productoImportado,
        tempId: crypto.randomUUID(),
        precioCapturado,
        productoSku: row.product.sku?.trim() ?? "",
        productoDescripcion: row.product.descripcion,
      };
    });
    setProductosCotizacion((prev) => {
      const kept = prev.filter((i) => i.id_producto);
      return [...kept, ...newRows];
    });
    const nOk = importPreview.ok.length;
    const nFail = importPreview.failed.length;
    setImportExcelOpen(false);
    setImportPreview(null);
    toast.success(`Se agregaron ${nOk} renglón(es) a Productos.`);
    if (nFail) toast.warning(`${nFail} fila(s) no se encontraron en el catálogo.`);
  }

  function cancelExcelImport() {
    setImportExcelOpen(false);
    setImportPreview(null);
  }

  async function handleDownloadProductosTemplate() {
    setTemplateDownloading(true);
    try {
      await downloadCotizacionProductosExcelTemplate();
    } catch {
      toast.error("No se pudo generar la plantilla.");
    } finally {
      setTemplateDownloading(false);
    }
  }

  function clearObraSelection() {
    setObraSelected(null);
    setIdObra("");
  }

  function clearClienteSelection() {
    setClienteSelected(null);
    setIdCliente("");
    clearObraSelection();
    setObraTouched(false);
  }

  function resolveObraPayload(): { id_obra: string | null; nombre_obra: string | null } {
    if (idObra) {
      const obra = obrasCliente.find((row) => row.id === idObra);
      return {
        id_obra: idObra,
        nombre_obra: obra?.nombre_obra ?? null,
      };
    }
    if (obraTouched) {
      return { id_obra: null, nombre_obra: null };
    }
    return {
      id_obra: null,
      nombre_obra: initial?.nombre_obra ?? null,
    };
  }

  function openModal(type: "cliente" | "producto" | "obra") {
    if (type === "cliente" && !idSucursal) {
      toast.error("Selecciona una sucursal antes de registrar un cliente.");
      return;
    }
    if (type === "obra" && !idCliente) {
      toast.error("Selecciona un cliente antes de registrar una obra.");
      return;
    }
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
    if (type === "obra") {
      setObraDraft({
        nombre_obra: "",
        num_obra: "",
        referencia_pago: "",
      });
    }
  }

  function closeModal() {
    if (modalLoading) return;
    setModalType(null);
  }

  async function handleModalSave() {
    if (modalType === "cliente") {
      if (!idSucursal) {
        toast.error("Selecciona una sucursal antes de registrar un cliente.");
        return;
      }
      setModalLoading(true);
      if (!clienteDraft.nombre_cliente.trim()) {
        setModalLoading(false);
        toast.error("El nombre del cliente es obligatorio.");
        return;
      }
      const result = await createCliente({
        id_sucursal: idSucursal,
        nombre_cliente: clienteDraft.nombre_cliente.trim(),
        num_cliente: clienteDraft.num_cliente.trim(),
        empresa: clienteDraft.empresa.trim(),
        telefono: clienteDraft.telefono.trim(),
        correo: clienteDraft.correo.trim(),
      });
      setModalLoading(false);
      if (!result.ok) {
        if (result.error === "duplicate") {
          toast.error("Ya existe ese cliente en esta sucursal.");
        } else {
          toast.error("No se pudo crear cliente.");
        }
        return;
      }
      const created = result.cliente;
      setIdCliente(created.id);
      setClienteSelected({
        id: created.id,
        label: created.nombre_cliente,
        sublabel: created.num_cliente ?? created.empresa ?? undefined,
      });
      setClientesSucursal((prev) => {
        if (prev.some((c) => c.id === created.id)) return prev;
        return [...prev, created].sort((a, b) => a.nombre_cliente.localeCompare(b.nombre_cliente));
      });
      toast.success("Cliente creado.");
      setModalType(null);
      return;
    }

    if (modalType !== "obra") return;
    if (!idCliente) {
      toast.error("Selecciona un cliente antes de registrar una obra.");
      return;
    }
    setModalLoading(true);
    if (!obraDraft.nombre_obra.trim()) {
      setModalLoading(false);
      toast.error("El nombre de la obra es obligatorio.");
      return;
    }
    const result = await createObra({
      id_cliente: idCliente,
      nombre_obra: obraDraft.nombre_obra.trim(),
      num_obra: obraDraft.num_obra.trim(),
      referencia_pago: obraDraft.referencia_pago.trim(),
    });
    setModalLoading(false);
    if (!result.ok) {
      if (result.error === "duplicate") {
        toast.error("Ya existe esa obra para este cliente.");
      } else {
        toast.error("No se pudo crear la obra.");
      }
      return;
    }
    const created = result.obra;
    setIdObra(created.id);
    setObraSelected(obraToOption(created));
    setObraTouched(true);
    setReferenciaPago(created.referencia_pago ?? "");
    setObrasCliente((prev) => {
      if (prev.some((obra) => obra.id === created.id)) return prev;
      return [...prev, created].sort((a, b) => a.nombre_obra.localeCompare(b.nombre_obra));
    });
    toast.success("Obra creada.");
    setModalType(null);
  }

  function toastCreateCotizacionError(error: CreateCotizacionError) {
    switch (error) {
      case "duplicate_folio":
        toast.error("El folio ya existe. Intenta de nuevo.");
        break;
      case "invalid_reference":
        toast.error("Datos inválidos. Cierra sesión y vuelve a entrar, o revisa sucursal y cliente.");
        break;
      case "cliente_sucursal":
        toast.error("El cliente no pertenece a la sucursal seleccionada.");
        break;
      case "productos":
        toast.error("No se pudieron guardar los productos de la cotización.");
        break;
      case "tipo_pago_invalido":
        toast.error("Tipo de pago no válido. Contacta al administrador si el problema continúa.");
        break;
      default:
        toast.error("No fue posible registrar la cotización.");
    }
  }

  function resolveProductosWithPendingDrafts(rows: ProductoLocal[]): ProductoLocal[] {
    return rows.map((producto) => {
      const raw = cantidadDraft[producto.tempId];
      if (raw === undefined) return producto;
      const parsed = parseDecimalInput(raw);
      if (parsed === null || parsed <= 0) return producto;
      const qty = roundQuantity(parsed);
      return recalcProductoFromCapturado(
        { ...producto, cantidad: qty, precioCapturado: producto.precioCapturado },
        ivaCotizacion,
        preciosIncluyenIva
      );
    });
  }

  async function save() {
    if (loading) return;
    const sessionUser = getCurrentUser();
    if (!sessionUser) return;
    const user = (await getUsuarioByEmail(sessionUser.email)) ?? sessionUser;
    if (!idSucursal || !idCliente || !productosCotizacion.length) {
      toast.error("Selecciona sucursal, cliente y al menos un producto.");
      return;
    }

    const productosParaGuardar = resolveProductosWithPendingDrafts(productosCotizacion);

    const productosListos = productosParaGuardar
      .filter((producto) => producto.id_producto && producto.cantidad > 0)
      .map(({ tempId, productoSku, productoDescripcion, precioCapturado: _pc, ...producto }) => {
        const selectedProduct = productos.find((product) => product.id === producto.id_producto);
        return toProductoInput({
          ...producto,
          descripcion_registro: selectedProduct?.descripcion ?? producto.descripcion_registro,
          iva_porcentaje: ivaCotizacion,
        });
      });
    if (!productosListos.length) {
      toast.error("Agrega al menos un producto válido.");
      return;
    }

    const ivaPorCotizacion = ivaCotizacion;
    const productosPayload = productosListos.map((row) =>
      toProductoInput({ ...row, iva_porcentaje: ivaPorCotizacion })
    );

    setLoading(true);
    if (mode === "create") {
      const sucursal = sucursales.find((row) => row.id === idSucursal);
      if (!sucursal) {
        toast.error("Sucursal inválida.");
        setLoading(false);
        return;
      }
      const obraPayload = resolveObraPayload();
      const terminosSnapshot =
        terminosDraft.trim() || sucursal.terminos_adicionales?.trim() || null;
      const cotizacionBase = {
        id_usuario: user.id,
        id_sucursal: idSucursal,
        id_cliente: idCliente,
        id_obra: obraPayload.id_obra,
        nombre_obra: obraPayload.nombre_obra,
        tipo_pago: toDbTipoPago(tipoPago),
        referencia_pago: referenciaPago || null,
        comentarios: null,
        mostrar_con_iva: preciosIncluyenIva,
        iva_porcentaje: ivaPorCotizacion,
        subtotal: totals.subtotal,
        iva_total: totals.ivaTotal,
        total: totals.total,
        terminos_adicionales: terminosSnapshot,
        direccion_sucursal: sucursal.direccion?.trim() || null,
        venta_cerrada: false,
      };
      let result: Awaited<ReturnType<typeof createCotizacion>> = { ok: false, error: "unknown" };
      for (let attempt = 0; attempt < 3; attempt++) {
        result = await createCotizacion({
          cotizacion: {
            folio: generarFolio(sucursal.prefijo_folio),
            ...cotizacionBase,
          },
          productos: productosPayload,
        });
        if (result.ok) break;
        if (result.error !== "duplicate_folio") break;
      }

      setLoading(false);
      if (!result.ok) {
        if (result.error === "invalid_reference") {
          const fresh = await getUsuarioByEmail(sessionUser.email);
          if (!fresh) {
            toast.error("Tu sesión ya no es válida (base de datos reiniciada). Vuelve a iniciar sesión.");
            return;
          }
        }
        toastCreateCotizacionError(result.error);
        return;
      }
      toast.success("Cotización registrada.");
      onSaved(result.id);
      return;
    }

    if (!initial?.id) {
      setLoading(false);
      return;
    }
    const cotizacionId = initial.id;
    const obraPayload = resolveObraPayload();
    const terminosSnapshot = terminosDraft.trim() || null;
    const ok = await updateCotizacion(
      cotizacionId,
      {
        id_sucursal: idSucursal,
        id_cliente: idCliente,
        id_obra: obraPayload.id_obra,
        nombre_obra: obraPayload.nombre_obra,
        tipo_pago: toDbTipoPago(tipoPago),
        referencia_pago: referenciaPago || null,
        comentarios: null,
        mostrar_con_iva: preciosIncluyenIva,
        iva_porcentaje: ivaPorCotizacion,
        subtotal: totals.subtotal,
        iva_total: totals.ivaTotal,
        total: totals.total,
        terminos_adicionales: terminosSnapshot,
      },
      productosPayload
    );
    setLoading(false);
    if (!ok) return toast.error("No fue posible actualizar.");
    toast.success("Cotización actualizada.");
    onSaved(cotizacionId);
  }

  return (
    <section className="space-y-4">
      {copySourceFolio ? (
        <p className={ALERT_INFO}>
          Copia basada en el folio <span className="font-semibold">{copySourceFolio}</span>. Al guardar se
          generará un folio nuevo.
        </p>
      ) : null}
      <div className={`grid gap-4 p-4 md:grid-cols-2 ${PANEL_CARD}`}>
        <label className={FIELD_LABEL}>
          Sucursal
          <SearchCombobox
            className="mt-1"
            inputClassName="px-3 py-2"
            disabled={catalogLoading || sucursales.length === 0}
            minChars={0}
            placeholder={catalogLoading ? "Cargando sucursales..." : "Buscar o seleccionar sucursal..."}
            value={sucursalSelected}
            onSearch={searchSucursales}
            onChange={(opt) => {
              setSucursalSelected(opt);
              setIdSucursal(opt?.id ?? "");
              clearClienteSelection();
            }}
          />
        </label>
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className={FIELD_LABEL}>Cliente</span>
            <button
              type="button"
              disabled={!idSucursal}
              title={!idSucursal ? "Selecciona una sucursal primero" : "Registrar un cliente nuevo"}
              className={`${BTN_GHOST} shrink-0 whitespace-nowrap px-2.5 py-1 text-xs`}
              onClick={() => openModal("cliente")}
            >
              + Nuevo cliente
            </button>
          </div>
          <SearchCombobox
            className="mt-1"
            inputClassName="px-3 py-2"
            disabled={catalogLoading || !idSucursal || loadingClientesSucursal}
            minChars={0}
            placeholder={
              !idSucursal
                ? "Selecciona sucursal primero"
                : loadingClientesSucursal
                  ? "Cargando clientes..."
                  : "Buscar o seleccionar cliente..."
            }
            value={clienteSelected}
            onSearch={searchClientesCb}
            onChange={(opt) => {
              setClienteSelected(opt);
              setIdCliente(opt?.id ?? "");
              clearObraSelection();
              setObraTouched(false);
            }}
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className={FIELD_LABEL}>Nombre de la obra</span>
            <button
              type="button"
              disabled={!idCliente}
              title={!idCliente ? "Selecciona un cliente primero" : "Registrar una obra nueva"}
              className={`${BTN_GHOST} shrink-0 whitespace-nowrap px-2.5 py-1 text-xs`}
              onClick={() => openModal("obra")}
            >
              + Nueva obra
            </button>
          </div>
          <SearchCombobox
            className="mt-1"
            inputClassName="px-3 py-2"
            disabled={catalogLoading || !idCliente || loadingObrasCliente}
            minChars={0}
            placeholder={
              !idCliente
                ? "Selecciona cliente primero"
                : loadingObrasCliente
                  ? "Cargando obras..."
                  : "Buscar o seleccionar obra..."
            }
            value={obraSelected}
            onSearch={searchObrasCb}
            onChange={(opt) => {
              setObraTouched(true);
              setObraSelected(opt);
              setIdObra(opt?.id ?? "");
              if (opt?.id) {
                const obra = obrasCliente.find((row) => row.id === opt.id);
                setReferenciaPago(obra?.referencia_pago ?? "");
              }
            }}
          />
          {!idObra && initial?.nombre_obra ? (
            <p className="mt-1 text-xs text-fg-subtle">
              Obra registrada anteriormente: {initial.nombre_obra}
            </p>
          ) : null}
        </div>
        <label className={FIELD_LABEL}>
          Tipo de pago
          <div className="mt-1.5">
            <FilterSelect
              value={tipoPago}
              onChange={(value) => setTipoPago(value as "Contado" | "Crédito")}
              options={[
                { value: "Contado", label: "Contado" },
                { value: "Crédito", label: "Crédito" },
              ]}
              inputClassName={FIELD_SELECT_TRIGGER}
            />
          </div>
        </label>
        <label className={`md:col-span-2 ${FIELD_LABEL}`}>
          Referencia de pago
          <input
            className={`mt-1.5 ${FIELD_INPUT}`}
            placeholder="Ej. REF-12345 o instrucciones para depósito/transferencia"
            value={referenciaPago}
            onChange={(event) => setReferenciaPago(event.target.value)}
          />
        </label>
      </div>

      <div className={`p-4 ${PANEL_CARD}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-y-2">
          <h3 className="font-semibold text-fg">Productos</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-fg-strong">
                {preciosIncluyenIva ? "Precios con IVA incluido" : "Precios sin IVA incluido"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={preciosIncluyenIva}
                aria-label={preciosIncluyenIva ? "Precios con IVA incluido" : "Precios sin IVA incluido"}
                onClick={() => handlePreciosIncluyenIvaChange(!preciosIncluyenIva)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  preciosIncluyenIva ? "bg-[#DA291C]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-card shadow transition-transform ${
                    preciosIncluyenIva ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              IVA
              <div className="w-36">
                <FilterSelect
                  value={String(ivaCotizacion)}
                  onChange={(value) => handleIvaCotizacionChange(normalizeIvaPct(Number(value)))}
                  options={[
                    { value: "16", label: "16%" },
                    { value: "8", label: "8%" },
                  ]}
                  inputClassName={`${FIELD_SELECT_TRIGGER} !min-h-0 py-1 text-sm md:text-sm`}
                />
              </div>
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
              className={`${BTN_SECONDARY} !min-h-0 px-3 py-1 text-sm`}
              disabled={templateDownloading}
              onClick={() => void handleDownloadProductosTemplate()}
            >
              {templateDownloading ? "Generando..." : "Descargar plantilla"}
            </button>
            <button
              type="button"
              className={`${BTN_SECONDARY} !min-h-0 px-3 py-1 text-sm`}
              disabled={catalogLoading || excelParsing || !productos.length}
              onClick={() => excelInputRef.current?.click()}
            >
              {excelParsing ? "Leyendo..." : "Importar Excel"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="hidden gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle md:grid md:grid-cols-10">
            <p className="md:col-span-2">SKU</p>
            <p className="md:col-span-2">Descripción</p>
            <p className="md:col-span-1">U.M.</p>
            <p className="md:col-span-2">Cantidad</p>
            <p className="md:col-span-2">{precioUnitarioLabel}</p>
            <p className="md:col-span-1">Accion</p>
          </div>
          {productosCotizacion.map((producto, index) => {
            const productoCatalogo = productos.find((p) => p.id === producto.id_producto);
            const umDefault = productoCatalogo?.unidad_medida?.trim() || "";
            return (
            <div key={producto.tempId} className={`grid gap-3 p-3 md:grid-cols-10 md:gap-2 ${PANEL_INSET}`}>
              {productosCotizacion.length > 1 ? (
                <p className="text-xs font-semibold text-fg-subtle md:col-span-10 md:hidden">Producto {index + 1}</p>
              ) : null}
              <CotizacionProductoPickers
                productoId={producto.id_producto}
                skuLabel={producto.productoSku}
                descripcionLabel={producto.productoDescripcion}
                disabled={catalogLoading}
                onProductSelected={(product) => applyProductoCotizacion(producto.tempId, product)}
                onProductCleared={() => clearProductoCotizacion(producto.tempId)}
              />
              <label className="block md:col-span-1">
                <span className="mb-1 block text-xs font-medium text-fg-muted md:sr-only">U.M.</span>
                <input
                  className={FIELD_INPUT}
                  placeholder={umDefault || "U.M."}
                  value={producto.unidad_medida ?? ""}
                  onChange={(event) =>
                    updateProducto(producto.tempId, {
                      unidad_medida: event.target.value.trim() ? event.target.value.trim() : null,
                    })
                  }
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-fg-muted md:sr-only">Cantidad</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className={FIELD_INPUT}
                  placeholder="Cantidad"
                  value={cantidadDraft[producto.tempId] ?? formatCantidadDisplay(producto.cantidad)}
                  onChange={(event) => handleCantidadChange(producto.tempId, event.target.value)}
                  onBlur={() => handleCantidadBlur(producto.tempId)}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-fg-muted md:sr-only">{precioUnitarioLabel}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className={FIELD_INPUT}
                  placeholder={precioUnitarioLabel}
                  value={precioUnitarioDraft[producto.tempId] ?? formatPrecioDisplay(producto.precioCapturado)}
                  onChange={(event) => handlePrecioChange(producto.tempId, event.target.value)}
                  onBlur={() => handlePrecioBlur(producto.tempId)}
                />
              </label>
              <div className="md:col-span-1">
                <span className="mb-1 block text-xs font-medium text-fg-muted md:sr-only">Accion</span>
                <button
                  type="button"
                  className={`${BTN_SECONDARY} !min-h-0 w-full text-red-600 md:py-1`}
                  onClick={() => {
                    clearProductoInputDrafts(producto.tempId);
                    setProductosCotizacion((prev) => prev.filter((row) => row.tempId !== producto.tempId));
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className={`${BTN_SECONDARY} !min-h-0 px-3 py-1 text-sm`}
            onClick={() =>
              setProductosCotizacion((prev) => [
                ...prev,
                {
                  tempId: crypto.randomUUID(),
                  id_producto: null,
                  descripcion_registro: "",
                  cantidad: 1,
                  unidad_medida: null,
                  precio_unitario: 0,
                  precioCapturado: 0,
                  iva_porcentaje: ivaCotizacion,
                  subtotal_item: 0,
                  total_item: 0,
                  productoSku: "",
                  productoDescripcion: "",
                },
              ])
            }
          >
            + Producto
          </button>
          <div className="flex flex-wrap items-center justify-end gap-4 text-sm text-fg-strong">
            <p>Subtotal: {money(totals.subtotal)}</p>
            <p>IVA: {money(totals.ivaTotal)}</p>
            <p className="font-semibold">Total: {money(totals.total)}</p>
          </div>
        </div>
      </div>

      {idSucursal && selectedSucursalNombre && !catalogLoading && (
        <div className={`p-4 ${PANEL_CARD}`}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-fg">Términos adicionales de esta cotización (PDF)</h3>
              <p className="mt-1 text-xs text-fg-subtle">
                {mode === "create" ? (
                  <>
                    Se guardan en <strong>esta</strong> cotización al registrarla. Cambiar la plantilla de la sucursal
                    (en Sucursales) no afecta cotizaciones ya guardadas. Una línea nueva por viñeta.
                  </>
                ) : (
                  <>
                    Puedes editarlos aquí; al guardar cambios solo se actualiza <strong>esta</strong> cotización, no la
                    plantilla de <strong>{selectedSucursalNombre}</strong>. Otras cotizaciones no se modifican.
                  </>
                )}
              </p>
            </div>
          </div>
          <div className={`mb-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle ${PANEL_INSET}`}>
            Texto para el PDF
          </div>
          <textarea
            className={`min-h-[120px] ${FIELD_INPUT}`}
            value={terminosDraft}
            onChange={(e) => setTerminosDraft(e.target.value)}
            placeholder="Ej. Condiciones especiales de esta cotización..."
            aria-label="Términos adicionales para el PDF"
          />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" disabled={loading} className={BTN_PRIMARY} onClick={save}>
          {mode === "create" ? "Registrar cotización" : "Guardar cambios"}
        </button>
        <button
          type="button"
          className={BTN_SECONDARY}
          onClick={() => openModal("producto")}
        >
          + Nuevo producto
        </button>
        {mode === "edit" && canDelete && onDelete && (
          <button
            type="button"
            className={`${BTN_PRIMARY} bg-brand hover:bg-brand-hover`}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Borrar cotización
          </button>
        )}
      </div>

      <AnimatePresence>
      {modalType === "cliente" && (
        <FormDialogShell>
            <h4 className="text-base font-semibold text-fg">Nuevo cliente</h4>
            <p className="mt-1 text-sm text-fg-subtle">
              {sucursalNombre
                ? `Se registrará en la sucursal: ${sucursalNombre}.`
                : "Completa los campos del cliente."}
            </p>

            <div className="mt-4 grid gap-3">
              <label className={`space-y-1.5 ${FIELD_LABEL}`}>
                Nombre del Cliente *
                <input
                  autoFocus
                  value={clienteDraft.nombre_cliente}
                  onChange={(event) => setClienteDraft((prev) => ({ ...prev, nombre_cliente: event.target.value }))}
                  placeholder="Ej. CEMEX Norte"
                  className={`${FIELD_INPUT} normal-case`}
                />
              </label>
              <label className={`space-y-1.5 ${FIELD_LABEL}`}>
                Número de Cliente
                <input
                  value={clienteDraft.num_cliente}
                  onChange={(event) => setClienteDraft((prev) => ({ ...prev, num_cliente: event.target.value }))}
                  placeholder="Ej. CL-10025"
                  className={`${FIELD_INPUT} normal-case`}
                />
              </label>
              <label className={`space-y-1.5 ${FIELD_LABEL}`}>
                Empresa
                <input
                  value={clienteDraft.empresa}
                  onChange={(event) => setClienteDraft((prev) => ({ ...prev, empresa: event.target.value }))}
                  placeholder="Ej. Promexma"
                  className={`${FIELD_INPUT} normal-case`}
                />
              </label>
              <label className={`space-y-1.5 ${FIELD_LABEL}`}>
                Teléfono
                <input
                  value={clienteDraft.telefono}
                  onChange={(event) => setClienteDraft((prev) => ({ ...prev, telefono: event.target.value }))}
                  placeholder="Ej. 9991234567"
                  className={`${FIELD_INPUT} normal-case`}
                />
              </label>
              <label className={`space-y-1.5 ${FIELD_LABEL}`}>
                Correo
                <input
                  type="email"
                  value={clienteDraft.correo}
                  onChange={(event) => setClienteDraft((prev) => ({ ...prev, correo: event.target.value }))}
                  placeholder="Ej. cliente@empresa.com"
                  className={`${FIELD_INPUT} normal-case`}
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
              <button type="button" onClick={closeModal} disabled={modalLoading} className={BTN_SECONDARY}>
                Descartar
              </button>
              <button
                type="button"
                onClick={() => void handleModalSave()}
                disabled={modalLoading}
                className={BTN_PRIMARY}
              >
                {modalLoading ? "Guardando..." : "Guardar"}
              </button>
            </div>
        </FormDialogShell>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {modalType === "obra" && (
        <FormDialogShell>
            <h4 className="text-base font-semibold text-fg">Nueva obra</h4>
            <p className="mt-1 text-sm text-fg-subtle">
              {clienteNombre
                ? `Se registrará para el cliente: ${clienteNombre}.`
                : "Completa los campos de la obra."}
            </p>

            <div className="mt-4 grid gap-3">
              <label className={`space-y-1.5 ${FIELD_LABEL}`}>
                Nombre de la obra *
                <input
                  autoFocus
                  value={obraDraft.nombre_obra}
                  onChange={(event) => setObraDraft((prev) => ({ ...prev, nombre_obra: event.target.value }))}
                  placeholder="Ej. Fraccionamiento Los Bosques"
                  className={`${FIELD_INPUT} normal-case`}
                />
              </label>
              <label className={`space-y-1.5 ${FIELD_LABEL}`}>
                Número de obra
                <input
                  value={obraDraft.num_obra}
                  onChange={(event) => setObraDraft((prev) => ({ ...prev, num_obra: event.target.value }))}
                  placeholder="Ej. 67237602"
                  className={`${FIELD_INPUT} normal-case`}
                />
              </label>
              <label className={`space-y-1.5 ${FIELD_LABEL}`}>
                Referencia de pago
                <input
                  value={obraDraft.referencia_pago}
                  onChange={(event) => setObraDraft((prev) => ({ ...prev, referencia_pago: event.target.value }))}
                  placeholder="Ej. 6723760274"
                  className={`${FIELD_INPUT} normal-case`}
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
              <button type="button" onClick={closeModal} disabled={modalLoading} className={BTN_SECONDARY}>
                Descartar
              </button>
              <button
                type="button"
                onClick={() => void handleModalSave()}
                disabled={modalLoading}
                className={BTN_PRIMARY}
              >
                {modalLoading ? "Guardando..." : "Guardar"}
              </button>
            </div>
        </FormDialogShell>
      )}
      </AnimatePresence>

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
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-sm border border-line bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05)] shadow-xl">
            <div className="border-b border-line-subtle px-5 py-4">
              <h4 className="text-base font-semibold text-fg">Importar desde Excel</h4>
              <p className="mt-1 text-sm text-fg-subtle">
                Primera fila: encabezados. Obligatorio: <strong>SKU</strong> o <strong>SKU (obligatorio)</strong>.
                Opcional: Cantidad / Cantidad (opcional), Precio / Precio (opcional). El IVA de las filas importadas
                usa el <strong>IVA</strong> del formulario. La unidad de medida siempre viene del
                catálogo (no se lee del Excel). Puedes usar el botón <strong>Descargar plantilla</strong> en Productos para
                obtener un .xlsx con esos títulos.
              </p>
            </div>
            <div className="max-h-[50vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
              {importPreview.ok.length > 0 && (
                <div>
                  <p className="mb-2 font-semibold text-emerald-800">Listos para agregar ({importPreview.ok.length})</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-emerald-100 bg-emerald-50/50 p-2 text-xs text-fg">
                    {importPreview.ok.map((row, i) => (
                      <li key={`ok-${row.excelRowIndex}-${i}`}>
                        Fila {row.excelRowIndex}: {row.skuRaw} · {row.product.descripcion.slice(0, 40)}
                        {row.product.descripcion.length > 40 ? "…" : ""} — Cant. {formatQuantity(row.cantidad)}
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
            <div className="flex justify-end gap-2 border-t border-line-subtle px-5 py-4">
              <button type="button" onClick={cancelExcelImport} className={BTN_SECONDARY}>
                Descartar
              </button>
              <button
                type="button"
                disabled={!importPreview.ok.length}
                onClick={confirmExcelImport}
                className={BTN_PRIMARY}
              >
                Agregar a Productos
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteCotizacionModal
        open={confirmDeleteOpen}
        loading={deleteLoading}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          if (!onDelete) return;
          setDeleteLoading(true);
          const ok = await onDelete();
          setDeleteLoading(false);
          if (!ok) {
            toast.error("No se pudo borrar la cotización.");
            return;
          }
          toast.success("Cotización borrada.");
        }}
      />
    </section>
  );
}


/** Animated overlay + panel for the inline cliente/obra dialogs — same spring feel as ui/Modal. */
function FormDialogShell({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4"
      initial={reduceMotion ? undefined : { opacity: 0 }}
      animate={reduceMotion ? undefined : { opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, transition: { duration: 0.15 } }}
    >
      <motion.div
        className="w-full max-w-md rounded-sm border border-line bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] shadow-xl"
        initial={reduceMotion ? undefined : { y: 24, opacity: 0 }}
        animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
        exit={reduceMotion ? undefined : { y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
