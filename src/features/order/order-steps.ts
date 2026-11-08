import type { OrderStatus, OrderType } from '@/shared/api/generated/model';

/** The steps shown to the customer: a delivery ends on the road, not at the counter. */
export const stepsFor = (type: OrderType) =>
  type === 'DELIVERY'
    ? (['accepted', 'cooking', 'onTheWay'] as const)
    : (['accepted', 'cooking', 'ready'] as const);

/**
 * How many steps an order has reached, counting from 0. A delivery waiting for its
 * phone call has reached none; a ready one is still cooking as far as the customer
 * at home can tell, until it leaves.
 */
export function stepOf(
  status: OrderStatus,
  type: OrderType = 'TAKEAWAY',
): number {
  switch (status) {
    case 'NEW':
      return -1;
    case 'ACCEPTED':
    case 'CANCELLED':
      return 0;
    case 'COOKING':
      return 1;
    case 'READY':
      return type === 'DELIVERY' ? 1 : 2;
    default:
      return 2;
  }
}

/** Nothing more will happen to these, so there is no need to keep listening. */
export const isOver = (status: OrderStatus) =>
  status === 'PAID' || status === 'CANCELLED';

/** The headline's i18n key: a delivery reads differently once it is ready. */
export const headlineKey = (status: OrderStatus, type: OrderType) =>
  type === 'DELIVERY' && (status === 'READY' || status === 'SERVED')
    ? `order.deliveryHeadline.${status}`
    : `order.headline.${status}`;
