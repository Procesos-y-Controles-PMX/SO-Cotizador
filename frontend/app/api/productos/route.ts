import { jsonError, jsonOk, requireApiSession } from "@/lib/api-route";
import {
  createProducto,
  createProductosBulk,
  getExistingProductoSkus,
  getProductoById,
  getProductosByIds,
  listAllProductos,
  listAllProductosActivos,
  listInventarioProductos,
  searchProductosActivosPorDescripcion,
  searchProductosActivosPorSku,
  updateProducto,
} from "@/lib/queries/productos";
import type { ProductoBulkInsertRow } from "@/lib/queries/productos.shared";
import type { CtzProducto } from "@/lib/types/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const { searchParams } = new URL(request.url);
    const op = searchParams.get("op") ?? "inventario";
    const q = searchParams.get("q") ?? "";

    if (op === "inventario") return jsonOk(await listInventarioProductos(q));
    if (op === "search-sku") return jsonOk(await searchProductosActivosPorSku(q));
    if (op === "search-descripcion") return jsonOk(await searchProductosActivosPorDescripcion(q));
    if (op === "all-activos") return jsonOk(await listAllProductosActivos());
    if (op === "all") return jsonOk(await listAllProductos());
    if (op === "skus") {
      const skus = await getExistingProductoSkus();
      return jsonOk([...skus]);
    }
    if (op === "get") {
      const id = searchParams.get("id") ?? "";
      return jsonOk(id ? await getProductoById(id) : null);
    }

    return jsonError("Operación no válida.", 400);
  } catch (err) {
    console.error("[api/productos GET]", err);
    return jsonError("No se pudieron cargar los productos.");
  }
}

export async function POST(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const body = (await request.json()) as {
      op?: string;
      ids?: string[];
      rows?: ProductoBulkInsertRow[];
      payload?: {
        sku?: string;
        descripcion: string;
        unidad_medida?: string;
        precio_unitario_base?: number;
      } & Partial<Pick<CtzProducto, "sku" | "descripcion" | "unidad_medida" | "precio_unitario_base" | "activo">>;
      id?: string;
    };

    if (body.op === "by-ids" && body.ids) {
      return jsonOk(await getProductosByIds(body.ids));
    }
    if (body.op === "bulk" && body.rows) {
      return jsonOk(await createProductosBulk(body.rows));
    }
    if (body.op === "create" && body.payload?.descripcion) {
      return jsonOk(await createProducto(body.payload));
    }
    if (body.op === "update" && body.id && body.payload) {
      const ok = await updateProducto(body.id, body.payload);
      return jsonOk({ ok });
    }

    return jsonError("Operación no válida.", 400);
  } catch (err) {
    console.error("[api/productos POST]", err);
    return jsonError("No se pudo completar la operación de producto.");
  }
}
