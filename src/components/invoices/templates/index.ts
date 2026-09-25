import type { ComponentType } from 'react';
import type { InvoiceData, TemplateId } from '@/types/invoice';
import { ExecutiveTemplate } from './ExecutiveTemplate';
import { MinimalistTemplate } from './MinimalistTemplate';
import { NeoBrutalistTemplate } from './NeoBrutalistTemplate';
import { SidebarSplitTemplate } from './SidebarSplitTemplate';
import { WarmEditorialTemplate } from './WarmEditorialTemplate';
import { TechDarkTemplate } from './TechDarkTemplate';
import { CorporateSlateTemplate } from './CorporateSlateTemplate';
import { VibrantPopTemplate } from './VibrantPopTemplate';
import { MonochromaticGridTemplate } from './MonochromaticGridTemplate';
import { LuxeGoldTemplate } from './LuxeGoldTemplate';

type InvoiceTemplateComponent = ComponentType<{ data: InvoiceData }>;

/** Single source of truth mapping a template's id to its component. Adding an
 *  11th template is one line here plus the file itself — nothing else (the
 *  renderer, the switcher, the type) needs to change. */
export const TEMPLATE_REGISTRY: Record<TemplateId, InvoiceTemplateComponent> = {
  executive: ExecutiveTemplate,
  minimalist: MinimalistTemplate,
  'neo-brutalist': NeoBrutalistTemplate,
  'sidebar-split': SidebarSplitTemplate,
  'warm-editorial': WarmEditorialTemplate,
  'tech-dark': TechDarkTemplate,
  'corporate-slate': CorporateSlateTemplate,
  'vibrant-pop': VibrantPopTemplate,
  'monochromatic-grid': MonochromaticGridTemplate,
  'luxe-gold': LuxeGoldTemplate,
};

export const TEMPLATE_LIST: { id: TemplateId; label: string }[] = [
  { id: 'executive', label: 'Executive' },
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'neo-brutalist', label: 'Neo-Brutalist' },
  { id: 'sidebar-split', label: 'Sidebar Split' },
  { id: 'warm-editorial', label: 'Warm Editorial' },
  { id: 'tech-dark', label: 'Tech Dark' },
  { id: 'corporate-slate', label: 'Corporate Slate' },
  { id: 'vibrant-pop', label: 'Vibrant Pop' },
  { id: 'monochromatic-grid', label: 'Monochromatic Grid' },
  { id: 'luxe-gold', label: 'Luxe Gold' },
];
