import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { loadNews, setLocations, type NewsArticle } from '../../store/newsSlice';
import { Box, Typography, Card, CardActionArea, Skeleton, Chip, Divider, Button, Stack } from '@mui/material';
import { fetchWeather } from '../../services/APIs/weather/weatherService';
import { fetchCurrency } from '../../services/APIs/currency/currencyService';
import { flagEmojiFromCode, countryNameFromCode, countryCodeFromName } from '../../utils/countryFlags';

const MAX_HERO = 4;
const TRENDING_COUNT = 5;
const MAJOR_FX = ['USD','EUR','GBP'];

interface CountryMetaDefinition {
  name: string;
  currency: string;
  languages: string[];
  region: string;
}

const COUNTRY_META: Record<string, CountryMetaDefinition> = {
  us: { name: 'United States', currency: 'USD', languages: ['English'], region: 'North America' },
  gb: { name: 'United Kingdom', currency: 'GBP', languages: ['English'], region: 'Europe' },
  fr: { name: 'France', currency: 'EUR', languages: ['French'], region: 'Europe' },
  de: { name: 'Germany', currency: 'EUR', languages: ['German'], region: 'Europe' },
  es: { name: 'Spain', currency: 'EUR', languages: ['Spanish'], region: 'Europe' },
  it: { name: 'Italy', currency: 'EUR', languages: ['Italian'], region: 'Europe' },
  jp: { name: 'Japan', currency: 'JPY', languages: ['Japanese'], region: 'Asia Pacific' },
  cn: { name: 'China', currency: 'CNY', languages: ['Mandarin'], region: 'Asia Pacific' },
  in: { name: 'India', currency: 'INR', languages: ['Hindi', 'English'], region: 'Asia Pacific' },
  ca: { name: 'Canada', currency: 'CAD', languages: ['English', 'French'], region: 'North America' },
  au: { name: 'Australia', currency: 'AUD', languages: ['English'], region: 'Asia Pacific' },
  nz: { name: 'New Zealand', currency: 'NZD', languages: ['English', 'Te Reo Māori'], region: 'Asia Pacific' },
  sg: { name: 'Singapore', currency: 'SGD', languages: ['English', 'Mandarin'], region: 'Asia Pacific' },
  ae: { name: 'United Arab Emirates', currency: 'AED', languages: ['Arabic', 'English'], region: 'Middle East' },
  br: { name: 'Brazil', currency: 'BRL', languages: ['Portuguese'], region: 'South America' },
  mx: { name: 'Mexico', currency: 'MXN', languages: ['Spanish'], region: 'North America' },
  za: { name: 'South Africa', currency: 'ZAR', languages: ['English', 'Zulu'], region: 'Africa' },
  th: { name: 'Thailand', currency: 'THB', languages: ['Thai'], region: 'Asia Pacific' }
};

type SeverityLevel = 'normal' | 'advisory' | 'watch' | 'warning';

interface CountryIntelState {
  code: string;
  name: string;
  flag: string;
  region: string;
  currency: string;
  languages: string[];
  weather: {
    loading: boolean;
    temperatureC: number | null;
    conditionText: string | null;
    windKph: number | null;
    severity: SeverityLevel;
    icon?: string;
    updated?: string;
    error?: string;
  };
  currencyRates: {
    loading: boolean;
    base: string;
    rates: Record<string, number>;
    fetched?: string;
    error?: string;
  };
}

const getCountryMeta = (code: string): Omit<CountryIntelState, 'weather' | 'currencyRates'> => {
  const normalized = code.toLowerCase();
  const meta = COUNTRY_META[normalized];
  const fallbackName = countryNameFromCode(normalized.toUpperCase()) || normalized.toUpperCase();
  const iso2 = (() => {
    if (normalized.length === 2) return normalized.toUpperCase();
    const byName = countryCodeFromName(fallbackName);
    if (byName) return byName.toUpperCase();
    if (normalized.length === 3) {
      const nameFromCode = countryNameFromCode(normalized.toUpperCase());
      if (nameFromCode) {
        const deduced = countryCodeFromName(nameFromCode);
        if (deduced) return deduced.toUpperCase();
      }
      return normalized.slice(0, 2).toUpperCase();
    }
    return '';
  })();
  const currency = meta?.currency || 'USD';
  return {
    code: normalized,
    name: meta?.name || fallbackName,
    flag: iso2 ? flagEmojiFromCode(iso2) : '',
    region: meta?.region || 'Global',
    currency,
    languages: meta?.languages || ['English']
  };
};

