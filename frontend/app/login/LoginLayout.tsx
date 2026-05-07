"use client";

import Image from "next/image";
import { ReactNode } from "react";

interface LoginLayoutProps {
  children: ReactNode;
}

export default function LoginLayout({ children }: LoginLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative flex min-h-[340px] w-full flex-col justify-between overflow-hidden bg-slate-900 p-8 text-white md:p-12 lg:min-h-screen lg:w-[48%] lg:p-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-red-500/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Image
            src="/promexma-logo.png"
            alt="Promexma"
            width={180}
            height={48}
            className="brightness-0 invert"
            priority
          />
        </div>

        <div className="relative z-10 my-auto py-10 lg:py-0">
          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-[2.6rem]">
            <span className="text-slate-200">Sistema Integral</span>
            <br />
            <span className="text-white">de Cotizaciones</span>
          </h1>

          <div className="mb-6 mt-5 h-1 w-12 rounded-full bg-red-600" />

          <p className="max-w-md text-sm leading-relaxed text-slate-400 md:text-base">
            Plataforma para la administracion, seguimiento y gestion de cotizaciones de sucursales CEMEX.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-slate-600" />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">Promexma</span>
          </div>
          <span className="text-[11px] text-slate-600">Uso exclusivo interno</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white p-8 md:p-12 lg:p-16">{children}</div>
    </div>
  );
}
