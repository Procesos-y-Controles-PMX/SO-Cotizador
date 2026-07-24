"use client";

import { useCallback } from "react";
import SearchCombobox, { type SearchComboboxOption } from "@/components/ui/SearchCombobox";
import {
  getProductoById,
  searchProductosActivosPorDescripcion,
  searchProductosActivosPorSku,
} from "@/lib/queries/productos";
import type { CtzProducto } from "@/lib/types/db";

type Props = {
  productoId: string | null;
  skuLabel: string;
  descripcionLabel: string;
  disabled?: boolean;
  onProductSelected: (product: CtzProducto) => void;
  onProductCleared: () => void;
};

function productToSkuOption(p: CtzProducto): SearchComboboxOption {
  return {
    id: p.id,
    label: p.sku?.trim() ? p.sku : "(sin SKU)",
    sublabel: p.descripcion,
  };
}

function productToDescripcionOption(p: CtzProducto): SearchComboboxOption {
  return {
    id: p.id,
    label: p.descripcion,
    sublabel: p.sku?.trim() ? p.sku : undefined,
  };
}

export default function CotizacionProductoPickers({
  productoId,
  skuLabel,
  descripcionLabel,
  disabled,
  onProductSelected,
  onProductCleared,
}: Props) {
  const skuValue: SearchComboboxOption | null = productoId
    ? { id: productoId, label: skuLabel || "(sin SKU)" }
    : null;
  const descripcionValue: SearchComboboxOption | null = productoId
    ? { id: productoId, label: descripcionLabel || "" }
    : null;

  const searchSku = useCallback(async (query: string) => {
    const rows = await searchProductosActivosPorSku(query);
    return rows.map(productToSkuOption);
  }, []);

  const searchDescripcion = useCallback(async (query: string) => {
    const rows = await searchProductosActivosPorDescripcion(query);
    return rows.map(productToDescripcionOption);
  }, []);

  async function handleSelect(option: SearchComboboxOption | null) {
    if (!option) {
      onProductCleared();
      return;
    }
    const product = await getProductoById(option.id);
    if (product) onProductSelected(product);
  }

  return (
    <>
      <div className="md:col-span-2">
        <span className="mb-1 block text-xs font-medium text-fg-muted md:sr-only">SKU</span>
        <SearchCombobox
          className="w-full"
          disabled={disabled}
          placeholder="Buscar SKU..."
          value={skuValue}
          onChange={handleSelect}
          onSearch={searchSku}
        />
      </div>
      <div className="md:col-span-2">
        <span className="mb-1 block text-xs font-medium text-fg-muted md:sr-only">Descripción</span>
        <SearchCombobox
          className="w-full"
          disabled={disabled}
          placeholder="Buscar descripción..."
          value={descripcionValue}
          onChange={handleSelect}
          onSearch={searchDescripcion}
        />
      </div>
    </>
  );
}
