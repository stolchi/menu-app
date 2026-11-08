import { readablePrimary } from './cafe-theme';

describe('readablePrimary', () => {
  it('keeps a colour white text already reads on', () => {
    expect(readablePrimary('#b0431e')).toBe('#b0431e');
  });

  it('darkens a pale one', () => {
    const [r] = [parseInt(readablePrimary('#ffee88').slice(1, 3), 16)];
    expect(r).toBeLessThan(255);
    expect(readablePrimary('#ffffff')).not.toBe('#ffffff');
  });
});
