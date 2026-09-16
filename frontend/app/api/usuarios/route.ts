import { jsonError, jsonOk, requireApiSession } from "@/lib/api-route";
import {
  createUsuario,
  createUsuariosBulk,
  deleteUsuario,
  getExistingUsuarioEmails,
  getUsuarioByEmail,
  listUsuarios,
  updateUsuario,
  validateUsuarioMutation,
} from "@/lib/queries/usuarios";
import type { UsuarioBulkInsertRow } from "@/lib/queries/usuarios.shared";
import type { CtzUsuario, UserRole } from "@/lib/types/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const { searchParams } = new URL(request.url);
    const op = searchParams.get("op") ?? "list";
    if (op === "emails") {
      const emails = await getExistingUsuarioEmails();
      return jsonOk([...emails]);
    }
    if (op === "by-email") {
      const email = searchParams.get("email") ?? "";
      const user = email ? await getUsuarioByEmail(email) : null;
      return jsonOk(user);
    }
    const search = searchParams.get("search") ?? "";
    const rows = await listUsuarios(search);
    return jsonOk(rows);
  } catch (err) {
    console.error("[api/usuarios GET]", err);
    return jsonError("No se pudieron cargar los usuarios.");
  }
}

export async function POST(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const body = (await request.json()) as {
      op?: string;
      payload?: {
        email: string;
        nombre_completo?: string;
        rol: UserRole;
        password: string;
      };
      rows?: UsuarioBulkInsertRow[];
      id?: string;
      options?: { currentUserId: string; target: CtzUsuario };
      target?: CtzUsuario;
      currentUserId?: string;
      changes?: {
        rol?: UserRole;
        activo?: boolean;
        email?: string;
        nombre_completo?: string | null;
        password?: string;
      };
    };

    if (body.op === "create" && body.payload) {
      return jsonOk(await createUsuario(body.payload));
    }
    if (body.op === "bulk" && body.rows) {
      return jsonOk(await createUsuariosBulk(body.rows));
    }
    if (body.op === "update" && body.id && body.payload) {
      return jsonOk(await updateUsuario(body.id, body.payload, body.options));
    }
    if (body.op === "delete" && body.id) {
      return jsonOk(await deleteUsuario(body.id));
    }
    if (body.op === "validate" && body.target && body.currentUserId && body.changes) {
      const error = await validateUsuarioMutation(body.target, body.currentUserId, body.changes);
      return jsonOk({ error });
    }

    return jsonError("Operación no válida.", 400);
  } catch (err) {
    console.error("[api/usuarios POST]", err);
    return jsonError("No se pudo completar la operación de usuario.");
  }
}