function formatDate(iso?: string){
  if(!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function normalizeLocationCode(value?: string): string {
  if (!value) return '';
  const lower = value.toLowerCase();
  const match = lower.match(/[a-z]{2}/);
  return match ? match[0] : '';
}

interface NewsPanelProps {
  selectedCountries?: string[];
}

const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
};

const classifyImpact = (article: NewsArticle): { label: string; color: 'default' | 'warning' | 'error' | 'info'; } | null => {
  const source = `${article.title || ''} ${article.summary || ''} ${article.section_name || ''}`.toLowerCase();
  if(/(hurricane|typhoon|cyclone|storm|tornado|flood|tsunami|earthquake|wildfire|eruption)/i.test(source)) {
    return { label: 'Severe Weather', color: 'error' };
  }
  if(/(travel ban|border closure|visa|restriction|curfew|martial law|state of emergency)/i.test(source)) {
    return { label: 'Travel Advisory', color: 'warning' };
  }
  if(/(strike|protest|riot|security|attack|terror|kidnap|shooting)/i.test(source)) {
    return { label: 'Security Risk', color: 'warning' };
  }
  if(/(health alert|outbreak|covid|disease|epidemic)/i.test(source)) {
    return { label: 'Health Alert', color: 'warning' };
  }
  if(/(flight|airport|airline|cancellation|delay|railway|transport)/i.test(source)) {
    return { label: 'Transport Update', color: 'info' };
  }
  return null;
};

export const NewsPanel: React.FC<NewsPanelProps> = ({ selectedCountries }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { articles, status, error, locations, lastFetched } = useSelector((s: RootState) => s.news);

  const normalizedSelection = useMemo(() => {
    if (!selectedCountries || selectedCountries.length === 0) return [];
    const codes = selectedCountries
      .map(entry => {
        const raw = (entry || '').trim();
        if (!raw) return '';
        const codeFromName = countryCodeFromName(raw);
        if (codeFromName) return codeFromName;
        return raw;
      })
      .map(code => code.toLowerCase())
      .map(code => code.length === 3 ? code.slice(0, 2) : code)
      .filter(code => code.length === 2);
    return Array.from(new Set(codes));
  }, [selectedCountries]);

  const propControlled = Array.isArray(selectedCountries);

  const targetLocations = useMemo(() => {
    if (propControlled) return normalizedSelection;
    return locations.length ? locations : normalizedSelection;
  }, [propControlled, normalizedSelection, locations]);

  const [countryIntel, setCountryIntel] = React.useState<Record<string, CountryIntelState>>({});

  useEffect(() => {
    if (!arraysEqual(locations, targetLocations)) {
      dispatch(setLocations(targetLocations));
    }
  }, [dispatch, locations, targetLocations]);

  useEffect(() => {
    if (!targetLocations.length) return;
    if (!arraysEqual(locations, targetLocations)) return;
    if (status === 'idle' || !lastFetched) {
      dispatch(loadNews({ locations: targetLocations }));
      return;
    }
    if (!articles.length) {
      dispatch(loadNews({ locations: targetLocations }));
    }
  }, [dispatch, status, lastFetched, targetLocations, locations, articles.length]);

  useEffect(() => {
    if (!targetLocations.length) {
      setCountryIntel({});
      return;
    }
    let cancelled = false;
    setCountryIntel(prev => {
      const next: Record<string, CountryIntelState> = {};
      targetLocations.forEach(code => {
        const meta = getCountryMeta(code);
        const previous = prev[code];
        next[code] = {
          ...meta,
          weather: previous?.weather
            ? { ...previous.weather, loading: true, error: undefined }
            : { loading: true, temperatureC: null, conditionText: null, windKph: null, severity: 'normal' },
          currencyRates: previous?.currencyRates
            ? { ...previous.currencyRates, loading: true, error: undefined }
            : { loading: true, base: meta.currency, rates: {} }
        };
      });
      return next;
    });

    (async () => {
      const weatherResults = await Promise.all(
        targetLocations.map(async code => ({ code, data: await fetchWeather(code) }))
      );
      if (cancelled) return;
      setCountryIntel(prev => {
        const next = { ...prev };
        weatherResults.forEach(({ code, data }) => {
          const meta = getCountryMeta(code);
          next[code] = {
            ...next[code],
            ...meta,
            weather: {
              loading: false,
              temperatureC: data.temperatureC,
              conditionText: data.conditionText,
              windKph: data.windKph,
              severity: (data.severity || 'normal') as SeverityLevel,
              icon: data.icon,
              updated: data.updated,
              error: data.conditionText ? undefined : next[code]?.weather?.error
            },
            currencyRates: next[code]?.currencyRates || { loading: true, base: meta.currency, rates: {} }
          };
        });
        return next;
      });

      const currencyResults = await Promise.all(
        targetLocations.map(async code => ({ code, data: await fetchCurrency(code) }))
      );
      if (cancelled) return;
      setCountryIntel(prev => {
        const next = { ...prev };
        currencyResults.forEach(({ code, data }) => {
          const meta = getCountryMeta(code);
          next[code] = {
            ...next[code],
            ...meta,
            currencyRates: {
              loading: false,
              base: data.base,
              rates: data.rates || {},
              fetched: data.fetched,
              error: undefined
            },
            weather: next[code]?.weather || { loading: true, temperatureC: null, conditionText: null, windKph: null, severity: 'normal' }
          };
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [targetLocations]);

  const activeArticles = useMemo(() => {
    if (!targetLocations.length) return [];
    const allowed = new Set(targetLocations.map(loc => loc.toLowerCase()));
    return articles.filter(a => {
      const loc = normalizeLocationCode(a.location_code);
      if (!loc) return false;
      return allowed.has(loc);
    });
  }, [articles, targetLocations]);

  const { heroes, latest, trending, filteredCount, droppedCount, rawCount, locationStats, alertCount } = useMemo(() => {
    if(!targetLocations.length) return { heroes: [], latest: [], trending: [], filteredCount: 0, droppedCount: 0, rawCount: 0, locationStats: {}, alertCount: 0 };
    if(!activeArticles.length) return { heroes: [], latest: [], trending: [], filteredCount: 0, droppedCount: 0, rawCount: 0, locationStats: {}, alertCount: 0 };
    // Relaxed business filter: only exclude explicit financial performance or stock/IPO/merger style news
  const businessBlock = /(quarterly\s+results|q[1-4]\s+results|earnings\s+report|earnings\b|ipo\b|merger\b|acquisition\b|shareholder\b|dividend\b|stock\s+price|stocks?\b|share\s+price|revenue\b|net\s+income|profit\b|loss(es)?\b|financial\s+results|guidance\s+update|economic\s+outlook|gdp\b|inflation\b|interest\s+rate|central\s+bank)/i;
    let dropped = 0;
    const filtered = activeArticles.filter(a => {
      const hay = `${a.title || ''} ${a.summary || ''} ${a.section_name || ''}`;
      const isBusiness = businessBlock.test(hay);
      if(isBusiness) { dropped++; return false; }
      return true;
    });
    const locationStats = filtered.reduce<Record<string, number>>((acc, article) => {
      const key = normalizeLocationCode(article.location_code);
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const alertCount = filtered.reduce((acc, article) => classifyImpact(article) ? acc + 1 : acc, 0);
    const sorted = [...filtered].sort((a,b) => {
      const ra = a.readership?.number_of_potential_readers || 0;
      const rb = b.readership?.number_of_potential_readers || 0;
      return rb - ra;
    });
    const heroes = sorted.slice(0, MAX_HERO);
    const rest = sorted.slice(MAX_HERO);
    const trending = sorted.slice(0, TRENDING_COUNT);
    // eslint-disable-next-line no-console
    console.log('[NewsPanel] Filter diagnostics raw:', activeArticles.length, 'kept:', filtered.length, 'dropped:', dropped);
    return { heroes, latest: rest, trending, filteredCount: filtered.length, droppedCount: dropped, rawCount: activeArticles.length, locationStats, alertCount };
  }, [activeArticles, targetLocations]);

  const loading = status === 'loading';
  const activeIntelList = useMemo(() => {
    return targetLocations.map(code => {
      const existing = countryIntel[code];
      if (existing) return existing;
      const meta = getCountryMeta(code);
      return {
        ...meta,
        weather: { loading: true, temperatureC: null, conditionText: null, windKph: null, severity: 'normal' as SeverityLevel },
        currencyRates: { loading: true, base: meta.currency, rates: {} }
      } as CountryIntelState;
    });
  }, [targetLocations, countryIntel]);

  const coverageStats = useMemo(() => {
    return activeIntelList.map(intel => ({
      code: intel.code,
      name: intel.name,
      flag: intel.flag,
      stories: locationStats[intel.code] || 0
    }));
  }, [activeIntelList, locationStats]);

  const countriesCovered = coverageStats.filter(item => item.stories > 0).length;
  const coverageCount = countriesCovered || targetLocations.length;
  const coverageMap = useMemo(() => {
    return coverageStats.reduce<Record<string, number>>((acc, item) => {
      acc[item.code] = item.stories;
      return acc;
    }, {});
  }, [coverageStats]);

  const ArticleImage: React.FC<{ src?: string; alt: string; mode?: 'hero'|'thumb'; sx?: any }> = ({ src, alt, mode='thumb', sx }) => {
    const [error, setError] = React.useState(false);
    const display = !src || error ? null : src;
    const initial = alt?.trim()?.charAt(0)?.toUpperCase() || 'N';
    return (
      <Box sx={{ position:'relative', background: display? 'transparent':'linear-gradient(135deg,#1e3a8a,#0369a1)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, letterSpacing:.5, fontSize: mode==='hero'? 48:22, userSelect:'none', ...sx }}>
        {display && (
          <Box component='img' src={display} alt={alt} loading='lazy' onError={()=> setError(true)} sx={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
        )}
        {!display && (
          <Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>{initial}</Box>
        )}
        {mode==='hero' && <Box sx={{ position:'absolute', inset:0, background: display? 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.65) 100%)':'linear-gradient(180deg, rgba(0,0,0,.1) 0%, rgba(0,0,0,.65) 100%)' }} />}
      </Box>
    );
  };

  const buildStoryChips = (article: NewsArticle, size: 'small' | 'medium' = 'small', mode: 'hero' | 'list' = 'list') => {
    const chips: Array<{ key: string; props: Record<string, any> }> = [];
    const impact = classifyImpact(article);
    if (impact) {
      const color = impact.color === 'error' ? 'error' : impact.color === 'warning' ? 'warning' : impact.color === 'info' ? 'info' : 'default';
      const sx = mode === 'hero'
        ? { bgcolor: 'rgba(148, 163, 184, 0.18)', color: '#f8fafc', fontSize: size === 'small' ? 11 : 12, border: 'none' }
        : { fontSize: size === 'small' ? 11 : 12 };
      chips.push({ key: 'impact', props: { label: impact.label, color, variant: color === 'default' ? 'outlined' : 'filled', sx } });
    }
    const locCode = normalizeLocationCode(article.location_code);
    if (locCode) {
      const meta = getCountryMeta(locCode);
      const sx = mode === 'hero'
        ? { bgcolor: 'rgba(15,23,42,0.45)', color: '#e2e8f0', borderColor: 'rgba(226,232,240,0.32)', fontSize: size === 'small' ? 11 : 12 }
        : { fontSize: size === 'small' ? 11 : 12 };
      chips.push({ key: 'location', props: { label: `${meta.flag ? `${meta.flag} ` : ''}${meta.name}`, variant: 'outlined', sx } });
    }
    if (article.language_code) {
      const sx = mode === 'hero'
        ? { bgcolor: 'rgba(15,23,42,0.45)', color: '#e2e8f0', borderColor: 'rgba(148,163,184,0.35)', fontSize: size === 'small' ? 11 : 12 }
        : { fontSize: size === 'small' ? 11 : 12 };
      chips.push({ key: 'lang', props: { label: `Lang: ${article.language_code.toUpperCase()}`, variant: 'outlined', sx } });
    }
    return chips.map((chip, idx) => (
      <Chip
        key={`${article.article_id}-${chip.key}-${idx}`}
        size={size}
        {...chip.props}
      />
    ));
  };

  const renderWeatherGlyph = (icon?: string) => {
    switch (icon) {
      case 'thunder': return '⛈️';
      case 'heavy-rain': return '🌧️';
      case 'rain': return '🌦️';
      case 'snow': return '❄️';
      case 'fog': return '🌫️';
      case 'drizzle': return '💧';
      case 'clear': return '☀️';
      case 'partly': return '⛅';
      case 'cloudy': return '☁️';
      default: return 'ℹ️';
    }
  };

  const formatFxRate = (value?: number) => {
    if (value == null || Number.isNaN(value)) return '—';
    if (value >= 100) return value.toFixed(0);
    if (value >= 10) return value.toFixed(2);
    if (value >= 1) return value.toFixed(3);
    return value.toFixed(4);
  };

  const severityColorMap: Record<SeverityLevel, 'default' | 'info' | 'warning' | 'error'> = {
    normal: 'default',
    advisory: 'info',
    watch: 'warning',
    warning: 'error'
  };

  const HeroSkeletons = (
    <Box sx={{
      mb: 2,
      display: 'grid',
      gap: 2,
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }
    }}>
      {Array.from({ length: MAX_HERO }).map((_, i) => (
        <Box key={i}>
          <Skeleton variant="rectangular" height={140} />
          <Skeleton width="80%" />
          <Skeleton width="60%" />
        </Box>
      ))}
    </Box>
  );

  if (!targetLocations.length) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', boxSizing: 'border-box' }}>
        <Card sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant='h6' sx={{ fontWeight: 700, mb: 1 }}>Select Trip Countries</Typography>
          <Typography variant='body2' color='text.secondary'>Add at least one destination in trip settings to unlock travel news, weather, and currency intelligence tailored to your itinerary.</Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', boxSizing: 'border-box' }}>
      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>
          <Button variant="outlined" size="small" onClick={() => dispatch(loadNews({ locations: targetLocations }))}>Retry</Button>
        </Box>
      )}
      {!error && !loading && targetLocations.length > 0 && activeArticles.length === 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant='body2' color='text.secondary'>No situational coverage yet for the selected countries. Refresh or adjust your locations to broaden results.</Typography>
          <Button size='small' sx={{ mt: 1 }} variant='outlined' onClick={() => dispatch(loadNews({ locations: targetLocations }))}>Refresh</Button>
        </Box>
      )}

      <Card
        sx={{
          mb: 3,
          p: { xs: 2.2, md: 3 },
          color: '#f8fafc',
          background: 'linear-gradient(135deg,#0f172a 0%, #1e3a8a 38%, #0ea5e9 100%)',
          border: 'none',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 28px 42px rgba(15,23,42,0.35)'
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 20%, rgba(255,255,255,0.18), transparent 55%)' }} />
        <Box sx={{ position: 'relative', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 4 }, justifyContent: 'space-between' }}>
          <Box sx={{ maxWidth: 520 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant='h5' sx={{ fontWeight: 700, letterSpacing: .4 }}>Travel Risk Monitor</Typography>
              <Box sx={{ px: 1.2, py: 0.4, borderRadius: 999, border: '1px solid rgba(148,163,184,0.5)', bgcolor: 'rgba(15,23,42,0.35)', display: 'inline-flex', alignItems: 'center' }}>
                <Typography variant='caption' sx={{ fontWeight: 600, letterSpacing: 1, color: '#f8fafc', textTransform: 'uppercase' }}>Coming Soon</Typography>
              </Box>
            </Box>
            <Typography variant='body2' sx={{ opacity: .86 }}>
              Curating {filteredCount} essential updates with {alertCount} critical alerts across {coverageCount} active corridors.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: { sm: 320 } }}>
            <Box sx={{ flex: 1, minWidth: 120, p: 2, borderRadius: 2, bgcolor: 'rgba(15,23,42,0.45)', border: '1px solid rgba(148,163,184,0.25)' }}>
              <Typography variant='overline' sx={{ letterSpacing: 1.2, opacity: .7 }}>Stories </Typography>
              <Typography variant='h5' sx={{ fontWeight: 700 }}>{filteredCount}</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 120, p: 2, borderRadius: 2, bgcolor: 'rgba(14,116,144,0.45)', border: '1px solid rgba(148,163,184,0.25)' }}>
              <Typography variant='overline' sx={{ letterSpacing: 1.2, opacity: .75 }}>Alerts</Typography>
              <Typography variant='h5' sx={{ fontWeight: 700 }}>{alertCount}</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 120, p: 2, borderRadius: 2, bgcolor: 'rgba(8,47,73,0.55)', border: '1px solid rgba(148,163,184,0.25)' }}>
              <Typography variant='overline' sx={{ letterSpacing: 1.2, opacity: .75 }}>Countries</Typography>
              <Typography variant='h5' sx={{ fontWeight: 700 }}>{coverageCount}</Typography>
            </Box>
          </Stack>
        </Box>
        <Stack direction='row' spacing={1} flexWrap='wrap' sx={{ position: 'relative', mt: { xs: 2, md: 3 } }}>
          {coverageStats.map(item => (
            <Chip
              key={item.code}
              size='small'
              variant='outlined'
              label={`${item.flag ? `${item.flag} ` : ''}${item.name} • ${item.stories} stories`}
              sx={{
                borderColor: 'rgba(226,232,240,0.4)',
                color: '#f8fafc',
                bgcolor: 'rgba(15,23,42,0.3)',
                fontSize: 12,
                '&:hover': { bgcolor: 'rgba(148,163,184,0.25)' }
              }}
            />
          ))}
        </Stack>
      </Card>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, gap: { xs: 3, xl: 4 }, alignItems: 'stretch' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700, letterSpacing: .3 }}>Top Stories</Typography>
            {loading && !activeArticles.length ? HeroSkeletons : heroes.length ? (
              <Box sx={{
                borderRadius: 3,
                overflow: 'hidden',
                background: theme => theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.78)' : '#ffffff',
                border: theme => theme.palette.mode === 'dark' ? '1px solid rgba(148,163,184,0.22)' : '1px solid rgba(15,23,42,0.08)',
                boxShadow: theme => theme.palette.mode === 'dark'
                  ? '0 20px 48px rgba(15,23,42,0.32)'
                  : '0 22px 44px rgba(15,23,42,0.18)'
              }}>
                {(() => {
                  const lead = heroes[0];
                  const secondary = heroes.slice(1, 4);
                  const remainder = heroes.slice(4, 8);
                  return (
                    <>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' } }}>
                        <CardActionArea
                          href={lead.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          sx={{ position: 'relative', minHeight: { xs: 280, md: 360 } }}
                        >
                          <ArticleImage
                            src={lead.images && lead.images[0]?.url}
                            alt={lead.title}
                            mode='hero'
                            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'brightness(0.85)' }}
                          />
                          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(210deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.82) 70%)' }} />
                          <Box sx={{ position: 'relative', p: { xs: 2.4, md: 3.2 }, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1.2, height: '100%' }}>
                            <Stack direction='row' spacing={0.75} useFlexGap flexWrap='wrap'>
                              {buildStoryChips(lead, 'small', 'hero')}
                            </Stack>
                            <Typography variant='h5' sx={{ fontWeight: 800, lineHeight: 1.1, color: '#f8fafc' }}>{lead.title}</Typography>
                            {lead.summary && (
                              <Typography variant='body2' sx={{ color: 'rgba(226,232,240,0.85)', maxWidth: 520 }}>
                                {lead.summary}
                              </Typography>
                            )}
                            <Typography variant='caption' sx={{ color: 'rgba(226,232,240,0.72)' }}>{formatDate(lead.timestamp)} {lead.site_name ? `• ${lead.site_name}` : ''}</Typography>
                          </Box>
                        </CardActionArea>
                        <Box sx={{ display: 'flex', flexDirection: 'column', background: theme => theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.55)' : 'rgba(249,250,251,0.9)', borderLeft: { lg: '1px solid rgba(148,163,184,0.18)' } }}>
                          {secondary.map((story, idx) => (
                            <CardActionArea
                              key={story.article_id}
                              href={story.url}
                              target='_blank'
                              rel='noopener noreferrer'
                              sx={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                px: { xs: 1.8, md: 2.4 },
                                py: { xs: 1.6, md: 2.2 },
                                borderBottom: idx === secondary.length - 1 ? 'none' : '1px solid rgba(148,163,184,0.18)'
                              }}
                            >
                              <ArticleImage
                                src={story.images && story.images[0]?.url}
                                alt={story.title}
                                sx={{ width: 96, height: 78, borderRadius: 1.5, flexShrink: 0 }}
                              />
                              <Box sx={{ ml: 1.8, display: 'flex', flexDirection: 'column', gap: 0.7 }}>
                                <Stack direction='row' spacing={0.5} useFlexGap flexWrap='wrap'>
                                  {buildStoryChips(story)}
                                </Stack>
                                <Typography variant='subtitle1' sx={{ fontWeight: 700, lineHeight: 1.3 }}>{story.title}</Typography>
                                <Typography variant='caption' sx={{ color: 'text.secondary' }}>{formatDate(story.timestamp)} {story.site_name ? `• ${story.site_name}` : ''}</Typography>
                              </Box>
                            </CardActionArea>
                          ))}
                        </Box>
                      </Box>
                      {remainder.length > 0 && (
                        <Box sx={{
                          display: 'flex',
                          gap: 1.6,
                          px: { xs: 1.6, md: 2.4 },
                          py: { xs: 1.6, md: 2.2 },
                          background: theme => theme.palette.mode === 'dark' ? 'rgba(10,17,29,0.75)' : 'rgba(241,245,249,0.85)',
                          overflowX: 'auto'
                        }}>
                          {remainder.map(story => (
                            <CardActionArea
                              key={story.article_id}
                              href={story.url}
                              target='_blank'
                              rel='noopener noreferrer'
                              sx={{
                                minWidth: { xs: 240, sm: 260 },
                                maxWidth: 300,
                                borderRadius: 2,
                                border: '1px solid rgba(148,163,184,0.18)',
                                background: theme => theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.72)' : '#ffffff',
                                p: 1.6,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                                transition: 'transform .2s ease, box-shadow .2s ease',
                                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 28px rgba(15,23,42,0.24)' }
                              }}
                            >
                              <ArticleImage src={story.images && story.images[0]?.url} alt={story.title} sx={{ width: '100%', height: 130, borderRadius: 1.5 }} />
                              <Stack direction='row' spacing={0.5} useFlexGap flexWrap='wrap'>
                                {buildStoryChips(story)}
                              </Stack>
                              <Typography variant='body2' sx={{ fontWeight: 600, lineHeight: 1.35 }}>{story.title}</Typography>
                              <Typography variant='caption' sx={{ color: 'text.secondary' }}>{formatDate(story.timestamp)} {story.site_name ? `• ${story.site_name}` : ''}</Typography>
                            </CardActionArea>
                          ))}
                        </Box>
                      )}
                    </>
                  );
                })()}
              </Box>
            ) : !loading && activeArticles.length > 0 && heroes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>All {rawCount} fetched articles filtered out ({droppedCount} business, kept 0). Adjust filtering or broaden query.</Typography>
            ) : null}
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Latest</Typography>
            {loading && !activeArticles.length && (
              <Box>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Skeleton width="60%" />
                    <Skeleton width="45%" />
                  </Box>
                ))}
              </Box>
            )}
            {!loading && latest.map(a => (
              <Card key={a.article_id} variant="outlined" sx={{ mb: 2, borderRadius: 2, transition: 'all .25s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
                <CardActionArea href={a.url} target="_blank" rel="noopener noreferrer" sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <ArticleImage src={a.images && a.images[0]?.url} alt={a.title} sx={{ width: 112, height: 76, borderRadius: 1.5, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight: 1.25 }}>{a.title}</Typography>
                    {a.summary && (
                      <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.45 }} noWrap>
                        {a.summary}
                      </Typography>
                    )}
                    <Stack direction='row' spacing={0.7} useFlexGap flexWrap='wrap'>
                      <Chip size='small' label={formatDate(a.timestamp)} sx={{ height: 22, fontSize: 11 }} />
                      {a.site_name && <Chip size='small' label={a.site_name} variant='outlined' sx={{ height: 22, fontSize: 11 }} />}
                      {buildStoryChips(a)}
                    </Stack>
                  </Box>
                </CardActionArea>
              </Card>
            ))}
            {!loading && !latest.length && heroes.length > 0 && (
              <Typography variant="body2" color="text.secondary">No additional latest items.</Typography>
            )}
            {!loading && activeArticles.length > 0 && filteredCount === 0 && (
              <Typography variant="body2" color="text.secondary">No non-business situational articles available right now.</Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ width: { xs: '100%', xl: 360 }, flexShrink: 0 }}>
          <Box sx={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Stack spacing={2}>
              {activeIntelList.map(intel => {
                const storyCount = coverageMap[intel.code] || 0;
                return (
                  <Card key={intel.code} sx={{ p: 2.2, borderRadius: 2.5, background: 'linear-gradient(165deg, rgba(241,245,249,0.85) 0%, rgba(226,232,240,0.75) 100%)', border: '1px solid rgba(148,163,184,0.35)' }}>
                    <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={1}>
                      <Box>
                        <Typography variant='subtitle1' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          {intel.flag && <span>{intel.flag}</span>}{intel.name}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>{intel.region} • {intel.languages.join(', ')}</Typography>
                      </Box>
                      <Chip size='small' label={intel.currencyRates.base || intel.currency} color='primary' variant='outlined' />
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1 }}>
                        {intel.weather.loading ? (
                          <Skeleton variant='circular' width={46} height={46} />
                        ) : (
                          <Box sx={{ fontSize: 34, lineHeight: 1 }}>{renderWeatherGlyph(intel.weather.icon)}</Box>
                        )}
                        <Box>
                          {intel.weather.loading ? (
                            <Skeleton width={70} />
                          ) : (
                            <Typography variant='h6' sx={{ fontWeight: 700 }}>{intel.weather.temperatureC != null ? `${intel.weather.temperatureC.toFixed(0)}°C` : '—'}</Typography>
                          )}
                          {intel.weather.loading ? (
                            <Skeleton width={110} />
                          ) : (
                            <Typography variant='caption' color='text.secondary'>
                              {intel.weather.conditionText || '—'}{intel.weather.windKph != null ? ` • ${intel.weather.windKph.toFixed(0)} km/h wind` : ''}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant='caption' color='text.secondary'>Currency pulse</Typography>
                        {intel.currencyRates.loading ? (
                          <Skeleton width='90%' />
                        ) : (
                          <Stack spacing={0.4} sx={{ mt: 0.4 }}>
                            {MAJOR_FX.filter(cur => cur !== (intel.currencyRates.base || intel.currency)).map(cur => (
                              <Typography key={`${intel.code}-${cur}`} variant='body2' sx={{ fontWeight: 500 }}>
                                1 {intel.currencyRates.base || intel.currency} = {formatFxRate(intel.currencyRates.rates[cur])} {cur}
                              </Typography>
                            ))}
                          </Stack>
                        )}
                      </Box>
                    </Stack>
                    <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap' sx={{ mt: 1.5 }}>
                      {intel.weather.severity !== 'normal' && (
                        <Chip size='small' color={severityColorMap[intel.weather.severity]} label={`${intel.weather.severity.charAt(0).toUpperCase()}${intel.weather.severity.slice(1)} alert`} />
                      )}
                      <Chip size='small' variant='outlined' label={`${storyCount} stories`} />
                      <Chip size='small' variant='outlined' label={intel.languages.join(', ')} />
                    </Stack>
                  </Card>
                );
              })}
            </Stack>

            <Card variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 1 }}>Global Trending</Typography>
              {loading && trending.length === 0 ? (
                <Box>
                  {Array.from({ length: TRENDING_COUNT }).map((_, i) => (
                    <Skeleton key={i} width='88%' sx={{ mb: 1 }} />
                  ))}
                </Box>
              ) : trending.length > 0 ? (
                <Stack spacing={1.4}>
                  {trending.map(t => (
                    <Box key={t.article_id} sx={{ p: 0.5, borderRadius: 1.5, transition: 'background .2s', '&:hover': { background: theme => theme.palette.action.hover } }}>
                      <Typography variant='caption' color='text.secondary'>
                        {formatDate(t.timestamp)} {t.site_name ? `• ${t.site_name}` : ''}
                      </Typography>
                      <Typography variant='body2' fontWeight={600} sx={{ mb: 0.4, lineHeight: 1.35 }}>{t.title}</Typography>
                      <Stack direction='row' spacing={0.6} useFlexGap flexWrap='wrap'>
                        {buildStoryChips(t)}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant='caption' color='text.secondary'>All trending candidates filtered (business related).</Typography>
              )}
            </Card>

            <Card variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant='subtitle2' fontWeight={600} sx={{ mb: 1 }}>Coverage diagnostics</Typography>
              <Stack spacing={0.75}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.secondary'>Stories surfaced</Typography>
                  <Typography variant='body2' fontWeight={600}>{filteredCount}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.secondary'>Critical alerts</Typography>
                  <Typography variant='body2' fontWeight={600}>{alertCount}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.secondary'>Filtered finance pieces</Typography>
                  <Typography variant='body2' fontWeight={600}>{droppedCount}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.secondary'>Raw feed volume</Typography>
                  <Typography variant='body2' fontWeight={600}>{rawCount}</Typography>
                </Box>
              </Stack>
              <Button size='small' sx={{ mt: 2, alignSelf: 'flex-start' }} onClick={() => dispatch(loadNews({ locations: targetLocations }))}>Refresh now</Button>
            </Card>

            <Card variant='outlined' sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant='subtitle1' sx={{ fontWeight: 500, mb: 0.5 }}>Sponsored</Typography>
              <Typography variant='caption' color='text.secondary'>Ad space</Typography>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default NewsPanel;
