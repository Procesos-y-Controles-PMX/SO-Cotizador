"use client";

import { useEffect, type ReactNode } from "react";
import MagazineDots from "@/components/kokonutui/magazine-dots";
import PromexmaLogotipo from "@/components/login/PromexmaLogotipo";

const LOGIN_THEME = "#0d1117";

interface LoginShellProps {
  productLabel: string;
  heroLine1: string;
  heroLine2: string;
  heroDescription: string;
  children: ReactNode;
}

/** Dark canvas + status bar while login is mounted (kills white iOS overscroll). */
function useLoginChromeTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevScheme = root.style.colorScheme;
    const prevHtmlBg = root.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    const prevOverscroll = root.style.overscrollBehavior;
    root.style.colorScheme = "dark";
    root.style.backgroundColor = LOGIN_THEME;
    body.style.backgroundColor = LOGIN_THEME;
    root.style.overscrollBehavior = "none";

    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    const prevTheme = meta.getAttribute("content");
    meta.setAttribute("content", LOGIN_THEME);

    let apple = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    ) as HTMLMetaElement | null;
    const createdApple = !apple;
    if (!apple) {
      apple = document.createElement("meta");
      apple.name = "apple-mobile-web-app-status-bar-style";
      document.head.appendChild(apple);
    }
    const prevApple = apple.getAttribute("content");
    apple.setAttribute("content", "black-translucent");

    return () => {
      root.style.colorScheme = prevScheme;
      root.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      root.style.overscrollBehavior = prevOverscroll;
      if (created) meta?.remove();
      else if (prevTheme != null) meta?.setAttribute("content", prevTheme);
      else meta?.removeAttribute("content");

      if (createdApple) apple?.remove();
      else if (prevApple != null) apple?.setAttribute("content", prevApple);
      else apple?.removeAttribute("content");
    };
  }, []);
}

export default function LoginShell({
  productLabel,
  heroLine1,
  heroLine2,
  heroDescription,
  children,
}: LoginShellProps) {
  useLoginChromeTheme();

  return (
    <MagazineDots interactive className="min-h-dvh !items-stretch !justify-start">
      <main className="relative z-10 grid min-h-dvh w-full lg:grid-cols-2">
        <div className="absolute left-0 right-0 top-[env(safe-area-inset-top,0px)] z-20 h-px bg-brand/40" />

        {/* Desktop — branding column */}
        <section className="hidden lg:flex flex-col justify-center px-12 xl:px-16 py-10">
          <div className="max-w-xl">
            <div className="mb-16">
              <PromexmaLogotipo productLabel={productLabel} variant="dark" />
            </div>

            <div className="space-y-5">
              <h1 className="font-display text-4xl xl:text-5xl font-semibold text-white leading-[1.08] tracking-tight">
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
        <section className="login-safe-x login-safe-top login-safe-bottom flex min-h-dvh flex-col px-4 sm:px-6 lg:min-h-0 lg:justify-center lg:px-12 lg:py-10 xl:px-16">
          {/* Mobile — branding on dark canvas (not inside the white card) */}
          <div className="lg:hidden shrink-0 px-1 pt-1 pb-5 text-center">
            <PromexmaLogotipo
              productLabel={productLabel}
              variant="dark"
              align="center"
            />
            <div className="mt-6 space-y-3">
              <h1 className="font-display text-[1.65rem] leading-[1.15] sm:text-3xl font-semibold text-white tracking-tight">
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
              <div className="bg-card rounded-2xl border border-white/20 shadow-xl shadow-black/25 p-6 sm:p-8 lg:bg-card/95 lg:backdrop-blur-md lg:p-10">
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
