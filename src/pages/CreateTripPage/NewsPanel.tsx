import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { loadNews, setLocations, type NewsArticle } from '../../store/newsSlice';
import { Box, Typography, Card, CardActionArea, Skeleton, Chip, Divider, Button, Stack, Collapse } from '@mui/material';
import { motion } from 'framer-motion';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { fetchWeather } from '../../services/APIs/weather/weatherService';
import { fetchCurrency } from '../../services/APIs/currency/currencyService';
import { flagEmojiFromCode, countryNameFromCode, countryCodeFromName } from '../../utils/countryFlags';
import { conditionIcon } from '../../utils/weatherIcons';
import { IconSatellite, IconNews, IconBolt, IconFlame } from '@tabler/icons-react';

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

//  Colour/icon helpers shared with AlertsPanel 
const ALERT_META: Record<string, { bg: string; border: string; iconColor: string; badgeColor: 'error' | 'warning' | 'info' | 'default'; description: string }> = {
  'Severe Weather': {
    bg: 'rgba(127,29,29,0.18)', border: 'rgba(239,68,68,0.45)', iconColor: '#f87171',
    badgeColor: 'error',
    description: 'Extreme meteorological events (hurricanes, typhoons, floods, earthquakes, wildfires) that may directly impact travel safety and infrastructure.'
  },
  'Travel Advisory': {
    bg: 'rgba(120,53,15,0.18)', border: 'rgba(245,158,11,0.45)', iconColor: '#fbbf24',
    badgeColor: 'warning',
    description: 'Official travel bans, border closures, visa restrictions, curfews or states of emergency issued by governments that affect entry and movement.'
  },
  'Security Risk': {
    bg: 'rgba(120,53,15,0.18)', border: 'rgba(245,158,11,0.4)', iconColor: '#fb923c',
    badgeColor: 'warning',
    description: 'Active security threats including protests, civil unrest, terrorist incidents or crime events in or near your travel corridor.'
  },
  'Health Alert': {
    bg: 'rgba(20,83,45,0.18)', border: 'rgba(74,222,128,0.35)', iconColor: '#4ade80',
    badgeColor: 'default',
    description: 'Active disease outbreaks, epidemics or public health advisories that may require vaccination, testing or mask requirements for entry.'
  },
  'Transport Update': {
    bg: 'rgba(30,58,138,0.2)', border: 'rgba(96,165,250,0.4)', iconColor: '#60a5fa',
    badgeColor: 'info',
    description: 'Disruptions to airports, airlines or rail services - including cancellations, strikes or major delays affecting your itinerary.'
  }
};

