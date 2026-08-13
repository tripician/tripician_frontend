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
  Box, Typography, Button, Avatar, Chip, Collapse, Divider, Snackbar, LinearProgress, Tooltip, useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  IconArrowLeft, IconHeart, IconHeartFilled, IconBookmark, IconBookmarkFilled,
  IconShare2, IconPencil, IconCopy, IconMapPin, IconMoonStars, IconCalendar, IconFileDownload,
  IconUsers, IconToolsKitchen2, IconNotes, IconRoute, IconInfoCircle, IconBed,
  IconWallet, IconExternalLink, IconPlane, IconTrain, IconBus, IconCar,
  IconSailboat, IconWalk, IconLuggage, IconStar, IconLock,
  IconCircle, IconCircleCheckFilled, IconShirt, IconId, IconDroplet,
  IconPlug, IconFirstAidKit, IconMountain, IconConfetti, IconChevronDown,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { fetchUnsplashImage } from '../../services/unsplashService';
import { resolveTripCover } from '../../utils/tripCover';
import { VIBES } from '../CommunityPage/vibes';
import { safeExternalUrl } from '../../utils/sanitizeHtml';
import TripShareModal from '../../components/TripShareModal';
import ProvenanceChip from '../../components/CommonComponents/ProvenanceChip';
import ExpandableText from '../../components/ui/ExpandableText';
import type { SpotProvenance } from '../../store/plannerSlice';
import TripComments from '../CreateTripPage/TripComments';
import ShowcaseMap from './ShowcaseMap';

// ─── Data normalisation ───────────────────────────────────────────────────────

interface ShowcaseSpot {
  name: string;
  description?: string;
  photoUrl?: string;
  mapsHref?: string;
  mustVisit?: boolean;
  provenance?: SpotProvenance;
  verifiedAt?: string;
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
          provenance: s.provenance === 'verified' || s.provenance === 'unchecked' ? s.provenance : undefined,
          verifiedAt: typeof s.verifiedAt === 'string' ? s.verifiedAt : undefined,
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

/**
 * Timeline geometry, named because three places have to agree on it: the vertical
 * space between stops, the connector segments that cross it, and the numbered node
 * they run into. Hard-coding 40 and 30 in each spot is how a rail drifts out of
 * alignment the first time someone changes the spacing.
 */
const STOP_GAP_PX = 40;
const RAIL_NODE_PX = 30;

/**
 * The chevron that opens and closes a stop.
 *
 * Extracted because it renders in both card states, and a copy in each would let
 * them drift on size, rotation or label. It is the ONLY announced control for the
 * toggle: the cover photo and the stop name also respond to clicks, but as mouse
 * conveniences, so there is exactly one tab stop per stop.
 *
 * A sibling of the "Open in Maps" link rather than a wrapper around the header, so
 * an anchor never ends up nested inside a button.
 */
const StopToggle: React.FC<{
  stop: { id: string; name: string };
  expanded: boolean;
  /** No planned detail to reveal. Rendered, but inert. */
  disabled?: boolean;
  onToggle: (id: string) => void;
}> = ({ stop, expanded, disabled = false, onToggle }) => {
  const button = (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : (e: React.MouseEvent) => { e.stopPropagation(); onToggle(stop.id); }}
      /* No aria-expanded or aria-controls when disabled: there is no detail panel
         rendered for a bare stop, so both would point at nothing. The label carries
         the reason instead. */
      aria-expanded={disabled ? undefined : expanded}
      aria-controls={disabled ? undefined : `stop-details-${stop.id}`}
      aria-label={disabled
        ? `Nothing planned for ${stop.name} yet`
        : expanded ? `Hide details for ${stop.name}` : `Show details for ${stop.name}`}
      sx={(t) => ({
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, flexShrink: 0,
        borderRadius: '50%',
        border: `1px solid ${t.custom.surface.border}`,
        bgcolor: 'background.paper',
        // Dimmed rather than hidden, so every row keeps the same geometry and the
        // Map buttons stay in one column down the page. Muted via the icon colour
        // plus a light overall fade rather than opacity alone: the icon is already a
        // mid grey, so dropping it to ~0.35 made the whole circle vanish against the
        // paper instead of reading as an inactive control.
        color: disabled ? 'text.disabled' : 'text.secondary',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.65 : 1,
        transition: `transform ${t.custom.motion.duration.base} ${t.custom.motion.easing.standard}, color .15s, border-color .15s`,
        transform: expanded ? 'rotate(180deg)' : 'none',
        '&:hover': disabled ? {} : { color: 'text.primary', borderColor: 'text.disabled' },
        '&:focus-visible': { outline: `2px solid ${t.custom.ring}`, outlineOffset: 2 },
      })}
    >
      <IconChevronDown size={17} stroke={2} />
    </Box>
  );

