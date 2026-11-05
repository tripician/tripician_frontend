import { describe, expect, it } from 'vitest';

import { creditActionLabel } from './tripicianAIService';

describe('creditActionLabel', () => {
  it('names a month closing', () => {
    expect(creditActionLabel('credit_expiry:2026-12')).toBe('Unused credits expired');
  });

  it('names the trip-chat agent by the handle people type', () => {
    expect(creditActionLabel('trip_agent')).toBe('@tripician proposal');
    expect(creditActionLabel('refund_trip_agent')).toBe('Refund · @tripician proposal');
  });

  it('still reads the other prefixed keys', () => {
    expect(creditActionLabel('monthly_grant:2026-12:basic')).toBe('Monthly plan credits');
    expect(creditActionLabel('purchase:abc')).toBe('Credit pack');
  });
});
