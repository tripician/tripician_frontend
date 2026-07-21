/**
 * TripShowcase, the public face of a published trip.
 *
 * Visitors should meet a finished story, not the workshop: no readiness
 * meters, no "add your lodging" prompts, no planner chrome. Editorial
 * hero, day-by-day route, live map, and one conversion action,
 * "Make it yours" (clone). Owners/members get an Edit shortcut.
 */
import React from 'react';
import {
  Box, Typography, Button, Avatar, Chip, Divider, Snackbar, LinearProgress, useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  IconArrowLeft, IconHeart, IconHeartFilled, IconBookmark, IconBookmarkFilled,
  IconShare2, IconPencil, IconCopy, IconMapPin, IconMoonStars, IconCalendar,
  IconUsers, IconToolsKitchen2, IconNotes, IconRoute, IconInfoCircle, IconBed,
  IconWallet, IconExternalLink, IconPlane, IconTrain, IconBus, IconCar,
  IconSailboat, IconWalk, IconLuggage, IconStar, IconLock,
  IconCircle, IconCircleCheckFilled, IconShirt, IconId, IconDroplet,
  IconPlug, IconFirstAidKit, IconMountain, IconConfetti,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { fetchUnsplashImage } from '../../services/unsplashService';
import { VIBES } from '../CommunityPage/vibes';
import { safeExternalUrl } from '../../utils/sanitizeHtml';
import TripShareModal from '../../components/TripShareModal';
import TripComments from '../CreateTripPage/TripComments';
import ShowcaseMap from './ShowcaseMap';

// ─── Data normalisation ───────────────────────────────────────────────────────

interface ShowcaseSpot {
  name: string;
  description?: string;
  photoUrl?: string;
  mapsHref?: string;
  mustVisit?: boolean;
}
interface ShowcaseStay { name: string; referenceHref?: string; referenceText?: string }
interface ShowcaseStopFull {
  id: string;
  name: string;
  title?: string;
  nights: number;
  startDate?: string;
  endDate?: string;
  photoUrl?: string;
  lat?: number;
  lng?: number;
  transport?: string;
  spots: ShowcaseSpot[];
  foods: string[];
  notes?: string;
  stays: ShowcaseStay[];
  stayNotes?: string;
}
interface ShowcasePackingItem { key: string; name: string; qty: number; checked: boolean }
interface ShowcasePackingCategory { name: string; items: ShowcasePackingItem[] }

/** Category name → icon, so each card reads at a glance. */
function packingCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (/cloth|wear|outfit/.test(n)) return IconShirt;
  if (/essential|document|paper|id\b/.test(n)) return IconId;
  if (/toilet|hygiene|bath|cosmetic/.test(n)) return IconDroplet;
  if (/electronic|tech|gadget|charger|device/.test(n)) return IconPlug;
  if (/med|first aid|health/.test(n)) return IconFirstAidKit;
  if (/trek|hike|outdoor|camp|gear|adventure/.test(n)) return IconMountain;
  return IconLuggage;
}

interface TripShowcaseProps {
  tripId: string;
  rawTrip: any;
  isOwner: boolean;
  isMember: boolean;
  isPublished: boolean;
  onEdit?: () => void;
}

const fmtDay = (d?: string) => (d ? dayjs(d).format('MMM D') : null);
const fmtDow = (d?: string) => (d ? dayjs(d).format('ddd, MMM D') : null);
const fmtFull = (d?: string) => (d ? dayjs(d).format('MMM D, YYYY') : null);

/** Google-Maps link for a whole stop (coords first, name search fallback). */
const stopMapsHref = (stop: { name: string; lat?: number; lng?: number }): string =>
  stop.lat != null && stop.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name)}`;

/** Small caption telling members a section is hidden from the public. */
const MembersOnlyTag: React.FC = () => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
    <IconLock size={12} />
    <Typography component="span" sx={{ fontSize: 11, fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>
      Visible to trip members only
    </Typography>
  </Box>
);

/** Google-Maps link for a spot: prefer its own mapUrl, else the place id, else a name search. */
function spotMapsHref(spot: any, stopName: string): string | undefined {
  const direct = safeExternalUrl(spot?.mapUrl);
  if (direct) return direct;
  if (spot?.placeId) return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(spot.placeId)}`;
  if (spot?.name) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spot.name} ${stopName}`)}`;
  return undefined;
}

