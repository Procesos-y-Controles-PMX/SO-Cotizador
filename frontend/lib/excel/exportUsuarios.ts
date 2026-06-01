import type { CtzUsuario, UserRole } from "@/lib/types/db";

export const USUARIOS_EXPORT_FILENAME = "usuarios.xlsx";

const HEADERS = ["Correo", "Nombre", "Tipo"] as const;

function rolExportLabel(rol: UserRole): string {
  return rol === "admin" ? "Administrador" : "Tienda";
}

function sortUsuarios(rows: CtzUsuario[]): CtzUsuario[] {
  return [...rows].sort((a, b) => {
    if (a.activo !== b.activo) return a.activo ? -1 : 1;
    return a.email.localeCompare(b.email, "es");
  });
}

export async function downloadUsuariosExcel(usuarios: CtzUsuario[]): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const sorted = sortUsuarios(usuarios);
  const sheetData: (string | null)[][] = [
    [...HEADERS],
    ...sorted.map((u) => [u.email, u.nombre_completo?.trim() || "", rolExportLabel(u.rol)]),
  ];

  await writeXlsxFile(sheetData, {
    sheet: "Usuarios",
    columns: [{ width: 32 }, { width: 28 }, { width: 18 }],
  }).toFile(USUARIOS_EXPORT_FILENAME);
}
