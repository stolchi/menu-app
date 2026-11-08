import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/shared/lib/format';
import type { Amounts } from '@/shared/lib/order-charges';

/** The total, and what it is made of whenever the cafe charges more than the food. */
export function AmountList({
  amounts,
  className = '',
}: {
  amounts: Amounts;
  className?: string;
}) {
  const { t } = useTranslation();
  const charges = [
    {
      key: 'service',
      label: t('amounts.service', { percent: amounts.serviceChargePercent }),
      value: amounts.serviceCharge,
    },
    {
      key: 'packaging',
      label: t('amounts.packaging'),
      value: amounts.packagingFee,
    },
    {
      key: 'delivery',
      label: t('amounts.delivery'),
      value: amounts.deliveryFee,
    },
  ].filter((part) => part.value > 0);
  const parts =
    charges.length > 0
      ? [
          {
            key: 'items',
            label: t('amounts.items'),
            value: amounts.itemsTotal,
          },
          ...charges,
        ]
      : [];

  return (
    <dl className={`space-y-1 ${className}`}>
      {parts.map((part) => (
        <div
          key={part.key}
          className="flex justify-between gap-3 text-sm text-muted-foreground"
        >
          <dt>{part.label}</dt>
          <dd className="whitespace-nowrap">{formatMoney(part.value)}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-3 font-bold">
        <dt>{t('amounts.total')}</dt>
        <dd className="text-xl whitespace-nowrap">
          {formatMoney(amounts.total)}
        </dd>
      </div>
    </dl>
  );
}
