"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginByEmailPassword } from "@/lib/auth";
import LoginLayout from "./LoginLayout";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const user = await loginByEmailPassword(email, password);
    setLoading(false);

    if (!user) {
      const message = "Correo o contraseña incorrectos.";
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
        password={password}
        loading={loading}
        error={error}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={onSubmit}
      />
    </LoginLayout>
  );
}
