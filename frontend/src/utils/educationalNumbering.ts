/**
 * educationalNumbering.ts
 * Educational Numbering Engines for Amazon KDP & Classroom Activity Books.
 * Supports:
 * - Standard Numbers: 1, 2, 3...
 * - Alphabet Uppercase: A, B, C... Z, AA, AB...
 * - Alphabet Lowercase: a, b, c... z, aa, ab...
 * - Skip-Counting by 2s: 2, 4, 6, 8...
 * - Skip-Counting by 5s: 5, 10, 15, 20...
 * - Skip-Counting by 10s: 10, 20, 30, 40...
 * - Roman Numerals: I, II, III, IV, V...
 */

import type { Dot, NumberingMode } from '../types';

export function toRoman(num: number): string {
  if (num <= 0) return '0';
  const valMap: [number, string][] = [
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let res = '';
  let n = num;
  for (const [val, roman] of valMap) {
    while (n >= val) {
      res += roman;
      n -= val;
    }
  }
  return res || String(num);
}

export function toAlphaUpper(num: number): string {
  if (num <= 0) return 'A';
  let s = '';
  let n = num;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function toAlphaLower(num: number): string {
  return toAlphaUpper(num).toLowerCase();
}

export function formatDisplayLabel(sequenceIndex: number, mode: NumberingMode): string {
  switch (mode) {
    case 'letters_upper':
      return toAlphaUpper(sequenceIndex);
    case 'letters_lower':
      return toAlphaLower(sequenceIndex);
    case 'skip_2':
      return String(sequenceIndex * 2);
    case 'skip_5':
      return String(sequenceIndex * 5);
    case 'skip_10':
      return String(sequenceIndex * 10);
    case 'roman':
      return toRoman(sequenceIndex);
    case 'numbers':
    default:
      return String(sequenceIndex);
  }
}

export function applyNumberingModeToDots(dots: Dot[], mode: NumberingMode): Dot[] {
  return dots.map((dot) => ({
    ...dot,
    displayLabel: formatDisplayLabel(dot.sequenceIndex, mode),
  }));
}
