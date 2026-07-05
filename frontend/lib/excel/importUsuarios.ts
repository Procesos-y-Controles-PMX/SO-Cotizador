import { parseExcelFile } from "./importCotizacionProductos";

export const USUARIOS_EXCEL_TEMPLATE_HEADERS = ["Correo", "Nombre"] as const;
export const USUARIOS_EXCEL_TEMPLATE_FILENAME = "plantilla-usuarios.xlsx";
export const USUARIOS_EXCEL_IMPORT_MAX_ROWS = 500;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeader(h: unknown): string {
  return stripAccents(cellToString(h).toLowerCase()).replace(/\s+/g, " ");
}

function stripKnownHeaderSuffix(label: string): string {
  return label
    .replace(/\s*\(\s*obligatorio\s*\)\s*$/i, "")
    .replace(/\s*\(\s*opcional\s*\)\s*$/i, "")
    .trim();
}

export function findColumnIndex(headers: unknown[], candidates: string[]): number {
  const lowered = candidates.map((c) =>
    stripKnownHeaderSuffix(stripAccents(c.toLowerCase()).replace(/\s+/g, " "))
  );
  for (let i = 0; i < headers.length; i++) {
    const raw = normalizeHeader(headers[i]);
    if (!raw) continue;
    const h = stripKnownHeaderSuffix(raw);
    if (!h) continue;
    for (const c of lowered) {
      if (h === c || h.replace(/\s/g, "") === c.replace(/\s/g, "")) return i;
    }
  }
  return -1;
}

export type UsuariosExcelOkRow = {
  excelRowIndex: number;
  email: string;
  nombre_completo: string | null;
};

export type UsuariosExcelFailRow = {
  excelRowIndex: number;
  emailRaw: string;
  reason: string;
};

export type UsuariosExcelSkippedRow = {
  excelRowIndex: number;
  email: string;
  reason: string;
};

export type UsuariosExcelImportPreview = {
  ok: UsuariosExcelOkRow[];
  failed: UsuariosExcelFailRow[];
  skipped: UsuariosExcelSkippedRow[];
};

export async function downloadUsuariosExcelTemplate(): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const headers = [...USUARIOS_EXCEL_TEMPLATE_HEADERS];
  const blank = (): null[] => headers.map(() => null);
  const sheetData: (string | null)[][] = [headers, blank(), blank(), blank()];
  await writeXlsxFile(sheetData, {
    sheet: "Usuarios",
    columns: headers.map(() => ({ width: 28 })),
  }).toFile(USUARIOS_EXCEL_TEMPLATE_FILENAME);
}

export async function parseUsuariosExcelFile(file: File): Promise<unknown[][]> {
  return parseExcelFile(file);
}

export function resolveUsuariosExcelRows(
  rows: unknown[][],
  existingEmails: Set<string>
): { preview: UsuariosExcelImportPreview; error: string | null } {
  const empty: UsuariosExcelImportPreview = { ok: [], failed: [], skipped: [] };
  if (!rows.length) return { preview: empty, error: "El archivo no tiene filas." };

  const headerRow = rows[0];
  const emailCol = findColumnIndex(headerRow, [
    USUARIOS_EXCEL_TEMPLATE_HEADERS[0],
    "correo",
    "email",
    "e-mail",
    "mail",
  ]);
  const nombreCol = findColumnIndex(headerRow, [
    USUARIOS_EXCEL_TEMPLATE_HEADERS[1],
    "nombre",
    "nombre completo",
    "nombre_completo",
  ]);

  if (emailCol < 0) {
    return {
      preview: empty,
      error: 'No se encontro la columna "Correo" o "Email" en la primera fila.',
    };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > USUARIOS_EXCEL_IMPORT_MAX_ROWS) {
    return {
      preview: empty,
      error: `El archivo supera el maximo de ${USUARIOS_EXCEL_IMPORT_MAX_ROWS} filas de datos.`,
    };
  }

  const ok: UsuariosExcelOkRow[] = [];
  const failed: UsuariosExcelFailRow[] = [];
  const skipped: UsuariosExcelSkippedRow[] = [];
  const seenInFile = new Set<string>();

  for (let idx = 0; idx < dataRows.length; idx++) {
    const row = dataRows[idx];
    const excelRowIndex = idx + 2;
    const emailRaw = cellToString(row[emailCol]);
    const nombreRaw = nombreCol >= 0 ? cellToString(row[nombreCol]) : "";

    if (!emailRaw && !nombreRaw) continue;

    if (!emailRaw) {
      failed.push({ excelRowIndex, emailRaw: "", reason: "Correo vacio." });
      continue;
    }

    const email = emailRaw.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      failed.push({ excelRowIndex, emailRaw, reason: "Correo invalido." });
      continue;
    }

    if (seenInFile.has(email)) {
      failed.push({ excelRowIndex, emailRaw, reason: "Correo duplicado en el archivo." });
      continue;
    }
    seenInFile.add(email);

    if (existingEmails.has(email)) {
      skipped.push({
        excelRowIndex,
        email,
        reason: "Ya registrado en la base de datos.",
      });
      continue;
    }

    ok.push({
      excelRowIndex,
      email,
      nombre_completo: nombreRaw.trim() || null,
    });
  }

  if (!ok.length && !failed.length && !skipped.length) {
    return { preview: empty, error: "No hay filas con correo para importar." };
  }

  return { preview: { ok, failed, skipped }, error: null };
}
