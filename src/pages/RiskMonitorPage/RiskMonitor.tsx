import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { Skeleton, Box, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { fetchWeather, type WeatherData } from '../../services/APIs/weather/weatherService';
import { fetchCurrency, type CurrencyData } from '../../services/APIs/currency/currencyService';
import { fetchNews, type TwinglyDocument, type FetchNewsParams } from '../../services/APIs/news/newsService';
import { fetchAdvisory, advisoryScoreToBaseRisk, type AdvisoryData } from '../../services/APIs/alerts/advisoryService';
import { flagEmojiFromCode } from '../../utils/countryFlags';
import '../../assets/css/RiskMonitor.css';

//  Destination catalogue 
interface Dest { name: string; currency: string; region: string; baseRisk: number; }
const DESTS: Record<string, Dest> = {
  jp: { name: 'Japan',          currency: 'JPY', region: 'Asia Pacific',  baseRisk: 8  },
  sg: { name: 'Singapore',      currency: 'SGD', region: 'Asia Pacific',  baseRisk: 5  },
  nz: { name: 'New Zealand',    currency: 'NZD', region: 'Asia Pacific',  baseRisk: 6  },
  au: { name: 'Australia',      currency: 'AUD', region: 'Asia Pacific',  baseRisk: 8  },
  ca: { name: 'Canada',         currency: 'CAD', region: 'North America', baseRisk: 8  },
  us: { name: 'United States',  currency: 'USD', region: 'North America', baseRisk: 12 },
  gb: { name: 'United Kingdom', currency: 'GBP', region: 'Europe',        baseRisk: 10 },
  de: { name: 'Germany',        currency: 'EUR', region: 'Europe',        baseRisk: 9  },
  fr: { name: 'France',         currency: 'EUR', region: 'Europe',        baseRisk: 18 },
  it: { name: 'Italy',          currency: 'EUR', region: 'Europe',        baseRisk: 14 },
  es: { name: 'Spain',          currency: 'EUR', region: 'Europe',        baseRisk: 13 },
  nl: { name: 'Netherlands',    currency: 'EUR', region: 'Europe',        baseRisk: 9  },
  ch: { name: 'Switzerland',    currency: 'CHF', region: 'Europe',        baseRisk: 6  },
  pt: { name: 'Portugal',       currency: 'EUR', region: 'Europe',        baseRisk: 10 },
  gr: { name: 'Greece',         currency: 'EUR', region: 'Europe',        baseRisk: 16 },
  se: { name: 'Sweden',         currency: 'SEK', region: 'Europe',        baseRisk: 8  },
  no: { name: 'Norway',         currency: 'NOK', region: 'Europe',        baseRisk: 7  },
  ae: { name: 'UAE',            currency: 'AED', region: 'Middle East',   baseRisk: 15 },
  th: { name: 'Thailand',       currency: 'THB', region: 'Asia Pacific',  baseRisk: 25 },
  vn: { name: 'Vietnam',        currency: 'VND', region: 'Asia Pacific',  baseRisk: 22 },
  id: { name: 'Indonesia',      currency: 'IDR', region: 'Asia Pacific',  baseRisk: 28 },
  my: { name: 'Malaysia',       currency: 'MYR', region: 'Asia Pacific',  baseRisk: 20 },
  kr: { name: 'South Korea',    currency: 'KRW', region: 'Asia Pacific',  baseRisk: 14 },
  in: { name: 'India',          currency: 'INR', region: 'Asia Pacific',  baseRisk: 32 },
  cn: { name: 'China',          currency: 'CNY', region: 'Asia Pacific',  baseRisk: 28 },
  br: { name: 'Brazil',         currency: 'BRL', region: 'South America', baseRisk: 40 },
  mx: { name: 'Mexico',         currency: 'MXN', region: 'North America', baseRisk: 38 },
  ar: { name: 'Argentina',      currency: 'ARS', region: 'South America', baseRisk: 35 },
  za: { name: 'South Africa',   currency: 'ZAR', region: 'Africa',        baseRisk: 45 },
  eg: { name: 'Egypt',          currency: 'EGP', region: 'Africa',        baseRisk: 40 },
  ma: { name: 'Morocco',        currency: 'MAD', region: 'Africa',        baseRisk: 30 },
  ke: { name: 'Kenya',          currency: 'KES', region: 'Africa',        baseRisk: 42 },
  tr: { name: 'Turkey',         currency: 'TRY', region: 'Middle East',   baseRisk: 36 },
  ph: { name: 'Philippines',    currency: 'PHP', region: 'Asia Pacific',  baseRisk: 32 },
  ru: { name: 'Russia',         currency: 'RUB', region: 'Europe',        baseRisk: 74 },
};

const POPULAR = ['jp', 'fr', 'ae', 'th', 'it', 'au', 'sg', 'gb'];
const MAJOR_FX = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'SGD', 'JPY'];
const REGIONS  = ['All', 'Asia Pacific', 'Europe', 'North America', 'South America', 'Middle East', 'Africa'];

