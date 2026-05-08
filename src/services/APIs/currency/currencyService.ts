// Currency service using Open Exchange Rates API (https://open.er-api.com)
// Completely free, no API key required, updated every hour.

export interface CurrencyData {
  base: string;
  rates: Record<string, number>;
  fetched: string;
}

// Mapping of country code -> primary currency (simplified)
const COUNTRY_CURRENCY: Record<string, string> = {
  us: 'USD', gb: 'GBP', fr: 'EUR', de: 'EUR', es: 'EUR', it: 'EUR',
  jp: 'JPY', cn: 'CNY', in: 'INR', ca: 'CAD', au: 'AUD',
  nz: 'NZD', sg: 'SGD', ae: 'AED', br: 'BRL', mx: 'MXN', za: 'ZAR', th: 'THB'
};

interface CacheEntry { data: CurrencyData; expires: number; }
const CACHE: Record<string, CacheEntry> = {};
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchCurrency(countryCode: string): Promise<CurrencyData> {
  const cc = countryCode.toLowerCase();
  const base = COUNTRY_CURRENCY[cc] || 'USD';
  const now = Date.now();
  const cached = CACHE[base];
  if(cached && cached.expires > now) {
    return cached.data;
  }
  try {
  const url = `https://open.er-api.com/v6/latest/${base}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Currency fetch failed: '+res.status);
  const json = await res.json();
  if(json.result !== 'success') throw new Error('Currency API error: ' + (json['error-type'] || 'unknown'));
  const data: CurrencyData = { base, rates: json.rates || {}, fetched: new Date().toISOString() };
  CACHE[base] = { data, expires: now + TTL_MS };
  return data;
  } catch(err){
    return { base, rates:{}, fetched: new Date().toISOString() };
  }
}
