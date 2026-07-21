import React, { useEffect, useMemo, useRef, useState } from 'react';
import TripCard from './TripCard';
import { Tabs, Tab, Box, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Snackbar, useTheme, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { fetchUnsplashImage } from '../../services/unsplashService';
import TripCreationModal from '../../components/CreateTripComponents/TripCreationModal';
import TripShareModal from '../../components/TripShareModal';
import EmptyState from '../../components/ui/EmptyState';
import SectionHeader from '../../components/ui/SectionHeader';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import { IconArrowRight, IconMapPlus, IconPlus } from '@tabler/icons-react';
import { staggerContainer, staggerItem } from '../../utils/animations';
import { clearUser } from '../../store/userSlice';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import TravelMap from '../../components/TravelMap';
import { countryAlpha3FromName } from '../../utils/countryFlags';
import { tripPath } from '../../utils/tripSlug';

const Dashboard: React.FC = () => {
  const demoDataEnabled = import.meta.env.DEV || String(import.meta.env.VITE_ENABLE_DEMO_DATA || '').toLowerCase() === 'true';
  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return '-';
    const now = Date.now();
    const diffMs = Math.max(0, now - then);
    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    const week = Math.floor(day / 7);
    const month = Math.floor(day / 30);
    const year = Math.floor(day / 365);
    if (sec < 60) return `${sec}s ago`;
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    if (day < 7) return `${day}d ago`;
    if (week < 5) return `${week}w ago`;
    if (month < 12) return `${month}mo ago`;
    return `${year}y ago`;
  };
  const { token, loading: authLoading } = useAuthToken();
  const navigate = useNavigate();
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const savedFetchedRef = useRef(false);
  const [tripImages, setTripImages] = useState<Record<string, string>>({});
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createTripOpen, setCreateTripOpen] = useState(false);
  const theme = useTheme();
  
  useSelector((state: RootState) => state.user);
  const userProfile = useSelector((state: RootState) => state.user.profile);

  const dispatch = useDispatch<AppDispatch>();
  

  const handleLogout = () => {
      try {
        // Remove stored tokens (adjust keys as needed)
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Clear redux user state
        dispatch(clearUser());
        navigate('/signin');
      } catch (e) {
        console.error('Logout error', e);
      }
    };

  // Maps a backend TripResponseDto into the card view-model used across all dashboard tabs.
  const mapTripVM = (t: any) => ({
    id: t.id || t.Id,
    title: t.name || t.title || 'Untitled trip',
    description: typeof t.description === 'string' ? t.description.trim() : '',
    visibility: t.visibility || t.Visibility || t.privacy || t.Privacy || 'PRIVATE',
    location: Array.isArray(t.countries) && t.countries.length ? t.countries[0] : 'Unknown',
    countries: Array.isArray(t.countries) ? t.countries : [],
    image: (() => {
      const cover = t.bannerPhotoUrl || t.BannerPhotoUrl || t.photoUrl || t.PhotoUrl;
      return (typeof cover === 'string' && cover.trim()) ? cover : '';
    })(),
    progress: typeof t.progress === 'number' ? t.progress : 0,
    edited: formatRelativeTime(t.updatedDate),
    members: (() => {
      const rawMembers = t.members || t.invitedUsers || [];
      const normalizeMember = (m: any) => {
        const u = m.user || m.User || m;
        const firstName = u.fname || u.Fname || u.firstName || u.FirstName || m.fname || m.firstName || '';
        const lastName = u.lname || u.Lname || u.lastName || u.LastName || m.lname || m.lastName || '';
        const name =
          u.name || u.Name || u.fullName || u.displayName ||
          m.name || m.Name || m.fullName || m.displayName ||
          [firstName, lastName].filter(Boolean).join(' ').trim() ||
          (u.email ? u.email.split('@')[0] : null) ||
          (m.email ? m.email.split('@')[0] : 'Member');
        const profilePic =
          u.profilePic || u.ProfilePic ||
          u.profilePicture || u.ProfilePicture ||
          u.profilepicture ||
          u.avatar || u.Avatar ||
          u.photoUrl || u.PhotoUrl ||
          m.profilePic || m.ProfilePic ||
          m.profilePicture || m.ProfilePicture ||
          m.profilepicture ||
          m.avatar || m.Avatar ||
          m.photoUrl || '';
        return {
          id: String(m.id || m.userId || m.Id || m.UserId || u.id || u.Id || ''),
          name,
          profilePic,
        };
      };
      const normalized = rawMembers.map(normalizeMember);
      const myId = String(userProfile?.id || '');
      const patched = normalized.map((m: { id: string; name: string; profilePic: string }) => {
        if (m.profilePic) return m;
        if (myId && m.id === myId) return { ...m, profilePic: (userProfile?.profilepicture as string) || '' };
        return m;
      });
      if (normalized.length === 0) {
        const o = t.owner || t.Owner || null;
        const firstName = (o?.fname || o?.Fname || o?.firstName || o?.FirstName ||
          userProfile?.fname || '') as string;
        const lastName = (o?.lname || o?.Lname || o?.lastName || o?.LastName ||
          userProfile?.lname || '') as string;
        const name = (o?.name || o?.Name || o?.displayName ||
          [firstName, lastName].filter(Boolean).join(' ').trim() ||
          (o?.email ? o.email.split('@')[0] : null) ||
          (userProfile?.email ? (userProfile.email as string).split('@')[0] : 'Me')) as string;
        const profilePic = (o?.profilePic || o?.profilePicture || o?.profilepicture ||
          o?.avatar || o?.Avatar || o?.photoUrl ||
          userProfile?.profilepicture || '') as string;
        return [{ id: String(o?.id || o?.Id || userProfile?.id || ''), name, profilePic }];
      }
      return patched;
    })(),
    startDate: t.startDate || t.start_date || null,
    endDate: t.endDate || t.end_date || null,
    isOwner: (() => {
      const myId = String(userProfile?.id || '');
      if (!myId) return true;
      const o = t.owner || t.Owner;
      const ownerId = String(
        t.OwnerUserId || t.ownerUserId || t.ownerId || t.OwnerId ||
        o?.id || o?.Id || o?.userId || o?.UserId || ''
      );
      return ownerId ? ownerId === myId : true;
    })(),
    isPublished: t.published === true || t.isPublished === true || (typeof t.status === 'string' && t.status.toUpperCase() === 'PUBLISHED'),
    tripStatus: typeof t.tripStatus === 'number' ? t.tripStatus : 0,
    ownerId: (() => {
      const o = t.owner || t.Owner;
      return String(
        t.OwnerUserId || t.ownerUserId || t.ownerId || t.OwnerId ||
        o?.id || o?.Id || o?.userId || o?.UserId || ''
      );
    })(),
  });


  // Page entrance animation (banner + tabs + cards)
  // ── Country codes for the trip map ────────────────────────────────────────
  const plannedCountryCodes = useMemo(() => {
    const codes = new Set<string>();
    allPlans
      .filter(p => !p.isPublished && p.tripStatus !== 2)
      .forEach(p => (p.countries || []).forEach((c: string) => {
        const a3 = countryAlpha3FromName(c);
        if (a3) codes.add(a3);
      }));
    return Array.from(codes);
  }, [allPlans]);

  const publishedCountryCodes = useMemo(() => {
    const codes = new Set<string>();
    allPlans
      .filter(p => p.isPublished)
      .forEach(p => (p.countries || []).forEach((c: string) => {
        const a3 = countryAlpha3FromName(c);
        if (a3) codes.add(a3);
      }));
    return Array.from(codes);
  }, [allPlans]);

  const hasMapData = plannedCountryCodes.length > 0 || publishedCountryCodes.length > 0;
  // Split view: on desktop the globe lives in a sticky right rail (Airbnb-style);
  // below lg it stays an inline section. One breakpoint, one mounted map.
  const isDesktop = useMediaQuery('(min-width:1200px)');
  const showWorldPanel = !loading && hasMapData;
  const worldCountryCount = new Set([...plannedCountryCodes, ...publishedCountryCodes]).size;

  // Fetch dashboard trips
  useEffect(() => {
    let active = true;
    const fetchTrips = async () => {
      if (authLoading) return; // auth still resolving - wait before fetching
      if(!token) { setLoading(false); return; } // not authenticated
      setLoading(true);
      setError(null);
      try {
        const resp = await apiServices.getDashboardTrips(token);
        // Assuming resp.data is an array of trips with fields: id, name, countries, progress?, updatedAt?, members?
        const mapped = (resp.data || []).map((t: any) => mapTripVM(t));
        if(active){
          setAllPlans(mapped);
          setPlans(mapped);
          // Kick off Unsplash fetches immediately - runs concurrently with state flush,
          // so images arrive with minimal extra delay (or instantly from localStorage cache).
          const tripsNeedingImage = mapped.filter((p: any) => !p.image && p.countries?.[0]);
          if (tripsNeedingImage.length > 0) {
            Promise.all(
              tripsNeedingImage.map(async (p: any) => {
                const url = await fetchUnsplashImage(p.countries[0]);
                return { id: p.id, url };
              })
            ).then((results) => {
              if (!active) return;
              const updates: Record<string, string> = {};
              results.forEach(({ id, url }) => { if (url) updates[id] = url; });
              if (Object.keys(updates).length > 0) setTripImages(prev => ({ ...prev, ...updates }));
            });
          }
        }
      } catch(err: any){
        if(active){
          console.error('[Dashboard] fetch trips failed', err);
          setError(err?.response?.data?.message || 'Failed to load trips');
        }
      } finally {
        if(active) setLoading(false);
      }
    };
    fetchTrips();
    return () => { active = false; };
  }, [token, authLoading]);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Share modal state
  const [shareTripId, setShareTripId] = useState<string | null>(null);
  const [shareTripMeta, setShareTripMeta] = useState<{ name: string; destinationCount: number; totalNights: number } | null>(null);

  const handleShare = (plan: any) => {
    setShareTripId(plan.id);
    setShareTripMeta({
      name: plan.title || 'My Trip',
      destinationCount: Array.isArray(plan.countries) ? plan.countries.length : 1,
      totalNights: typeof plan.totalNights === 'number' ? plan.totalNights : 0,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      await apiServices.deleteTrip(token, deleteTarget.id);
      setAllPlans(prev => prev.filter(p => p.id !== deleteTarget.id));
      setPlans(prev => prev.filter(p => p.id !== deleteTarget.id));
      setSnackbar('Trip deleted.');
    } catch {
      setSnackbar('Failed to delete trip.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Featured trip: only show if there's a genuinely future-dated trip
  const today = Date.now();
  const nextUpcoming = allPlans
    .filter(p => p.startDate && new Date(p.startDate).getTime() > today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] ?? null;

  const formatBoardingDate = (ds: string | null) => {
    if (!ds) return 'TBD';
    const d = new Date(ds);
    if (isNaN(d.getTime())) return 'TBD';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const demoTrips = useMemo(() => {
    if (!demoDataEnabled) return [] as any[];
    const existingIds = new Set(allPlans.map((p) => String(p.id)));
    const templates = [
      { id: 'demo-1', title: 'Nordic Aurora Loop', location: 'Norway' },
      { id: 'demo-2', title: 'Iberian Food Sprint', location: 'Spain' },
      { id: 'demo-3', title: 'Balkan Budget Run', location: 'Croatia' },
      { id: 'demo-4', title: 'Silk Road Cities', location: 'Turkey' },
      { id: 'demo-5', title: 'Coastal Japan Arc', location: 'Japan' },
      { id: 'demo-6', title: 'Andes to Atacama', location: 'Chile' },
      { id: 'demo-7', title: 'Mediterranean Rail', location: 'Italy' },
      { id: 'demo-8', title: 'Morocco Desert Route', location: 'Morocco' },
    ];
    return templates
      .filter((t) => !existingIds.has(t.id))
      .map((t, idx) => ({
        id: t.id,
        title: t.title,
        description: 'Community-generated demo itinerary with active collaborators.',
        visibility: 'EVERYONE',
        location: t.location,
        countries: [t.location],
        image: '',
        progress: 100,
        edited: `${idx + 1}h ago`,
        members: [
          { id: `demo-u-${idx}-1`, name: 'Alex', profilePic: '' },
          { id: `demo-u-${idx}-2`, name: 'Mina', profilePic: '' },
          { id: `demo-u-${idx}-3`, name: 'Leo', profilePic: '' },
        ],
        startDate: null,
        endDate: null,
        isOwner: false,
        isPublished: true,
        ownerId: `demo-owner-${idx}`,
      }));
  }, [allPlans, demoDataEnabled]);

  const allPlansWithDemo = useMemo(() => [...allPlans, ...demoTrips], [allPlans, demoTrips]);
  const myTrips = allPlansWithDemo.filter(plan => plan.isOwner);
  const sharedTrips = allPlansWithDemo.filter(plan => !plan.isOwner);
  const publishedTrips = allPlansWithDemo.filter(plan => plan.isPublished);
  // DEV: log raw published values to diagnose missing field from backend
  if (import.meta.env.development) {
    console.debug('[Dashboard] isPublished map:', allPlansWithDemo.map(p => ({ id: p.id, title: p.title, isPublished: p.isPublished })));
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    switch(newValue){
      case 0: setPlans(allPlansWithDemo); break;
      case 1: setPlans(myTrips); break;
      case 2: setPlans(sharedTrips); break;
      case 3: setPlans(publishedTrips); break;
      case 4: setPlans(savedPlans); break;
    }
  };

  useEffect(() => {
    if (tabValue === 0) setPlans(allPlansWithDemo);
    if (tabValue === 1) setPlans(myTrips);
    if (tabValue === 2) setPlans(sharedTrips);
    if (tabValue === 3) setPlans(publishedTrips);
  }, [tabValue, allPlansWithDemo, myTrips, sharedTrips, publishedTrips]);

  // Lazily load the trips this user has saved (Saved Trips tab)
    useEffect(() => {
    const fetchSavedTrips = async (force = false) => {
      if (!token) return;
      if (savedFetchedRef.current && !force) return;
      savedFetchedRef.current = true;
      setSavedLoading(true);
      try {
        const resp = await apiServices.getSavedTrips(token);
        const mapped = (resp.data || []).map((t: any) => mapTripVM(t));
        setSavedPlans(mapped);
        setPlans(prev => (tabValue === 4 ? mapped : prev));
        // Fetch Unsplash images for saved trips lacking a photo
        const needImg = mapped.filter((p: any) => !p.image && p.countries?.[0]);
        if (needImg.length > 0) {
          const results = await Promise.all(
            needImg.map(async (p: any) => ({ id: p.id, url: await fetchUnsplashImage(p.countries[0]) }))
          );
          const updates: Record<string, string> = {};
          results.forEach(({ id, url }) => { if (url) updates[id] = url; });
          if (Object.keys(updates).length > 0) setTripImages(prev => ({ ...prev, ...updates }));
        }
      } catch (err) {
        console.error('[Dashboard] fetch saved trips failed', err);
      } finally {
        setSavedLoading(false);
      }
    };
    fetchSavedTrips()
    }, [token, authLoading]);
  
  return (
    <Box sx={{ width: '100%', backgroundColor: 'background.default', minHeight: '100vh' }}>
      <Box sx={{ maxWidth: { xs: 1280, lg: showWorldPanel ? 1440 : 1280 }, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 8 }}>
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08, 0.05)}>

        {/* ── Page header ── */}
        <motion.div variants={staggerItem}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: { xs: 3, md: 4 } }}>
            <Box>
              <Typography component="h1" sx={{
                fontFamily: theme.custom.fontDisplay, fontWeight: 700,
                fontSize: { xs: '1.9rem', md: '2.4rem' },
                letterSpacing: '-0.02em', lineHeight: 1.1, color: 'text.primary',
              }}>
                Trips
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 15, color: 'text.secondary' }}>
                Every journey you're dreaming, drafting, and sharing - all in one place.
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setCreateTripOpen(true)} sx={{ flexShrink: 0 }}>
              New trip
            </Button>
          </Box>
        </motion.div>

        {/* ── Split view: scrollable content left, sticky globe right (lg+) ── */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: (isDesktop && showWorldPanel) ? 'minmax(0, 1fr) 400px' : 'minmax(0, 1fr)' },
          gap: { xs: 0, lg: 5 },
        }}>
        <Box sx={{ minWidth: 0 }}>

        {/* ── Next trip feature card ── */}
        {!loading && nextUpcoming && (
          <motion.div variants={staggerItem}>
            <Box
              onClick={() => navigate(tripPath({ id: nextUpcoming.id, name: nextUpcoming.title }), { state: { trip: { id: nextUpcoming.id, name: nextUpcoming.title }, tripId: nextUpcoming.id, __ts: Date.now() } })}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' },
                borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', mb: { xs: 4, md: 5 },
                border: `1px solid ${theme.custom.surface.border}`,
                bgcolor: 'background.paper',
                boxShadow: theme.custom.shadows.card,
                transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
                '&:hover': { boxShadow: theme.custom.shadows.cardHover },
                '&:hover .next-trip-cover img': { transform: 'scale(1.03)' },
              }}
            >
              <Box sx={{ order: { xs: 2, md: 1 }, p: { xs: 3, md: 4.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1.25, minWidth: 0 }}>
                <Typography variant="overline" sx={{ color: 'primary.main' }}>Next trip</Typography>
                <Typography noWrap sx={{
                  fontFamily: theme.custom.fontDisplay, fontWeight: 700,
                  fontSize: { xs: '1.5rem', md: '1.9rem' },
                  letterSpacing: '-0.02em', lineHeight: 1.15, color: 'text.primary',
                }}>
                  {nextUpcoming.countries?.[0] || nextUpcoming.location || nextUpcoming.title}
                </Typography>
                <Typography noWrap sx={{ fontSize: 14, color: 'text.secondary' }}>
                  {nextUpcoming.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 0.75, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Departure', value: formatBoardingDate(nextUpcoming.startDate) },
                    { label: 'Status', value: nextUpcoming.progress === 100 ? 'Completed' : nextUpcoming.progress > 0 ? `${nextUpcoming.progress}% planned` : 'Planning' },
                    { label: 'Travelers', value: nextUpcoming.members?.length > 1 ? `${nextUpcoming.members.length} people` : 'Solo' },
                  ].map(({ label, value }) => (
                    <Box key={label}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: 'text.disabled', textTransform: 'uppercase', lineHeight: 1.4 }}>{label}</Typography>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: 'text.primary' }}>{value}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ mt: 1.25 }}>
                  <Button variant="contained" size="small" endIcon={<IconArrowRight size={15} />}>Open trip</Button>
                </Box>
              </Box>
              <Box className="next-trip-cover" sx={{ order: { xs: 1, md: 2 }, position: 'relative', overflow: 'hidden', minHeight: { xs: 180, sm: 220, md: 280 }, bgcolor: theme.custom.surface.active }}>
                {(nextUpcoming.image || tripImages[nextUpcoming.id]) && (
                  <Box
                    component="img" src={nextUpcoming.image || tripImages[nextUpcoming.id]} alt=""
                    sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}` }}
                  />
                )}
              </Box>
            </Box>
          </motion.div>
        )}

        {/* ── Trip World Map: inline section below lg only ─────────────────── */}
        {!isDesktop && showWorldPanel && (
          <Box sx={{ mb: { xs: 4, md: 5 } }}>
            <SectionHeader
              title="Your world"
              subtitle="Countries across your planned and published trips"
              action={
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  {plannedCountryCodes.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2B89C7' }} />
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
                        Planned ({plannedCountryCodes.length})
                      </Typography>
                    </Box>
                  )}
                  {publishedCountryCodes.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FBBF24' }} />
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
                        Published ({publishedCountryCodes.length})
                      </Typography>
                    </Box>
                  )}
                </Box>
              }
            />

            {/* Map container - fixed height, clipped */}
            <Box sx={{
              borderRadius: '16px',
              overflow: 'hidden',
              height: { xs: 220, sm: 300, md: 340 },
              border: `1px solid ${theme.custom.surface.border}`,
              boxShadow: theme.custom.shadows.card,
            }}>
              <TravelMap
                planned={plannedCountryCodes}
                upcoming={publishedCountryCodes}
                autoRotate={false}
                disableAttribution
              />
            </Box>
          </Box>
        )}

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="trip tabs"
            sx={{ minHeight: 44, borderBottom: `1px solid ${theme.custom.surface.border}` }}
          >
            <Tab disableRipple label={`All Trips${allPlansWithDemo.length ? ` · ${allPlansWithDemo.length}` : ''}`} />
            <Tab disableRipple label={`My Trips${myTrips.length ? ` · ${myTrips.length}` : ''}`} />
            <Tab disableRipple label={`Shared with Me${sharedTrips.length ? ` · ${sharedTrips.length}` : ''}`} />
            <Tab disableRipple label={`Published${publishedTrips.length ? ` · ${publishedTrips.length}` : ''}`} />
            <Tab disableRipple label={`Saved Trips${savedPlans.length ? ` · ${savedPlans.length}` : ''}`} />
          </Tabs>
          <Box sx={{
            mt: 3,
            display: 'grid',
            // 2-up when the globe rail is showing (narrower column); 3-up full width
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: (isDesktop && showWorldPanel) ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
            },
            gap: 3, alignItems: 'stretch',
            pb: 'env(safe-area-inset-bottom, 0px)',
          }}>
            {(loading || (!loading && tabValue === 4 && savedLoading)) && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <CardGridSkeleton count={6} />
              </Box>
            )}
            {error && !loading && (              
              <Alert
                severity="error"
                sx={{
                  gridColumn: '1 / -1',
                  mb: 6,
                  display: "flex",
                  alignItems: "center",
                }}
                action={
                  <Button variant="contained" size="small" onClick={handleLogout}>
                    Log In
                  </Button>
                }
              >
                {error}
              </Alert>
            )}
            {!loading && !error && !(tabValue === 4 && savedLoading) && plans.length === 0 && (
              <Box sx={{ gridColumn: '1 / -1', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EmptyState
                  icon={IconMapPlus}
                  title={tabValue === 4 ? 'No saved trips yet' : tabValue === 2 ? 'Nothing shared with you yet' : 'Your next story starts here'}
                  description={
                    tabValue === 4
                      ? 'Trips you bookmark from the community will live here for quick access.'
                      : tabValue === 2
                        ? 'When friends invite you to plan together, their trips will show up here.'
                        : 'All it takes is a destination, Navia and your crew handle the rest.'
                  }
                  actionLabel={tabValue === 4 || tabValue === 2 ? 'Explore community trips' : 'Plan your first trip'}
                  onAction={tabValue === 4 || tabValue === 2 ? () => navigate('/community') : () => setCreateTripOpen(true)}
                />
              </Box>
            )}
            {!loading && !error && !(tabValue === 4 && savedLoading) && plans.map((plan) => (
              <TripCard
                key={plan.id || plan.title}
                title={plan.title}
                countries={plan.countries}
                description={plan.description}
                image={plan.image || tripImages[plan.id] || ''}
                progress={plan.progress}
                edited={plan.edited}                
                members={plan.members}
                onShare={() => handleShare(plan)}
                onDelete={plan.isOwner ? () => setDeleteTarget({ id: plan.id, title: plan.title }) : undefined}
                tripStatus={plan.tripStatus}
                isOwner={plan.isOwner}
                onGoLive={plan.isOwner && plan.tripStatus === 0 ? async () => {
                  if (!token) return;
                  await apiServices.setTripStatus(token, plan.id, 1);
                  setAllPlans(prev => prev.map(p => p.id === plan.id ? { ...p, tripStatus: 1 } : p));
                } : undefined}
                onClick={()=> {
                  navigate(tripPath({ id: plan.id, name: plan.title }), {
                    state: {
                      trip: {
                        id: plan.id,
                        name: plan.title,
                        visibility: plan.visibility,
                        ownerId: plan.ownerId,
                        memberIds: (plan.members||[]).map((m:any)=> m.id).filter(Boolean)
                      },
                      tripId: plan.id,
                      __ts: Date.now()
                    }
                  });
                }}
              />
            ))}
          </Box>

        </Box>{/* end left column */}

        {/* ── Sticky globe rail (lg+) ── */}
        {isDesktop && showWorldPanel && (
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{
              position: 'sticky',
              top: 88,
              height: 'calc(100vh - 120px)',
              minHeight: 520,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              overflow: 'hidden',
              border: `1px solid ${theme.custom.surface.border}`,
              boxShadow: theme.custom.shadows.card,
              bgcolor: 'background.paper',
            }}>
              {/* Panel header */}
              <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${theme.custom.surface.border}` }}>
                <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', color: 'text.primary' }}>
                  Your world
                </Typography>
                <Typography sx={{ mt: 0.25, fontSize: 12.5, color: 'text.secondary' }}>
                  {worldCountryCount} {worldCountryCount === 1 ? 'country' : 'countries'} across your planned and published trips
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 1.25 }}>
                  {plannedCountryCodes.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2B89C7' }} />
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
                        Planned ({plannedCountryCodes.length})
                      </Typography>
                    </Box>
                  )}
                  {publishedCountryCodes.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FBBF24' }} />
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
                        Published ({publishedCountryCodes.length})
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Globe */}
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <TravelMap
                  planned={plannedCountryCodes}
                  upcoming={publishedCountryCodes}
                  autoRotate
                  rotationSpeedDegPerSec={2}
                  disableAttribution
                />
              </Box>

              {/* Panel footer */}
              <Box sx={{ px: 3, py: 1.25, borderTop: `1px solid ${theme.custom.surface.border}` }}>
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
                  Drag to spin the globe, it pauses while you explore.
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        </Box>{/* end split grid */}
        </motion.div>
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>Delete trip?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily: "'Inter', sans-serif" }}>
            <strong>"{deleteTarget?.title}"</strong> will be permanently deleted. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none', fontFamily: "'Inter', sans-serif" }}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={deleting}
            variant="contained"
            color="error"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <TripCreationModal open={createTripOpen} onClose={() => setCreateTripOpen(false)} />

      {/* Share modal */}
      {shareTripId && shareTripMeta && (
        <TripShareModal
          open={!!shareTripId}
          onClose={() => { setShareTripId(null); setShareTripMeta(null); }}
          tripId={shareTripId}
          tripName={shareTripMeta.name}
          destinationCount={shareTripMeta.destinationCount}
          totalNights={shareTripMeta.totalNights}
        />
      )}
    </Box>
  );
};
export default Dashboard;
