"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { AnimatedFilterDropdown, AnimatedFilterDropdownItem } from "@/components/common/AnimatedFilterDropdown";
import AnimatedSearchInput from "@/components/common/AnimatedSearchInput";
import { FILTER_CONTROL_CLASS } from "@/lib/filterStyles";

export type FilterMultiSelectOption = {
  value: string;
  label: string;
};

type FilterMultiSelectProps = {
  /** `null` = all options selected. Empty array = none selected. */
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  options: FilterMultiSelectOption[];
  disabled?: boolean;
  allLabel?: string;
  inputClassName?: string;
  icon?: LucideIcon;
  searchable?: boolean | "auto";
};

function isAllSelected(value: string[] | null, optionValues: string[]): boolean {
  return value === null || (optionValues.length > 0 && value.length === optionValues.length);
}

function resolveSelectedSet(value: string[] | null, optionValues: string[]): Set<string> {
  if (value === null) return new Set(optionValues);
  return new Set(value);
}

const FilterMultiSelect = memo(function FilterMultiSelect({
  value,
  onChange,
  options,
  disabled = false,
  allLabel = "Todas",
  inputClassName,
  icon: Icon,
  searchable = "auto",
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const optionValues = useMemo(() => options.map((opt) => opt.value), [options]);
  const allSelected = isAllSelected(value, optionValues);
  const selectedSet = useMemo(() => resolveSelectedSet(value, optionValues), [value, optionValues]);

  const showSearch = searchable === true || (searchable === "auto" && options.length > 6);

  const triggerLabel = useMemo(() => {
    if (options.length === 0) return allLabel;
    if (allSelected) return allLabel;
    if (!value || value.length === 0) return "Ninguna";
    if (value.length === 1) {
      return options.find((opt) => opt.value === value[0])?.label ?? `${value.length} seleccionada`;
    }
    return `${value.length} seleccionadas`;
  }, [allLabel, allSelected, options, value]);

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

  const handleSelectAll = () => {
    onChange(null);
  };

  const handleToggle = (optionValue: string) => {
    const next = new Set(selectedSet);
    if (next.has(optionValue)) {
      next.delete(optionValue);
    } else {
      next.add(optionValue);
    }

    if (next.size === 0) {
      onChange([]);
      return;
    }
    if (next.size === optionValues.length) {
      onChange(null);
      return;
    }
    onChange([...next]);
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
        <span className="truncate">{triggerLabel}</span>
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
          <AnimatedFilterDropdownItem>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleSelectAll}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${allSelected ? "bg-red-50 font-medium text-brand" : "text-slate-700"}`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${allSelected ? "border-brand bg-brand text-white" : "border-slate-300"}`}
              >
                {allSelected && <Check size={10} />}
              </span>
              <span className="truncate">{allLabel}</span>
            </button>
          </AnimatedFilterDropdownItem>

          {filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-600">Sin coincidencias</p>
          ) : (
            filteredOptions.map((option) => {
              const selected = selectedSet.has(option.value);
              return (
                <AnimatedFilterDropdownItem key={option.value}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleToggle(option.value)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${selected ? "bg-red-50 font-medium text-brand" : "text-slate-700"}`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${selected ? "border-brand bg-brand text-white" : "border-slate-300"}`}
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

export default FilterMultiSelect;

/** Returns true when the row value passes a multi-select filter. */
export function matchesMultiFilter(
  rowValue: string,
  selected: string[] | null,
  allValues: string[],
): boolean {
  if (allValues.length === 0) return true;
  if (selected === null || selected.length === allValues.length) return true;
  if (selected.length === 0) return false;
  return selected.includes(rowValue);
}
