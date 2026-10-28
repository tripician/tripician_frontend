import { describe, it, expect } from 'vitest';
import { CODE_LENGTH, codeFrom, countdownLabel } from './emailCode';

describe('codeFrom', () => {
  it('keeps a typed code as it is', () => {
    expect(codeFrom('123456')).toBe('123456');
    expect(codeFrom('12')).toBe('12');
  });

  it('keeps only the digits of a pasted code', () => {
    expect(codeFrom('123 456')).toBe('123456');
    expect(codeFrom('123-456')).toBe('123456');
    expect(codeFrom('Your code: 123456.')).toBe('123456');
  });

  it('stops at six digits', () => {
    expect(codeFrom('1234567890')).toBe('123456');
    expect(codeFrom('1234567890')).toHaveLength(CODE_LENGTH);
  });

  it('leaves nothing when there are no digits', () => {
    expect(codeFrom('')).toBe('');
    expect(codeFrom('abcdef')).toBe('');
  });
});

describe('countdownLabel', () => {
  it('reads as minutes and padded seconds', () => {
    expect(countdownLabel(60)).toBe('1:00');
    expect(countdownLabel(42)).toBe('0:42');
    expect(countdownLabel(5)).toBe('0:05');
    expect(countdownLabel(125)).toBe('2:05');
  });

  it('rounds up, so it never shows 0:00 while a wait is left', () => {
    expect(countdownLabel(59.2)).toBe('1:00');
    expect(countdownLabel(0.4)).toBe('0:01');
  });

  it('never goes below 0:00', () => {
    expect(countdownLabel(0)).toBe('0:00');
    expect(countdownLabel(-3)).toBe('0:00');
  });
});
