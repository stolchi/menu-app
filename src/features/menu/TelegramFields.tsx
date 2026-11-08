import { Check, LocateFixed, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  normalizePhone,
  PHONE_PATTERN,
  useContactStore,
} from './contact-store';

export type RemoteType = 'TAKEAWAY' | 'DELIVERY';

/** The kind of Mini App order: the last one chosen, while the cafe still offers it. */
export const remoteTypeOf = (
  offered: readonly RemoteType[],
  chosen: RemoteType | null,
): RemoteType =>
  chosen && offered.includes(chosen) ? chosen : (offered[0] ?? 'TAKEAWAY');

const input =
  'h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary aria-invalid:border-destructive';

/** What a Telegram order needs to be called back and, for a delivery, found. */
export function contactReady(type: RemoteType) {
  const { phone, address } = useContactStore.getState();
  return (
    PHONE_PATTERN.test(normalizePhone(phone)) &&
    (type === 'TAKEAWAY' || address.trim() !== '')
  );
}

export function TelegramFields({
  types,
  type,
  onType,
  checked,
}: {
  types: readonly RemoteType[];
  type: RemoteType;
  onType: (type: RemoteType) => void;
  /** Show what is missing, once the customer has tried to order. */
  checked: boolean;
}) {
  const { t } = useTranslation();
  const contact = useContactStore();
  const [locating, setLocating] = useState<'idle' | 'busy' | 'denied'>('idle');
  const phoneBad = !PHONE_PATTERN.test(normalizePhone(contact.phone));
  const addressBad = type === 'DELIVERY' && contact.address.trim() === '';

  const locate = () => {
    if (!navigator.geolocation) return setLocating('denied');
    setLocating('busy');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        contact.set({
          location: { latitude: coords.latitude, longitude: coords.longitude },
        });
        setLocating('idle');
      },
      () => setLocating('denied'),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  return (
    <div className="my-3 space-y-3">
      {types.length > 1 && (
        <div
          role="radiogroup"
          aria-label={t('telegram.orderType')}
          className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1"
        >
          {types.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={type === option}
              onClick={() => onType(option)}
              className="h-11 rounded-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary aria-checked:bg-card aria-checked:shadow-sm"
            >
              {t(`telegram.type.${option}`)}
            </button>
          ))}
        </div>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          {t('telegram.phone')}
        </span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          aria-invalid={(checked && phoneBad) || undefined}
          className={input}
          value={contact.phone}
          onChange={(event) => contact.set({ phone: event.target.value })}
          onBlur={() => contact.set({ phone: normalizePhone(contact.phone) })}
        />
      </label>
      {/* Outside the label, so it does not become part of the field's name. */}
      {checked && phoneBad && (
        <p className="-mt-2 text-sm text-destructive">
          {t('telegram.phoneInvalid')}
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          {t('telegram.name')}
        </span>
        <input
          autoComplete="name"
          maxLength={120}
          className={input}
          value={contact.name}
          onChange={(event) => contact.set({ name: event.target.value })}
        />
      </label>
      {type === 'DELIVERY' && (
        <>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {t('telegram.address')}
            </span>
            <textarea
              rows={2}
              maxLength={500}
              placeholder={t('telegram.addressPlaceholder')}
              aria-invalid={(checked && addressBad) || undefined}
              className="w-full resize-none rounded-xl border border-border bg-background p-3 text-base outline-none focus:border-primary aria-invalid:border-destructive"
              value={contact.address}
              onChange={(event) => contact.set({ address: event.target.value })}
            />
          </label>
          {checked && addressBad && (
            <p className="-mt-2 text-sm text-destructive">
              {t('telegram.addressRequired')}
            </p>
          )}
          <button
            type="button"
            onClick={locate}
            disabled={locating === 'busy'}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border font-semibold outline-none active:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            {contact.location ? (
              <Check className="size-5 text-emerald-700" />
            ) : locating === 'busy' ? (
              <LocateFixed className="size-5 animate-pulse" />
            ) : (
              <MapPin className="size-5" />
            )}
            {t(
              contact.location
                ? 'telegram.located'
                : locating === 'busy'
                  ? 'telegram.locating'
                  : 'telegram.locate',
            )}
          </button>
          {locating === 'denied' && (
            <p className="text-sm text-muted-foreground">
              {t('telegram.locateDenied')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
