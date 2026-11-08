import { headlineKey, isOver, stepOf, stepsFor } from './order-steps';

describe('order steps', () => {
  it('follows an order at the cafe to ready', () => {
    expect(stepOf('ACCEPTED')).toBe(0);
    expect(stepOf('COOKING')).toBe(1);
    expect(stepOf('READY')).toBe(2);
    expect(stepOf('SERVED')).toBe(2);
    expect(stepOf('PAID')).toBe(2);
    expect(stepsFor('TAKEAWAY').at(-1)).toBe('ready');
  });

  it('follows a delivery from the phone call to the road', () => {
    expect(stepOf('NEW', 'DELIVERY')).toBe(-1);
    expect(stepOf('READY', 'DELIVERY')).toBe(1);
    expect(stepOf('SERVED', 'DELIVERY')).toBe(2);
    expect(stepsFor('DELIVERY').at(-1)).toBe('onTheWay');
    expect(headlineKey('SERVED', 'DELIVERY')).toBe(
      'order.deliveryHeadline.SERVED',
    );
    expect(headlineKey('SERVED', 'DINE_IN')).toBe('order.headline.SERVED');
  });

  it('stops listening once nothing more can happen', () => {
    expect(isOver('PAID')).toBe(true);
    expect(isOver('CANCELLED')).toBe(true);
    expect(isOver('READY')).toBe(false);
  });
});
