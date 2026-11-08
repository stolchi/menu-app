import { Plus, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicProductDto } from '@/shared/api/generated/model';
import { formatMoney } from '@/shared/lib/format';
import { lineKey } from './cart-lines';
import { useCafeCart, useCartStore } from './cart-store';
import { Stepper } from './Stepper';

/** The sizes of one product, each counted on its own. */
export function SizeSheet({
  slug,
  product,
  onClose,
}: {
  slug: string;
  product: PublicProductDto | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const cart = useCafeCart(slug);
  const setQuantity = useCartStore((state) => state.setQuantity);

  useEffect(() => {
    const element = dialog.current;
    if (product && !element?.open) element?.showModal();
    if (!product && element?.open) element.close();
  }, [product]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="size-title"
      onClose={onClose}
      className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-card p-0 text-foreground sm:mx-auto sm:max-w-lg"
    >
      {product && (
        <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <header className="flex items-center justify-between border-b border-border px-4 py-2">
            <h2 id="size-title" className="text-lg font-bold">
              {product.name}
            </h2>
            <button
              type="button"
              aria-label={t('cart.close')}
              className="flex size-11 items-center justify-center rounded-full outline-none active:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
              onClick={onClose}
            >
              <X className="size-5" />
            </button>
          </header>
          <ul className="px-4">
            {product.variants.map((variant) => {
              const key = lineKey(product.id, variant.id);
              const quantity = cart.lines[key] ?? 0;
              const name = `${product.name} (${variant.name})`;
              return (
                <li
                  key={variant.id}
                  className="flex min-h-16 items-center gap-3 border-b border-border py-2 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{variant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(variant.price)}
                    </p>
                  </div>
                  {quantity > 0 ? (
                    <Stepper
                      name={name}
                      quantity={quantity}
                      onChange={(next) => setQuantity(slug, key, next)}
                    />
                  ) : (
                    <button
                      type="button"
                      aria-label={t('menu.add', { name })}
                      className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none active:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      onClick={() => setQuantity(slug, key, 1)}
                    >
                      <Plus className="size-5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="px-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-12 w-full rounded-2xl bg-muted font-semibold outline-none active:opacity-80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('menu.done')}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
