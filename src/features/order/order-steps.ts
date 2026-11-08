import type { OrderStatus } from '@/shared/api/generated/model';

export const STEPS = ['accepted', 'cooking', 'ready'] as const;

/** Which of the steps shown to the customer an order has reached. */
export function stepOf(status: OrderStatus): number {
  switch (status) {
    case 'NEW':
    case 'ACCEPTED':
    case 'CANCELLED':
      return 0;
    case 'COOKING':
      return 1;
    default:
      return 2;
  }
}

/** Nothing more will happen to these, so there is no need to keep listening. */
export const isOver = (status: OrderStatus) =>
  status === 'PAID' || status === 'CANCELLED';
