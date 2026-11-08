import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ApiError } from '@/shared/api/client';
import { usePublicControllerCreateOrder } from '@/shared/api/generated/public/public';
import type {
  PublicCafeDto,
  PublicProductDto,
} from '@/shared/api/generated/model';
import { AmountList } from '@/shared/AmountList';
import { formatMoney } from '@/shared/lib/format';
import { amountsOf } from '@/shared/lib/order-charges';
import { formatWeight, WEIGHT_STEP } from '@/shared/lib/quantity';
import { cartItems } from './cart-lines';
import { useCafeCart, useCartStore } from './cart-store';
import { Stepper } from './Stepper';

function errorKey(error: unknown) {
  if (!(error instanceof ApiError)) return 'common.errors.network';
  if (/is not available/.test(error.message)) {
    return 'common.errors.unavailable';
  }
  return error.status === 409
    ? 'common.errors.conflict'
    : 'common.errors.generic';
}

export function CartSheet({
  slug,
  cafe,
  orderType,
  products,
  qrToken,
  tableReady,
  open,
  onClose,
  onUnavailable,
}: {
  slug: string;
  cafe: PublicCafeDto;
  /** `null`: the cafe takes no order from here. */
  orderType: 'DINE_IN' | 'TAKEAWAY' | null;
  products: PublicProductDto[];
  /** The verified table, if any. */
  qrToken: string | null;
  /** The table check has finished, so it is known what kind of order this is. */
  tableReady: boolean;
  open: boolean;
  onClose: () => void;
  /** The menu is out of date: a product ran out since it was loaded. */
  onUnavailable: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const cart = useCafeCart(slug);
  const { setQuantity, setNote, finish } = useCartStore.getState();
  const createOrder = usePublicControllerCreateOrder();

  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  // A product deleted from the menu meanwhile simply drops out of the cart.
  const lines = cartItems(cart.lines, products);
  const itemsTotal = lines.reduce((sum, line) => sum + line.total, 0);
  const guessed = lines.some(({ product }) => product.unit === 'KG');
  const hasSoldOut = lines.some(({ product }) => !product.isAvailable);
  const canOrder =
    orderType !== null &&
    lines.length > 0 &&
    !hasSoldOut &&
    tableReady &&
    !createOrder.isPending;

  const order = () => {
    if (!canOrder) return;
    const dineIn = orderType === 'DINE_IN' && qrToken !== null;
    const note = cart.note.trim();
    createOrder.mutate(
      {
        slug,
        data: {
          type: dineIn ? 'DINE_IN' : 'TAKEAWAY',
          ...(dineIn && { qrToken }),
          ...(note && { note }),
          items: lines.map(({ product, variantId, quantity }) => ({
            productId: product.id,
            ...(variantId && { variantId }),
            quantity,
          })),
        },
      },
      {
        onSuccess: ({ publicToken }) => {
          finish(slug, publicToken);
          onClose();
          const query = qrToken ? `?table=${qrToken}` : '';
          void navigate(`/${slug}/order/${publicToken}${query}`);
        },
        onError: onUnavailable,
      },
    );
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="cart-title"
      onClose={onClose}
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-t-3xl bg-card p-0 text-foreground sm:mx-auto sm:max-w-lg"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <h2 id="cart-title" className="text-lg font-bold">
            {t('cart.title')}
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
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {lines.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              {t('cart.empty')}
            </p>
          ) : (
            <ul>
              {lines.map(({ key, name, product, quantity, total }) => (
                <li
                  key={key}
                  className="flex items-center gap-3 border-b border-border py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{name}</p>
                    {product.isAvailable ? (
                      <p className="text-sm text-muted-foreground">
                        {product.unit === 'KG' && '≈ '}
                        {formatMoney(total)}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-destructive">
                        {t('cart.soldOut')}
                      </p>
                    )}
                  </div>
                  <Stepper
                    name={name}
                    quantity={quantity}
                    step={product.unit === 'KG' ? WEIGHT_STEP : 1}
                    label={
                      product.unit === 'KG' ? formatWeight(quantity) : undefined
                    }
                    onChange={(next) =>
                      setQuantity(slug, key, next, product.unit === 'KG')
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          {lines.length > 0 && (
            <label className="my-3 block">
              <span className="mb-1 block text-sm font-medium">
                {t('cart.note')}
              </span>
              <textarea
                rows={2}
                maxLength={1000}
                placeholder={t('cart.notePlaceholder')}
                value={cart.note}
                onChange={(event) => setNote(slug, event.target.value)}
                className="w-full resize-none rounded-xl border border-border bg-background p-3 text-base outline-none focus:border-primary"
              />
            </label>
          )}
        </div>
        {lines.length > 0 && (
          <footer className="space-y-2 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {createOrder.error ? (
              <p role="alert" className="text-sm text-destructive">
                {t(errorKey(createOrder.error))}
              </p>
            ) : null}
            <AmountList
              amounts={amountsOf(itemsTotal, orderType ?? 'TAKEAWAY', cafe)}
            />
            {guessed && (
              <p className="text-sm text-muted-foreground">
                {t('cart.weightNote')}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t(orderType ? 'cart.payHint' : 'menu.viewOnly')}
            </p>
            <button
              type="button"
              disabled={!canOrder}
              onClick={order}
              className="h-14 w-full rounded-2xl bg-primary text-lg font-semibold text-primary-foreground outline-none active:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {t(createOrder.isPending ? 'cart.ordering' : 'cart.order')}
            </button>
          </footer>
        )}
      </div>
    </dialog>
  );
}