//  Helpers 
function riskProfile(score: number) {
  if (score <= 20) return { label: 'Low Risk', color: '#22c55e', dim: 'rgba(34,197,94,0.15)',  icon: '🟢' };
  if (score <= 45) return { label: 'Watch',    color: '#f59e0b', dim: 'rgba(245,158,11,0.15)', icon: '🟡' };
  if (score <= 70) return { label: 'Advisory', color: '#ef4444', dim: 'rgba(239,68,68,0.15)',  icon: '🔴' };
  return              { label: 'High Risk', color: '#dc2626', dim: 'rgba(220,38,38,0.2)',   icon: '⛔' };
}

function weatherContribution(weatherSev?: string): number {
  if (weatherSev === 'advisory') return 10;
  if (weatherSev === 'watch')    return 18;
  if (weatherSev === 'warning')  return 28;
  return 0;
}

function alertContribution(alertCount: number): number {
  return Math.min(18, alertCount * 3);
}

function computeScore(baseRisk: number, weatherSev?: string, alertCount = 0) {
  const s = baseRisk + weatherContribution(weatherSev) + alertContribution(alertCount);
  return Math.min(99, Math.max(2, s));
}

type AlertType = 'Severe Weather' | 'Travel Advisory' | 'Security Risk' | 'Health Alert' | 'Transport Update';
function classifyAlert(title: string, body = ''): AlertType | null {
  const t = (title + ' ' + body).toLowerCase();
  if (/storm|hurricane|typhoon|earthquake|flood|wildfire|tsunami|tornado|cyclone/.test(t)) return 'Severe Weather';
  if (/travel ban|visa|border|restrict|evacuat|advisory level|do not travel/.test(t))      return 'Travel Advisory';
  if (/attack|shoot|terror|protest|riot|civil unrest|kidnap/.test(t))                      return 'Security Risk';
  if (/outbreak|epidemic|disease|virus|health emergency|quarantine/.test(t))               return 'Health Alert';
  if (/flight cancel|airport clos|train strike|transport shutdown/.test(t))                 return 'Transport Update';
  return null;
}

const ALERT_META: Record<AlertType, { color: string; emoji: string }> = {
  'Severe Weather':   { color: '#ef4444', emoji: '🌪️' },
  'Travel Advisory':  { color: '#f59e0b', emoji: '🛂' },
  'Security Risk':    { color: '#f97316', emoji: '🔒' },
  'Health Alert':     { color: '#22c55e', emoji: '🏥' },
  'Transport Update': { color: '#60a5fa', emoji: '✈️' },
};

