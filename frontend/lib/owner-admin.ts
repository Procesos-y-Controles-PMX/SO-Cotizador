export const OWNER_ADMIN_EMAILS = ["fernando.corella@ext.cemex.com"] as const;

const OWNER_ADMIN_EMAIL_SET = new Set(OWNER_ADMIN_EMAILS.map((email) => email.trim().toLowerCase()));

export function isOwnerAdminEmail(email: string | null | undefined) {
  return OWNER_ADMIN_EMAIL_SET.has((email ?? "").trim().toLowerCase());
}

/** User-facing role. Never show raw `admin`. */
export function displayRol(rol: string | null | undefined, email?: string | null) {
  if (isOwnerAdminEmail(email)) return "Administrador general";
  if (rol === "admin") return "Administrador";
  if (rol === "tienda") return "Tienda";
  return rol?.trim() || "";
}
