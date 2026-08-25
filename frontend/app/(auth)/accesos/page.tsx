"use client";

import { useAuth } from "@/lib/auth";
import { isOwnerAdminEmail } from "@/lib/owner-admin";
import AccessLogsBoard from "@/components/admin/AccessLogsBoard";
import PageHeader from "@/components/ui/PageHeader";
import { ALERT_WARNING } from "@/components/ui/contentStyles";

export default function AccesosPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!isOwnerAdminEmail(user?.email)) {
    return <p className={ALERT_WARNING}>Esta sección es solo para el administrador general.</p>;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administración"
        title="Accesos"
        subtitle="Logins de todas las apps de Soporte Operativo."
      />
      <AccessLogsBoard />
    </div>
  );
}
