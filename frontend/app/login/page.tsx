"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginByEmail } from "@/lib/auth";
import LoginLayout from "./LoginLayout";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const user = await loginByEmail(email);
    setLoading(false);

    if (!user) {
      const message = "No se encontro un usuario activo con ese correo.";
      setError(message);
      toast.error(message);
      return;
    }

    toast.success(`Bienvenido, ${user.nombre_completo ?? user.email}`);
    router.replace("/cotizaciones");
  }

  return (
    <LoginLayout>
      <LoginForm
        email={email}
        loading={loading}
        error={error}
        onEmailChange={setEmail}
        onSubmit={onSubmit}
      />
    </LoginLayout>
  );
}

