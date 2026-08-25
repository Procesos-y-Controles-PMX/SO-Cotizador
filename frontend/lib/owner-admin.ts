export const OWNER_ADMIN_EMAILS = ["fernando.corella@ext.cemex.com"] as const;

const OWNER_ADMIN_EMAIL_SET = new Set(OWNER_ADMIN_EMAILS.map((email) => email.trim().toLowerCase()));

export function isOwnerAdminEmail(email: string | null | undefined) {
  return OWNER_ADMIN_EMAIL_SET.has((email ?? "").trim().toLowerCase());
}
