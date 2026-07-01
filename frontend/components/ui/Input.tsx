import { InputHTMLAttributes } from "react";
import { FIELD_INPUT, FIELD_LABEL } from "@/components/ui/contentStyles";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = "", id, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={id} className={FIELD_LABEL}>
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className={`${FIELD_INPUT} ${error ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""} ${className}`}
        {...props}
      />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
