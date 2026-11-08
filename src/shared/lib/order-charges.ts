import type {
  OrderType,
  PublicCafeDto,
  PublicOrderDto,
} from '@/shared/api/generated/model';

type Charges = Pick<
  PublicCafeDto,
  'serviceChargePercent' | 'packagingFee' | 'deliveryFee'
>;

export type Amounts = Pick<
  PublicOrderDto,
  | 'itemsTotal'
  | 'serviceChargePercent'
  | 'serviceCharge'
  | 'packagingFee'
  | 'deliveryFee'
  | 'total'
>;

/** What the order will cost. Mirrors the API, which has the final say. */
export function amountsOf(
  itemsTotal: number,
  type: OrderType,
  cafe: Charges,
): Amounts {
  const serviceChargePercent =
    type === 'DINE_IN' ? cafe.serviceChargePercent : 0;
  const serviceCharge = Math.round((itemsTotal * serviceChargePercent) / 100);
  const packagingFee = type === 'DINE_IN' ? 0 : cafe.packagingFee;
  const deliveryFee = type === 'DELIVERY' ? cafe.deliveryFee : 0;
  return {
    itemsTotal,
    serviceChargePercent,
    serviceCharge,
    packagingFee,
    deliveryFee,
    total: itemsTotal + serviceCharge + packagingFee + deliveryFee,
  };
}

/**
 * A scanned table makes it dine-in, otherwise takeaway, as far as the cafe takes
 * either. `null`: this cafe takes neither here, so the menu is only to look at.
 */
export function orderTypeFor(
  offered: readonly OrderType[],
  atTable: boolean,
): 'DINE_IN' | 'TAKEAWAY' | null {
  if (atTable && offered.includes('DINE_IN')) return 'DINE_IN';
  return offered.includes('TAKEAWAY') ? 'TAKEAWAY' : null;
}
