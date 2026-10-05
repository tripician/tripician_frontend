import { describe, it, expect } from 'vitest';
import {
  approximate,
  approximateLabel,
  conversionNote,
  regionOf,
  visitorCurrency,
  type DisplayRates,
} from './localPrice';

// The real shape, with the rates the ECB published on 5 October 2026.
const RATES: DisplayRates = { asOf: '2026-10-05', rates: { EUR: 0.00927, USD: 0.01038 } };

describe('regionOf', () => {
  it('reads the region out of a browser locale', () => {
    expect(regionOf(['de-DE'])).toBe('DE');
    expect(regionOf(['en-US', 'en'])).toBe('US');
  });

  it('skips locales that name no region, and survives malformed ones', () => {
    expect(regionOf(['en', 'fr-FR'])).toBe('FR');
    expect(regionOf(['not a locale', 'it-IT'])).toBe('IT');
    expect(regionOf(['en'])).toBeNull();
    expect(regionOf([])).toBeNull();
    expect(regionOf(undefined)).toBeNull();
  });
});

describe('visitorCurrency', () => {
  it('gives euros to Europe and dollars to the United States', () => {
    expect(visitorCurrency('DE', RATES)).toBe('EUR');
    expect(visitorCurrency('PT', RATES)).toBe('EUR');
    expect(visitorCurrency('US', RATES)).toBe('USD');
  });

  it('shows rupees alone in India, which is already the charging currency', () => {
    expect(visitorCurrency('IN', RATES)).toBeNull();
  });

  it('shows rupees alone when the region is unknown or we hold no rate', () => {
    expect(visitorCurrency(null, RATES)).toBeNull();
    expect(visitorCurrency('JP', RATES)).toBeNull();
    // Britain is mapped to pounds, but no rate was published for them here.
    expect(visitorCurrency('GB', RATES)).toBeNull();
    expect(visitorCurrency('DE', null)).toBeNull();
  });
});

describe('approximate', () => {
  it('converts at the published rate', () => {
    expect(approximate(149, 'EUR', RATES)).toBe(1.38);
    expect(approximate(149, 'USD', RATES)).toBe(1.55);
  });

  it('drops the cents once the number is large enough not to need them', () => {
    expect(approximate(1299, 'EUR', RATES)).toBe(12.04);
    expect(approximate(14999, 'USD', RATES)).toBe(156);
  });

  it('refuses rather than inventing a figure', () => {
    expect(approximate(149, 'JPY', RATES)).toBeNull();
    expect(approximate(149, 'EUR', null)).toBeNull();
    expect(approximate(0, 'EUR', RATES)).toBeNull();
  });
});

describe('approximateLabel', () => {
  it('always says the number is approximate', () => {
    expect(approximateLabel(149, 'USD', RATES)).toBe('approximately $1.55');
    expect(approximateLabel(1299, 'EUR', RATES)).toBe('approximately €12.04');
  });

  it('says nothing at all when there is no local currency', () => {
    expect(approximateLabel(149, null, RATES)).toBeNull();
    expect(approximateLabel(149, 'EUR', null)).toBeNull();
  });
});

describe('conversionNote', () => {
  it('names the source, the date and the currency actually charged', () => {
    expect(conversionNote('EUR', 'INR', RATES)).toBe(
      'Prices in EUR are approximate, converted at the European Central Bank rate of 5 Oct 2026. You are charged in INR, and your bank sets the rate it uses.',
    );
  });

  it('drops the date rather than printing an invalid one', () => {
    expect(conversionNote('EUR', 'INR', { asOf: 'whenever', rates: { EUR: 0.00927 } })).toBe(
      'Prices in EUR are approximate, converted at the European Central Bank rate. You are charged in INR, and your bank sets the rate it uses.',
    );
  });

  it('says nothing when the visitor is being shown rupees', () => {
    expect(conversionNote(null, 'INR', RATES)).toBeNull();
  });
});
