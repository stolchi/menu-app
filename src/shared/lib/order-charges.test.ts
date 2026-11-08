import { describe, expect, it } from 'vitest';
import { amountsOf, orderTypeFor } from './order-charges';

const cafe = {
  serviceChargePercent: 10,
  packagingFee: 2000,
  deliveryFee: 15000,
};

describe('order charges', () => {
  it('adds service at the table and packaging to take away', () => {
    expect(amountsOf(45_000, 'DINE_IN', cafe)).toMatchObject({
      serviceCharge: 4500,
      packagingFee: 0,
      total: 49_500,
    });
    expect(amountsOf(45_000, 'TAKEAWAY', cafe)).toMatchObject({
      serviceCharge: 0,
      packagingFee: 2000,
      total: 47_000,
    });
  });

  it('picks the kind of order the cafe takes', () => {
    expect(orderTypeFor(['DINE_IN', 'TAKEAWAY'], true)).toBe('DINE_IN');
    expect(orderTypeFor(['DINE_IN', 'TAKEAWAY'], false)).toBe('TAKEAWAY');
    expect(orderTypeFor(['TAKEAWAY'], true)).toBe('TAKEAWAY');
    expect(orderTypeFor(['DINE_IN'], false)).toBeNull();
    expect(orderTypeFor(['DELIVERY'], true)).toBeNull();
  });
});
