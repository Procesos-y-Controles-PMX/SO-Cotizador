"use client";

import { InteractiveGridPattern } from "@promexma/ui";
import { cn } from "@/lib/utils";
import {
  useAmbientGrid,
  useAmbientGridSpinner,
  type SpinnerOrigin,
} from "@/contexts/AmbientGridContext";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const RING_SIZE = {
  xs: "h-4 w-4",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
} as const;

const INSET_BOX = {
  md: "h-28 w-28",
  lg: "h-36 w-36",
  xl: "h-44 w-44",
} as const;

const INSET_RADIUS = {
  md: 2.2,
  lg: 2.8,
  xl: 3.2,
} as const;

export type BrandLoaderSize = keyof typeof RING_SIZE;

/**
 * - ambient: drives the page canvas mesh spinner (label only when mesh is ready)
 * - inset: compact mesh badge inside a card/panel
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

/** Compact mesh orbit for in-card empty / nested states. */
function InsetOrbit({ size }: { size: "md" | "lg" | "xl" }) {
  return (
    <div
      className={cn("relative overflow-hidden", INSET_BOX[size])}
      role="status"
      aria-label="Cargando"
    >
      <InteractiveGridPattern
        cellSize={18}
        skewY={6}
        spinner
        spinnerMs={1300}
        spinnerRadius={INSET_RADIUS[size]}
        trailMs={650}
        spinnerOrigin={[0.5, 0.5]}
        className="absolute inset-0"
        squaresClassName="stroke-slate-300/70"
      />
    </div>
  );
}

function clamp01(n: number, lo = 0.08, hi = 0.92) {
  return Math.min(hi, Math.max(lo, n));
}

function quantize(n: number, step = 0.02) {
  return Math.round(n / step) * step;
}

/** Visible strip from the loader top to the bottom of the viewport. */
function measureLandingHeight(slot: HTMLElement): number {
  const top = slot.getBoundingClientRect().top;
  return Math.max(160, Math.floor(window.innerHeight - top));
}

function originsClose(a: SpinnerOrigin, b: SpinnerOrigin, eps = 0.02) {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
}

/**
 * Fallback when the shell ambient mesh isn't mounted (mobile / bare routes).
 */
function LocalAmbientMesh({
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
      <InteractiveGridPattern
        cellSize={40}
        skewY={6}
        spinner
        spinnerMs={1400}
        spinnerRadius={3.5}
        trailMs={700}
        spinnerOrigin={[0.5, 0.5]}
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_85%_75%_at_50%_50%,white,transparent)]"
        squaresClassName="stroke-slate-300/80"
      />
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
 * Page-canvas loader: drives the shell mesh spinner and paints the caption.
 * Slot height = remaining visible landing under chrome.
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
  const [origin, setOrigin] = useState<SpinnerOrigin | undefined>(undefined);
  const [landingH, setLandingH] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!ambient?.meshReady) return;
    const slot = slotRef.current;
    if (!slot) return;

    const measure = () => {
      const h = measureLandingHeight(slot);
      setLandingH((prev) => (prev === h ? prev : h));

      const clip = document.querySelector("[data-ambient-grid-clip]");
      const c = clip?.getBoundingClientRect();
      if (!c || c.width < 8 || c.height < 8) return;

      const top = slot.getBoundingClientRect().top;
      const midY = top + h / 2;
      const cluster = slot.firstElementChild?.getBoundingClientRect();
      const midX = cluster
        ? cluster.left + cluster.width / 2
        : c.left + c.width / 2;

      const next: SpinnerOrigin = [
        quantize(clamp01((midX - c.left) / c.width)),
        quantize(clamp01((midY - c.top) / c.height)),
      ];
      setOrigin((prev) => (prev && originsClose(prev, next) ? prev : next));
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [ambient?.meshReady, label, children]);

  useAmbientGridSpinner(Boolean(ambient?.meshReady), origin);

  if (!ambient?.meshReady) {
    return (
      <LocalAmbientMesh label={label} className={className}>
        {children}
      </LocalAmbientMesh>
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
  const gridSize = size === "xs" || size === "sm" ? "md" : size;

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

  const inset = <InsetOrbit size={gridSize} />;
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
    <div className={cn(label || children ? "flex flex-col items-center" : undefined, className)}>
      {inset}
      {label ? <p className="mt-3 text-sm font-medium text-fg-subtle">{label}</p> : null}
      {children}
    </div>
  );
}
