import type { ProductUnit } from '@/shared/api/generated/model';

/** The most a weighed line can be, in grams. Mirrors the API. */
export const MAX_GRAMS = 100_000;
/** A customer picks a weight in half kilograms; staff weigh the real one. */
export const WEIGHT_STEP = 500;
export const FIRST_WEIGHT = 1000;

/** Whole so'm: a weighed line is priced per kilogram. Mirrors the API. */
export const lineTotal = (
  price: number,
  quantity: number,
  unit: ProductUnit,
) => (unit === 'KG' ? Math.round((price * quantity) / 1000) : price * quantity);

/** `1500` → `1,5 kg`, `350` → `350 g`. */
export function formatWeight(grams: number): string {
  if (grams < 1000) return `${grams} g`;
  const kilos = (grams / 1000).toFixed(3).replace(/\.?0+$/, '');
  return `${kilos.replace('.', ',')} kg`;
}

/** What goes before a line's name: `2 ×` or `1,5 kg`. */
export const quantityLabel = (unit: ProductUnit, quantity: number) =>
  unit === 'KG' ? formatWeight(quantity) : `${quantity} ×`;
