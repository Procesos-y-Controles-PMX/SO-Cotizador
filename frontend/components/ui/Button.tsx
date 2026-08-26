import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "neu-button text-fg-strong",
  ghost: "bg-transparent text-fg-muted hover:text-fg",
  danger: "btn-danger",
};

const sizeStyles: Record<Size, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs rounded-sm md:min-h-0",
  md: "min-h-11 px-4 py-2.5 text-sm rounded-sm md:min-h-0 md:py-2",
  lg: "min-h-12 px-6 py-3 text-sm rounded-sm md:min-h-0",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-50
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