  if (!disabled) return button;

  /* A disabled button fires no pointer events, so the tooltip needs a live wrapper
     or the explanation never appears, which is the only time it matters. */
  return (
    <Tooltip title="Nothing planned for this stop yet" arrow placement="top">
      <Box component="span" sx={{ display: 'inline-flex' }}>{button}</Box>
    </Tooltip>
  );
};

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
      // The hero goes through the shared resolver so this page and the trip's
      // cards agree on one photo. Per-stop shots stay a plain Unsplash lookup.
      if (!heroPhotoFromTrip) {
        try {
          const heroUrl = await resolveTripCover({ countries, name });
          if (cancelled) return;
          if (heroUrl) setPhotos(prev => (prev['__hero'] ? prev : { ...prev, __hero: heroUrl }));
        } catch { /* photo is a nice-to-have */ }
      }
      for (const s of stops.filter(s => !s.photoUrl).slice(0, 10)) {
        try {
          const url = await fetchUnsplashImage(`${s.name} travel`, 'landscape');
          if (cancelled) return;
          if (url) setPhotos(prev => (prev[s.id] ? prev : { ...prev, [s.id]: url }));
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

  const [pdfBusy, setPdfBusy] = React.useState(false);
  /**
   * Downloads the itinerary PDF. Rendered by headless Chromium on the server so
   * the photos and layout survive - a browser-side capture would drop the Google
   * Places spot photos to CORS and render the map canvas blank.
   */
  const handleDownloadPdf = React.useCallback(async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const apiBase = ((import.meta.env.VITE_API_BASE_URL as string) || '').replace(/\/$/, '');
      // Members get the crew variant; the server ignores the flag for everyone else.
      const url = `${apiBase}/api/trips/${tripId}/pdf${isOwner || isMember ? '?full=true' : ''}`;
      const resp = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (!resp.ok) throw new Error(String(resp.status));

      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `tripician-${(name || 'trip').replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch {
      setToast("Couldn't build the PDF right now. Please try again.");
    } finally {
      setPdfBusy(false);
    }
  }, [pdfBusy, tripId, isOwner, isMember, token, name]);

  const dateRange = startDate && endDate
    ? `${fmtDay(startDate)} - ${fmtFull(endDate)}`
    : startDate ? `From ${fmtFull(startDate)}` : null;

  const border = theme.custom.surface.border;
  const serif = theme.custom.fontDisplay;
  const canEdit = isOwner || isMember;
  // Budget, packing, and booking references are the crew's business, not the public's.
  const memberView = isOwner || isMember;

  // Meta separator dot
  const Dot = () => <Box component="span" sx={{ mx: 1, opacity: 0.55 }}>·</Box>;

  // Day ranges per stop, tour-operator style ("Day 1-3" = arrive day 1, leave day 3).
  const stopMeta = React.useMemo(() => {
    let cursor = 1;
    return stops.map((s) => {
      const from = cursor;
      const to = from + Math.max(1, s.nights) - (s.nights > 0 ? 0 : 1);
      cursor = from + Math.max(s.nights, 1);
      return { from, to, dayLabel: s.nights > 1 ? `Day ${from}-${to}` : `Day ${from}` };
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

  /*
   * Stops are collapsed by default so the page opens as a readable overview of the
   * whole route rather than a wall you have to scroll past to see where the trip
   * even goes. A ten-stop trip with places, stays, food and notes ran to several
   * screens per stop; the shape of the journey was the one thing you could not see.
   *
   * Keyed by stop id, not index, so reordering upstream cannot transfer one stop's
   * open state to another.
   */
  const [expandedStops, setExpandedStops] = React.useState<Record<string, boolean>>({});

  const toggleStop = (id: string) => {
    setExpandedStops((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /** Stops with something to reveal. Bare stops render a compact row with no toggle. */
  const expandableIds = React.useMemo(() => stops.filter((s) => (
    s.spots.length > 0 || s.foods.length > 0 || !!s.notes || s.stays.length > 0 || !!s.stayNotes
  )).map((s) => s.id), [stops]);

  const allExpanded = expandableIds.length > 0 && expandableIds.every((id) => expandedStops[id]);

  const toggleAll = () => {
    const open = !allExpanded;
    setExpandedStops(open
      ? Object.fromEntries(expandableIds.map((id) => [id, true]))
      : {});
  };

  const scrollToStop = (idx: number) => {
    // Jumping to a day is a request to read it, so open it on the way. Landing on a
    // collapsed card after tapping its own chip reads as a broken link.
    const id = stops[idx]?.id;
    if (id) setExpandedStops((prev) => ({ ...prev, [id]: true }));
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
            Every stop tells a story.
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
          {/* Members get the crew version (booking refs + packing); everyone else
              gets the public itinerary. Rendered server-side, so it keeps the photos.
              Labelled for the reason people press it - a copy that works on the
              plane and at the border desk - with the tooltip carrying the mechanics. */}
          <Tooltip title="Save the illustrated itinerary as a PDF you can read without signal">
            {/* span, not the Button itself: a disabled button fires no pointer
                events, so the tooltip would never open while the PDF builds.
                The breakpoint lives here too, or the empty wrapper would still
                claim a flex gap on mobile. */}
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              <Button
                size="small"
                onClick={handleDownloadPdf}
                disabled={pdfBusy}
                startIcon={<IconFileDownload size={16} />}
                sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', minWidth: 0, px: 1.25, borderRadius: '50px' }}
              >
                {pdfBusy ? 'Preparing…' : 'Take it offline'}
              </Button>
            </Box>
          </Tooltip>

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
                Where & how?
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
                <ExpandableText
                  lines={4}
                  sx={{ fontSize: 14.5, color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.7, whiteSpace: 'pre-line' }}
                  moreLabel="Read all"
                  lessLabel="Show less"
                >
                  {importantNotes}
                </ExpandableText>
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
            {/* Opening eight stops one at a time is a chore; this is the escape hatch
                for anyone who wants to read the whole thing straight through. */}
            {expandableIds.length > 1 && (
              <Box
                component="button"
                type="button"
                onClick={toggleAll}
                sx={(t) => ({
                  ml: 'auto', flexShrink: 0,
                  border: 'none', background: 'none', p: 0.5, cursor: 'pointer',
                  fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600,
                  color: 'text.secondary',
                  borderRadius: '8px',
                  '&:hover': { color: 'text.primary' },
                  '&:focus-visible': { outline: `2px solid ${t.custom.ring}`, outlineOffset: 2 },
                })}
              >
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </Box>
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
              const expanded = !!expandedStops[stop.id];
              const dateLine = [
                dayLabel,
                stop.nights > 0 ? `${stop.nights} night${stop.nights === 1 ? '' : 's'}` : 'Day visit',
                stop.startDate ? `${fmtDow(stop.startDate)}${stop.endDate ? ` → ${fmtDow(stop.endDate)}` : ''}` : null,
              ].filter(Boolean).join('  ·  ');
              /*
               * What is inside, named while it is closed.
               *
               * This is what stops collapsing from being a downgrade. A card that hides
               * its contents behind a chevron and says nothing about them forces you to
               * open every stop to find out whether any of them is worth opening, which
               * is worse than the long page it replaced.
               */
              const contentSummary = [
                stop.spots.length > 0 ? `${stop.spots.length} place${stop.spots.length === 1 ? '' : 's'}` : null,
                stop.stays.length > 0 ? `${stop.stays.length} stay${stop.stays.length === 1 ? '' : 's'}` : null,
                stop.foods.length > 0 ? `${stop.foods.length} dish${stop.foods.length === 1 ? '' : 'es'}` : null,
                stop.notes ? 'notes' : null,
              ].filter(Boolean).join('  ·  ');

              return (
                <Box
                  key={stop.id}
                  ref={(el: HTMLDivElement | null) => { stopRefs.current[idx] = el; }}
                  /* The gap between stops is a MARGIN here, not padding on the card
                     column. That is what lets the number sit at the card's middle: the
                     rail column then stretches to exactly the card's height, so
                     centring in it centres on the card rather than on the card plus
                     40px of empty space below it. The connector reaches across the gap
                     with a negative offset instead. */
                  sx={{ scrollMarginTop: '132px', mb: isLast ? 0 : `${STOP_GAP_PX}px` }}
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
                  {/*
                    Rail. The number is centred against the card, and the connector is
                    drawn as two absolute segments around it rather than as a flex
                    sibling, because a flex line can only fill the space left over
                    BELOW the number, which is what pinned the number to the top.

                    Segments, and why they tile rather than overlap:
                      above  card top      -> just short of the number   (not on the first)
                      below  just past it  -> STOP_GAP_PX past the card  (not on the last)
                    The below segment is the one that crosses the gap, so each gap is
                    painted exactly once and the rail reads as one continuous line.
                  */}
                  <Box sx={{ position: 'relative', width: RAIL_NODE_PX, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {idx > 0 && (
                      <Box sx={{
                        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                        width: 2, borderRadius: 1, bgcolor: border,
                        top: 0, bottom: `calc(50% + ${RAIL_NODE_PX / 2 + 4}px)`,
                      }} />
                    )}
                    {!isLast && (
                      <Box sx={{
                        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                        width: 2, borderRadius: 1, bgcolor: border,
                        top: `calc(50% + ${RAIL_NODE_PX / 2 + 4}px)`, bottom: `-${STOP_GAP_PX}px`,
                      }} />
                    )}
                    <Box sx={{ position: 'relative', zIndex: 1, width: RAIL_NODE_PX, height: RAIL_NODE_PX, borderRadius: '50%', bgcolor: 'text.primary', color: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif", flexShrink: 0 }}>
                      {idx + 1}
                    </Box>
                  </Box>

                  {/* Stop card */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {/*
                      One card, two states.
                      ─────────────────────────────────────────────────────────────
                      Collapsed is the compact row: 72px thumb, name, dates, and a
                      line naming what is inside. Expanded is the cover photo plus
                      the full detail. Both live in the same bordered container so
                      the two Collapses hand height over to each other and the card
                      grows as one object instead of one block vanishing and another
                      appearing.

                      Two Collapses rather than a morph on purpose: animating a 72px
                      square into a full-width banner means scaling the photo, and a
                      stretched photo mid-tween looks broken. A cross-fade at matched
                      timings reads as smooth without distorting anything.

                      A stop with nothing planned only ever renders the top half, and
                      gets no chevron, because there is nothing to open.
                    */}
                    <Box
                      sx={{
                        borderRadius: '16px',
                        border: `1px solid ${border}`,
                        bgcolor: 'background.paper',
                        overflow: 'hidden',
                      }}
                    >
                      {/* ── Collapsed / summary row ── */}
                      <Collapse in={!expanded} timeout={260}>
                        <Box
                          onClick={hasContent ? () => toggleStop(stop.id) : undefined}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 2, p: 1.5,
                            cursor: hasContent ? 'pointer' : 'default',
                            /*
                             * Faded out ahead of the height, and back in behind it.
                             *
                             * Collapse clips rather than scales, so without this you
                             * catch a hard-cut half thumbnail for a frame or two while
                             * the two states swap. Leaving on the way out (no delay) and
                             * arriving after the height has made room (100ms) is what
                             * turns the handover into a cross-fade.
                             */
                            opacity: expanded ? 0 : 1,
                            transition: `opacity 160ms ease ${expanded ? '0ms' : '100ms'}, background .15s`,
                            '&:hover': hasContent ? { bgcolor: 'action.hover' } : {},
                          }}
                        >
                          {photo && (
                            <Box
                              component="img"
                              src={photo}
                              alt={stop.name}
                              sx={{ width: 72, height: 72, borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                            />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontFamily: serif, fontWeight: 700, fontSize: 19, color: 'text.primary', lineHeight: 1.2 }}>
                              {stop.name}
                            </Typography>
                            <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontFamily: "'Inter',sans-serif", fontWeight: 600, mt: 0.4 }}>
                              {dateLine}
                            </Typography>
                            {/* What is inside, named while it is closed. Without this a
                                collapsed card tells you nothing about its contents, so
                                you have to open every stop to find the one worth
                                reading, which is worse than the long page it replaced.
                                Left readable by assistive tech rather than aria-hidden. */}
                            {contentSummary && (
                              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.secondary', fontFamily: "'Inter',sans-serif", mt: 0.4 }}>
                                {contentSummary}
                              </Typography>
                            )}
                          </Box>
                          {/* Icon-only on a phone, where thumb + name + button + chevron
                              does not fit. Hiding it outright was wrong: a stop with
                              nothing planned has no chevron either, so it would have been
                              left with no action at all. */}
                          <Button
                            component="a"
                            href={stopMapsHref(stop)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            size="small"
                            variant="outlined"
                            aria-label={`Open ${stop.name} in Maps`}
                            sx={{
                              textTransform: 'none', fontWeight: 700, fontSize: 12,
                              borderRadius: '50px', flexShrink: 0,
                              minWidth: 0, px: { xs: 1.1, sm: 1.5 },
                            }}
                          >
                            <IconMapPin size={13} style={{ flexShrink: 0 }} />
                            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.6 }}>
                              Map
                            </Box>
                          </Button>
                          {/* On every row, disabled where there is nothing to open. Omitting
                              it left bare stops a chevron short, which pulled their Map
                              button out of line with the rest of the column. */}
                          <StopToggle stop={stop} expanded={expanded} disabled={!hasContent} onToggle={toggleStop} />
                        </Box>
                      </Collapse>

                      {/* ── Expanded detail ── */}
                      {hasContent && (
                      <Collapse in={expanded} timeout={260} id={`stop-details-${stop.id}`}>
                        <Box sx={{
                          // Mirror of the summary row's fade, offset the other way.
                          opacity: expanded ? 1 : 0,
                          transition: `opacity 180ms ease ${expanded ? '90ms' : '0ms'}`,
                        }}>
                        {photo && (
                          /* The cover doubles as the way to close the stop again. It is
                             the biggest thing on the card and was otherwise inert.
                             Deliberately a plain click handler, not a <button> and not
                             aria-hidden: making it a control would announce the image as
                             one, and hiding it would throw away the img's alt text. The
                             labelled chevron is the control assistive tech uses. */
                          <Box
                            onClick={() => toggleStop(stop.id)}
                            sx={{ position: 'relative', cursor: 'pointer' }}
                          >
                            <Box component="img" src={photo} alt={stop.name} sx={{ width: '100%', height: { xs: 180, sm: 220 }, objectFit: 'cover', display: 'block' }} />
                            <Box sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'rgba(12,14,18,0.66)', color: '#fff', borderRadius: '50px', px: 1.5, py: 0.4, fontSize: 12, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>
                              {dayLabel}
                            </Box>
                          </Box>
                        )}

                        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography
                              onClick={() => toggleStop(stop.id)}
                              sx={{ fontFamily: serif, fontWeight: 700, fontSize: 24, color: 'text.primary', lineHeight: 1.2, mr: 'auto', cursor: 'pointer' }}
                            >
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
                            <StopToggle stop={stop} expanded={expanded} onToggle={toggleStop} />
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
                                  <ProvenanceChip provenance={spot.provenance} verifiedAt={spot.verifiedAt} />
                                  {spot.mapsHref && (
                                    /* Row itself is the link; this is just the visual cue */
                                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', color: 'text.disabled' }}>
                                      <IconExternalLink size={14} />
                                    </Box>
                                  )}
                                </Box>
                                {spot.description && (
                                  <ExpandableText
                                    lines={1}
                                    sx={{ fontSize: 13.5, color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.55 }}
                                  >
                                    {spot.description}
                                  </ExpandableText>
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
                            <ExpandableText
                              lines={2}
                              sx={{ fontSize: 13.5, color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.55, whiteSpace: 'pre-line' }}
                            >
                              {stop.stayNotes}
                            </ExpandableText>
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
                        <ExpandableText
                          lines={3}
                          sx={{ fontSize: 14, color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.65, whiteSpace: 'pre-line' }}
                          moreLabel="Read the full note"
                          lessLabel="Show less"
                        >
                          {stop.notes}
                        </ExpandableText>
                      </Box>
                    )}
                        </Box>
                        </Box>
                      </Collapse>
                      )}
                    </Box>
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

      {/* ═══ COMMENTS ═══
          Given a heading and an invitation rather than being left as an unlabelled
          footer: the discussion on a plan is the point of a community, and a plan
          nobody can react to is just a document. */}
      {isPublished ? (
        <Box sx={{ borderTop: `1px solid ${border}`, bgcolor: 'background.paper' }}>
          <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 6 } }}>
            <Typography sx={{ fontFamily: serif, fontWeight: 700, fontSize: 22, color: 'text.primary', mb: 0.75 }}>
              {canEdit ? 'What travellers are saying' : `Been to ${countries[0] || 'these places'}?`}
            </Typography>
            <Typography sx={{ fontSize: 14.5, color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.6, mb: 2.5 }}>
              {canEdit
                ? 'Ask the community to look over your plan before you book - people who have been will tell you what you have missed.'
                : `Tell ${ownerName.split(' ')[0]} what you would change, what they have missed, or what is worth skipping. That advice is the most useful thing on this page.`}
            </Typography>
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
        isOwner={isOwner}
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
