import { useCartStore } from './cart-store';

const store = () => useCartStore.getState();

describe('cart store', () => {
  beforeEach(() => useCartStore.setState({ carts: {} }));

  it('keeps cafes apart', () => {
    store().setQuantity('a', 'osh', 2);
    store().setQuantity('b', 'choy', 1);
    expect(store().carts.a.lines).toEqual({ osh: 2 });
    expect(store().carts.b.lines).toEqual({ choy: 1 });
  });

  it('removes a line at zero and caps the quantity', () => {
    store().setQuantity('a', 'osh', 2);
    store().setQuantity('a', 'choy', 5000);
    store().setQuantity('a', 'osh', 0);
    expect(store().carts.a.lines).toEqual({ choy: 999 });
  });

  it('starts over after an order, remembering it', () => {
    store().setQuantity('a', 'osh', 2);
    store().setNote('a', 'tez');
    store().finish('a', 'token');
    expect(store().carts.a).toEqual({
      lines: {},
      note: '',
      lastOrderToken: 'token',
    });
  });

  it('survives a reload', () => {
    store().setQuantity('a', 'osh', 2);
    expect(localStorage.getItem('stolchi-cart')).toContain('osh');
  });
});
