import { describe, expect, it } from 'vitest';
import { formatWeight, lineTotal, quantityLabel } from './quantity';

describe('quantity', () => {
  it('prices weight per kilogram', () => {
    expect(lineTotal(120000, 1500, 'KG')).toBe(180000);
    expect(lineTotal(5000, 3, 'PIECE')).toBe(15000);
  });

  it('shows weights the way people say them', () => {
    expect(formatWeight(500)).toBe('500 g');
    expect(formatWeight(1500)).toBe('1,5 kg');
    expect(quantityLabel('PIECE', 2)).toBe('2 ×');
    expect(quantityLabel('KG', 1000)).toBe('1 kg');
  });
});
