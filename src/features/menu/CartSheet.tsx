import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ApiError } from '@/shared/api/client';
import {
  usePublicControllerCreateOrder,
  useTelegramOrdersControllerCreate,
} from '@/shared/api/generated/public/public';
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
import { normalizePhone, useContactStore } from './contact-store';
import {
  contactReady,
  remoteTypeOf,
  TelegramFields,
  type RemoteType,
} from './TelegramFields';
import { Stepper } from './Stepper';

function errorKey(error: unknown) {
  if (!(error instanceof ApiError)) return 'common.errors.network';
  if (error.status === 401) return 'telegram.reopen';
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
  telegram,
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
  /** Opened in Telegram: the order is a delivery or a takeaway, signed by the bot. */
  telegram: { initData: string } | null;
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
  const qrOrder = usePublicControllerCreateOrder();
  const telegramOrder = useTelegramOrdersControllerCreate();
  const createOrder = telegram ? telegramOrder : qrOrder;
  const remoteTypes = (['DELIVERY', 'TAKEAWAY'] as const).filter((type) =>
    cafe.orderTypes.includes(type),
  );
  const chosenType = useContactStore((state) => state.remoteType);
  const remoteType = remoteTypeOf(remoteTypes, chosenType);
  const setRemoteType = (next: RemoteType) =>
    useContactStore.getState().set({ remoteType: next });
  const [checked, setChecked] = useState(false);
  // In Telegram nobody sits at a table: it is taken away or delivered.
  const type = telegram
    ? remoteTypes.length > 0
      ? remoteType
      : null
    : orderType;

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
    type !== null &&
    lines.length > 0 &&
    !hasSoldOut &&
    (telegram !== null || tableReady) &&
    !createOrder.isPending;

  const items = lines.map(({ product, variantId, quantity }) => ({
    productId: product.id,
    ...(variantId && { variantId }),
    quantity,
  }));
  const done = ({ publicToken }: { publicToken: string }) => {
    finish(slug, publicToken);
    onClose();
    const query = qrToken
      ? `?table=${qrToken}`
      : telegram
        ? '?via=telegram'
        : '';
    void navigate(`/${slug}/order/${publicToken}${query}`);
  };

  const orderByTelegram = (session: { initData: string }, kind: RemoteType) => {
    setChecked(true);
    if (!contactReady(kind)) return;
    const contact = useContactStore.getState();
    const note = cart.note.trim();
    telegramOrder.mutate(
      {
        slug,
        data: {
          initData: session.initData,
          type: kind,
          customerPhone: normalizePhone(contact.phone),
          ...(contact.name.trim() && { customerName: contact.name.trim() }),
          ...(kind === 'DELIVERY' && {
            address: contact.address.trim(),
            ...(contact.location && { location: contact.location }),
          }),
          ...(note && { note }),
          items,
        },
      },
      { onSuccess: done, onError: onUnavailable },
    );
  };

  const order = () => {
    if (!canOrder) return;
    if (telegram) {
      orderByTelegram(telegram, remoteType);
      return;
    }
    const dineIn = orderType === 'DINE_IN' && qrToken !== null;
    const note = cart.note.trim();
    qrOrder.mutate(
      {
        slug,
        data: {
          type: dineIn ? 'DINE_IN' : 'TAKEAWAY',
          ...(dineIn && { qrToken }),
          ...(note && { note }),
          items,
        },
      },
      { onSuccess: done, onError: onUnavailable },
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
          {lines.length > 0 && telegram && remoteTypes.length > 0 && (
            <TelegramFields
              types={remoteTypes}
              type={remoteType}
              onType={setRemoteType}
              checked={checked}
            />
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
              amounts={amountsOf(itemsTotal, type ?? 'TAKEAWAY', cafe)}
            />
            {guessed && (
              <p className="text-sm text-muted-foreground">
                {t('cart.weightNote')}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t(
                telegram
                  ? type
                    ? 'telegram.payHint'
                    : 'telegram.notTaking'
                  : type
                    ? 'cart.payHint'
                    : 'menu.viewOnly',
              )}
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