function normaliseStops(rawTrip: any): ShowcaseStopFull[] {
  const itinerary: any[] = Array.isArray(rawTrip?.itinerary) ? rawTrip.itinerary
    : Array.isArray(rawTrip?.Itinerary) ? rawTrip.Itinerary : [];
  return itinerary.map((it, idx) => {
    const staysRaw: any[] = Array.isArray(it.stays) && it.stays.length > 0
      ? it.stays
      : it.stay?.name ? [it.stay] : [];
    return {
      id: String(it.id ?? idx),
      name: it.name || `Stop ${idx + 1}`,
      title: typeof it.title === 'string' && it.title.trim() ? it.title.trim() : undefined,
      nights: Math.max(0, Number(it.nights) || 0),
      startDate: it.startDate || undefined,
      endDate: it.endDate || undefined,
      photoUrl: it.photoUrl || undefined,
      lat: typeof it.lat === 'number' ? it.lat : undefined,
      lng: typeof it.lng === 'number' ? it.lng : undefined,
      transport: typeof it.transport === 'string' && it.transport.trim() ? it.transport.trim() : undefined,
      spots: (Array.isArray(it.spots) ? it.spots : [])
        .filter((s: any) => s?.name)
        .map((s: any) => ({
          name: s.name,
          description: s.description || undefined,
          photoUrl: s.photoUrl || undefined,
          mapsHref: spotMapsHref(s, it.name || ''),
          mustVisit: s.mustVisit === true,
        })),
      foods: (Array.isArray(it.foods) ? it.foods : [])
        .map((f: any) => (typeof f === 'string' ? f : f?.name))
        .filter(Boolean),
      notes: typeof it.notes === 'string' && it.notes.trim() ? it.notes.trim() : undefined,
      stays: staysRaw
        .filter((s: any) => s?.name)
        .map((s: any) => {
          const refUrl = safeExternalUrl(s.reference);
          return {
            name: s.name,
            referenceHref: refUrl ?? undefined,
            referenceText: !refUrl && typeof s.reference === 'string' && s.reference.trim() ? s.reference.trim() : undefined,
          };
        }),
      stayNotes: typeof it.stayNotes === 'string' && it.stayNotes.trim() ? it.stayNotes.trim() : undefined,
    };
  });
}

function normalisePacking(rawTrip: any): ShowcasePackingCategory[] {
  const packing = rawTrip?.packing ?? rawTrip?.Packing;
  const categories: any[] = Array.isArray(packing?.categories) ? packing.categories : [];
  return categories
    .map((c: any) => {
      const catName = typeof c?.name === 'string' ? c.name : 'Packing';
      return {
        name: catName,
        items: (Array.isArray(c?.items) ? c.items : [])
          .filter((i: any) => i?.name)
          .map((i: any) => ({
            key: String(i.id ?? `${catName}:${i.name}`),
            name: String(i.name),
            qty: Math.max(1, Number(i.qty) || 1),
            checked: i.checked === true,
          })),
      };
    })
    .filter((c) => c.items.length > 0);
}

/** Transport label → Tabler icon. */
function transportIcon(mode: string) {
  const m = mode.toLowerCase();
  if (/plane|flight|fly|air/.test(m)) return IconPlane;
  if (/train|rail/.test(m)) return IconTrain;
  if (/bus|coach/.test(m)) return IconBus;
  if (/car|drive|taxi|cab|road/.test(m)) return IconCar;
  if (/boat|ferry|cruise|ship/.test(m)) return IconSailboat;
  if (/walk|hike|trek|foot/.test(m)) return IconWalk;
  return IconRoute;
}

// ─── Component ────────────────────────────────────────────────────────────────

