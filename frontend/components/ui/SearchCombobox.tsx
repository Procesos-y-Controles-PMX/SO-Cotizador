"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from "@/lib/search";
import { cn } from "@/lib/utils";
import { AnimatedFilterDropdown } from "@/components/common/AnimatedFilterDropdown";

export type SearchComboboxOption = {
  id: string;
  label: string;
  sublabel?: string;
};

type Props = {
  value: SearchComboboxOption | null;
  onChange: (value: SearchComboboxOption | null) => void;
  onSearch: (query: string) => Promise<SearchComboboxOption[]>;
  placeholder?: string;
  disabled?: boolean;
  minChars?: number;
  className?: string;
  inputClassName?: string;
};

export default function SearchCombobox({
  value,
  onChange,
  onSearch,
  placeholder = "Buscar...",
  disabled = false,
  minChars = SEARCH_MIN_CHARS,
  className,
  inputClassName,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(value?.label ?? "");
  const [options, setOptions] = useState<SearchComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  useEffect(() => {
    setInputText(value?.label ?? "");
  }, [value?.id, value?.label]);

  const canSearch = useCallback(
    (query: string) => minChars === 0 || query.trim().length >= minChars,
    [minChars]
  );

  const runSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!canSearch(query)) {
        setOptions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const results = await onSearch(trimmed);
        setOptions(results);
        setHighlightIndex(results.length ? 0 : -1);
      } finally {
        setLoading(false);
      }
    },
    [canSearch, onSearch]
  );

  useEffect(() => {
    if (!open) return;
    if (!canSearch(inputText)) {
      setOptions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void runSearch(inputText);
    }, minChars === 0 && !inputText.trim() ? 0 : SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [inputText, open, minChars, canSearch, runSearch]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function selectOption(option: SearchComboboxOption) {
    setInputText(option.label);
    onChange(option);
    setOpen(false);
    setOptions([]);
  }

  function handleInputChange(next: string) {
    setInputText(next);
    if (value && next !== value.label) {
      onChange(null);
    }
    setOpen(true);
  }

  const trimmed = inputText.trim();
  const showMinHint = open && minChars > 0 && trimmed.length > 0 && trimmed.length < minChars;
  const showEmpty = open && !loading && canSearch(inputText) && options.length === 0;
  const showList = open && options.length > 0;

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        value={inputText}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border border-line-strong px-2 py-1 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-muted",
          inputClassName
        )}
        onFocus={() => setOpen(true)}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && highlightIndex >= 0) {
            e.preventDefault();
            const opt = options[highlightIndex];
            if (opt) selectOption(opt);
          }
        }}
      />
      <AnimatedFilterDropdown open={open && (showMinHint || showEmpty || showList || loading)}>
        <ul id={listId} role="listbox" className="py-1 text-sm">
          {loading && <li className="px-3 py-2 text-fg-subtle">Buscando...</li>}
          {showMinHint && !loading && (
            <li className="px-3 py-2 text-fg-subtle">Escribe al menos {minChars} caracteres</li>
          )}
          {showEmpty && !loading && <li className="px-3 py-2 text-fg-subtle">Sin resultados</li>}
          {showList &&
            options.map((opt, index) => (
              <li key={opt.id} role="option" aria-selected={index === highlightIndex}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-muted",
                    index === highlightIndex && "bg-red-50"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(opt)}
                >
                  <span className="block font-medium text-fg">{opt.label}</span>
                  {opt.sublabel ? (
                    <span className="block truncate text-xs text-fg-subtle">{opt.sublabel}</span>
                  ) : null}
                </button>
              </li>
            ))}
        </ul>
      </AnimatedFilterDropdown>
    </div>
  );
}