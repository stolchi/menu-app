import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MAX_GRAMS } from '@/shared/lib/quantity';

export const MAX_QUANTITY = 999;

export interface CafeCart {
  /**
   * Quantities by product, or by product and size (`lineKey`): pieces, or grams for
   * a weighed product. Names and prices are read from the live menu.
   */
  lines: Record<string, number>;
  note: string;
  /** Lets the customer get back to their order after leaving the page. */
  lastOrderToken: string | null;
}

const EMPTY: CafeCart = { lines: {}, note: '', lastOrderToken: null };

interface CartState {
  /** By cafe slug: one phone can scan the codes of several cafes. */
  carts: Record<string, CafeCart>;
  setQuantity: (
    slug: string,
    key: string,
    quantity: number,
    /** Grams for a weighed product. */
    weighed?: boolean,
  ) => void;
  setNote: (slug: string, note: string) => void;
  /** The order went through: the cart starts over, and the order is remembered. */
  finish: (slug: string, orderToken: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => {
      const patch = (
        slug: string,
        change: (cart: CafeCart) => Partial<CafeCart>,
      ) =>
        set(({ carts }) => {
          const cart = carts[slug] ?? EMPTY;
          return { carts: { ...carts, [slug]: { ...cart, ...change(cart) } } };
        });

      return {
        carts: {},
        setQuantity: (slug, key, quantity, weighed = false) =>
          patch(slug, ({ lines }) => ({
            lines:
              quantity < 1
                ? Object.fromEntries(
                    Object.entries(lines).filter(([id]) => id !== key),
                  )
                : {
                    ...lines,
                    [key]: Math.min(
                      quantity,
                      weighed ? MAX_GRAMS : MAX_QUANTITY,
                    ),
                  },
          })),
        setNote: (slug, note) => patch(slug, () => ({ note })),
        finish: (slug, orderToken) =>
          patch(slug, () => ({ ...EMPTY, lastOrderToken: orderToken })),
      };
    },
    { name: 'stolchi-cart', version: 1 },
  ),
);

export const useCafeCart = (slug: string) =>
  useCartStore((state) => state.carts[slug] ?? EMPTY);
