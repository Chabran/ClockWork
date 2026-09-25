import type { TemplateId } from '@/types/invoice';
import type { ColorScheme } from '@/components/invoices/colors';
import { TEMPLATE_LIST } from '@/components/invoices/templates';

/**
 * Small localStorage-backed store for "what a user picked last time" —
 * the last template used for export, and a saved color preset per template.
 * Both are best-effort niceties: a storage failure (private browsing,
 * disabled storage) just falls back to the built-in defaults, never blocks
 * anything.
 */
const LAST_TEMPLATE_KEY = 'clockwork:last-invoice-template';
const COLOR_PRESET_KEY_PREFIX = 'clockwork:template-colors:';

export function isTemplateId(value: string | null): value is TemplateId {
  return value !== null && TEMPLATE_LIST.some((template) => template.id === value);
}

export function loadLastTemplate(): TemplateId | null {
  try {
    const stored = window.localStorage.getItem(LAST_TEMPLATE_KEY);
    return isTemplateId(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function saveLastTemplate(templateId: TemplateId): void {
  try {
    window.localStorage.setItem(LAST_TEMPLATE_KEY, templateId);
  } catch {
    // Remembering the choice is a nicety, not a requirement.
  }
}

/** The user's saved color preset for a template, or null if none was ever saved. */
export function loadColorPreset(templateId: TemplateId): ColorScheme | null {
  try {
    const raw = window.localStorage.getItem(COLOR_PRESET_KEY_PREFIX + templateId);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ColorScheme;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveColorPreset(templateId: TemplateId, colors: ColorScheme): void {
  try {
    window.localStorage.setItem(COLOR_PRESET_KEY_PREFIX + templateId, JSON.stringify(colors));
  } catch {
    // Best-effort — a failed save just means the next export starts from
    // the template's built-in defaults again.
  }
}
