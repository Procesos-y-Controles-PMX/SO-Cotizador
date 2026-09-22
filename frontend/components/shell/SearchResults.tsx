"use client";

import { Building2, FileText, HardHat, Package, UserRound } from "lucide-react";
import { GROUP_LABEL_SINGULAR, type SearchGroup, type SearchHit, type SearchHitKind } from "@/lib/queries/globalSearch";
import { cn } from "@/lib/utils";

/** Cada tipo trae su color para que la retícula se lea de un vistazo. */
const TONO: Record<SearchHitKind, { icon: typeof FileText; from: string; to: string }> = {
  cotizacion: { icon: FileText, from: "var(--brand)", to: "var(--brand-active)" },
  cliente: { icon: UserRound, from: "var(--steel)", to: "#22324d" },
  obra: { icon: HardHat, from: "#b45309", to: "#7c2d12" },
  sku: { icon: Package, from: "#0f766e", to: "#134e4a" },
  sucursal: { icon: Building2, from: "#6d28d9", to: "#4c1d95" },
};

function Card({
  hit,
  active,
  mostrarTipo,
  onSelect,
}: {
  hit: SearchHit;
  active: boolean;
  mostrarTipo?: boolean;
  onSelect: () => void;
}) {
  const tono = TONO[hit.kind];
  const Icon = tono.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-lg p-4 text-left text-white",
        "transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none",
        active && "ring-2 ring-fg ring-offset-2 ring-offset-[var(--neu-bg)]",
      )}
      style={{ backgroundImage: `linear-gradient(145deg, ${tono.from}, ${tono.to})` }}
    >
      <div
        className="pointer-events-none absolute -bottom-8 -right-6 opacity-25 transition-transform duration-300 group-hover:scale-110"
        aria-hidden
      >
        <Icon className="h-24 w-24" strokeWidth={1.2} />
      </div>
      {mostrarTipo ? (
        <p className="relative mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">
          {GROUP_LABEL_SINGULAR[hit.kind]}
        </p>
      ) : null}
      <p className="relative line-clamp-2 font-display text-lg font-semibold leading-tight">{hit.titulo}</p>
      <p className="relative mt-1 line-clamp-2 text-xs text-white/80">{hit.subtitulo}</p>
      <p className="relative mt-auto pt-4 text-[11px] font-medium text-white/70">{hit.meta}</p>
    </button>
  );
}

export default function SearchResults({
  groups,
  loading,
  query,
  selectedKey,
  onSelect,
}: {
  groups: SearchGroup[];
  loading: boolean;
  query: string;
  selectedKey: string | null;
  onSelect: (hit: SearchHit) => void;
}) {
  if (loading) {
    return <p className="px-5 py-12 text-center text-sm text-fg-subtle">Buscando…</p>;
  }

  if (groups.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="font-display text-lg font-semibold text-fg">Sin resultados para “{query}”</p>
        <p className="mt-1 text-sm text-fg-subtle">Prueba con un folio, el nombre del cliente, la obra o un SKU.</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 px-5 pb-6">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-fg">{group.label}</h2>
            <span className="text-xs text-fg-faint">{group.hits.length}</span>
          </div>
          {group.relacionado ? (
            <p className="mb-3 text-xs text-fg-subtle">
              No coinciden con el texto, pero salen de lo que sí coincidió.
            </p>
          ) : (
            <div className="mb-3" />
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.hits.map((hit) => (
              <Card
                key={`${hit.kind}:${hit.id}`}
                hit={hit}
                active={selectedKey === `${hit.kind}:${hit.id}`}
                mostrarTipo={group.relacionado}
                onSelect={() => onSelect(hit)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
