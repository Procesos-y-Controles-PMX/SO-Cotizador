"use client";

import { cn } from "@/lib/utils";

/**
 * Tirador entre columnas. Ocupa el hueco del `gap-2` del layout, así que no
 * roba ancho: la zona de click es más generosa que la línea que se ve.
 */
export default function ResizeHandle({
  ancho,
  min,
  max,
  arrastrando,
  etiqueta,
  ...props
}: {
  ancho: number;
  min: number;
  max: number;
  arrastrando: boolean;
  etiqueta: string;
} & React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={etiqueta}
      aria-valuenow={Math.round(ancho)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className={cn(
        "group relative hidden w-2 shrink-0 cursor-col-resize touch-none lg:block",
        "-mx-1 focus-visible:outline-none",
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-4 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors duration-150",
          "motion-reduce:transition-none",
          arrastrando
            ? "bg-brand"
            : "bg-transparent group-hover:bg-line group-focus-visible:bg-brand",
        )}
      />
    </div>
  );
}
