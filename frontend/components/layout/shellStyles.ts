/** Shared Promexma shell styles — aligned with SO Equipo Móvil */

/** Layout only — add `flex` when the sidebar is visible (never with `hidden`). */
export const SIDEBAR_SHELL =
  "h-screen flex-col border-r border-white/10 bg-[#0d1117]";

export const SIDEBAR_NAV_ACTIVE =
  "overflow-hidden bg-gradient-to-br from-brand to-brand-active text-white shadow-[0_2px_8px_-3px_rgba(237,28,36,.7)]";

export const SIDEBAR_NAV_IDLE =
  "text-slate-400 transition-[transform,background-color,color] duration-200 hover:translate-x-0.5 hover:bg-white/10 hover:text-slate-100";

export const SIDEBAR_SECTION_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.15em] text-brand";

export const SIDEBAR_USER_CARD =
  "rounded-sm border border-white/10 bg-[#0d1117] p-3";
