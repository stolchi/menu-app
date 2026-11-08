import type { PublicProductDto } from '@/shared/api/generated/model';
import { lineTotal } from '@/shared/lib/quantity';

/** A cart key: the product, and its size when it has sizes. */
export const lineKey = (productId: string, variantId?: string) =>
  variantId ? `${productId}:${variantId}` : productId;

export interface CartItem {
  key: string;
  product: PublicProductDto;
  variantId?: string;
  name: string;
  price: number;
  /** Pieces, or grams for a weighed product. */
  quantity: number;
  total: number;
}

/**
 * The cart as the live menu prices it, in menu order. A product or size removed
 * from the menu meanwhile simply drops out.
 */
export function cartItems(
  lines: Record<string, number>,
  products: readonly PublicProductDto[],
): CartItem[] {
  return products.flatMap((product) => {
    const sizes =
      product.variants.length > 0
        ? product.variants.map((variant) => ({
            key: lineKey(product.id, variant.id),
            variantId: variant.id,
            name: `${product.name} (${variant.name})`,
            price: variant.price,
          }))
        : [{ key: product.id, name: product.name, price: product.price }];
    return sizes.flatMap(({ key, name, price, ...size }) => {
      const quantity = lines[key];
      if (!quantity) return [];
      return [
        {
          key,
          product,
          ...size,
          name,
          price,
          quantity,
          total: lineTotal(price, quantity, product.unit),
        },
      ];
    });
  });
}

/** Pieces count one by one; a weighed product counts once. */
export const countOf = (items: readonly CartItem[]) =>
  items.reduce(
    (sum, item) => sum + (item.product.unit === 'KG' ? 1 : item.quantity),
    0,
  );
