"use client";

import { NoiseField } from "@promexma/ui";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAmbientGrid } from "@/contexts/AmbientGridContext";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const RING_SIZE = {
  xs: "h-4 w-4",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
} as const;

export type BrandLoaderSize = keyof typeof RING_SIZE;

/**
 * - ambient: caption over the shell NoiseField (no separate spinner graphic)
 * - inset: small brand pulse for in-card / nested loads
 * - ring: tiny CSS arc (buttons / dense UI)
 */
export type BrandLoaderVariant = "ambient" | "inset" | "ring";

type BrandLoaderProps = {
  size?: BrandLoaderSize;
  className?: string;
  /** Center content; also defaults variant to `ambient` when unset. */
  center?: boolean;
  paddingClass?: string;
  label?: string;
  /** Override auto variant selection. */
  variant?: BrandLoaderVariant;
  /** Extra UI under the label (e.g. progress) — stays in the centered cluster. */
  children?: React.ReactNode;
};

function CssRing({ size, className }: { size: BrandLoaderSize; className?: string }) {
  return (
    <div
      aria-label="Cargando"
      className={cn("animate-spin rounded-full border-b-2 border-brand", RING_SIZE[size], className)}
      role="status"
    />
  );
}

function BrandPulse() {
  return (
    <>
      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="nf-loader-bar h-1 w-7 rounded-full bg-brand" />
        <span className="nf-loader-bar nf-loader-bar-delay-1 h-1 w-3 rounded-full bg-brand/70" />
        <span className="nf-loader-bar nf-loader-bar-delay-2 h-1 w-2 rounded-full bg-brand/45" />
      </div>
      <style>{`
        @keyframes nf-loader-breathe {
          0%, 100% { opacity: 0.35; transform: scaleX(0.85); }
          50% { opacity: 1; transform: scaleX(1); }
        }
        .nf-loader-bar {
          transform-origin: left center;
          animation: nf-loader-breathe 1.6s ease-in-out infinite;
        }
        .nf-loader-bar-delay-1 { animation-delay: 0.18s; }
        .nf-loader-bar-delay-2 { animation-delay: 0.36s; }
        @media (prefers-reduced-motion: reduce) {
          .nf-loader-bar { animation: none; opacity: 0.85; transform: none; }
        }
      `}</style>
    </>
  );
}

/** Visible strip from the loader top to the bottom of the viewport. */
function measureLandingHeight(slot: HTMLElement): number {
  const top = slot.getBoundingClientRect().top;
  return Math.max(160, Math.floor(window.innerHeight - top));
}

/**
 * Fallback when the shell ambient field isn't mounted (mobile / bare routes).
 * Shows NoiseField locally — same language as the app canvas.
 */
function LocalAmbientField({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [landingH, setLandingH] = useState<number | undefined>(undefined);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme !== "light";

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const measure = () => {
      const h = measureLandingHeight(slot);
      setLandingH((prev) => (prev === h ? prev : h));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [label, children]);

  return (
    <div
      ref={slotRef}
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden",
        className,
      )}
      style={landingH != null ? { height: landingH } : { minHeight: "40vh" }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label ?? "Cargando"}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <NoiseField
          key={mounted ? resolvedTheme : "light"}
          className="absolute inset-0"
          color={isDark ? [255, 255, 255] : [52, 80, 122]}
          maxOpacity={isDark ? 0.5 : 0.7}
        />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-4 px-6">
        {label ? (
          <p className="text-center text-sm font-medium text-fg-subtle">{label}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/**
 * Page-canvas loader: keep the shell NoiseField running and paint the caption.
 */
function AmbientOnCanvas({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const ambient = useAmbientGrid();
  const [landingH, setLandingH] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!ambient?.meshReady) return;
    const slot = slotRef.current;
    if (!slot) return;

    const measure = () => {
      const h = measureLandingHeight(slot);
      setLandingH((prev) => (prev === h ? prev : h));
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [ambient?.meshReady, label, children]);

  if (!ambient?.meshReady) {
    return (
      <LocalAmbientField label={label} className={className}>
        {children}
      </LocalAmbientField>
    );
  }

  return (
    <div
      ref={slotRef}
      className={cn(
        "flex w-full flex-col items-center justify-center overflow-hidden",
        className,
      )}
      style={landingH != null ? { height: landingH } : { minHeight: "40vh" }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label ?? "Cargando"}
    >
      <div className="relative z-10 flex flex-col items-center gap-4 px-6">
        {label ? (
          <p className="text-center text-sm font-medium text-fg-subtle drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] dark:drop-shadow-none">
            {label}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function resolveVariant(
  variant: BrandLoaderVariant | undefined,
  size: BrandLoaderSize,
  center: boolean,
): BrandLoaderVariant {
  if (variant) return variant;
  if (size === "xs" || size === "sm") return "ring";
  if (center) return "ambient";
  return "inset";
}

/**
 * Canonical loading indicator.
 * Prefer `center` / ambient for module loads; inset for in-card states; ring for tiny UI.
 */
export default function BrandLoader({
  size = "md",
  className,
  center = false,
  paddingClass = "py-12",
  label,
  variant,
  children,
}: BrandLoaderProps) {
  const mode = resolveVariant(variant, size, center);

  if (mode === "ambient") {
    return (
      <AmbientOnCanvas label={label} className={className}>
        {children}
      </AmbientOnCanvas>
    );
  }

  if (mode === "ring") {
    const ring = <CssRing size={size} />;
    if (center) {
      return (
        <div className={cn("flex flex-col items-center justify-center", paddingClass, className)}>
          {ring}
          {label ? <p className="mt-4 text-sm font-medium text-fg-subtle">{label}</p> : null}
          {children}
        </div>
      );
    }
    return (
      <div className={cn(label || children ? "flex flex-col items-center" : undefined, className)}>
        {ring}
        {label ? <p className="mt-3 text-sm font-medium text-fg-subtle">{label}</p> : null}
        {children}
      </div>
    );
  }

  const inset = <BrandPulse />;
  if (center) {
    return (
      <div className={cn("flex flex-col items-center justify-center", paddingClass, className)}>
        {inset}
        {label ? <p className="mt-4 text-sm font-medium text-fg-subtle">{label}</p> : null}
        {children}
      </div>
    );
  }

  return (
    <div className={cn(label || children ? "flex flex-col items-center gap-3" : undefined, className)}>
      {inset}
      {label ? <p className="text-sm font-medium text-fg-subtle">{label}</p> : null}
      {children}
    </div>
  );
}
