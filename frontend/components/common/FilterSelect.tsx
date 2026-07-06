"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { AnimatedFilterDropdown, AnimatedFilterDropdownItem } from "@/components/common/AnimatedFilterDropdown";
import AnimatedSearchInput from "@/components/common/AnimatedSearchInput";
import { FILTER_CONTROL_CLASS } from "@/lib/filterStyles";

export type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  inputClassName?: string;
  icon?: LucideIcon;
  /** Enable search in dropdown. `"auto"` enables when options.length > 6. */
  searchable?: boolean | "auto";
};

const FilterSelect = memo(function FilterSelect({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Seleccionar...",
  inputClassName,
  icon: Icon,
  searchable = "auto",
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const showSearch = searchable === true || (searchable === "auto" && options.length > 6);

  const selectedLabel = useMemo(
    () => options.find((opt) => opt.value === value)?.label ?? placeholder,
    [options, value, placeholder],
  );

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter(
      (opt) => opt.label.toLowerCase().includes(normalized) || opt.value.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    setQuery("");
  };

  const controlClass = inputClassName ?? FILTER_CONTROL_CLASS;

  return (
    <div ref={containerRef} className="relative w-full min-w-[140px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`${controlClass} flex items-center text-left ${Icon ? "pl-9 pr-9" : "pl-3 pr-9"} ${disabled ? "" : "cursor-pointer"}`}
      >
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        )}
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          size={16}
        />
      </button>

      <AnimatedFilterDropdown open={open && !disabled} className="overflow-hidden" maxHeightClass="max-h-none">
        {showSearch && (
          <div className="border-b border-slate-100 p-2">
            <AnimatedSearchInput
              value={query}
              onChange={setQuery}
              placeholder="Buscar..."
              autoFocus
              className="h-8 w-full rounded-sm border border-slate-200 bg-white px-2 pr-9 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400"
            />
          </div>
        )}
        <div className="max-h-52 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-600">Sin coincidencias</p>
          ) : (
            filteredOptions.map((option) => {
              const selected = option.value === value;
              return (
                <AnimatedFilterDropdownItem key={option.value}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${selected ? "bg-red-50 font-medium text-brand" : "text-slate-700"}`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-brand bg-brand text-white" : "border-slate-300"}`}
                    >
                      {selected && <Check size={10} />}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                </AnimatedFilterDropdownItem>
              );
            })
          )}
        </div>
      </AnimatedFilterDropdown>
    </div>
  );
});

export default FilterSelect;
