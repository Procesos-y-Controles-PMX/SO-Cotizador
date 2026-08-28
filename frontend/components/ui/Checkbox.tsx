"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  title?: string;
};

export default function Checkbox({
  checked,
  disabled = false,
  onChange,
  label,
  className,
  title,
}: CheckboxProps) {
  const ariaLabel = label ?? title;

  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-fg-muted",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      title={title}
    >
      <span
        className={cn(
          "relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm transition-shadow",
          checked ? "bg-brand-tint neu-pressed-sm" : "neu-pressed-sm"
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <Check
          size={12}
          strokeWidth={3}
          className={cn("text-brand transition-opacity", checked ? "opacity-100" : "opacity-0")}
          aria-hidden
        />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
