import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { KalaGeometric } from '../../components/DecorativeComponents/KalaDecor';
import type { RootState } from '../../store';
import TripCard from './TripCard';
import '../../assets/css/Dashboard.css';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { Tabs, Tab, Box, CircularProgress, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Snackbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { fetchUnsplashImage } from '../../services/unsplashService';
import gsap from 'gsap';
import TripCreationModal from '../../components/CreateTripComponents/TripCreationModal';
import TripShareModal from '../../components/TripShareModal';

const Dashboard: React.FC = () => {
  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return '—';
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
  const [tripImages, setTripImages] = useState<Record<string, string>>({});
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageRef   = useRef<HTMLDivElement>(null);
  const tabsRef   = useRef<HTMLDivElement>(null);
  const cardsRef  = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const [createTripOpen, setCreateTripOpen] = useState(false);

  useSelector((state: RootState) => state.user);
  const userProfile = useSelector((state: RootState) => state.user.profile);

  // Page entrance animation (banner + tabs + cards)
  useEffect(() => {
    if (loading) return; // wait until banner is in the DOM
    if (!bannerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(bannerRef.current, {
        y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out', delay: 0.05,
      });
      gsap.to(tabsRef.current, {
        y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.22,
      });
    }, pageRef);
    return () => ctx.revert();
  }, [loading]);

  // Re-animate cards whenever the displayed list changes
  useEffect(() => {
    if (!cardsRef.current || plans.length === 0) return;
    const cards = cardsRef.current.querySelectorAll<HTMLElement>('.gs-trip-card');
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { y: 40, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.07, ease: 'power3.out', clearProps: 'transform,opacity' }
    );
  }, [plans]);

  // Fetch dashboard trips
  useEffect(() => {
    let active = true;
    const fetchTrips = async () => {
      if (authLoading) return; // auth still resolving — wait before fetching
      if(!token) { setLoading(false); return; } // not authenticated
      setLoading(true);
      setError(null);
      try {
        const resp = await apiServices.getDashboardTrips(token);
        // Assuming resp.data is an array of trips with fields: id, name, countries, progress?, updatedAt?, members?
        const mapped = (resp.data || []).map((t: any) => ({
          id: t.id || t.Id,
          title: t.name || t.title || 'Untitled trip',
          description: typeof t.description === 'string' ? t.description.trim() : '',
          visibility: t.visibility || t.Visibility || t.privacy || t.Privacy || 'PRIVATE',
          location: Array.isArray(t.countries) && t.countries.length ? t.countries[0] : 'Unknown',
          countries: Array.isArray(t.countries) ? t.countries : [],
          // Use user-uploaded photoUrl if present; Unsplash fetch happens after mount
          image: (typeof t.photoUrl === 'string' && t.photoUrl.trim()) ? t.photoUrl : '',
          progress: typeof t.progress === 'number' ? t.progress : 0,
          edited: formatRelativeTime(t.updatedDate),
          members: (() => {
            const rawMembers = t.members || t.invitedUsers || [];
            // Log ALL members of first trip so we can diagnose field names + profile pic URLs
            if (t === (resp.data || [])[0]) {
              console.debug('[Dashboard] raw trip sample:', JSON.parse(JSON.stringify({
                owner: t.owner || t.Owner,
                members: rawMembers,
              })));
            }
            const normalizeMember = (m: any) => {
              // Flatten nested user sub-object if present (e.g. { userId, user: { fname, profilepicture } })
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
            // Patch: if any member is the logged-in user and their profilePic is empty,
            // fill it from Redux — backend member lists often omit the picture URL
            const myId = String(userProfile?.id || '');
            const patched = normalized.map((m: { id: string; name: string; profilePic: string }) => {
              if (m.profilePic) return m;
              if (myId && m.id === myId) return { ...m, profilePic: (userProfile?.profilepicture as string) || '' };
              return m;
            });
            // If backend returned no members (solo trip), synthesise one from t.owner or the logged-in user
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
            if (!myId) return true; // assume owner if we can't tell
            const o = t.owner || t.Owner;
            const ownerId = String(
              t.OwnerUserId || t.ownerUserId || t.ownerId || t.OwnerId ||
              o?.id || o?.Id || o?.userId || o?.UserId || ''
            );
            return ownerId ? ownerId === myId : true;
          })(),
          isPublished: t.published === true || t.isPublished === true || (typeof t.status === 'string' && t.status.toUpperCase() === 'PUBLISHED'),
          ownerId: (() => {
            const o = t.owner || t.Owner;
            return String(
              t.OwnerUserId || t.ownerUserId || t.ownerId || t.OwnerId ||
              o?.id || o?.Id || o?.userId || o?.UserId || ''
            );
          })(),
        }));
        if(active){
          setAllPlans(mapped);
          setPlans(mapped);
          // Kick off Unsplash fetches immediately — runs concurrently with state flush,
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
      await apiServices.deleteTrip(deleteTarget.id, token);
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

  const myTrips = allPlans.filter(plan => plan.isOwner);
  const sharedTrips = allPlans.filter(plan => !plan.isOwner);
  const publishedTrips = allPlans.filter(plan => plan.isPublished);
  // DEV: log raw published values to diagnose missing field from backend
  if (import.meta.env.development) {
    console.debug('[Dashboard] isPublished map:', allPlans.map(p => ({ id: p.id, title: p.title, isPublished: p.isPublished })));
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    switch(newValue){
      case 0: setPlans(allPlans); break;
      case 1: setPlans(myTrips); break;
      case 2: setPlans(sharedTrips); break;
      case 3: setPlans(publishedTrips); break;
    }
  };
  return (
    <Box
      ref={pageRef}
      sx={{
        width: '100%',
        backgroundColor: 'background.default',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Indian kala geometric — bottom-left accent */}
      <KalaGeometric size={420} color="#FF6B8A" opacity={0.04} style={{ position: 'absolute', bottom: 10, right: -120, zIndex: 0, pointerEvents: 'none' }} />
      <TopBar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>

        {/* ── Boarding pass / Welcome banner ── */}
        {!loading && (
          <Box ref={bannerRef} style={{ opacity: 0, transform: 'translateY(-28px) scale(0.97)' }} sx={{ mx: '2%', mt: 2.5, mb: 1 }}>
            {allPlans.length === 0 || !nextUpcoming ? (
              /* ── Premium welcome banner (new / no trips) ── */
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  background: 'linear-gradient(125deg, #1a1a2e 0%, #16213e 45%, #0f3460 100%)',
                  p: { xs: 3, md: 3.5 },
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
                  minHeight: 130,
                }}
              >
                {/* Decorative circles */}
                <Box sx={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,56,92,0.08)', pointerEvents:'none' }} />
                <Box sx={{ position:'absolute', bottom:-50, right:120, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }} />

                <Box sx={{ position:'relative', zIndex:1, maxWidth: 480 }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
                    <Box sx={{ px:1.2, py:0.3, borderRadius:999, background:'rgba(255,56,92,0.2)', border:'1px solid rgba(255,56,92,0.35)' }}>
                      <Typography sx={{ fontSize:'0.62rem', fontWeight:800, letterSpacing:1.8, color:'#FF385C', fontFamily:"'Inter',sans-serif", textTransform:'uppercase' }}>Tripician</Typography>
                    </Box>
                    <Box sx={{ width:4, height:4, borderRadius:'50%', bgcolor:'rgba(255,255,255,0.2)' }} />
                    <Typography sx={{ fontSize:'0.68rem', fontWeight:500, color:'rgba(255,255,255,0.4)', fontFamily:"'Inter',sans-serif" }}>Your journey starts here</Typography>
                  </Box>
                  <Typography sx={{ fontFamily:"'Playfair Display',serif", fontWeight:800, fontSize:{ xs:'1.35rem', md:'1.65rem' }, color:'#fff', lineHeight:1.25, letterSpacing:'-0.02em', mb:1 }}>
                    Where will you go next?
                  </Typography>
                  <Typography sx={{ fontFamily:"'Inter',sans-serif", fontSize:'0.82rem', color:'rgba(255,255,255,0.52)', lineHeight:1.6, mb:2.5 }}>
                    Plan your dream trip, track every destination, and travel smarter.
                  </Typography>
                  <Button
                    onClick={() => setCreateTripOpen(true)}
                    variant="contained"
                    sx={{
                      fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:'0.82rem',
                      px:3, py:1, borderRadius:999, textTransform:'none',
                      background:'linear-gradient(135deg,#FF385C 0%,#D91A50 100%)',
                      boxShadow:'0 6px 22px rgba(255,56,92,0.4)',
                      '&:hover':{ background:'linear-gradient(135deg,#E31C5F,#B01550)', boxShadow:'0 10px 32px rgba(255,56,92,0.55)', transform:'translateY(-1px)' },
                      transition:'all 0.22s ease',
                    }}
                  >+ Plan your first trip</Button>
                </Box>

                {/* Right illustration */}
                <Box sx={{ display:{ xs:'none', md:'flex' }, alignItems:'center', justifyContent:'center', position:'relative', zIndex:1, mr:2 }}>
                  <Box sx={{ fontSize:'4.5rem', filter:'drop-shadow(0 8px 24px rgba(255,56,92,0.35))', lineHeight:1 }}>✈️</Box>
                  <Box sx={{ position:'absolute', width:80, height:80, borderRadius:'50%', background:'rgba(255,56,92,0.1)', filter:'blur(20px)' }} />
                </Box>
              </Box>
            ) : (
              /* ── Next Trip card (has trips) ── */
              <Box
                onClick={() => nextUpcoming && navigate(`/trip/${nextUpcoming.id}`, { state:{ trip:{ id:nextUpcoming.id, name:nextUpcoming.title }, tripId:nextUpcoming.id, __ts:Date.now() } })}
                sx={{
                  position:'relative', borderRadius:'20px', overflow:'hidden',
                  height: 148,
                  cursor: nextUpcoming ? 'pointer' : 'default',
                  boxShadow:'0 4px 28px rgba(0,0,0,0.22)',
                  transition:'transform 0.25s ease, box-shadow 0.25s ease',
                  '&:hover': nextUpcoming ? {
                    transform:'translateY(-3px)',
                    boxShadow:'0 14px 48px rgba(0,0,0,0.32)',
                  } : {},
                }}
              >
                {/* Full-bleed destination image */}
                {(nextUpcoming?.image || (nextUpcoming?.id && tripImages[nextUpcoming.id])) && (
                  <Box
                    component="img"
                    src={nextUpcoming?.image || tripImages[nextUpcoming!.id]}
                    alt=""
                    sx={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                  />
                )}
                {/* Dark gradient — left to right, heavily cover left for text legibility */}
                <Box sx={{ position:'absolute', inset:0, background:'linear-gradient(100deg, rgba(6,6,10,0.92) 0%, rgba(6,6,10,0.78) 38%, rgba(6,6,10,0.30) 68%, rgba(6,6,10,0.05) 100%)', zIndex:1 }} />
                {/* Subtle rose glow bottom-left */}
                <Box sx={{ position:'absolute', bottom:-40, left:-30, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,56,92,0.14) 0%, transparent 70%)', zIndex:1, pointerEvents:'none' }} />

                {/* Content */}
                <Box sx={{ position:'relative', zIndex:2, height:'100%', display:'flex', alignItems:'stretch' }}>

                  {/* Left — all text */}
                  <Box sx={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between', px:{ xs:2.5, md:3.5 }, py:2.2, minWidth:0 }}>

                    {/* Top: badge */}
                    <Box sx={{ display:'flex', alignItems:'center', gap:0.75 }}>
                      <Box sx={{ width:6, height:6, borderRadius:'50%', bgcolor:'#FF385C', boxShadow:'0 0 7px rgba(255,56,92,0.9)', flexShrink:0 }} />
                      <Typography sx={{ fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.18em', color:'#FF385C', fontFamily:"'Inter',sans-serif", textTransform:'uppercase', lineHeight:1 }}>Next trip</Typography>
                    </Box>

                    {/* Middle: destination + trip name */}
                    <Box>
                      <Typography sx={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontStyle:'italic', fontSize:{ xs:'1.7rem', md:'2.1rem' }, color:'#fff', lineHeight:1.05, letterSpacing:'-0.02em' }} noWrap>
                        {nextUpcoming?.countries?.[0] || nextUpcoming?.location || '—'}
                      </Typography>
                      <Typography sx={{ fontFamily:"'Inter',sans-serif", fontSize:'0.72rem', fontWeight:500, color:'rgba(255,255,255,0.48)', mt:0.35, letterSpacing:'0.02em' }} noWrap>
                        {nextUpcoming?.title}
                      </Typography>
                    </Box>

                    {/* Bottom: stats */}
                    <Box sx={{ display:'flex', alignItems:'center', gap:2.5 }}>
                      {[
                        { label:'Departure', value: formatBoardingDate(nextUpcoming?.startDate) },
                        { label:'Status',    value: nextUpcoming?.progress === 100 ? 'Completed' : nextUpcoming?.progress > 0 ? 'In progress' : 'Planning' },
                        { label:'Travelers', value: nextUpcoming?.members?.length > 1 ? `${nextUpcoming.members.length} people` : 'Solo' },
                      ].map(({ label, value }, i) => (
                        <React.Fragment key={label}>
                          {i > 0 && <Box sx={{ width:'1px', height:20, background:'rgba(255,255,255,0.12)', flexShrink:0 }} />}
                          <Box>
                            <Typography sx={{ fontSize:'0.52rem', fontWeight:700, letterSpacing:'0.12em', color:'rgba(255,255,255,0.32)', fontFamily:"'Inter',sans-serif", textTransform:'uppercase', lineHeight:1, mb:0.3 }}>{label}</Typography>
                            <Typography sx={{ fontSize:'0.78rem', fontWeight:600, color:'rgba(255,255,255,0.88)', fontFamily:"'Inter',sans-serif", lineHeight:1 }}>{value}</Typography>
                          </Box>
                        </React.Fragment>
                      ))}
                    </Box>

                  </Box>

                  {/* Right — progress ring */}
                  <Box sx={{ display:{ xs:'none', md:'flex' }, flexDirection:'column', alignItems:'center', justifyContent:'center', pr:3.5, gap:0.6, flexShrink:0 }}>
                    <Box sx={{ position:'relative', width:52, height:52 }}>
                      <Box component="svg" viewBox="0 0 52 52" sx={{ position:'absolute', inset:0, transform:'rotate(-90deg)' }}>
                        <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="4" />
                        <circle
                          cx="26" cy="26" r="20" fill="none" stroke="#FF385C" strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          strokeDashoffset={`${2 * Math.PI * 20 * (1 - (nextUpcoming?.progress ?? 0) / 100)}`}
                          style={{ transition:'stroke-dashoffset 0.8s ease' }}
                        />
                      </Box>
                      <Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Typography sx={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:'0.7rem', color:'#fff' }}>{nextUpcoming?.progress ?? 0}%</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontFamily:"'Inter',sans-serif", fontSize:'0.52rem', fontWeight:600, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase' }}>planned</Typography>
                  </Box>

                </Box>
              </Box>
            )}
          </Box>
        )}

          <Tabs
            ref={tabsRef}
            style={{ opacity: 0, transform: 'translateY(-18px)' }}
            value={tabValue}
            className="mb-1 mt-3"
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="trip tabs"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              pl: 0,
              mt: "1%",
              ml: "2%",
              mr: "2%",
              '& .MuiTabs-flexContainer': {
                backgroundColor: 'action.hover',
                borderRadius: '8px',
                padding: '4px',
              },
              '& .MuiTab-root': {
                minHeight: '40px',
                borderRadius: '6px',
                margin: '0 2px',
                textTransform: 'none',
                fontWeight: 'bold',
                '&.Mui-selected': {
                  backgroundColor: 'background.paper',
                  boxShadow: 1,
                  color: 'primary.main',
                },
              },
              '& .MuiTabs-indicator': {
                display: 'none', // Hide the default indicator since we're using background color
              },
            }}
          >
            <Tab label="All Trips" />
            <Tab label="My Trips" />
            <Tab label="Shared with Me" />
            <Tab label="Published" />
          </Tabs>
          <div ref={cardsRef} className="trip-cards-container" style={{ marginBottom: '32px' }}>
            {loading && (
              <Box sx={{ display:'flex', justifyContent:'center', py:6 }}>
                <CircularProgress />
              </Box>
            )}
            {error && !loading && (
              <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>
            )}
            {!loading && !error && plans.length === 0 && (
              <Box
                sx={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: '55vh', px: 3, textAlign: 'center',
                }}
              >
                {/* Illustration */}
                <Box sx={{
                  width: 110, height: 110, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(255,56,92,0.10) 0%, rgba(255,56,92,0.04) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mb: 3, fontSize: '3.2rem',
                  boxShadow: '0 0 0 18px rgba(255,56,92,0.04)',
                }}>✈️</Box>

                {/* Headline */}
                <Typography sx={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 800,
                  fontSize: { xs: '1.6rem', md: '2rem' },
                  color: 'text.primary',
                  letterSpacing: '-0.03em',
                  mb: 1,
                }}>Your adventure awaits.</Typography>

                {/* Sub */}
                <Typography sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.92rem',
                  color: 'text.secondary',
                  maxWidth: 360,
                  lineHeight: 1.7,
                  mb: 3.5,
                }}>Let's start building your itinerary and make every journey unforgettable.</Typography>

                {/* CTA */}
                <Button
                  variant="contained"
                  onClick={() => setCreateTripOpen(true)}
                  sx={{
                    fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.9rem',
                    px: 4, py: 1.4, borderRadius: '50px', textTransform: 'none',
                    background: 'linear-gradient(135deg, #FF385C 0%, #D91A50 100%)',
                    boxShadow: '0 8px 24px rgba(255,56,92,0.32)',
                    '&:hover': { background: 'linear-gradient(135deg, #E31C5F 0%, #B01550 100%)', boxShadow: '0 14px 36px rgba(255,56,92,0.44)', transform: 'translateY(-2px)' },
                    transition: 'all 0.25s ease',
                  }}
                >+ Plan your trip</Button>
              </Box>
            )}
            {!loading && !error && plans.map((plan) => (
              <div key={plan.id || plan.title} className="gs-trip-card">
              <TripCard
                title={plan.title}
                countries={plan.countries}
                description={plan.description}
                image={plan.image || tripImages[plan.id] || ''}
                progress={plan.progress}
                edited={plan.edited}                
                members={plan.members}
                onShare={() => handleShare(plan)}
                onDelete={() => setDeleteTarget({ id: plan.id, title: plan.title })}
                onClick={()=> {
                  navigate(`/trip/${plan.id}`, {
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
              </div>
            ))}
          </div>
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
            sx={{ textTransform: 'none', fontFamily: "'Inter', sans-serif", background: '#EF4444', '&:hover': { background: '#DC2626' }, borderRadius: 2 }}
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