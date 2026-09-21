"use client";

import { useEffect, useRef } from "react";
import { Clock, Home, Search, X } from "lucide-react";
import type { SearchHitKind } from "@/lib/queries/globalSearch";
import { GROUP_LABEL_SINGULAR } from "@/lib/queries/globalSearch";
import { cn } from "@/lib/utils";

export type RecentEntry = {
  kind: SearchHitKind;
  id: string;
  titulo: string;
  subtitulo: string;
};

/**
 * Búsqueda global del shell: vive en el layout, así que está disponible en
 * todas las rutas. Al enfocar sin texto muestra lo último abierto, que es el
 * equivalente útil de "Recent searches".
 */
export default function GlobalSearchBar({
  value,
  onValue,
  open,
  onOpen,
  recientes,
  onPickReciente,
  onHome,
  iniciales,
}: {
  value: string;
  onValue: (next: string) => void;
  open: boolean;
  onOpen: (next: boolean) => void;
  recientes: RecentEntry[];
  onPickReciente: (entry: RecentEntry) => void;
  onHome: () => void;
  iniciales: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDocDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) onOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [onOpen]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        onOpen(true);
      }
      if (event.key === "Escape") onOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onOpen]);

  const mostrarRecientes = open && !value.trim() && recientes.length > 0;

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 px-1">
      <button
        type="button"
        onClick={onHome}
        aria-label="Inicio"
        className={cn(
          "neu-dark-canvas neu-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          "text-fg-subtle hover:text-fg",
        )}
      >
        <Home className="h-[18px] w-[18px]" />
      </button>

      <div ref={wrapRef} className="relative mx-auto w-full max-w-xl">
        <div className="neu-field flex min-h-11 items-center gap-2.5 rounded-full px-4">
          <Search className="h-4 w-4 shrink-0 text-fg-faint" />
          <input
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-faint"
            placeholder="Busca un folio, cliente, obra o SKU"
            value={value}
            onFocus={() => onOpen(true)}
            onChange={(event) => {
              onValue(event.target.value);
              onOpen(true);
            }}
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                onValue("");
                inputRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
              className="shrink-0 text-fg-faint hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden shrink-0 rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg-faint sm:block">
              ⌘K
            </kbd>
          )}
        </div>

        {mostrarRecientes ? (
          <div className="neu-popover absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-lg p-2">
            <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-fg-faint">
              Abiertos recientemente
            </p>
            <ul>
              {recientes.map((entry) => (
                <li key={`${entry.kind}:${entry.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onPickReciente(entry);
                      onOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-muted",
                    )}
                  >
                    <span className="neu-tray flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-fg-subtle">
                      <Clock className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{entry.titulo}</span>
                      <span className="block truncate text-xs text-fg-subtle">
                        {GROUP_LABEL_SINGULAR[entry.kind]} · {entry.subtitulo}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
        {iniciales}
      </div>
    </div>
  );
}
