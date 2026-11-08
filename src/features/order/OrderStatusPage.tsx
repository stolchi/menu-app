import { Check, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  usePublicControllerMenu,
  usePublicControllerOrderStatus,
} from '@/shared/api/generated/public/public';
import { AmountList } from '@/shared/AmountList';
import { useCafeTheme } from '@/shared/lib/cafe-theme';
import { formatMoney } from '@/shared/lib/format';
import { lineTotal, quantityLabel } from '@/shared/lib/quantity';
import { MessageScreen } from '@/shared/MessageScreen';
import { isOver, stepOf, STEPS } from './order-steps';
import { useOrderUpdates } from './use-order-updates';

/** In case a socket event goes missing while the customer waits. */
const REFETCH_MS = 30_000;

export function OrderStatusPage() {
  const { t } = useTranslation();
  const { cafeSlug: slug = '', publicToken = '' } = useParams();
  const [params] = useSearchParams();
  const table = params.get('table');
  const menu = usePublicControllerMenu(slug);
  const order = usePublicControllerOrderStatus(publicToken, {
    query: {
      retry: 1,
      refetchInterval: (query) =>
        query.state.data && isOver(query.state.data.status)
          ? false
          : REFETCH_MS,
    },
  });
  const status = order.data?.status;
  const { refetch } = order;

  useCafeTheme(menu.data?.cafe.primaryColor);
  useOrderUpdates(publicToken, status !== undefined && !isOver(status), () => {
    void refetch();
  });

  // A buzz when the order becomes ready, not when opening a page that already says so.
  const previous = useRef(status);
  useEffect(() => {
    if (status === 'READY' && previous.current && previous.current !== status) {
      navigator.vibrate?.([200, 100, 200]);
    }
    previous.current = status;
  }, [status]);

  if (!order.data) {
    if (order.isPending) {
      return (
        <div role="status" aria-label="..." className="animate-pulse p-4">
          <div className="h-56 rounded-3xl bg-muted" />
        </div>
      );
    }
    return <MessageScreen title={t('order.notFound')} />;
  }

  const { displayNumber, items, type } = order.data;
  const cancelled = order.data.status === 'CANCELLED';
  const step = stepOf(order.data.status);
  const isReady = step === 2 && !cancelled;

  return (
    <main className="mx-auto min-h-dvh max-w-lg space-y-4 p-4 pb-8">
      <p className="text-center font-semibold">{menu.data?.cafe.name}</p>
      <section className="rounded-3xl bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">{t('order.number')}</p>
        <p
          className={`my-1 text-6xl font-extrabold tabular-nums ${isReady ? 'text-emerald-700' : ''}`}
        >
          {displayNumber}
        </p>
        <p className="text-sm text-muted-foreground">{t('order.keepNumber')}</p>
        <h1
          role="status"
          className={`mt-4 text-xl font-bold ${cancelled ? 'text-destructive' : ''}`}
        >
          {t(`order.headline.${order.data.status}`)}
        </h1>
        {cancelled && (
          <p className="mt-1 text-muted-foreground">
            {t('order.cancelledHint')}
          </p>
        )}
        {order.data.status === 'READY' && type === 'TAKEAWAY' && (
          <p className="mt-1 font-medium">{t('order.readyTakeaway')}</p>
        )}
        {!cancelled && (
          <ol className="mt-5 flex justify-between gap-1">
            {STEPS.map((name, index) => {
              const done = index <= step;
              return (
                <li
                  key={name}
                  aria-current={index === step ? 'step' : undefined}
                  className="relative flex flex-1 flex-col items-center gap-1.5 text-xs font-medium"
                >
                  {index > 0 && (
                    <span
                      aria-hidden
                      className={`absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2 ${done ? 'bg-primary' : 'bg-muted'}`}
                    />
                  )}
                  <span
                    className={`relative flex size-8 items-center justify-center rounded-full transition-colors ${
                      done
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    } ${index === step && !isOver(order.data!.status) && step < 2 ? 'animate-pulse' : ''}`}
                  >
                    {done ? <Check className="size-4" /> : index + 1}
                  </span>
                  <span className={done ? '' : 'text-muted-foreground'}>
                    {t(`order.steps.${name}`)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {cancelled && (
          <span className="mx-auto mt-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <X className="size-6" />
          </span>
        )}
      </section>
      <section className="rounded-3xl bg-card p-5 shadow-sm">
        <h2 className="mb-2 font-bold">{t('order.items')}</h2>
        <ul className="divide-y divide-border text-sm">
          {items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3 py-2">
              <span>
                {quantityLabel(item.unit, item.quantity)} {item.name}
                {!item.weighed && (
                  <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {t('order.notWeighed')}
                  </span>
                )}
              </span>
              <span className="whitespace-nowrap">
                {!item.weighed && '≈ '}
                {formatMoney(lineTotal(item.price, item.quantity, item.unit))}
              </span>
            </li>
          ))}
        </ul>
        <AmountList
          amounts={order.data}
          className="mt-2 border-t border-border pt-3"
        />
        {items.some((item) => !item.weighed) && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('order.weightNote')}
          </p>
        )}
      </section>
      <Link
        to={`/${slug}${table ? `?table=${table}` : ''}`}
        className="flex h-12 items-center justify-center rounded-2xl bg-muted font-semibold"
      >
        {t('order.backToMenu')}
      </Link>
    </main>
  );
}
