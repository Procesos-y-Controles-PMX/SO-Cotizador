"use client";

import { InteractiveGridPattern } from "@promexma/ui";
import { cn } from "@/lib/utils";

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

type BrandLoaderProps = {
  size?: BrandLoaderSize;
  className?: string;
  /** Center in a flex container with default vertical padding. */
  center?: boolean;
  paddingClass?: string;
  label?: string;
};

function CssRing({ size }: { size: BrandLoaderSize }) {
  return (
    <div
      aria-label="Cargando"
      className={cn("animate-spin rounded-full border-b-2 border-brand", RING_SIZE[size])}
      role="status"
    />
  );
}

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

/** Canonical loading indicator — grid trail for md+, CSS ring for tiny UI. */
export default function BrandLoader({
  size = "md",
  className,
  center = false,
  paddingClass = "py-12",
  label,
}: BrandLoaderProps) {
  const useRing = size === "xs" || size === "sm";
  const gridSize = useRing ? "md" : size;
  const indicator = useRing ? <CssRing size={size} /> : <InsetOrbit size={gridSize} />;

  if (center) {
    return (
      <div className={cn("flex flex-col items-center justify-center", paddingClass, className)}>
        {indicator}
        {label ? <p className="mt-4 text-sm font-medium text-fg-subtle">{label}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn(label ? "flex flex-col items-center" : undefined, className)}>
      {indicator}
      {label ? <p className="mt-3 text-sm font-medium text-fg-subtle">{label}</p> : null}
    </div>
  );
}
