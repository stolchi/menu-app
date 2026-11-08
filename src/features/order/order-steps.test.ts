import { isOver, stepOf } from './order-steps';

describe('order steps', () => {
  it('shows customers three steps, whatever the status behind them', () => {
    expect(stepOf('NEW')).toBe(0);
    expect(stepOf('ACCEPTED')).toBe(0);
    expect(stepOf('COOKING')).toBe(1);
    expect(stepOf('READY')).toBe(2);
    expect(stepOf('SERVED')).toBe(2);
    expect(stepOf('PAID')).toBe(2);
  });

  it('knows when nothing more will happen', () => {
    expect(isOver('PAID')).toBe(true);
    expect(isOver('CANCELLED')).toBe(true);
    expect(isOver('SERVED')).toBe(false);
  });
});