const TripShowcase: React.FC<TripShowcaseProps> = ({
  tripId, rawTrip, isOwner, isMember, isPublished, onEdit,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useAuthToken();

  const root: any = rawTrip?.trip ?? rawTrip?.Trip ?? rawTrip ?? {};
  const name: string = root.name || root.Name || 'Untitled trip';
  const description: string = root.description || root.Description || '';
  const countries: string[] = Array.isArray(root.countries) ? root.countries
    : Array.isArray(root.Countries) ? root.Countries : [];
  const startDate: string | undefined = root.startDate || root.StartDate || undefined;
  const endDate: string | undefined = root.endDate || root.EndDate || undefined;
  const vibeId: string | null = (root.vibe || root.Vibe || null)?.toLowerCase?.() ?? null;
  const owner = root.owner || root.Owner || {};
  const ownerName: string = owner.name || owner.Name || 'A Tripician traveler';
  const ownerAvatar: string | undefined = owner.profilePictureUrl || owner.ProfilePictureUrl || undefined;
  const memberCount = 1 + (Array.isArray(root.members || root.Members) ? (root.members || root.Members).length : 0);
  const heroPhotoFromTrip: string | undefined =
    root.bannerPhotoUrl || root.BannerPhotoUrl || root.photoUrl || root.PhotoUrl || undefined;

  const stops = React.useMemo(() => normaliseStops(rawTrip), [rawTrip]);
  const packing = React.useMemo(() => normalisePacking(rawTrip), [rawTrip]);

  // ── Packing-day ticks: device-local, seeded from the planner's saved checks.
  // The planner keeps the master list; this page is the suitcase-side companion.
  const packStorageKey = `tripPackingView:${tripId}`;
  const [packTicks, setPackTicks] = React.useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(`tripPackingView:${tripId}`) || '{}'); }
    catch { return {}; }
  });
  const isPacked = React.useCallback(
    (item: ShowcasePackingItem) => packTicks[item.key] ?? item.checked,
    [packTicks],
  );
  const togglePacked = (item: ShowcasePackingItem) => {
    setPackTicks(prev => {
      const next = { ...prev, [item.key]: !(prev[item.key] ?? item.checked) };
      try { localStorage.setItem(packStorageKey, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };
  const packTotal = packing.reduce((a, c) => a + c.items.length, 0);
  const packDone = packing.reduce((a, c) => a + c.items.filter(isPacked).length, 0);
  const allPacked = packTotal > 0 && packDone === packTotal;
  const totalNights = stops.reduce((a, s) => a + s.nights, 0) || Number(root.totalNights) || 0;
  const vibe = vibeId ? VIBES[vibeId] : undefined;
  const importantNotes: string | undefined =
    (typeof root.importantNotes === 'string' && root.importantNotes.trim()) ? root.importantNotes.trim()
      : (typeof root.ImportantNotes === 'string' && root.ImportantNotes.trim()) ? root.ImportantNotes.trim()
        : undefined;
  const budget = Number(rawTrip?.budget ?? rawTrip?.Budget) || 0;
  const currencyCode: string = root.currencyCode || root.CurrencyCode || 'USD';
  const budgetLabel = budget > 0
    ? `${new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(budget)} budget`
    : null;

  // ── Photos: trip banner + per-stop Unsplash fallbacks ──
  const [photos, setPhotos] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const wanted: [string, string][] = [];
      if (!heroPhotoFromTrip && countries[0]) wanted.push(['__hero', `${countries[0]} landscape travel`]);
      stops.filter(s => !s.photoUrl).slice(0, 10).forEach(s => wanted.push([s.id, `${s.name} travel`]));
      for (const [key, query] of wanted) {
        try {
          const url = await fetchUnsplashImage(query);
          if (cancelled) return;
          if (url) setPhotos(prev => (prev[key] ? prev : { ...prev, [key]: url }));
        } catch { /* photo is a nice-to-have */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, stops.length]);

  const heroPhoto = heroPhotoFromTrip || photos['__hero'];

  // ── Reactions (public counts; toggling requires sign-in) ──
  const [liked, setLiked] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [likes, setLikes] = React.useState(0);
  const [saves, setSaves] = React.useState(0);
  const busyRef = React.useRef<Record<string, boolean>>({});

  const applySummary = React.useCallback((s: any) => {
    if (!s) return;
    setLikes(Math.max(0, Number(s.likes) || 0));
    setSaves(Math.max(0, Number(s.saves) || 0));
    setLiked(!!s.userLiked);
    setSaved(!!s.userSaved);
  }, []);

  React.useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    apiServices.getTripReactions(token, tripId)
      .then(resp => { if (!cancelled) applySummary(resp.data); })
      .catch(() => { /* counts stay at zero */ });
    return () => { cancelled = true; };
  }, [tripId, token, applySummary]);

  const toggleReaction = async (type: 'like' | 'save') => {
    if (!token) { navigate('/signin'); return; }
    if (busyRef.current[type]) return;
    busyRef.current[type] = true;
    try {
      const resp = await apiServices.toggleTripReaction(token, tripId, type);
      applySummary(resp.data);
    } catch { /* stay on last server state */ } finally {
      busyRef.current[type] = false;
    }
  };

  // ── Clone ("Make it yours"), the conversion action ──
  const [cloning, setCloning] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const handleClone = async () => {
    if (!token) { navigate('/signup'); return; }
    if (cloning) return;
    setCloning(true);
    try {
      const resp = await apiServices.cloneTrip(token, tripId);
      const newId = (resp.data as any)?.tripId || (resp.data as any)?.id;
      if (newId) {
        navigate(`/tripplanner/${newId}`, { state: { tripId: newId, __ts: Date.now() } });
      } else {
        setToast('Trip copied, find it on your dashboard.');
      }
    } catch {
      setToast("Couldn't copy this trip right now. Please try again.");
    } finally {
      setCloning(false);
    }
  };

  const [shareOpen, setShareOpen] = React.useState(false);

  const dateRange = startDate && endDate
    ? `${fmtDay(startDate)} – ${fmtFull(endDate)}`
    : startDate ? `From ${fmtFull(startDate)}` : null;

  const border = theme.custom.surface.border;
  const serif = theme.custom.fontDisplay;
  const canEdit = isOwner || isMember;
  // Budget, packing, and booking references are the crew's business, not the public's.
  const memberView = isOwner || isMember;

  // Meta separator dot
  const Dot = () => <Box component="span" sx={{ mx: 1, opacity: 0.55 }}>·</Box>;

  // Day ranges per stop, tour-operator style ("Day 1–3" = arrive day 1, leave day 3).
  const stopMeta = React.useMemo(() => {
    let cursor = 1;
    return stops.map((s) => {
      const from = cursor;
      const to = from + Math.max(1, s.nights) - (s.nights > 0 ? 0 : 1);
      cursor = from + Math.max(s.nights, 1);
      return { from, to, dayLabel: s.nights > 1 ? `Day ${from}–${to}` : `Day ${from}` };
    });
  }, [stops]);

  // Sticky day nav: track which stop section is in view, jump on chip click.
  const stopRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [activeStop, setActiveStop] = React.useState(0);
  React.useEffect(() => {
    if (stops.length < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const idx = stopRefs.current.findIndex((el) => el === visible[0].target);
          if (idx >= 0) setActiveStop(idx);
        }
      },
      { rootMargin: '-150px 0px -55% 0px', threshold: 0 },
    );
    stopRefs.current.slice(0, stops.length).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [stops.length]);

  const scrollToStop = (idx: number) => {
    stopRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>

      {/* ═══ HERO ═══ */}
      <Box sx={{ position: 'relative', height: { xs: 420, md: 520 }, overflow: 'hidden', bgcolor: '#101318' }}>
        {heroPhoto && (
          <Box component="img" src={heroPhoto} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,10,14,0.42) 0%, rgba(8,10,14,0.08) 34%, rgba(8,10,14,0.78) 100%)' }} />

        {/* Minimal overlay nav */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 4 }, py: 2 }}>
          <Button
            onClick={() => navigate(-1)}
            startIcon={<IconArrowLeft size={15} />}
            sx={{ color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: 13.5, bgcolor: 'rgba(10,12,16,0.42)', borderRadius: '50px', px: 1.75, py: 0.6, '&:hover': { bgcolor: 'rgba(10,12,16,0.62)' } }}
          >
            Back
          </Button>
          <Button
            onClick={() => navigate('/community')}
            sx={{ color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: 13.5, bgcolor: 'rgba(10,12,16,0.42)', borderRadius: '50px', px: 1.75, py: 0.6, '&:hover': { bgcolor: 'rgba(10,12,16,0.62)' } }}
          >
            Explore more trips
          </Button>
        </Box>

        {/* Title block */}
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, px: { xs: 2.5, md: 6 }, pb: { xs: 3.5, md: 5 }, maxWidth: 1280, mx: 'auto' }}>
          {countries.length > 0 && (
            <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: "'Inter',sans-serif", mb: 1 }}>
              {countries.join('  ·  ')}
            </Typography>
          )}
          <Typography component="h1" sx={{ color: '#fff', fontFamily: serif, fontWeight: 700, fontSize: { xs: '2.1rem', sm: '2.8rem', md: '3.4rem' }, lineHeight: 1.08, letterSpacing: '-0.02em', maxWidth: 900, textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}>
            {name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mt: 2, color: 'rgba(255,255,255,0.92)', fontFamily: "'Inter',sans-serif", fontSize: 14 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar src={ownerAvatar} sx={{ width: 26, height: 26, fontSize: 12, bgcolor: '#FF385C' }}>{ownerName[0]}</Avatar>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>by {ownerName}</Typography>
            </Box>
            {dateRange && (<><Dot />{dateRange}</>)}
            {totalNights > 0 && (<><Dot />{totalNights} night{totalNights === 1 ? '' : 's'}</>)}
            {stops.length > 0 && (<><Dot />{stops.length} stop{stops.length === 1 ? '' : 's'}</>)}
          </Box>
        </Box>
      </Box>

      {/* ═══ STICKY ACTION BAR ═══ */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: 'background.paper', borderBottom: `1px solid ${border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography noWrap sx={{ fontFamily: serif, fontWeight: 700, fontSize: 17, color: 'text.primary', flex: 1, minWidth: 0, mr: 1 }}>
            {name}
          </Typography>

          <Button
            size="small"
            onClick={() => toggleReaction('like')}
            startIcon={liked ? <IconHeartFilled size={16} color="#FF385C" /> : <IconHeart size={16} />}
            sx={{ textTransform: 'none', fontWeight: 600, color: liked ? '#FF385C' : 'text.secondary', minWidth: 0, px: 1.25, borderRadius: '50px' }}
          >
            {likes > 0 ? likes : 'Like'}
          </Button>
          <Button
            size="small"
            onClick={() => toggleReaction('save')}
            startIcon={saved ? <IconBookmarkFilled size={16} color="#FF385C" /> : <IconBookmark size={16} />}
            sx={{ textTransform: 'none', fontWeight: 600, color: saved ? '#FF385C' : 'text.secondary', minWidth: 0, px: 1.25, borderRadius: '50px' }}
          >
            {saves > 0 ? saves : 'Save'}
          </Button>
          <Button
            size="small"
            onClick={() => setShareOpen(true)}
            startIcon={<IconShare2 size={16} />}
            sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', minWidth: 0, px: 1.25, borderRadius: '50px', display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Share
          </Button>

          {canEdit ? (
            <Button
              variant="contained"
              size="small"
              onClick={onEdit}
              startIcon={<IconPencil size={15} />}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px', px: 2, flexShrink: 0 }}
            >
              Edit trip
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={handleClone}
              disabled={cloning}
              startIcon={<IconCopy size={15} />}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px', px: 2, flexShrink: 0 }}
            >
              {cloning ? 'Copying…' : 'Make it yours'}
            </Button>
          )}
        </Box>
      </Box>

      {/* ═══ STICKY DAY NAV, jump to any leg with one tap ═══ */}
      {stops.length >= 2 && (
        <Box sx={{ position: 'sticky', top: 57, zIndex: 19, bgcolor: 'background.default', borderBottom: `1px solid ${border}` }}>
          <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 1, display: 'flex', gap: 0.75, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
            {stops.map((stop, idx) => {
              const active = activeStop === idx;
              return (
                <Box
                  key={stop.id}
                  component="button"
                  type="button"
                  onClick={() => scrollToStop(idx)}
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.75, flexShrink: 0,
                    border: `1px solid ${active ? 'transparent' : border}`,
                    bgcolor: active ? 'text.primary' : 'transparent',
                    color: active ? 'background.paper' : 'text.secondary',
                    borderRadius: '50px', px: 1.5, py: 0.55, cursor: 'pointer',
                    fontFamily: "'Inter',sans-serif", fontSize: 12.5, fontWeight: 600,
                    transition: 'all .15s',
                    '&:hover': active ? {} : { borderColor: 'text.primary', color: 'text.primary' },
                  }}
                >
                  <Box component="span" sx={{ fontWeight: 700 }}>Day {stopMeta[idx].from}</Box>
                  <Box component="span" sx={{ opacity: 0.75 }}>{stop.name}</Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* ═══ BODY ═══ */}
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 6 }, display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'minmax(0,1fr) 360px' }, gap: { xs: 4, md: 6 }, alignItems: 'start' }}>

        {/* ── Left: story + route ── */}
        <Box sx={{ minWidth: 0 }}>
          {description && (
            <Box sx={{ mb: importantNotes ? 3.5 : 5 }}>
              <Typography sx={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: 'text.primary', mb: 1.5 }}>
                About this trip
              </Typography>
              <Typography sx={{ fontFamily: "'Inter',sans-serif", fontSize: 16, lineHeight: 1.75, color: 'text.secondary', maxWidth: 680, whiteSpace: 'pre-line' }}>
                {description}
              </Typography>
            </Box>
          )}

          {/* Trip-wide practical notes the planner wrote, visas, warnings, essentials */}
          {importantNotes && (
            <Box sx={{ mb: 5, borderRadius: '16px', border: `1px solid ${border}`, bgcolor: 'background.paper', p: 2.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <IconInfoCircle size={20} style={{ color: '#FF385C', flexShrink: 0, marginTop: 2 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mb: 0.75 }}>
                  Good to know
                </Typography>
                <Typography sx={{ fontSize: 14.5, color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {importantNotes}
                </Typography>
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 3 }}>
            <Typography sx={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: 'text.primary' }}>
              The route
            </Typography>
            {totalNights > 0 && (
              <Typography sx={{ fontSize: 13.5, color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
                {stops.length} stop{stops.length === 1 ? '' : 's'} · {totalNights} night{totalNights === 1 ? '' : 's'}
              </Typography>
            )}
          </Box>

          {stops.length === 0 && (
            <Typography sx={{ fontSize: 14.5, color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
              The itinerary is still being written, check back soon.
            </Typography>
          )}

          {/* Timeline */}
          <Box>
            {stops.map((stop, idx) => {
              const { dayLabel } = stopMeta[idx];
              const photo = stop.photoUrl || photos[stop.id];
              const isLast = idx === stops.length - 1;
              const TransportIcon = stop.transport ? transportIcon(stop.transport) : null;
              const hasContent = stop.spots.length > 0 || stop.foods.length > 0
                || !!stop.notes || stop.stays.length > 0 || !!stop.stayNotes;
              const dateLine = [
                dayLabel,
                stop.nights > 0 ? `${stop.nights} night${stop.nights === 1 ? '' : 's'}` : 'Day visit',
                stop.startDate ? `${fmtDow(stop.startDate)}${stop.endDate ? ` → ${fmtDow(stop.endDate)}` : ''}` : null,
              ].filter(Boolean).join('  ·  ');

              return (
                <Box
                  key={stop.id}
                  ref={(el: HTMLDivElement | null) => { stopRefs.current[idx] = el; }}
                  sx={{ scrollMarginTop: '132px' }}
                >
                {/* Transport leg into this stop */}
                {idx > 0 && stop.transport && TransportIcon && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: '7px', mb: 2, mt: -2 }}>
                    <Box sx={{ width: 16, display: 'flex', justifyContent: 'center' }}>
                      <Box sx={{ width: 2, height: 26, bgcolor: border, borderRadius: 1 }} />
                    </Box>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, border: `1px solid ${border}`, borderRadius: '50px', px: 1.5, py: 0.5, bgcolor: 'background.paper' }}>
                      <TransportIcon size={14} style={{ color: '#FF385C' }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', fontFamily: "'Inter',sans-serif", textTransform: 'capitalize' }}>
                        By {stop.transport}
                      </Typography>
                    </Box>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 } }}>
                  {/* Rail */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 30, flexShrink: 0 }}>
                    <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: 'text.primary', color: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif", flexShrink: 0 }}>
                      {idx + 1}
                    </Box>
                    {!isLast && <Box sx={{ width: 2, flex: 1, bgcolor: border, my: 1, borderRadius: 1 }} />}
                  </Box>

                  {/* Stop card */}
                  <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 5 }}>
                    {!hasContent ? (
                      /* No planned details yet: compact row, not a hollow banner */
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, borderRadius: '16px', border: `1px solid ${border}`, bgcolor: 'background.paper', p: 1.5 }}>
                        {photo && (
                          <Box component="img" src={photo} alt={stop.name} sx={{ width: 72, height: 72, borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontFamily: serif, fontWeight: 700, fontSize: 19, color: 'text.primary', lineHeight: 1.2 }}>
                            {stop.name}
                          </Typography>
                          <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontFamily: "'Inter',sans-serif", fontWeight: 600, mt: 0.4 }}>
                            {dateLine}
                          </Typography>
                        </Box>
                        <Button
                          component="a"
                          href={stopMapsHref(stop)}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          variant="outlined"
                          startIcon={<IconMapPin size={13} />}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, borderRadius: '50px', flexShrink: 0 }}
                        >
                          Map
                        </Button>
                      </Box>
                    ) : (
                    <>
                    {photo && (
                      <Box sx={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', mb: 2, border: `1px solid ${border}` }}>
                        <Box component="img" src={photo} alt={stop.name} sx={{ width: '100%', height: { xs: 180, sm: 220 }, objectFit: 'cover', display: 'block' }} />
                        <Box sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'rgba(12,14,18,0.66)', color: '#fff', borderRadius: '50px', px: 1.5, py: 0.4, fontSize: 12, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>
                          {dayLabel}
                        </Box>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontFamily: serif, fontWeight: 700, fontSize: 24, color: 'text.primary', lineHeight: 1.2, mr: 'auto' }}>
                        {stop.name}
                      </Typography>
                      <Button
                        component="a"
                        href={stopMapsHref(stop)}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        variant="outlined"
                        startIcon={<IconMapPin size={13} />}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, borderRadius: '50px', py: 0.25, flexShrink: 0 }}
                      >
                        Open in Maps
                      </Button>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: 'text.disabled', fontFamily: "'Inter',sans-serif", fontWeight: 600, mt: 0.5 }}>
                      {dateLine}
                    </Typography>
                    {stop.title && (
                      <Typography sx={{ fontSize: 14.5, color: 'text.secondary', fontFamily: "'Inter',sans-serif", mt: 0.5 }}>
                        {stop.title}
                      </Typography>
                    )}

                    {stop.spots.length > 0 && (
                      <Box sx={{ mt: 2.25 }}>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mb: 1.25 }}>
                          Places to experience
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {stop.spots.map((spot, si) => (
                            <Box
                              key={si}
                              component={spot.mapsHref ? 'a' : 'div'}
                              {...(spot.mapsHref ? { href: spot.mapsHref, target: '_blank', rel: 'noopener noreferrer' } : {})}
                              sx={{
                                display: 'flex', gap: 1.5, alignItems: 'flex-start',
                                textDecoration: 'none', color: 'inherit',
                                borderRadius: '12px', px: 1, py: 0.75, mx: -1,
                                transition: 'background .15s',
                                '&:hover': spot.mapsHref ? { bgcolor: 'action.hover' } : {},
                              }}
                            >
                              {spot.photoUrl ? (
                                <Box component="img" src={spot.photoUrl} alt={spot.name} sx={{ width: 52, height: 52, borderRadius: '10px', objectFit: 'cover', flexShrink: 0, border: `1px solid ${border}` }} />
                              ) : (
                                <Box sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
                                  <IconMapPin size={15} style={{ color: '#FF385C' }} />
                                </Box>
                              )}
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                  <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: 'text.primary', fontFamily: "'Inter',sans-serif" }}>
                                    {spot.name}
                                  </Typography>
                                  {spot.mustVisit && (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: '#FF385C', fontSize: 11, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>
                                      <IconStar size={12} /> Must-see
                                    </Box>
                                  )}
                                  {spot.mapsHref && (
                                    /* Row itself is the link; this is just the visual cue */
                                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', color: 'text.disabled' }}>
                                      <IconExternalLink size={14} />
                                    </Box>
                                  )}
                                </Box>
                                {spot.description && (
                                  <Typography sx={{ fontSize: 13.5, color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.55 }}>
                                    {spot.description}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {(stop.stays.length > 0 || stop.stayNotes) && (
                      <Box sx={{ mt: 2.25 }}>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mb: 1, display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <IconBed size={13} /> Where they stayed
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {stop.stays.map((stay, sti) => (
                            <Box key={sti} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                              <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', fontFamily: "'Inter',sans-serif" }}>
                                {stay.name}
                              </Typography>
                              {/* Booking links & confirmation refs are crew business */}
                              {memberView && stay.referenceHref && (
                                <Box component="a" href={stay.referenceHref} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', color: 'text.disabled', '&:hover': { color: '#FF385C' } }}>
                                  <IconExternalLink size={14} />
                                </Box>
                              )}
                              {memberView && stay.referenceText && (
                                <Typography sx={{ fontSize: 13, color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
                                  · {stay.referenceText}
                                </Typography>
                              )}
                            </Box>
                          ))}
                          {stop.stayNotes && (
                            <Typography sx={{ fontSize: 13.5, color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.55 }}>
                              {stop.stayNotes}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}

                    {stop.foods.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mb: 1, display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <IconToolsKitchen2 size={13} /> Worth tasting
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                          {stop.foods.map((food, fi) => (
                            <Chip key={fi} label={food} size="small" variant="outlined" sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize: 12.5, borderColor: border, color: 'text.secondary' }} />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {stop.notes && (
                      <Box sx={{ mt: 2, pl: 1.75, borderLeft: `3px solid ${theme.palette.mode === 'light' ? 'rgba(255,56,92,0.35)' : 'rgba(255,56,92,0.5)'}` }}>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <IconNotes size={13} /> Notes from the planner
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                          {stop.notes}
                        </Typography>
                      </Box>
                    )}
                    </>
                    )}
                  </Box>
                </Box>
                </Box>
              );
            })}
          </Box>

          {/* ── Packing checklist (crew-only): the suitcase-side companion ── */}
          {memberView && packing.length > 0 && (
            <Box sx={{ mt: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconLuggage size={20} style={{ color: '#FF385C' }} />
                  <Typography sx={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: 'text.primary' }}>
                    The packing list
                  </Typography>
                </Box>
                <MembersOnlyTag />
              </Box>

              {/* Overall progress */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, maxWidth: 460 }}>
                {allPacked ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#16a34a' }}>
                    <IconConfetti size={17} />
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>
                      All packed, go catch that flight.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <LinearProgress
                      variant="determinate"
                      value={packTotal ? (packDone / packTotal) * 100 : 0}
                      sx={{ flex: 1, height: 7, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: '#FF385C' } }}
                    />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap' }}>
                      {packDone} of {packTotal} packed
                    </Typography>
                  </>
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2, minmax(0,1fr))' }, gap: 2 }}>
                {packing.map((cat, ci) => {
                  const CatIcon = packingCategoryIcon(cat.name);
                  const done = cat.items.filter(isPacked).length;
                  const catComplete = done === cat.items.length;
                  return (
                    <Box key={ci} sx={{
                      borderRadius: '16px',
                      border: `1px solid ${catComplete ? 'rgba(22,163,74,0.35)' : border}`,
                      bgcolor: 'background.paper',
                      p: 2,
                      transition: 'border-color .2s',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                        <Box sx={{
                          width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          bgcolor: catComplete ? 'rgba(22,163,74,0.10)' : 'rgba(255,56,92,0.08)',
                          color: catComplete ? '#16a34a' : '#FF385C',
                        }}>
                          <CatIcon size={16} />
                        </Box>
                        <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: 'text.primary', fontFamily: "'Inter',sans-serif", flex: 1, minWidth: 0 }}>
                          {cat.name}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: catComplete ? '#16a34a' : 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
                          {done}/{cat.items.length}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={cat.items.length ? (done / cat.items.length) * 100 : 0}
                        sx={{ height: 3, borderRadius: 2, mb: 1.5, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: catComplete ? '#16a34a' : '#FF385C' } }}
                      />
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {cat.items.map((item) => {
                          const packed = isPacked(item);
                          return (
                            <Box
                              key={item.key}
                              component="button"
                              type="button"
                              onClick={() => togglePacked(item)}
                              aria-pressed={packed}
                              sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 0.6,
                                border: `1px solid ${packed ? 'rgba(255,56,92,0.35)' : border}`,
                                bgcolor: packed ? 'rgba(255,56,92,0.06)' : 'transparent',
                                color: packed ? 'text.disabled' : 'text.secondary',
                                borderRadius: '50px', px: 1.1, py: 0.5, cursor: 'pointer',
                                fontFamily: "'Inter',sans-serif", fontSize: 12.5, fontWeight: 600,
                                textDecoration: packed ? 'line-through' : 'none',
                                transition: 'all .15s',
                                '&:hover': { borderColor: 'rgba(255,56,92,0.5)' },
                              }}
                            >
                              {packed
                                ? <IconCircleCheckFilled size={15} style={{ color: '#FF385C', flexShrink: 0 }} />
                                : <IconCircle size={15} style={{ opacity: 0.45, flexShrink: 0 }} />}
                              {item.qty > 1 ? `${item.name} × ${item.qty}` : item.name}
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', fontFamily: "'Inter',sans-serif", mt: 1.5 }}>
                Ticks here stay on this device, perfect for packing day. The planner keeps the master list.
              </Typography>
            </Box>
          )}
        </Box>

        {/* ── Right: sticky sidebar ── */}
        <Box sx={{ minWidth: 0, position: { md: 'sticky' }, top: { md: 76 } }}>
          {/* Map */}
          <Box sx={{ height: 260, borderRadius: '18px', overflow: 'hidden', border: `1px solid ${border}`, boxShadow: theme.custom.shadows.card, mb: 2.5 }}>
            <ShowcaseMap stops={stops} />
          </Box>

          {/* Facts */}
          <Box sx={{ borderRadius: '18px', border: `1px solid ${border}`, bgcolor: 'background.paper', boxShadow: theme.custom.shadows.card, p: 2.5, mb: 2.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {dateRange && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <IconCalendar size={17} style={{ color: '#FF385C', flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', fontFamily: "'Inter',sans-serif" }}>{dateRange}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <IconMoonStars size={17} style={{ color: '#FF385C', flexShrink: 0 }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', fontFamily: "'Inter',sans-serif" }}>
                  {totalNights} night{totalNights === 1 ? '' : 's'} · {stops.length} stop{stops.length === 1 ? '' : 's'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <IconUsers size={17} style={{ color: '#FF385C', flexShrink: 0 }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', fontFamily: "'Inter',sans-serif" }}>
                  {memberCount} traveler{memberCount === 1 ? '' : 's'}
                </Typography>
              </Box>
              {vibe && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <vibe.Icon size={17} style={{ color: '#FF385C', flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', fontFamily: "'Inter',sans-serif" }}>
                    {vibe.label} trip
                  </Typography>
                </Box>
              )}
              {memberView && budgetLabel && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <IconWallet size={17} style={{ color: '#FF385C', flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', fontFamily: "'Inter',sans-serif" }}>
                      {budgetLabel}
                    </Typography>
                    <MembersOnlyTag />
                  </Box>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Owner */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Avatar src={ownerAvatar} sx={{ width: 38, height: 38, bgcolor: '#FF385C', fontWeight: 700 }}>{ownerName[0]}</Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 14.5, fontWeight: 700, color: 'text.primary', fontFamily: "'Inter',sans-serif" }}>{ownerName}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>Trip creator</Typography>
              </Box>
            </Box>
          </Box>

          {/* CTA */}
          <Box sx={{ borderRadius: '18px', border: `1px solid ${border}`, bgcolor: 'background.paper', boxShadow: theme.custom.shadows.card, p: 2.5 }}>
            {canEdit ? (
              <>
                <Button fullWidth variant="contained" onClick={onEdit} startIcon={<IconPencil size={16} />} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px', py: 1.1 }}>
                  Edit this trip
                </Button>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', fontFamily: "'Inter',sans-serif", textAlign: 'center', mt: 1.25 }}>
                  Public visitors see this page without the members-only sections.
                </Typography>
              </>
            ) : (
              <>
                <Button fullWidth variant="contained" onClick={handleClone} disabled={cloning} startIcon={<IconRoute size={16} />} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px', py: 1.1 }}>
                  {cloning ? 'Copying…' : 'Make this trip yours'}
                </Button>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', fontFamily: "'Inter',sans-serif", textAlign: 'center', mt: 1.25 }}>
                  Copies the full route into your own planner, free, and yours to reshape.
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* ═══ COMMENTS ═══ */}
      {isPublished ? (
        <Box sx={{ borderTop: `1px solid ${border}`, bgcolor: 'background.paper' }}>
          <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 6 } }}>
            <TripComments tripId={tripId} authToken={token ?? null} />
          </Box>
        </Box>
      ) : canEdit ? (
        <Box sx={{ borderTop: `1px solid ${border}`, bgcolor: 'background.paper' }}>
          <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
              <IconLock size={12} />
              <Typography component="span" sx={{ fontSize: 11, fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>
                Comments open once you publish this trip
              </Typography>
            </Box>
          </Box>
        </Box>
      ) : null}

      <TripShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        tripId={tripId}
        tripName={name}
        destinationCount={stops.length}
        totalNights={totalNights}
      />

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default TripShowcase;
