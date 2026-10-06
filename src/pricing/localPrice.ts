/** An approximate price in the visitor's own currency. Display only: every charge is in rupees. */

/** Rates the server published, keyed by currency code, per one rupee. */
export interface DisplayRates {
  asOf: string;
  rates: Record<string, number>;
}

// The euro for its members and for the rest of the EU and EEA, where it is the closest familiar yardstick.
const EURO_REGIONS = new Set([
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES',
  'AD', 'MC', 'SM', 'VA', 'ME', 'XK',
  'BG', 'CZ', 'DK', 'HU', 'PL', 'RO', 'SE', 'IS', 'LI', 'NO', 'CH',
]);

const REGION_CURRENCY: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
};

/** The region of the first locale that names one, for example "de-DE" to "DE". */
export function regionOf(locales: readonly string[] | undefined): string | null {
  for (const locale of locales ?? []) {
    try {
      const region = new Intl.Locale(locale).region;
      if (region) return region.toUpperCase();
    } catch {
      // A malformed locale string is not worth a broken pricing page.
    }
  }
  return null;
}

/** The currency to show beside the rupee price, or null to show rupees alone. */
export function visitorCurrency(
  region: string | null,
  rates: DisplayRates | null | undefined,
): string | null {
  if (!region || !rates) return null;

  const wanted = REGION_CURRENCY[region] ?? (EURO_REGIONS.has(region) ? 'EUR' : null);
  if (!wanted) return null;

  const rate = rates.rates[wanted];
  return typeof rate === 'number' && rate > 0 ? wanted : null;
}

/** The converted figure, keeping cents only while the number is small enough to need them. */
export function approximate(
  amount: number,
  currency: string,
  rates: DisplayRates | null | undefined,
): number | null {
  const rate = rates?.rates[currency];
  if (typeof rate !== 'number' || rate <= 0 || !Number.isFinite(amount) || amount <= 0) return null;

  const converted = amount * rate;
  return converted < 100 ? Math.round(converted * 100) / 100 : Math.round(converted);
}

/** "approximately $1.55", or null when there is nothing honest to show. */
export function approximateLabel(
  amount: number,
  currency: string | null,
  rates: DisplayRates | null | undefined,
): string | null {
  if (!currency) return null;

  const converted = approximate(amount, currency, rates);
  if (converted === null) return null;

  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: converted < 100 ? 2 : 0,
  }).format(converted);

  return `approximately ${money}`;
}

/** The sentence under the plans that keeps the approximation honest. */
export function conversionNote(
  currency: string | null,
  charged: string,
  rates: DisplayRates | null | undefined,
): string | null {
  if (!currency || !rates) return null;

  const published = new Date(`${rates.asOf}T00:00:00Z`);
  const when = Number.isNaN(published.getTime())
    ? null
    : published.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  const source = when ? `the European Central Bank rate of ${when}` : 'the European Central Bank rate';
  return `Prices in ${currency} are approximate, converted at ${source}. You are charged in ${charged}, and your bank sets the rate it uses.`;
}
