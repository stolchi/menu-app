import { useEffect } from 'react';

const channels = (hex: string) =>
  [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));

const toHex = (values: number[]) =>
  `#${values.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

function contrastWithWhite(rgb: number[]) {
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

/** The cafe picks any colour, and buttons put white text on it, so a pale one is darkened. */
export function readablePrimary(hex: string): string {
  let rgb = channels(hex);
  while (contrastWithWhite(rgb) < 4.5) {
    rgb = rgb.map((value) => value * 0.94);
  }
  return toHex(rgb);
}

export function useCafeTheme(color: string | null | undefined) {
  useEffect(() => {
    if (!color) return;
    const primary = readablePrimary(color);
    document.documentElement.style.setProperty('--primary', primary);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', primary);
  }, [color]);
}
