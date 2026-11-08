import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Stepper({
  name,
  quantity,
  onChange,
  step = 1,
  label = String(quantity),
}: {
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
  /** 500 for a weight in grams. */
  step?: number;
  label?: string;
}) {
  const { t } = useTranslation();
  const button =
    'flex size-11 items-center justify-center rounded-full outline-none active:bg-black/10 focus-visible:ring-2 focus-visible:ring-primary';
  return (
    <div className="flex items-center rounded-full bg-muted">
      <button
        type="button"
        className={button}
        aria-label={t('menu.decrease', { name })}
        onClick={() => onChange(quantity - step)}
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-6 px-0.5 text-center font-bold whitespace-nowrap tabular-nums">
        {label}
      </span>
      <button
        type="button"
        className={button}
        aria-label={t('menu.increase', { name })}
        onClick={() => onChange(quantity + step)}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
