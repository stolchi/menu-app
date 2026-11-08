import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PublicProductDto } from '@/shared/api/generated/model';
import { assetUrl } from '@/shared/lib/assets';
import { formatMoney } from '@/shared/lib/format';
import { FIRST_WEIGHT, formatWeight, WEIGHT_STEP } from '@/shared/lib/quantity';
import { Stepper } from './Stepper';

export function ProductRow({
  product,
  quantity,
  onChange,
  onChooseSize,
  eager,
}: {
  product: PublicProductDto;
  /** Pieces in the cart (of every size), or grams for a weighed product. */
  quantity: number;
  onChange: (quantity: number) => void;
  /** For a product with sizes, which are chosen in a sheet. */
  onChooseSize: () => void;
  /** Pictures likely to be on the first screen should not wait. */
  eager: boolean;
}) {
  const { t } = useTranslation();
  const soldOut = !product.isAvailable;
  const sized = product.variants.length > 0;
  const weighed = product.unit === 'KG';
  const price = weighed
    ? `${formatMoney(product.price)} / ${t('menu.perKg')}`
    : sized
      ? t('menu.fromPrice', { price: formatMoney(product.price) })
      : formatMoney(product.price);
  return (
    <li className="flex gap-3 border-b border-border py-3 last:border-0">
      <div className="relative size-24 shrink-0">
        {product.imageUrl ? (
          <img
            src={assetUrl(product.imageUrl)}
            alt=""
            width={96}
            height={96}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className={`size-24 rounded-2xl object-cover ${soldOut ? 'opacity-40 grayscale' : ''}`}
          />
        ) : (
          <div
            aria-hidden
            className={`flex size-24 items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary ${soldOut ? 'opacity-40 grayscale' : ''}`}
          >
            {product.name.trim().charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3
          className={`leading-snug font-semibold ${soldOut ? 'text-muted-foreground' : ''}`}
        >
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {product.description}
          </p>
        )}
        {weighed && !soldOut && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('menu.weightHint')}
          </p>
        )}
        <div className="mt-auto flex min-h-11 items-center justify-between gap-2 pt-1">
          <span
            className={`font-semibold whitespace-nowrap ${soldOut ? 'text-muted-foreground' : ''}`}
          >
            {price}
          </span>
          {soldOut ? (
            <span className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
              {t('menu.soldOut')}
            </span>
          ) : sized ? (
            <button
              type="button"
              aria-label={t('menu.chooseSize', { name: product.name })}
              className="relative flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 font-semibold text-primary-foreground outline-none active:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={onChooseSize}
            >
              <Plus className="size-5" />
              {t('menu.choose')}
              {quantity > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background">
                  {quantity}
                </span>
              )}
            </button>
          ) : quantity > 0 ? (
            <Stepper
              name={product.name}
              quantity={quantity}
              step={weighed ? WEIGHT_STEP : 1}
              label={weighed ? formatWeight(quantity) : undefined}
              onChange={onChange}
            />
          ) : (
            <button
              type="button"
              aria-label={t('menu.add', { name: product.name })}
              className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none active:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => onChange(weighed ? FIRST_WEIGHT : 1)}
            >
              <Plus className="size-5" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
