import { ChevronRight, Receipt, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import { ApiError } from '@/shared/api/client';
import {
  usePublicControllerMenu,
  usePublicControllerOrderStatus,
  usePublicControllerTable,
} from '@/shared/api/generated/public/public';
import { assetUrl } from '@/shared/lib/assets';
import { useCafeTheme } from '@/shared/lib/cafe-theme';
import { formatMoney } from '@/shared/lib/format';
import { amountsOf, orderTypeFor } from '@/shared/lib/order-charges';
import { MessageScreen } from '@/shared/MessageScreen';
import { CartSheet } from './CartSheet';
import { useCafeCart, useCartStore } from './cart-store';
import { CategoryTabs, sectionId } from './CategoryTabs';
import { ProductRow } from './ProductRow';

/** Roughly what fits on a phone before scrolling. */
const EAGER_IMAGES = 4;

function MenuSkeleton() {
  return (
    <div role="status" aria-label="..." className="animate-pulse space-y-4 p-4">
      <div className="h-14 rounded-2xl bg-muted" />
      <div className="h-11 rounded-full bg-muted" />
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="h-24 rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

function OpenOrderLink({
  slug,
  token,
  table,
}: {
  slug: string;
  token: string;
  table: string | null;
}) {
  const { t } = useTranslation();
  const { data } = usePublicControllerOrderStatus(token, {
    query: { retry: false },
  });
  if (!data || data.status === 'PAID' || data.status === 'CANCELLED') {
    return null;
  }
  return (
    <Link
      to={`/${slug}/order/${token}${table ? `?table=${table}` : ''}`}
      className="mx-4 mt-3 flex min-h-12 items-center gap-3 rounded-2xl bg-primary/10 px-4 py-2 font-medium"
    >
      <Receipt className="size-5 shrink-0 text-primary" />
      <span className="flex-1">
        {t('menu.yourOrder', { number: data.displayNumber })}
      </span>
      <span className="text-sm">{t('menu.yourOrderHint')}</span>
      <ChevronRight className="size-4" />
    </Link>
  );
}

export function MenuPage() {
  const { t } = useTranslation();
  const { cafeSlug: slug = '' } = useParams();
  const [params] = useSearchParams();
  const qrToken = params.get('table');
  const [cartOpen, setCartOpen] = useState(false);

  const menu = usePublicControllerMenu(slug, {
    query: {
      retry: (count, error) =>
        count < 2 && !(error instanceof ApiError && error.status === 404),
    },
  });
  const table = usePublicControllerTable(qrToken ?? '', {
    query: { enabled: qrToken !== null, retry: false },
  });
  const cart = useCafeCart(slug);
  const setQuantity = useCartStore((state) => state.setQuantity);
  useCafeTheme(menu.data?.cafe.primaryColor);

  const categories = useMemo(
    () =>
      (menu.data?.categories ?? []).filter(
        (category) => category.products.length > 0,
      ),
    [menu.data],
  );
  const products = useMemo(
    () => categories.flatMap((category) => category.products),
    [categories],
  );

  if (!menu.data) {
    if (menu.isPending) return <MenuSkeleton />;
    return menu.error instanceof ApiError && menu.error.status === 404 ? (
      <MessageScreen title={t('notFound.title')} hint={t('notFound.hint')} />
    ) : (
      <MessageScreen
        title={t('common.errors.network')}
        action={t('common.retry')}
        onAction={() => void menu.refetch()}
      />
    );
  }

  const { cafe } = menu.data;
  // A code from another cafe counts as no code at all.
  const verifiedTable =
    table.data && table.data.cafeSlug === slug ? table.data : null;
  const badTable =
    qrToken !== null && !table.isPending && verifiedTable === null;

  const orderType = orderTypeFor(cafe.orderTypes, verifiedTable !== null);

  const inCart = products.filter((product) => cart.lines[product.id]);
  const count = inCart.reduce((sum, p) => sum + cart.lines[p.id], 0);
  const { total } = amountsOf(
    inCart.reduce((sum, p) => sum + p.price * cart.lines[p.id], 0),
    orderType ?? 'TAKEAWAY',
    cafe,
  );
  let shown = 0;

  return (
    <div
      className={`mx-auto min-h-dvh max-w-2xl ${count > 0 ? 'pb-24' : 'pb-6'}`}
    >
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        {cafe.logoUrl && (
          <img
            src={assetUrl(cafe.logoUrl)}
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-2xl object-cover"
          />
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{cafe.name}</h1>
          {orderType === 'DINE_IN' && verifiedTable ? (
            <p className="text-sm font-medium text-primary">
              {t('menu.table', { name: verifiedTable.name })}
            </p>
          ) : (
            orderType === 'TAKEAWAY' &&
            (!qrToken || verifiedTable) && (
              <p className="text-sm text-muted-foreground">
                {t('menu.takeaway')}
              </p>
            )
          )}
        </div>
      </header>
      {orderType === null && (
        <p role="status" className="mx-4 mb-3 rounded-2xl bg-muted p-3 text-sm">
          {t('menu.viewOnly')}
        </p>
      )}
      {badTable && orderType !== null && (
        <p role="alert" className="mx-4 mb-3 rounded-2xl bg-muted p-3 text-sm">
          {t('menu.badTable')}
        </p>
      )}
      {categories.length === 0 ? (
        <p className="p-10 text-center text-muted-foreground">
          {t('menu.empty')}
        </p>
      ) : (
        <>
          <CategoryTabs categories={categories} />
          {cart.lastOrderToken && (
            <OpenOrderLink
              slug={slug}
              token={cart.lastOrderToken}
              table={qrToken}
            />
          )}
          <main className="px-4">
            {categories.map((category) => (
              <section
                key={category.id}
                id={sectionId(category.id)}
                className="scroll-mt-16 pt-4"
              >
                <h2 className="text-lg font-bold">{category.name}</h2>
                <ul>
                  {category.products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      quantity={cart.lines[product.id] ?? 0}
                      eager={shown++ < EAGER_IMAGES}
                      onChange={(quantity) =>
                        setQuantity(slug, product.id, quantity)
                      }
                    />
                  ))}
                </ul>
              </section>
            ))}
          </main>
        </>
      )}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex h-14 w-full items-center gap-3 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground shadow-lg outline-none active:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ShoppingBag className="size-5" />
            <span className="flex-1 text-left">
              {t('cart.open')} · {t('cart.items', { count })}
            </span>
            <span>{formatMoney(total)}</span>
          </button>
        </div>
      )}
      <CartSheet
        slug={slug}
        cafe={cafe}
        orderType={orderType}
        products={products}
        qrToken={verifiedTable ? qrToken : null}
        tableReady={qrToken === null || !table.isPending}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onUnavailable={() => void menu.refetch()}
      />
    </div>
  );
}
