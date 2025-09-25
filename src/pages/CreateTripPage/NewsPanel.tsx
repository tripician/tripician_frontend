import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { loadNews } from '../../store/newsSlice';
import { Box, Typography, Card, CardActionArea, Skeleton, Chip, Divider, Button } from '@mui/material';
import { fetchWeather } from '../../services/APIs/weather/weatherService';

const MAX_HERO = 4;
const TRENDING_COUNT = 5;

function formatDate(iso?: string){
  if(!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const NewsPanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { articles, status, error, location } = useSelector((s: RootState) => s.news);
  const [weather, setWeather] = React.useState<{ temp?: number|null; wind?: number|null; text?: string|null; loading:boolean; error?:string; severity?: string; icon?: string }>(()=>({ loading:true }));

  useEffect(() => {
    if(status === 'idle') {
      // eslint-disable-next-line no-console
      console.log('[NewsPanel] Dispatching loadNews (status idle)');
      dispatch(loadNews());
    }
  }, [status, dispatch, location]);

  // Weather fetch
  useEffect(()=> {
    let cancelled = false;
    setWeather(w=> ({ ...w, loading:true, error: undefined }));
    fetchWeather(location).then(w => { if(!cancelled) setWeather({ temp: w.temperatureC, wind: w.windKph, text: w.conditionText, loading:false, severity: w.severity, icon: w.icon }); })
      .catch(e=> { if(!cancelled) setWeather({ loading:false, error: e.message }); });
    return () => { cancelled = true; };
  }, [location]);

  const { heroes, latest, trending, filteredCount, droppedCount, rawCount } = useMemo(() => {
    if(!articles.length) return { heroes: [], latest: [], trending: [], filteredCount: 0, droppedCount: 0, rawCount: 0 };
    // Relaxed business filter: only exclude explicit financial performance or stock/IPO/merger style news
  const businessBlock = /(quarterly\s+results|q[1-4]\s+results|earnings\s+report|earnings\b|ipo\b|merger\b|acquisition\b|shareholder\b|dividend\b|stock\s+price|stocks?\b|share\s+price|revenue\b|net\s+income|profit\b|loss(es)?\b|financial\s+results|guidance\s+update|economic\s+outlook|gdp\b|inflation\b|interest\s+rate|central\s+bank)/i;
    let dropped = 0;
    const filtered = articles.filter(a => {
      const hay = `${a.title || ''} ${a.summary || ''} ${a.section_name || ''}`;
      const isBusiness = businessBlock.test(hay);
      if(isBusiness) { dropped++; return false; }
      return true;
    });
    const sorted = [...filtered].sort((a,b) => {
      const ra = a.readership?.number_of_potential_readers || 0;
      const rb = b.readership?.number_of_potential_readers || 0;
      return rb - ra;
    });
    const heroes = sorted.slice(0, MAX_HERO);
    const rest = sorted.slice(MAX_HERO);
    const trending = sorted.slice(0, TRENDING_COUNT);
    // eslint-disable-next-line no-console
    console.log('[NewsPanel] Filter diagnostics raw:', articles.length, 'kept:', filtered.length, 'dropped:', dropped);
    return { heroes, latest: rest, trending, filteredCount: filtered.length, droppedCount: dropped, rawCount: articles.length };
  }, [articles]);

  const loading = status === 'loading';

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

  // Country metadata mapping (expandable)
  const COUNTRY_META: Record<string, { name: string; currency: string; language: string }> = {
    us: { name: 'United States', currency: 'USD', language: 'English' },
    gb: { name: 'United Kingdom', currency: 'GBP', language: 'English' },
    fr: { name: 'France', currency: 'EUR', language: 'French' },
    de: { name: 'Germany', currency: 'EUR', language: 'German' },
    es: { name: 'Spain', currency: 'EUR', language: 'Spanish' },
    it: { name: 'Italy', currency: 'EUR', language: 'Italian' },
    jp: { name: 'Japan', currency: 'JPY', language: 'Japanese' },
    cn: { name: 'China', currency: 'CNY', language: 'Mandarin' },
    in: { name: 'India', currency: 'INR', language: 'Hindi/English' },
    ca: { name: 'Canada', currency: 'CAD', language: 'English/French' },
    au: { name: 'Australia', currency: 'AUD', language: 'English' }
  };
  const meta = COUNTRY_META[location.toLowerCase()] || { name: location.toUpperCase(), currency: '—', language: '—' };

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

  return (
    <Box sx={{ p: 2, width: '100%', boxSizing: 'border-box' }}>
      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>
          <Button variant="outlined" size="small" onClick={() => dispatch(loadNews())}>Retry</Button>
        </Box>
      )}
      {!error && !loading && articles.length===0 && (
        <Box sx={{ mb:2 }}>
          <Typography variant='body2' color='text.secondary'>No situational news received (API returned 0). Broadening terms may help: set env VITE_NEWS_QUERY_MODE=any.</Typography>
          <Button size='small' sx={{ mt:1 }} variant='outlined' onClick={()=> dispatch(loadNews())}>Refresh</Button>
        </Box>
      )}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
        <Box sx={{ flex: 1 }}>
          {/* Hero Section */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700, letterSpacing:.3 }}>Top Stories</Typography>
            {loading && !articles.length ? HeroSkeletons : heroes.length ? (
              <Box>
                <Box sx={{
                  display:'grid',
                  gap:2,
                  gridTemplateColumns:{ xs:'1fr', md:'2fr 1fr 1fr' },
                  gridAutoRows:'1fr'
                }}>
                  {heroes.slice(0,2).map((h,i)=>(
                    <Card key={h.article_id} sx={{
                      position:'relative',
                      overflow:'hidden',
                      gridColumn:{ xs:'span 1', md: i===0? 'span 1':'span 1' },
                      height:{ xs:240, md: i===0? 300:240 },
                      display:'flex'
                    }}>
                      <CardActionArea href={h.url} target='_blank' rel='noopener noreferrer' sx={{ flex:1, display:'flex', alignItems:'flex-end' }}>
                        <ArticleImage src={h.images && h.images[0]?.url} alt={h.title} mode='hero' sx={{ position:'absolute', inset:0, width:'100%', height:'100%', filter:'brightness(0.9)' }} />
                        <Box sx={{ position:'relative', p:2 }}>
                          <Typography variant='subtitle2' sx={{ fontWeight:700, color:'#fff', mb:.5, lineHeight:1.2 }}>
                            {h.title}
                          </Typography>
                          <Typography variant='caption' sx={{ color:'rgba(255,255,255,0.8)' }}>{formatDate(h.timestamp)} {h.site_name? `• ${h.site_name}`:''}</Typography>
                        </Box>
                      </CardActionArea>
                    </Card>
                  ))}
                  <Box sx={{
                    display:'grid',
                    gap:2,
                    gridTemplateColumns:{ xs:'1fr 1fr', md:'1fr' }
                  }}>
                    {heroes.slice(2).map(h => (
                      <Card key={h.article_id} sx={{ height:'100%', position:'relative', overflow:'hidden' }}>
                        <CardActionArea href={h.url} target='_blank' rel='noopener noreferrer' sx={{ height:'100%' }}>
                          <ArticleImage src={h.images && h.images[0]?.url} alt={h.title} mode='hero' sx={{ position:'absolute', inset:0, width:'100%', height:'100%', filter:'brightness(.92)' }} />
                          <Box sx={{ position:'relative', p:1.2, display:'flex', flexDirection:'column', justifyContent:'flex-end', height:'100%' }}>
                            <Typography variant='caption' sx={{ color:'rgba(255,255,255,0.75)', mb:.5 }}>{formatDate(h.timestamp)} {h.site_name? `• ${h.site_name}`:''}</Typography>
                            <Typography variant='body2' sx={{ fontWeight:600, color:'#fff', lineHeight:1.15 }}>{h.title}</Typography>
                          </Box>
                        </CardActionArea>
                      </Card>
                    ))}
                  </Box>
                </Box>
              </Box>
            ) : !loading && articles.length>0 && heroes.length===0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt:1 }}>All {rawCount} fetched articles filtered out ({droppedCount} business, kept 0). Adjust filtering or broaden query.</Typography>
            ) : null}
          </Box>
          <Divider sx={{ my: 3 }} />
          {/* Latest list */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>Latest</Typography>
            {loading && !articles.length && (
              <Box>
                {Array.from({ length: 6 }).map((_,i) => (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Skeleton width="60%" />
                    <Skeleton width="40%" />
                  </Box>
                ))}
              </Box>
            )}
            {!loading && latest.map(a => (
              <Card key={a.article_id} variant="outlined" sx={{ mb: 2, transition:'all .25s', '&:hover':{ boxShadow:4, transform:'translateY(-2px)' } }}>
                <CardActionArea href={a.url} target="_blank" rel="noopener noreferrer" sx={{ p: 1.2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <ArticleImage src={a.images && a.images[0]?.url} alt={a.title} sx={{ width:108, height:72, borderRadius:1.2, flexShrink:0 }} />
                  <Box sx={{ flex: 1, minWidth:0 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight:1.15 }}>{a.title}</Typography>
                    <Box sx={{ display:'flex', flexWrap:'wrap', gap:.75, mt:.5 }}>
                      <Chip size='small' label={formatDate(a.timestamp)} sx={{ height:20, fontSize:11 }} />
                      {a.site_name && <Chip size='small' label={a.site_name} variant='outlined' sx={{ height:20, fontSize:11 }} />}
                    </Box>
                  </Box>
                </CardActionArea>
              </Card>
            ))}
            {!loading && !latest.length && heroes.length>0 && (
              <Typography variant="body2" color="text.secondary">No additional latest items.</Typography>
            )}
            {!loading && articles.length>0 && filteredCount===0 && (
              <Typography variant="body2" color="text.secondary">No non-business situational articles available right now.</Typography>
            )}
          </Box>
        </Box>
        {/* Right Column */}
        <Box sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0 }}>
          <Box sx={{ position: 'sticky', top: 16 }}>
            {/* Unified Country + Weather Info Card */}
            <Card sx={{
              mb:3,
              p:0,
              overflow:'hidden',
              position:'relative',
              background:'linear-gradient(135deg,#0f172a 0%, #075985 45%, #0284c7 100%)',
              color:'#fff'
            }}>
              <Box sx={{ p:1.5, display:'flex', flexDirection:'column', gap:1 }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <Typography variant='subtitle2' sx={{ fontWeight:700, letterSpacing:.5 }}>{meta.name}</Typography>
                  <Chip size='small' label={location.toUpperCase()} sx={{ bgcolor:'rgba(255,255,255,0.15)', color:'#fff' }} />
                </Box>
                <Divider sx={{ borderColor:'rgba(255,255,255,0.12)' }} />
                <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                  {weather.loading ? (
                    <Skeleton variant='circular' width={46} height={46} sx={{ bgcolor:'rgba(255,255,255,0.2)' }} />
                  ) : (
                    <Box sx={{ width:54, height:54, borderRadius:'18%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, background:'rgba(255,255,255,0.12)', backdropFilter:'blur(4px)' }}>
                      {weather.icon === 'thunder' && '⛈️'}
                      {weather.icon === 'heavy-rain' && '🌧️'}
                      {weather.icon === 'rain' && '🌦️'}
                      {weather.icon === 'snow' && '❄️'}
                      {weather.icon === 'fog' && '🌫️'}
                      {weather.icon === 'drizzle' && '💧'}
                      {weather.icon === 'clear' && '☀️'}
                      {weather.icon === 'partly' && '⛅'}
                      {weather.icon === 'cloudy' && '☁️'}
                      {(!weather.icon || weather.icon === 'unknown') && 'ℹ️'}
                    </Box>
                  )}
                  <Box sx={{ flex:1, minWidth:0 }}>
                    {weather.loading ? (
                      <Skeleton width={120} />
                    ) : weather.error ? (
                      <Typography variant='caption' color='error'>{weather.error}</Typography>
                    ) : (
                      <>
                        <Typography variant='h6' sx={{ fontWeight:700, lineHeight:1, fontSize:22 }}>{weather.temp!=null? `${weather.temp.toFixed(0)}°C`:'—'}</Typography>
                        <Typography variant='caption' sx={{ opacity:.85 }}>{weather.text||'—'} {weather.wind!=null? `• ${weather.wind.toFixed(0)} km/h wind`:''}</Typography>
                      </>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display:'flex', flexWrap:'wrap', gap:.75, mt:.5 }}>
                  <Chip size='small' label={`Currency: ${meta.currency}`} sx={{ bgcolor:'rgba(255,255,255,0.18)', color:'#fff', fontSize:11 }} />
                  <Chip size='small' label={`Language: ${meta.language}`} sx={{ bgcolor:'rgba(255,255,255,0.18)', color:'#fff', fontSize:11 }} />
                  {weather.severity && weather.severity !== 'normal' && (
                    <Chip size='small' label={weather.severity} color={weather.severity==='warning'? 'error': weather.severity==='watch'? 'warning':'default'} sx={{ fontSize:11 }} />
                  )}
                </Box>
              </Box>
              <Box sx={{ position:'absolute', inset:0, pointerEvents:'none', background:'radial-gradient(circle at 85% 20%, rgba(255,255,255,0.25), transparent 55%)' }} />
            </Card>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>Trending</Typography>
              {loading && !articles.length && (
                <Box>
                  {Array.from({ length: TRENDING_COUNT }).map((_,i) => (
                    <Skeleton key={i} width="80%" />
                  ))}
                </Box>
              )}
              {!loading && trending.length>0 && (
                <Box>
                  {trending.map(t => (
                    <Box key={t.article_id} sx={{ mb: 1.6, p:0.5, borderRadius:1, transition:'background .2s', '&:hover':{ background:(theme)=> theme.palette.action.hover } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:.25 }}>{formatDate(t.timestamp)}</Typography>
                      <Typography variant="body2" fontWeight={500} noWrap>{t.title}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {!loading && trending.length===0 && filteredCount===0 && articles.length>0 && (
                <Typography variant="caption" color="text.secondary">All trending candidates filtered (business related).</Typography>
              )}
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            {rawCount>0 && (
              <Typography variant='caption' color='text.secondary' sx={{ display:'block', mb:1 }}>Showing {filteredCount} / {rawCount} (filtered {droppedCount} business-finance)</Typography>
            )}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>Sponsored</Typography>
              <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">Ad space</Typography>
              </Card>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default NewsPanel;