interface AlertsPanelProps {
  articles: NewsArticle[];
  loading: boolean;
  classifyImpact: (a: NewsArticle) => { label: string; color: string } | null;
  formatDate: (iso?: string) => string;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ articles, loading, classifyImpact, formatDate }) => {
  const [expandedKey, setExpandedKey] = React.useState<string | false>(false);
  const [openArticle, setOpenArticle] = React.useState<number | false>(false);

  const groups = React.useMemo(() => {
    type Group = { label: string; articles: NewsArticle[] };
    const map = new Map<string, Group>();
    articles.forEach(a => {
      const impact = classifyImpact(a);
      if (!impact) return;
      const existing = map.get(impact.label);
      if (existing) existing.articles.push(a);
      else map.set(impact.label, { label: impact.label, articles: [a] });
    });
    // Order: Severe Weather → Travel Advisory → Security Risk → Health Alert → Transport Update
    const order = ['Severe Weather', 'Travel Advisory', 'Security Risk', 'Health Alert', 'Transport Update'];
    return order.map(k => map.get(k)).filter(Boolean) as Group[];
  }, [articles, classifyImpact]);

  if (loading && articles.length === 0) {
    return (
      <Card sx={{ p: 2.2, borderRadius: 2.5, border: '1px solid rgba(239,68,68,0.25)', bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(60,10,10,0.3)' : 'rgba(254,244,243,0.9)' }}>
        <Stack direction='row' alignItems='center' spacing={1.5} sx={{ mb: 1.5 }}>
          <Skeleton variant='circular' width={28} height={28} />
          <Skeleton width='60%' height={20} />
        </Stack>
        {[80, 70, 90].map((w, i) => <Skeleton key={i} width={`${w}%`} height={14} sx={{ mb: 0.6 }} />)}
      </Card>
    );
  }

  if (!groups.length) return null;

  const totalAlerts = groups.reduce((s, g) => s + g.articles.length, 0);

  return (
    <Card sx={{
      borderRadius: 3, overflow: 'hidden', p: 0,
      border: '1px solid rgba(239,68,68,0.35)',
      background: theme => theme.palette.mode === 'dark'
        ? 'linear-gradient(145deg, #1a0a0a 0%, #1c0f0f 100%)'
        : 'linear-gradient(145deg, #fff7f7 0%, #fff1f1 100%)',
      boxShadow: '0 8px 32px rgba(239,68,68,0.1)'
    }}>
      {/* Header */}
      <Box sx={{ px: 2.2, pt: 2, pb: 1.8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(239,68,68,0.18)' }}>
        <Stack direction='row' spacing={1.2} alignItems='center'>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <WarningAmberRoundedIcon sx={{ fontSize: 17, color: '#ef4444' }} />
          </Box>
          <Box>
            <Typography variant='subtitle1' fontWeight={800} sx={{ lineHeight: 1.1, color: theme => theme.palette.mode === 'dark' ? '#fca5a5' : '#b91c1c' }}>Active Alerts</Typography>
            <Typography variant='caption' sx={{ opacity: .6 }}>{totalAlerts} item{totalAlerts !== 1 ? 's' : ''} across {groups.length} categor{groups.length !== 1 ? 'ies' : 'y'}</Typography>
          </Box>
        </Stack>
        <Box sx={{ px: 1.2, py: 0.4, borderRadius: 999, bgcolor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <Typography variant='caption' sx={{ fontWeight: 700, color: '#ef4444', letterSpacing: .5 }}>{totalAlerts}</Typography>
        </Box>
      </Box>

      {/* Alert category accordions */}
      {groups.map(group => {
        const meta = ALERT_META[group.label] || ALERT_META['Transport Update'];
        const isOpen = expandedKey === group.label;
        return (
          <Box key={group.label} sx={{ borderBottom: '1px solid rgba(239,68,68,0.1)', '&:last-child': { borderBottom: 'none' } }}>
            {/* Category header (clickable) */}
            <Box
              onClick={() => setExpandedKey(isOpen ? false : group.label)}
              sx={{
                px: 2.2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer',
                transition: 'background .18s',
                bgcolor: isOpen ? meta.bg : 'transparent',
                '&:hover': { bgcolor: meta.bg }
              }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: meta.iconColor, flexShrink: 0, boxShadow: `0 0 6px ${meta.iconColor}` }} />
              <Typography variant='body2' fontWeight={700} sx={{ flex: 1, color: theme => theme.palette.mode === 'dark' ? '#f1f5f9' : '#0f172a' }}>
                {group.label}
              </Typography>
              <Chip size='small' label={group.articles.length} sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: meta.bg, color: meta.iconColor, border: `1px solid ${meta.border}`, minWidth: 28 }} />
              {isOpen
                ? <ExpandLessIcon sx={{ fontSize: 18, opacity: .55, flexShrink: 0 }} />
                : <ExpandMoreIcon sx={{ fontSize: 18, opacity: .55, flexShrink: 0 }} />}
            </Box>

            {/* Expanded content */}
            <Collapse in={isOpen} timeout={220}>
              <Box sx={{ px: 2.2, pb: 1.5, pt: 0.5 }}>
                {/* What does this mean explanation */}
                <Box sx={{ p: 1.4, mb: 1.5, borderRadius: 2, bgcolor: meta.bg, border: `1px solid ${meta.border}` }}>
                  <Stack direction='row' spacing={1} alignItems='flex-start'>
                    <InfoOutlinedIcon sx={{ fontSize: 15, color: meta.iconColor, mt: '1px', flexShrink: 0 }} />
                    <Typography variant='caption' sx={{ lineHeight: 1.65, color: theme => theme.palette.mode === 'dark' ? '#e2e8f0' : '#1e293b', fontStyle: 'italic' }}>
                      {meta.description}
                    </Typography>
                  </Stack>
                </Box>

                {/* Individual article items */}
                <Stack spacing={0.6}>
                  {group.articles.slice(0, 8).map(a => {
                    const isArticleOpen = openArticle === a.article_id;
                    return (
                      <Box key={a.article_id}>
                        <Box
                          onClick={() => setOpenArticle(isArticleOpen ? false : a.article_id)}
                          sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, p: 1, borderRadius: 1.5, cursor: 'pointer', transition: 'background .15s', '&:hover': { background: theme => theme.palette.action.hover } }}
                        >
                          <ErrorOutlineRoundedIcon sx={{ fontSize: 14, color: meta.iconColor, mt: '2px', flexShrink: 0 }} />
                          <Typography variant='caption' sx={{ flex: 1, lineHeight: 1.5, fontWeight: 500 }}>{a.title}</Typography>
                          <Stack direction='row' spacing={0.5} alignItems='center' sx={{ flexShrink: 0 }}>
                            <Typography variant='caption' sx={{ opacity: .45, whiteSpace: 'nowrap' }}>{formatDate(a.timestamp)}</Typography>
                            {isArticleOpen
                              ? <ExpandLessIcon sx={{ fontSize: 14, opacity: .4 }} />
                              : <ExpandMoreIcon sx={{ fontSize: 14, opacity: .4 }} />}
                          </Stack>
                        </Box>

                        <Collapse in={isArticleOpen} timeout={180}>
                          <Box sx={{ ml: 2.8, mb: 1, p: 1.2, borderRadius: 1.5, bgcolor: theme => theme.palette.action.hover, border: theme => `1px solid ${theme.palette.divider}` }}>
                            {a.summary && (
                              <Typography variant='caption' sx={{ display: 'block', lineHeight: 1.65, mb: 1, color: 'text.primary' }}>{a.summary}</Typography>
                            )}
                            <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between'>
                              <Stack direction='row' spacing={0.6} flexWrap='wrap'>
                                {a.site_name && <Chip size='small' label={a.site_name} variant='outlined' sx={{ height: 18, fontSize: 10 }} />}
                                {a.section_name && <Chip size='small' label={a.section_name} sx={{ height: 18, fontSize: 10, bgcolor: meta.bg, color: meta.iconColor, border: `1px solid ${meta.border}` }} />}
                              </Stack>
                              <Box
                                component='a' href={a.url} target='_blank' rel='noopener noreferrer'
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.4, fontSize: 11, color: 'primary.main', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' }, whiteSpace: 'nowrap', flexShrink: 0 }}
                              >
                                Read more <OpenInNewRoundedIcon sx={{ fontSize: 11 }} />
                              </Box>
                            </Stack>
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  })}
                  {group.articles.length > 8 && (
                    <Typography variant='caption' sx={{ pl: 1, opacity: .5 }}>+{group.articles.length - 8} more items</Typography>
                  )}
                </Stack>
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Card>
  );
};

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

  /** Icon set is shared with the Risk Monitor - see utils/weatherIcons. */
  const renderWeatherGlyph = (icon?: string) => {
    const Icon = conditionIcon(icon ?? '');
    return <Icon size={20} stroke={1.7} />;
  };

  const formatFxRate = (value?: number) => {
    if (value == null || Number.isNaN(value)) return '-';
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
    <Box sx={{ mb: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' } }}>
      {Array.from({ length: MAX_HERO }).map((_, i) => (
        <Box key={i} sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
          <Skeleton variant='rectangular' height={160} sx={{ borderRadius: '10px 10px 0 0' }} />
          <Box sx={{ p: 1.5 }}>
            <Skeleton width='85%' height={18} sx={{ mb: 1 }} />
            <Skeleton width='60%' height={14} />
          </Box>
        </Box>
      ))}
    </Box>
  );

  if (!targetLocations.length) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 340 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
          <Box sx={{ mb: 2.5, lineHeight: 1, color: 'text.disabled' }}><IconSatellite size={44} stroke={1.4} /></Box>
          <Typography variant='h6' sx={{ fontWeight: 700, mb: 1.5, letterSpacing: .3 }}>No Active Corridors</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.7, maxWidth: 360, mx: 'auto' }}>
            Add destinations in your trip settings to unlock real-time intelligence - breaking news, live weather alerts, and currency rates curated for your itinerary.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
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

      {/*  Premium Risk Monitor Banner  */}
      <Box sx={{
        mb: 3, color: '#f8fafc', borderRadius: { xs: 2.5, md: 3.5 },
        background: 'linear-gradient(135deg, #020a1c 0%, #0a1628 20%, #0d2146 50%, #1255b0 78%, #0288d1 100%)',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(2,8,28,0.55), 0 0 0 1px rgba(255,255,255,0.07)',
        p: { xs: 2.5, md: 3.5 }
      }}>
        {/* Dot grid overlay */}
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
        {/* Radial glow blobs */}
        <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 12% 25%, rgba(56,189,248,0.18) 0%, transparent 52%), radial-gradient(ellipse at 88% 75%, rgba(99,102,241,0.15) 0%, transparent 48%)', pointerEvents: 'none' }} />

        <Box sx={{ position: 'relative', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2.5, md: 4 }, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          {/* Left: title + description */}
          <Box sx={{ maxWidth: 500 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1.2 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}><IconSatellite size={18} stroke={1.6} /></Box>
              <Typography variant='h5' sx={{ fontWeight: 700, letterSpacing: .3, fontSize: { xs: '1.15rem', md: '1.4rem' } }}>
                Travel Risk Monitor
                <Box component='span' sx={{
                  display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle',
                  ml: 1, px: 0.7, py: 0.25, borderRadius: '6px',
                  fontSize: '0.38em', fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', lineHeight: 1,
                  color: '#FF385C',
                  background: 'rgba(255,56,92,0.13)',
                  border: '1px solid rgba(255,56,92,0.32)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  position: 'relative', top: '-0.1em',
                }}>BETA</Box>
              </Typography>
              {/* Live pulse indicator */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.45, borderRadius: 999, border: '1px solid rgba(74,222,128,0.5)', bgcolor: 'rgba(20,83,45,0.55)', flexShrink: 0 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4ade80', '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } }, animation: 'livePulse 2s ease-in-out infinite' }} />
                <Typography variant='caption' sx={{ fontWeight: 700, letterSpacing: .8, color: '#4ade80', fontSize: 10, textTransform: 'uppercase' }}>Live</Typography>
              </Box>
            </Box>
            <Typography variant='body2' sx={{ opacity: .8, lineHeight: 1.6 }}>
              Curating {filteredCount} essential updates with {alertCount} critical alerts across {coverageCount} active corridors.
            </Typography>
            {/* Research caution */}
            <Box sx={{
              display: 'flex', alignItems: 'flex-start', gap: 1,
              mt: 1.5, px: 1.5, py: 1.1, borderRadius: '10px',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.28)',
            }}>
              <Typography sx={{ fontSize: '0.72rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.72)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                <Box component='span' sx={{ fontWeight: 700, color: '#fbbf24' }}>For reference only. </Box>
                Risk data is sourced from automated feeds and ongoing research - it may be incomplete or inaccurate. Always check official government travel advisories before making travel decisions.
              </Typography>
            </Box>
          </Box>

          {/* Right: stat boxes */}
          <Stack direction='row' spacing={1.5} sx={{ flexShrink: 0 }}>
            {[{ label: 'Stories', value: filteredCount, accent: 'rgba(56,189,248,0.25)', border: 'rgba(56,189,248,0.35)' },
              { label: 'Alerts', value: alertCount, accent: alertCount > 0 ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.07)', border: alertCount > 0 ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.14)' },
              { label: 'Countries', value: coverageCount, accent: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.14)' }
            ].map(stat => (
              <Box key={stat.label} sx={{ minWidth: 80, px: { xs: 1.5, md: 2 }, py: 1.5, borderRadius: 2.5, bgcolor: stat.accent, border: `1px solid ${stat.border}`, textAlign: 'center', backdropFilter: 'blur(12px)', transition: 'transform .2s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <Typography sx={{ fontSize: 10, letterSpacing: 1.4, opacity: .65, textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>{stat.label}</Typography>
                <Typography variant='h5' sx={{ fontWeight: 700, lineHeight: 1.1, color: stat.label === 'Alerts' && alertCount > 0 ? '#f87171' : 'inherit' }}>{stat.value}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Country pills */}
        <Stack direction='row' flexWrap='wrap' sx={{ position: 'relative', mt: 2.5, gap: '8px !important' }}>
          {coverageStats.map(item => (
            <Chip key={item.code} size='small' variant='outlined'
              label={`${item.flag ? `${item.flag} ` : ''}${item.name} • ${item.stories} stories`}
              sx={{ borderColor: 'rgba(255,255,255,0.22)', color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', fontSize: 11.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
            />
          ))}
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, gap: { xs: 3, xl: 4 }, alignItems: 'stretch' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ mb: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 1.5, fontWeight: 700, letterSpacing: .3, display: 'flex', alignItems: 'center', gap: 1 }}><IconNews size={17} stroke={1.8} /> Top Stories</Typography>
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
                            <Typography variant='h5' sx={{ fontWeight: 700, lineHeight: 1.1, color: '#f8fafc' }}>{lead.title}</Typography>
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
            <Typography variant='h6' sx={{ mb: 2, fontWeight: 700, letterSpacing: .3, display: 'flex', alignItems: 'center', gap: 1 }}><IconBolt size={17} stroke={1.8} /> Latest</Typography>
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
              <Card key={a.article_id} sx={{ mb: 1.5, borderRadius: 2.5, overflow: 'hidden', transition: 'all .22s ease', border: theme => `1px solid ${theme.palette.divider}`, '&:hover': { transform: 'translateY(-3px)', boxShadow: theme => theme.palette.mode === 'dark' ? '0 12px 32px rgba(0,0,0,0.5)' : '0 12px 32px rgba(15,23,42,0.14)' } }}>
                <CardActionArea href={a.url} target='_blank' rel='noopener noreferrer' sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
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
                const baseCurrency = intel.currencyRates.base || intel.currency;
                return (
                  <Card key={intel.code} sx={{
                    p: 0, borderRadius: 3, overflow: 'hidden',
                    background: 'linear-gradient(145deg, #0d1f3c 0%, #102040 50%, #0b1930 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 12px 40px rgba(5,12,30,0.45)',
                    color: '#f8fafc'
                  }}>
                    {/* Card header strip */}
                    <Box sx={{ px: 2.2, pt: 2, pb: 1.5 }}>
                      <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
                        <Box>
                          <Typography variant='subtitle1' fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 0.6, lineHeight: 1.2 }}>
                            {intel.flag && <span style={{ fontSize: 18 }}>{intel.flag}</span>}{intel.name}
                          </Typography>
                          <Typography variant='caption' sx={{ opacity: .55 }}>{intel.region} • {intel.languages.join(', ')}</Typography>
                        </Box>
                        <Box sx={{ px: 1.2, py: 0.4, borderRadius: 999, bgcolor: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)' }}>
                          <Typography variant='caption' sx={{ fontWeight: 700, color: '#93c5fd', letterSpacing: .5 }}>{baseCurrency}</Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                    {/* Weather + FX */}
                    <Box sx={{ px: 2.2, py: 1.8 }}>
                      <Stack direction='row' spacing={2} alignItems='flex-start'>
                        {/* Weather */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                          {intel.weather.loading ? (
                            <Skeleton variant='circular' width={44} height={44} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                          ) : (
                            <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: '1px solid rgba(255,255,255,0.12)' }}>
                              {renderWeatherGlyph(intel.weather.icon)}
                            </Box>
                          )}
                          <Box sx={{ minWidth: 0 }}>
                            {intel.weather.loading ? <Skeleton width={60} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} /> : (
                              <Typography variant='h6' sx={{ fontWeight: 700, lineHeight: 1 }}>{intel.weather.temperatureC != null ? `${intel.weather.temperatureC.toFixed(0)}°C` : '-'}</Typography>
                            )}
                            {intel.weather.loading ? <Skeleton width={100} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} /> : (
                              <Typography variant='caption' sx={{ opacity: .6, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {intel.weather.conditionText || '-'}{intel.weather.windKph != null ? ` • ${intel.weather.windKph.toFixed(0)} km/h wind` : ''}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {/* FX rates */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant='caption' sx={{ opacity: .5, letterSpacing: .6, textTransform: 'uppercase', fontSize: 10 }}>Currency pulse</Typography>
                          {intel.currencyRates.loading ? (
                            <Box sx={{ mt: 0.5 }}><Skeleton width='90%' height={14} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} /><Skeleton width='70%' height={14} sx={{ bgcolor: 'rgba(255,255,255,0.1)', mt: 0.4 }} /></Box>
                          ) : (
                            <Stack spacing={0.3} sx={{ mt: 0.5 }}>
                              {MAJOR_FX.filter(cur => cur !== baseCurrency).map(cur => (
                                <Box key={`${intel.code}-${cur}`} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant='caption' sx={{ opacity: .55 }}>1 {baseCurrency} =</Typography>
                                  <Typography variant='caption' sx={{ fontWeight: 700, color: '#93c5fd' }}>{formatFxRate(intel.currencyRates.rates[cur])} {cur}</Typography>
                                </Box>
                              ))}
                            </Stack>
                          )}
                        </Box>
                      </Stack>
                    </Box>

                    {/* Footer badges */}
                    <Box sx={{ px: 2.2, pb: 1.8 }}>
                      <Stack direction='row' spacing={0.8} useFlexGap flexWrap='wrap'>
                        {intel.weather.severity !== 'normal' && (
                          <Chip size='small' color={severityColorMap[intel.weather.severity]}
                            label={`${intel.weather.severity.charAt(0).toUpperCase()}${intel.weather.severity.slice(1)} alert`}
                          />
                        )}
                        <Chip size='small' label={`${storyCount} stories`}
                          sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', '& .MuiChip-label': { fontWeight: 600 } }}
                        />
                        {intel.languages.slice(0, 2).map(lang => (
                          <Chip key={lang} size='small' label={lang}
                            sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  </Card>
                );
              })}
            </Stack>

            {/*  Active Alerts Panel  */}
            <AlertsPanel articles={activeArticles} loading={loading} classifyImpact={classifyImpact} formatDate={formatDate} />

            <Card variant='outlined' sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography variant='subtitle1' fontWeight={800} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.8 }}><IconFlame size={16} stroke={1.8} /> Global Trending</Typography>
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

            <Card variant='outlined' sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography variant='subtitle2' fontWeight={700} sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: .8, fontSize: 11, opacity: .65 }}>Coverage Diagnostics</Typography>
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


          </Box>
        </Box>
      </Box>
    </Box>
    </motion.div>
  );
};

export default NewsPanel;
