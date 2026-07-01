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

        <section className="flex items-center justify-center px-6 sm:px-10 lg:px-12 xl:px-16 py-8 lg:py-10">
          <div className="w-full max-w-md xl:max-w-lg">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl shadow-black/25 p-8 sm:p-10">
              <div className="lg:hidden mb-8 pb-7 border-b border-slate-100">
                <PromexmaLogotipo productLabel={productLabel} variant="light" />
              </div>

              {children}
            </div>

            <p className="text-center text-xs text-white/45 mt-4">
              Acceso restringido a personal autorizado
            </p>
          </div>
        </section>
      </main>
    </MagazineDots>
  );
}
