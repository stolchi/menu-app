import i18n from '@/shared/i18n';

export const formatMoney = (amount: number) =>
  i18n.t('common.money', {
    amount: String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
  });

const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tashkent',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** `14:35` in Tashkent. */
export const formatClock = (iso: string) => clock.format(new Date(iso));
