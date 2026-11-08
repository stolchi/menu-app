import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Stepper({
  name,
  quantity,
  onChange,
}: {
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
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
        onClick={() => onChange(quantity - 1)}
      >
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center font-bold tabular-nums">{quantity}</span>
      <button
        type="button"
        className={button}
        aria-label={t('menu.increase', { name })}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
