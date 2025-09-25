// Simple weather service using Open-Meteo (no API key required)
// https://open-meteo.com/en/docs

export interface WeatherData {
  temperatureC: number | null;
  windKph: number | null;
  conditionCode: number | null;
  conditionText: string | null;
  updated: string;
  severity?: 'normal' | 'advisory' | 'watch' | 'warning';
  icon?: string; // icon key name (consumer maps to actual component or emoji)
  forecast?: Array<{ date: string; minC: number|null; maxC: number|null; code: number|null; icon: string; severity: WeatherData['severity']; }>;
}

// Representative lat/lon per country code (minimal set, extend as needed)
const COUNTRY_COORDS: Record<string, { lat: number; lon: number }> = {
  us: { lat: 38.0, lon: -97.0 },
  gb: { lat: 54.0, lon: -2.0 },
  fr: { lat: 46.2, lon: 2.2 },
  de: { lat: 51.0, lon: 10.0 },
  it: { lat: 42.8, lon: 12.5 },
  es: { lat: 40.3, lon: -3.7 },
  jp: { lat: 36.2, lon: 138.3 },
  cn: { lat: 35.8, lon: 104.1 },
  in: { lat: 22.9, lon: 78.4 },
  ca: { lat: 56.1, lon: -106.3 },
  au: { lat: -25.0, lon: 133.0 }
};

function mapWeatherCodeToText(code: number | null): string | null {
  if(code == null) return null;
  // Simplified mapping subset
  const mapping: Record<number, string> = {
    0: 'Clear', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
    45:'Fog', 48:'Rime fog', 51:'Light drizzle', 61:'Rain', 63:'Rain', 65:'Heavy rain',
    71:'Snow', 80:'Rain showers', 95:'Thunderstorm'
  };
  return mapping[code] || 'Weather';
}

// Map codes to severity + icon key
function mapCodeToMeta(code: number | null): { severity: WeatherData['severity']; icon: string } {
  if(code == null) return { severity: 'normal', icon: 'unknown' };
  // Basic grouping referencing WMO weather interpretation codes
  if([95,96,99].includes(code)) return { severity: 'warning', icon: 'thunder' }; // Thunderstorms
  if([65,67,82].includes(code)) return { severity: 'watch', icon: 'heavy-rain' }; // Heavy rain
  if([71,73,75,77,85,86].includes(code)) return { severity: 'watch', icon: 'snow' }; // Snow events
  if([55,57,61,63,80,81].includes(code)) return { severity: 'advisory', icon: 'rain' }; // Rain / showers
  if([45,48].includes(code)) return { severity: 'advisory', icon: 'fog' }; // Fog
  if([51,53].includes(code)) return { severity: 'normal', icon: 'drizzle' };
  if([0].includes(code)) return { severity: 'normal', icon: 'clear' };
  if([1,2].includes(code)) return { severity: 'normal', icon: 'partly' };
  if([3].includes(code)) return { severity: 'normal', icon: 'cloudy' };
  return { severity: 'normal', icon: 'cloudy' };
}

// In-memory cache (per country) with TTL
interface CacheEntry { data: WeatherData; expires: number; }
const CACHE: Record<string, CacheEntry> = {};
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchWeather(countryCode: string): Promise<WeatherData> {
  const cc = countryCode.toLowerCase();
  const now = Date.now();
  const cached = CACHE[cc];
  if(cached && cached.expires > now) {
    return cached.data;
  }
  const coords = COUNTRY_COORDS[cc] || COUNTRY_COORDS['us'];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=UTC`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Weather fetch failed: '+res.status);
  const json = await res.json();
  const c = json.current || {};
  const codeVal = typeof c.weather_code === 'number' ? c.weather_code : null;
  const meta = mapCodeToMeta(codeVal);
  const forecast: WeatherData['forecast'] = (() => {
    const daily = json.daily || {};
    if(!Array.isArray(daily.time)) return [];
    return daily.time.slice(0,7).map((date: string, idx: number) => {
      const code = Array.isArray(daily.weather_code) ? daily.weather_code[idx] : null;
      const min = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[idx] : null;
      const max = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[idx] : null;
      const metaDay = mapCodeToMeta(typeof code === 'number' ? code : null);
      return { date, minC: typeof min==='number'?min:null, maxC: typeof max==='number'?max:null, code: typeof code==='number'?code:null, icon: metaDay.icon, severity: metaDay.severity };
    });
  })();
  const data: WeatherData = {
    temperatureC: typeof c.temperature_2m === 'number' ? c.temperature_2m : null,
    windKph: typeof c.wind_speed_10m === 'number' ? c.wind_speed_10m : null,
    conditionCode: codeVal,
    conditionText: mapWeatherCodeToText(codeVal),
    severity: meta.severity,
    icon: meta.icon,
    updated: new Date().toISOString(),
    forecast
  };
  CACHE[cc] = { data, expires: now + TTL_MS };
  return data;
}
