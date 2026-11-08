import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PublicProductDto } from '@/shared/api/generated/model';
import { assetUrl } from '@/shared/lib/assets';
import { formatMoney } from '@/shared/lib/format';
import { Stepper } from './Stepper';

export function ProductRow({
  product,
  quantity,
  onChange,
  eager,
}: {
  product: PublicProductDto;
  quantity: number;
  onChange: (quantity: number) => void;
  /** Pictures likely to be on the first screen should not wait. */
  eager: boolean;
}) {
  const { t } = useTranslation();
  const soldOut = !product.isAvailable;
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
        <div className="mt-auto flex min-h-11 items-center justify-between gap-2 pt-1">
          <span
            className={`font-semibold whitespace-nowrap ${soldOut ? 'text-muted-foreground' : ''}`}
          >
            {formatMoney(product.price)}
          </span>
          {soldOut ? (
            <span className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
              {t('menu.soldOut')}
            </span>
          ) : quantity > 0 ? (
            <Stepper
              name={product.name}
              quantity={quantity}
              onChange={onChange}
            />
          ) : (
            <button
              type="button"
              aria-label={t('menu.add', { name: product.name })}
              className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none active:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => onChange(1)}
            >
              <Plus className="size-5" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
