"use client";

import type { ReactNode } from "react";
import MagazineDots from "@/components/kokonutui/magazine-dots";
import PromexmaLogotipo from "@/components/login/PromexmaLogotipo";

interface LoginShellProps {
  productLabel: string;
  heroLine1: string;
  heroLine2: string;
  heroDescription: string;
  children: ReactNode;
}

export default function LoginShell({
  productLabel,
  heroLine1,
  heroLine2,
  heroDescription,
  children,
}: LoginShellProps) {
  return (
    <MagazineDots interactive className="min-h-dvh !items-stretch !justify-start">
      <main className="relative z-10 grid min-h-dvh w-full lg:grid-cols-2">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand z-20" />

        {/* Desktop — branding column */}
        <section className="hidden lg:flex flex-col justify-center px-12 xl:px-16 py-10">
          <div className="max-w-xl">
            <div className="mb-10">
              <PromexmaLogotipo productLabel={productLabel} variant="dark" />
            </div>

            <div className="space-y-6">
              <div className="w-10 h-0.5 bg-brand" />
              <h1 className="font-display text-5xl xl:text-6xl font-semibold text-white leading-[0.92] tracking-tight uppercase">
                {heroLine1}
                <br />
                <span className="text-white/90">{heroLine2}</span>
              </h1>
              <p className="text-white/50 text-base leading-relaxed max-w-md">
                {heroDescription}
              </p>
            </div>
          </div>

          <p className="mt-10 text-xs text-white/30">Uso exclusivo interno</p>
        </section>

        {/* Mobile + form column */}
        <section className="flex min-h-dvh flex-col lg:min-h-0 lg:justify-center login-safe-x login-safe-bottom px-4 sm:px-6 lg:px-12 xl:px-16 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4 lg:py-10">
          {/* Mobile — branding on dark canvas (not inside the white card) */}
          <div className="lg:hidden shrink-0 px-1 pt-3 pb-5 text-center">
            <PromexmaLogotipo
              productLabel={productLabel}
              variant="dark"
              align="center"
            />
            <div className="mt-5 space-y-3">
              <div className="mx-auto w-8 h-0.5 bg-brand" />
              <h1 className="font-display text-[1.65rem] leading-[1.05] sm:text-3xl font-semibold text-white tracking-tight uppercase">
                {heroLine1}
                <br />
                <span className="text-white/90">{heroLine2}</span>
              </h1>
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-white/45">
                {heroDescription}
              </p>
            </div>
          </div>

          <div className="mt-auto flex w-full flex-col justify-end lg:mt-0 lg:justify-center">
            <div className="w-full max-w-md xl:max-w-lg mx-auto lg:mx-0">
              <div className="bg-white rounded-2xl border border-white/20 shadow-xl shadow-black/25 p-6 sm:p-8 lg:bg-white/95 lg:backdrop-blur-md lg:p-10">
                {children}
              </div>

              <p className="text-center text-xs text-white/45 mt-4 px-2">
                Acceso restringido a personal autorizado
              </p>
            </div>
          </div>
        </section>
      </main>
    </MagazineDots>
  );
}
