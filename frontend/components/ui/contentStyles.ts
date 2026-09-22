/** Re-export clay surfaces from SO-UI so call sites stay stable. */

export {
  PANEL_CARD,
  PANEL_INSET,
  FIELD_INPUT,
  FIELD_SELECT,
  FIELD_SELECT_TRIGGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  FIELD_LABEL,
  BTN_GHOST,
  TABLE_WRAP,
  TABLE_HEAD_CELL,
  TABLE_BODY_ROW,
  EMPTY_STATE,
  MOBILE_LIST_CARD,
  STAT_TILE,
  STAT_TILE_ACTIVE,
  PAGE_EYEBROW,
  ALERT_WARNING,
  ALERT_INFO,
  ALERT_SUCCESS,
  ALERT_ERROR,
  CHEVRON_SELECT,
} from "@promexma/ui";

/** Icon-only danger — skip BTN_DANGER padding or the glyph gets squeezed. */
export const BTN_ICON_DANGER =
  "btn-danger inline-flex h-9 w-9 min-h-0 shrink-0 items-center justify-center gap-0 rounded-sm p-0 disabled:cursor-not-allowed disabled:opacity-50";