function wmoEmoji(code: number | null): string {
  if (code === null) return '🌡️';
  if (code === 0)    return '☀️';
  if (code <= 2)     return '🌤️';
  if (code === 3)    return '☁️';
  if (code <= 48)    return '🌫️';
  if (code <= 57)    return '🌦️';
  if (code <= 67)    return '🌧️';
  if (code <= 77)    return '❄️';
  return '⛈️';
}

//  Score Gauge 
function ScoreGauge({ score, color }: { score: number; color: string }) {
  const R = 52, cx = 64, cy = 64;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - score / 100);
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="rm-gauge-svg">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="11" />
      <circle
        cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth="11"
        strokeDasharray={`${circ}`} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1), stroke 0.5s ease' }}
      />
      <text x={cx} y={cy - 7}  textAnchor="middle" fill="white"                  fontSize="28" fontWeight="800" fontFamily="Inter,sans-serif">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.38)" fontSize="10" fontFamily="Inter,sans-serif">/ 100</text>
    </svg>
  );
}

//  Main Page 
export default function RiskMonitor() {
  const isMobile = useMediaQuery('(max-width: 899px)');
  const [query,    setQuery]    = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [weather,  setWeather]  = useState<WeatherData | null>(null);
  const [currency, setCurrency] = useState<CurrencyData | null>(null);
  const [articles, setArticles] = useState<TwinglyDocument[]>([]);
  const [advisory, setAdvisory] = useState<AdvisoryData | null>(null);
  const [tab,          setTab]          = useState<'news' | 'alerts' | 'currency'>('news');
  const [regionFilter, setRegionFilter] = useState('All');
  const [recent,       setRecent]       = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('rm_recent') ?? '[]') as string[]; } catch { return []; }
  });

  const heroRef    = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const suggestions = query.length >= 1
    ? Object.entries(DESTS).filter(([, d]) => d.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const selectDest = useCallback(async (code: string) => {
    setSelected(code);
    setDropOpen(false);
    setQuery('');
    setTab('news');
    setLoading(true);
    setRecent(prev => {
      const updated = [code, ...prev.filter(c => c !== code)].slice(0, 4);
      try { localStorage.setItem('rm_recent', JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
    setWeather(null);
    setCurrency(null);
    setArticles([]);
    setAdvisory(null);
    try {
      const params: FetchNewsParams = { locations: [code], size: 15 };
      const [w, c, n, adv] = await Promise.all([
        fetchWeather(code).catch(() => null),
        fetchCurrency(code).catch(() => null),
        fetchNews(params).catch(() => null),
        fetchAdvisory(code).catch(() => null),
      ]);
      setWeather(w);
      setCurrency(c);
      setArticles(n?.documents ?? []);
      setAdvisory(adv);
    } finally {
      setLoading(false);
    }
  }, []);

  // Hero entrance
  useEffect(() => {
    gsap.to('.rm-hero__content > *', { y: 0, opacity: 1, stagger: 0.1, duration: 0.55, ease: 'power3.out', delay: 0.1 });
  }, []);

  // Results entrance
  useEffect(() => {
    if (!selected || !resultsRef.current) return;
    gsap.fromTo(resultsRef.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.48, ease: 'power3.out' });
    gsap.from('.rm-stat-panel', { y: 22, opacity: 0, stagger: 0.07, duration: 0.4, ease: 'power3.out', delay: 0.15 });
  }, [selected]);

  const dest    = selected ? DESTS[selected] : null;
  const alerts  = articles.filter(a => classifyAlert(a.title, a.summary ?? a.text ?? ''));
  // Ground the baseline in live official advisories when available; the static
  // per-country estimate is only the fallback for when the feed is unreachable.
  const baseRisk   = advisory ? advisoryScoreToBaseRisk(advisory.score) : (dest?.baseRisk ?? 0);
  const weatherAdd = weatherContribution(weather?.severity ?? undefined);
  const alertsAdd  = alertContribution(alerts.length);
  const score   = dest ? computeScore(baseRisk, weather?.severity ?? undefined, alerts.length) : 0;
  const risk    = riskProfile(score);
  const fxPairs = MAJOR_FX.filter(m => m !== dest?.currency && currency?.rates[m]);

  const DEST_ENTRIES  = Object.entries(DESTS);
  const statsLow      = DEST_ENTRIES.filter(([, d]) => d.baseRisk <= 20).length;
  const statsWatch    = DEST_ENTRIES.filter(([, d]) => d.baseRisk > 20 && d.baseRisk <= 45).length;
  const statsAdvisory = DEST_ENTRIES.filter(([, d]) => d.baseRisk > 45 && d.baseRisk <= 70).length;
  const statsHigh     = DEST_ENTRIES.filter(([, d]) => d.baseRisk > 70).length;
  const filteredDests = DEST_ENTRIES.filter(([, d]) => regionFilter === 'All' || d.region === regionFilter);

  if (isMobile) {
    return (
      <Box sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100dvh', px: 3, textAlign: 'center', gap: 2.5,
      }}>
        <Typography sx={{ fontSize: '3rem' }}>🖥️</Typography>
        <Typography sx={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: '1.4rem' }}>
          Best on Desktop
        </Typography>
        <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: 'rgba(0,0,0,0.55)', maxWidth: 300, lineHeight: 1.7 }}>
          The Risk Monitor is designed for larger screens. Please open Tripician on your computer to access this feature.
        </Typography>
      </Box>
    );
  }

  return (
    <div className="rm-page">

      {/*  HERO  */}
      <div className="rm-hero" ref={heroRef}>
        <div className="rm-hero__dots" aria-hidden="true" />
        <div className="rm-hero__glow"  aria-hidden="true" />
        <div className="rm-hero__content">

          <div className="rm-hero__eyebrow">
            <span className="rm-hero__pulse" aria-hidden="true" />
            LIVE INTELLIGENCE
          </div>

          <h1 className="rm-hero__title">
            Travel Risk Monitor
            <span className="rm-hero__beta">BETA</span>
          </h1>
          <p className="rm-hero__sub">
            Live safety, weather &amp; news intelligence for any destination - know before you go.
          </p>

          {/*  Research caution notice  */}
          <div className="rm-hero__caution">
            <span>
              <strong>⚠️ For reference only.</strong> Scores blend aggregated official government advisories with automated weather and news signals - they may be incomplete or lag real events. Always confirm with your government's own travel advisory before making decisions.
            </span>
          </div>

          {/* Search input */}
          <div className={`rm-search-wrap${dropOpen && suggestions.length > 0 ? ' rm-search-wrap--open' : ''}`}>
            <SearchRoundedIcon className="rm-search-icon" />
            <input
              className="rm-search-input"
              placeholder="Where are you headed? Japan, UAE, Brazil…"
              value={query}
              onChange={e => { setQuery(e.target.value); setDropOpen(true); }}
              onFocus={() => setDropOpen(true)}
              onBlur={() => setTimeout(() => setDropOpen(false), 180)}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button className="rm-search-clear" onClick={() => setQuery('')} tabIndex={-1}>
                <CloseRoundedIcon fontSize="small" />
              </button>
            )}
            {dropOpen && suggestions.length > 0 && (
              <ul className="rm-dropdown">
                {suggestions.map(([code, d]) => (
                  <li key={code} className="rm-dropdown__item" onMouseDown={() => selectDest(code)}>
                    <span className="rm-dropdown__flag">{flagEmojiFromCode(code)}</span>
                    <span className="rm-dropdown__name">{d.name}</span>
                    <span className="rm-dropdown__region">{d.region}</span>
                    <span className={`rm-dropdown__risk`} style={{ color: riskProfile(d.baseRisk).color }}>
                      {riskProfile(d.baseRisk).label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick-pick chips */}
          <div className="rm-hero__chips">
            <span className="rm-hero__chips-label">Popular</span>
            {POPULAR.map(code => (
              <button
                key={code}
                className={`rm-hero-chip${selected === code ? ' rm-hero-chip--active' : ''}`}
                onClick={() => selectDest(code)}
              >
                {flagEmojiFromCode(code)} {DESTS[code].name}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/*  GLOBAL STATS STRIP  */}
      <div className="rm-stats-strip">
        <div className="rm-stats-strip__item">
          <span className="rm-stats-strip__num">{Object.keys(DESTS).length}</span>
          <span className="rm-stats-strip__lbl">Destinations</span>
        </div>
        <div className="rm-stats-strip__sep" />
        <div className="rm-stats-strip__item">
          <span className="rm-stats-strip__dot" style={{ background: '#22c55e' }} />
          <span className="rm-stats-strip__num" style={{ color: '#22c55e' }}>{statsLow}</span>
          <span className="rm-stats-strip__lbl">Low Risk</span>
        </div>
        <div className="rm-stats-strip__sep" />
        <div className="rm-stats-strip__item">
          <span className="rm-stats-strip__dot" style={{ background: '#f59e0b' }} />
          <span className="rm-stats-strip__num" style={{ color: '#f59e0b' }}>{statsWatch}</span>
          <span className="rm-stats-strip__lbl">Watch</span>
        </div>
        <div className="rm-stats-strip__sep" />
        <div className="rm-stats-strip__item">
          <span className="rm-stats-strip__dot" style={{ background: '#ef4444' }} />
          <span className="rm-stats-strip__num" style={{ color: '#ef4444' }}>{statsAdvisory}</span>
          <span className="rm-stats-strip__lbl">Advisory</span>
        </div>
        <div className="rm-stats-strip__sep" />
        <div className="rm-stats-strip__item">
          <span className="rm-stats-strip__dot" style={{ background: '#dc2626' }} />
          <span className="rm-stats-strip__num" style={{ color: '#dc2626' }}>{statsHigh}</span>
          <span className="rm-stats-strip__lbl">High Risk</span>
        </div>
      </div>
      {/*  RESULTS  */}
      {selected && dest && (
        <div className="rm-results" ref={resultsRef}>

          {/* Destination header bar */}
          <div className="rm-dest-bar">
            <div className="rm-dest-bar__left">
              <span className="rm-dest-bar__flag">{flagEmojiFromCode(selected)}</span>
              <div>
                <p className="rm-dest-bar__name">{dest.name}</p>
                <p className="rm-dest-bar__region">{dest.region} · {dest.currency}</p>
              </div>
              <span className="rm-dest-bar__live"><span className="rm-dest-bar__live-dot" />LIVE</span>
            </div>
            <p className="rm-dest-bar__updated">
              Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Official advisory headline (aggregated government guidance) */}
          {!loading && advisory?.message && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', marginBottom: 14,
              borderRadius: 12,
              background: risk.dim,
              border: `1px solid ${risk.color}33`,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{risk.icon}</span>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>
                <strong style={{ color: risk.color }}>Official guidance:</strong> {advisory.message}
              </span>
            </div>
          )}

          {/*  4-panel stat row  */}
          <div className="rm-stat-row">

            {/* Gauge */}
            <div className="rm-stat-panel rm-stat-panel--gauge" style={{ '--risk-color': risk.color, '--risk-dim': risk.dim } as React.CSSProperties}>
              {loading
                ? <Skeleton variant="circular" width={128} height={128} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
                : <ScoreGauge score={score} color={risk.color} />
              }
              <div className="rm-gauge-meta">
                <span className="rm-gauge-badge" style={{ color: risk.color, background: risk.dim, borderColor: `${risk.color}44` }}>
                  {loading ? '-' : risk.label}
                </span>
                <span className="rm-gauge-label-text">Risk Score</span>
              </div>

              {/* How the score is built - transparency beats a magic number */}
              {!loading && (
                <div style={{ marginTop: 12, width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {([
                    {
                      label: advisory ? `Official advisories (${advisory.score.toFixed(1)}/5)` : 'Baseline estimate',
                      value: baseRisk,
                    },
                    { label: 'Weather conditions', value: weatherAdd },
                    { label: `News alerts (${alerts.length})`, value: alertsAdd },
                  ]).map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                      <span>{row.label}</span>
                      <span style={{ fontWeight: 700, color: row.value > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>
                        {row.value > 0 ? `+${row.value}` : '0'}
                      </span>
                    </div>
                  ))}
                  {advisory ? (
                    <a
                      href={advisory.sourceUrl || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.42)', textDecoration: 'none', marginTop: 4 }}
                    >
                      {advisory.sourcesActive > 0
                        ? `Aggregated from ${advisory.sourcesActive} official government source${advisory.sourcesActive === 1 ? '' : 's'} ↗`
                        : 'View official advisory sources ↗'}
                    </a>
                  ) : (
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                      Live advisory feed unavailable - using research baseline
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Weather */}
            <div className="rm-stat-panel rm-stat-panel--weather">
              <p className="rm-stat-panel__title">🌤️ Weather</p>
              {loading ? (
                <>
                  <Skeleton width="55%" height={34} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
                  <Skeleton width="75%" sx={{ bgcolor: 'rgba(255,255,255,0.07)', mt: 0.5 }} />
                </>
              ) : weather ? (
                <>
                  <div className="rm-weather-main">
                    <span className="rm-weather-emoji">{wmoEmoji(weather.conditionCode)}</span>
                    <span className="rm-weather-temp">
                      {weather.temperatureC != null ? `${Math.round(weather.temperatureC)}°C` : '-'}
                    </span>
                  </div>
                  <p className="rm-weather-desc">{weather.conditionText ?? 'No data'}</p>
                  <p className="rm-weather-wind">💨 {weather.windKph != null ? `${Math.round(weather.windKph)} km/h` : '-'}</p>
                  {weather.severity && weather.severity !== 'normal' && (
                    <span className="rm-weather-sev" data-sev={weather.severity}>
                      ⚠️ {weather.severity.charAt(0).toUpperCase() + weather.severity.slice(1)}
                    </span>
                  )}
                </>
              ) : <p className="rm-stat-empty">Unavailable</p>}
            </div>

            {/* Active alerts count */}
            <div className="rm-stat-panel rm-stat-panel--alert-count">
              <p className="rm-stat-panel__title">⚠️ Active Alerts</p>
              {loading
                ? <Skeleton width="40%" height={48} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
                : <span className={`rm-alert-big-num${alerts.length > 0 ? ' rm-alert-big-num--active' : ''}`}>{alerts.length}</span>
              }
              <p className="rm-stat-panel__sub">
                {loading ? '' : alerts.length === 0 ? 'No active alerts' : `${alerts.length} alert${alerts.length > 1 ? 's' : ''} detected`}
              </p>
            </div>

            {/* Currency snapshot */}
            <div className="rm-stat-panel rm-stat-panel--fx">
              <p className="rm-stat-panel__title">💱 {dest.currency} Exchange</p>
              {loading || !currency
                ? <>
                    <Skeleton width="70%" height={22} sx={{ bgcolor: 'rgba(255,255,255,0.07)', mb: 0.5 }} />
                    <Skeleton width="60%" height={22} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
                  </>
                : fxPairs.slice(0, 3).map(m => {
                    const rate = currency.rates[m];
                    if (!rate) return null;
                    return (
                      <div key={m} className="rm-fx-row">
                        <span className="rm-fx-from">1 {dest.currency}</span>
                        <span className="rm-fx-eq">=</span>
                        <span className="rm-fx-to">{rate < 0.01 ? rate.toFixed(6) : rate < 1 ? rate.toFixed(4) : rate.toFixed(2)}</span>
                        <span className="rm-fx-ccy">{m}</span>
                      </div>
                    );
                  })
              }
            </div>
          </div>

          {/*  Tab bar  */}
          <div className="rm-tab-bar">
            {(['news', 'alerts', 'currency'] as const).map(t => (
              <button
                key={t}
                className={`rm-tab-btn${tab === t ? ' rm-tab-btn--active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'news'     && `📰 News Feed`}
                {t === 'alerts'   && `⚠️ Alerts (${loading ? '…' : alerts.length})`}
                {t === 'currency' && `💱 Currency`}
              </button>
            ))}
          </div>

          {/*  Tab content  */}
          <div className="rm-tab-body">

            {/* NEWS */}
            {tab === 'news' && (
              <div className="rm-news-grid">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="rm-news-card rm-news-card--skel">
                        <Skeleton width="90%" height={18} sx={{ bgcolor: 'rgba(255,255,255,0.07)', mb: 1 }} />
                        <Skeleton width="55%" height={13} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
                      </div>
                    ))
                  : articles.length === 0
                    ? <div className="rm-empty">No news articles found for {dest.name}</div>
                    : articles.slice(0, 12).map((a, i) => {
                        const type = classifyAlert(a.title, a.summary ?? a.text ?? '');
                        return (
                          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="rm-news-card">
                            {type && (
                              <span
                                className="rm-news-alert-tag"
                                style={{ color: ALERT_META[type].color, background: `${ALERT_META[type].color}1a`, borderColor: `${ALERT_META[type].color}33` }}
                              >
                                {ALERT_META[type].emoji} {type}
                              </span>
                            )}
                            <p className="rm-news-title">{a.title}</p>
                            <div className="rm-news-meta">
                              <span>{a.site_name ?? 'News'}</span>
                              <span>{new Date(a.timestamp).toLocaleDateString()}</span>
                              <OpenInNewRoundedIcon fontSize="inherit" className="rm-news-ext-icon" />
                            </div>
                          </a>
                        );
                      })
                }
              </div>
            )}

            {/* ALERTS */}
            {tab === 'alerts' && (
              <div className="rm-alerts-panel">
                {loading
                  ? <Skeleton width="100%" height={100} sx={{ bgcolor: 'rgba(255,255,255,0.07)', borderRadius: 2 }} />
                  : alerts.length === 0
                    ? (
                      <div className="rm-empty rm-empty--safe">
                        <span className="rm-empty__icon">✅</span>
                        <span className="rm-empty__title">No Active Alerts for {dest.name}</span>
                        <span className="rm-empty__sub">Conditions appear normal. Always verify with official government sources before travel.</span>
                      </div>
                    )
                    : alerts.map((a, i) => {
                        const type = classifyAlert(a.title, a.summary ?? a.text ?? '')!;
                        const meta = ALERT_META[type];
                        return (
                          <div key={i} className="rm-alert-card" style={{ borderColor: `${meta.color}30`, '--ac': meta.color } as React.CSSProperties}>
                            <div className="rm-alert-card__top">
                              <span className="rm-alert-card__type" style={{ color: meta.color, background: `${meta.color}18`, borderColor: `${meta.color}30` }}>
                                {meta.emoji} {type}
                              </span>
                              <span className="rm-alert-card__date">{new Date(a.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="rm-alert-card__title">{a.title}</p>
                            {a.summary && <p className="rm-alert-card__summary">{a.summary}</p>}
                            <a href={a.url} target="_blank" rel="noopener noreferrer" className="rm-alert-card__link" style={{ color: meta.color }}>
                              Full report <OpenInNewRoundedIcon fontSize="inherit" />
                            </a>
                          </div>
                        );
                      })
                }
              </div>
            )}

            {/* CURRENCY */}
            {tab === 'currency' && (
              <div className="rm-currency-panel">
                {loading || !currency
                  ? <Skeleton width="100%" height={220} sx={{ bgcolor: 'rgba(255,255,255,0.07)', borderRadius: 2 }} />
                  : <>
                      <div className="rm-currency-hero">
                        <span className="rm-currency-flag">{flagEmojiFromCode(selected)}</span>
                        <div>
                          <p className="rm-currency-ccy">{dest.currency}</p>
                          <p className="rm-currency-name">{dest.name}</p>
                        </div>
                      </div>
                      <div className="rm-currency-grid">
                        {fxPairs.map(m => {
                          const rate = currency.rates[m];
                          if (!rate) return null;
                          return (
                            <div key={m} className="rm-currency-cell">
                              <span className="rm-currency-cell__from">1 {dest.currency}</span>
                              <span className="rm-currency-cell__eq">=</span>
                              <span className="rm-currency-cell__rate">
                                {rate < 0.001 ? rate.toFixed(6) : rate < 1 ? rate.toFixed(4) : rate.toFixed(2)}
                              </span>
                              <span className="rm-currency-cell__ccy">{m}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="rm-currency-disclaimer">Rates updated hourly · open.er-api.com · For reference only</p>
                    </>
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/*  WELCOME (no destination selected)  */}
      {!selected && (
        <div className="rm-welcome">

          {/* Recently Checked */}
          {recent.length > 0 && (
            <div className="rm-recent">
              <p className="rm-recent__heading">Recently Checked</p>
              <div className="rm-recent-row">
                {recent.map(code => {
                  const d = DESTS[code];
                  if (!d) return null;
                  const rp = riskProfile(d.baseRisk);
                  return (
                    <button key={code} className="rm-recent-chip" onClick={() => selectDest(code)}>
                      <span className="rm-recent-chip__flag">{flagEmojiFromCode(code)}</span>
                      <span className="rm-recent-chip__name">{d.name}</span>
                      <span className="rm-recent-chip__badge" style={{ color: rp.color, background: rp.dim }}>
                        {rp.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Header: title + legend */}
          <div className="rm-welcome__header">
            <p className="rm-welcome__heading">Scout the World</p>
            <div className="rm-legend">
              {([
                { label: 'Low Risk',  color: '#22c55e' },
                { label: 'Watch',     color: '#f59e0b' },
                { label: 'Advisory',  color: '#ef4444' },
                { label: 'High Risk', color: '#dc2626' },
              ] as const).map(l => (
                <span key={l.label} className="rm-legend__item">
                  <span className="rm-legend__dot" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* Region filter tabs */}
          <div className="rm-region-tabs">
            {REGIONS.map(r => (
              <button
                key={r}
                className={`rm-region-tab${regionFilter === r ? ' rm-region-tab--active' : ''}`}
                onClick={() => setRegionFilter(r)}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Destination grid */}
          <div className="rm-welcome-grid">
            {filteredDests.map(([code, d]) => {
              const rp = riskProfile(d.baseRisk);
              return (
                <button
                  key={code}
                  className="rm-welcome-card"
                  onClick={() => selectDest(code)}
                  style={{ '--risk-color': rp.color, '--risk-dim': rp.dim } as React.CSSProperties}
                >
                  <div className="rm-welcome-card__top">
                    <span className="rm-welcome-card__flag">{flagEmojiFromCode(code)}</span>
                    <span className="rm-welcome-card__score" style={{ color: rp.color }}>{d.baseRisk}</span>
                  </div>
                  <span className="rm-welcome-card__name">{d.name}</span>
                  <span className="rm-welcome-card__region">{d.region}</span>
                  <div className="rm-welcome-card__bar-wrap">
                    <div className="rm-welcome-card__bar" style={{ width: `${Math.min(d.baseRisk, 100)}%`, background: rp.color }} />
                  </div>
                  <span className="rm-welcome-card__risk" style={{ color: rp.color, background: rp.dim }}>
                    {rp.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
