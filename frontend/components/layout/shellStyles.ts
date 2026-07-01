/** Shared Promexma shell styles — aligned with SO Equipo Móvil */

/** Layout only — add `flex` when the sidebar is visible (never with `hidden`). */
export const SIDEBAR_SHELL =
  "h-screen flex-col border-r border-white/10 bg-gradient-to-b from-[#0e1626] to-[#070b14]";

export const SIDEBAR_NAV_ACTIVE =
  "overflow-hidden bg-gradient-to-br from-brand to-brand-active text-white shadow-[0_2px_8px_-3px_rgba(237,28,36,.7)]";

export const SIDEBAR_NAV_IDLE =
  "text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-slate-100";

export const SIDEBAR_SECTION_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.15em] text-brand";

export const SIDEBAR_USER_CARD =
  "rounded-sm border border-white/10 bg-gradient-to-br from-[#131c2e] to-[#0c1322] p-3";
