import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  xs: "h-4 w-4",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
} as const;

export type BrandLoaderSize = keyof typeof SIZE_CLASS;

type BrandLoaderProps = {
  size?: BrandLoaderSize;
  className?: string;
  /** Center in a flex container with default vertical padding. */
  center?: boolean;
  paddingClass?: string;
  label?: string;
};

/** Red arc spinner — canonical loading indicator (Documentación unidades list). */
export default function BrandLoader({
  size = "md",
  className,
  center = false,
  paddingClass = "py-12",
  label,
}: BrandLoaderProps) {
  const spinner = (
    <div
      aria-label="Cargando"
      className={cn("animate-spin rounded-full border-b-2 border-brand", SIZE_CLASS[size])}
      role="status"
    />
  );

  if (center) {
    return (
      <div className={cn("flex flex-col items-center justify-center", paddingClass, className)}>
        {spinner}
        {label ? <p className="mt-4 text-sm font-medium text-slate-500">{label}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn(label ? "flex flex-col items-center" : undefined, className)}>
      {spinner}
      {label ? <p className="mt-3 text-sm font-medium text-slate-500">{label}</p> : null}
    </div>
  );
}
