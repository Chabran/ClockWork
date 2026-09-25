import type { TemplateId } from '@/types/invoice';

/** A template's color palette, keyed by role name (e.g. "primary",
 *  "surface"). Every key a template uses to render is listed in that
 *  template's `ColorField[]` below, so the editor UI and the template's own
 *  defaults never fall out of sync. */
export type ColorScheme = Record<string, string>;

export interface ColorField {
  key: string;
  label: string;
}

export const EXECUTIVE_COLORS = {
  primary: '#1B365D',
  secondary: '#68727D',
  surface: '#FFFFFF',
  tableHeader: '#F1F5F9',
};
export const EXECUTIVE_COLOR_FIELDS: ColorField[] = [
  { key: 'primary', label: 'Primary (navy)' },
  { key: 'secondary', label: 'Secondary (slate)' },
  { key: 'surface', label: 'Surface' },
  { key: 'tableHeader', label: 'Table header' },
];

export const MINIMALIST_COLORS = {
  ink: '#222222',
  canvas: '#F9F9F9',
  muted: '#888888',
  border: '#E5E5E5',
  // The one spot of color in an otherwise monochrome layout — the total and
  // the invoice number, so it still reads as minimalist rather than colorful.
  accent: '#4F46E5',
};
export const MINIMALIST_COLOR_FIELDS: ColorField[] = [
  { key: 'ink', label: 'Ink' },
  { key: 'canvas', label: 'Canvas' },
  { key: 'muted', label: 'Muted text' },
  { key: 'border', label: 'Hairline border' },
  { key: 'accent', label: 'Accent' },
];

export const NEO_BRUTALIST_COLORS = {
  accent1: '#7C3AED',
  accent2: '#FACC15',
  ink: '#000000',
  surface: '#FFFFFF',
};
export const NEO_BRUTALIST_COLOR_FIELDS: ColorField[] = [
  { key: 'accent1', label: 'Accent 1 (purple)' },
  { key: 'accent2', label: 'Accent 2 (yellow)' },
  { key: 'ink', label: 'Ink' },
  { key: 'surface', label: 'Surface' },
];

export const SIDEBAR_SPLIT_COLORS = {
  sidebar: '#1E3F20',
  sidebarText: '#E8F5E9',
  canvas: '#FFFFFF',
  accent: '#2E5A31',
};
export const SIDEBAR_SPLIT_COLOR_FIELDS: ColorField[] = [
  { key: 'sidebar', label: 'Sidebar' },
  { key: 'sidebarText', label: 'Sidebar text' },
  { key: 'canvas', label: 'Main canvas' },
  { key: 'accent', label: 'Accent' },
];

export const WARM_EDITORIAL_COLORS = {
  primary: '#C86D51',
  canvas: '#FDFBF7',
  ink: '#3D312A',
  cardSurface: '#F5EFE6',
};
export const WARM_EDITORIAL_COLOR_FIELDS: ColorField[] = [
  { key: 'primary', label: 'Primary (terracotta)' },
  { key: 'canvas', label: 'Canvas' },
  { key: 'ink', label: 'Ink' },
  { key: 'cardSurface', label: 'Card surface' },
];

export const VIBRANT_POP_COLORS = {
  primary: '#FF6B6B',
  secondary: '#FFD93D',
  ink: '#1E293B',
  surface: '#FFFFFF',
};
export const VIBRANT_POP_COLOR_FIELDS: ColorField[] = [
  { key: 'primary', label: 'Primary (coral)' },
  { key: 'secondary', label: 'Secondary (yellow)' },
  { key: 'ink', label: 'Ink' },
  { key: 'surface', label: 'Surface' },
];

export const LUXE_GOLD_COLORS = {
  accent: '#C5A059',
  ink: '#2C221E',
  canvas: '#FAF8F5',
  border: '#E6DEC8',
};
export const LUXE_GOLD_COLOR_FIELDS: ColorField[] = [
  { key: 'accent', label: 'Gold accent' },
  { key: 'ink', label: 'Dark surface / ink' },
  { key: 'canvas', label: 'Light canvas' },
  { key: 'border', label: 'Subtle border' },
];

export const DEFAULT_TEMPLATE_COLORS: Record<TemplateId, ColorScheme> = {
  executive: EXECUTIVE_COLORS,
  minimalist: MINIMALIST_COLORS,
  'neo-brutalist': NEO_BRUTALIST_COLORS,
  'sidebar-split': SIDEBAR_SPLIT_COLORS,
  'warm-editorial': WARM_EDITORIAL_COLORS,
  'vibrant-pop': VIBRANT_POP_COLORS,
  'luxe-gold': LUXE_GOLD_COLORS,
};

export const TEMPLATE_COLOR_FIELDS: Record<TemplateId, ColorField[]> = {
  executive: EXECUTIVE_COLOR_FIELDS,
  minimalist: MINIMALIST_COLOR_FIELDS,
  'neo-brutalist': NEO_BRUTALIST_COLOR_FIELDS,
  'sidebar-split': SIDEBAR_SPLIT_COLOR_FIELDS,
  'warm-editorial': WARM_EDITORIAL_COLOR_FIELDS,
  'vibrant-pop': VIBRANT_POP_COLOR_FIELDS,
  'luxe-gold': LUXE_GOLD_COLOR_FIELDS,
};

/**
 * Picks black or white text for a solid block whose background color is now
 * user-editable. Without this, a header/total banner hardcoded to white text
 * goes unreadable the moment someone picks a light custom color — this keeps
 * every color choice safe automatically instead of trusting the user to
 * avoid light colors on the handful of blocks that used to assume "dark".
 *
 * Plain sRGB luminance, not perceptually-accurate WCAG contrast — overkill
 * for a two-way black/white choice on an invoice banner.
 */
export function pickReadableText(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return '#FFFFFF';
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#FFFFFF';
}
