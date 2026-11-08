import i18n from '@/shared/i18n';

export const formatMoney = (amount: number) =>
  i18n.t('common.money', {
    amount: String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
  });
