/** Promexma content surface styles — aligned with SO Equipo Móvil (sharp panels) */

export const PANEL_SHADOW = "shadow-[0_1px_3px_rgba(0,0,0,0.05)]";

export const PANEL_CARD =
  `rounded-sm border border-slate-200 bg-white ${PANEL_SHADOW}`;

export const PANEL_INSET =
  "rounded-sm border border-slate-200 bg-slate-50";

export const FIELD_INPUT =
  "w-full min-h-12 rounded-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/15 md:min-h-0 md:py-2.5 md:text-sm";

export const FIELD_SELECT =
  "w-full min-h-12 appearance-none rounded-sm border border-slate-200 bg-slate-50 bg-[length:12px] bg-[position:right_12px_center] bg-no-repeat px-4 py-2.5 pr-10 text-base text-slate-900 transition-all duration-200 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/15 md:min-h-0 md:text-sm";

export const BTN_PRIMARY =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-colors hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto md:min-h-0";

export const BTN_DANGER =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0";

export const BTN_SECONDARY =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto md:min-h-0";

export const FIELD_LABEL =
  "block text-xs font-semibold uppercase tracking-wider text-slate-500";

export const BTN_GHOST =
  "inline-flex min-h-10 items-center justify-center rounded-sm px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

export const TABLE_WRAP =
  `overflow-x-auto overscroll-x-contain rounded-sm border border-slate-200 bg-white ${PANEL_SHADOW} [-webkit-overflow-scrolling:touch]`;

export const TABLE_HEAD_CELL =
  "whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500";

export const TABLE_BODY_ROW =
  "border-t border-slate-100 transition-colors hover:bg-slate-50";

export const EMPTY_STATE =
  `rounded-sm border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 ${PANEL_SHADOW}`;

export const MOBILE_LIST_CARD =
  `rounded-sm border border-slate-200 bg-white p-4 ${PANEL_SHADOW}`;

export const STAT_TILE =
  "rounded-sm border border-slate-200 bg-white p-4 text-center transition-all hover:border-slate-300";

export const STAT_TILE_ACTIVE =
  "rounded-sm border border-slate-300 bg-slate-50 p-4 text-center shadow-sm";

export const PAGE_EYEBROW =
  "text-[10px] font-bold uppercase tracking-[0.2em] text-brand";

export const ALERT_WARNING =
  "rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800";

export const ALERT_INFO =
  "rounded-sm border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700";

export const ALERT_SUCCESS =
  "rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700";

export const ALERT_ERROR =
  "rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600";

export const CHEVRON_SELECT =
  "bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22%2364748b%22%20stroke-width%3d%222%22%3e%3cpolyline%20points%3d%226%209%2012%2015%2018%209%22%3e%3c%2fpolyline%3e%3c%2fsvg%3e')]";
