import React, { useEffect, useRef, useState } from 'react';
import TripCard from './TripCard';
import '../../assets/css/Dashboard.css';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { Tabs, Tab, Box, CircularProgress, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Snackbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import covers from '../../assets/covers.json';
import gsap from 'gsap';
import TripCreationModal from '../../components/CreateTripComponents/TripCreationModal';

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
  const { token } = useAuthToken();
  const navigate = useNavigate();
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageRef  = useRef<HTMLDivElement>(null);
  const tabsRef  = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [createTripOpen, setCreateTripOpen] = useState(false);

  // Page entrance animation (tabs + cards)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(tabsRef.current, {
        y: -24, opacity: 0, duration: 0.55, ease: 'power3.out', delay: 0.05,
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

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
      if(!token) return; // handled by higher level auth route guard
      setLoading(true);
      setError(null);
      try {
        const resp = await apiServices.getDashboardTrips(token);
        // Assuming resp.data is an array of trips with fields: id, name, countries, progress?, updatedAt?, members?
        const mapped = (resp.data || []).map((t: any) => ({
          id: t.id || t.Id,
          title: t.name || t.title || 'Untitled trip',
          // naive country -> location mapping (first country) fallback
          location: Array.isArray(t.countries) && t.countries.length ? t.countries[0] : 'Unknown',
          countries: Array.isArray(t.countries) ? t.countries : [],
          image: covers[
            (
              t.countries && t.countries.length && covers.hasOwnProperty(String(t.countries[0].toLowerCase()))
                ? covers[t.countries[0].toLowerCase() as keyof typeof covers].length > 0 ? (t.countries[0].toLowerCase() as keyof typeof covers) : 'default'
                : 'default'
            ) as keyof typeof covers
          ], // placeholder; could map by country later
          progress: typeof t.progress === 'number' ? t.progress : 0,
          edited: formatRelativeTime(t.updatedDate),
          members: t.members || t.invitedUsers || [],
        }));
        if(active){
          setAllPlans(mapped);
          setPlans(mapped);
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
  }, [token]);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const handleShare = (plan: any) => {
    const url = `${window.location.origin}/trip/${plan.id}`;
    if (navigator.share) {
      navigator.share({ title: plan.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => setSnackbar('Link copied to clipboard!'));
    }
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

  const private_plans = allPlans.filter(plan => plan.members.length <= 1);
  const group_plans = allPlans.filter(plan => plan.members.length > 1);
  const in_progress_plans = allPlans.filter(plan => plan.progress < 100);
  const completed_plans = allPlans.filter(plan => plan.progress === 100);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    switch(newValue){
      case 0: setPlans(allPlans); break;
      case 1: setPlans(private_plans); break;
      case 2: setPlans(group_plans); break;
      case 3: setPlans(completed_plans); break;
      case 4: setPlans(in_progress_plans); break;
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
        flexDirection: 'column'
      }}
    >
      <TopBar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <Tabs
            ref={tabsRef}
            value={tabValue}
            className="mb-1 mt-3"
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="trip tabs"
            sx={{
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
            <Tab label="All Plans" />
            <Tab label="Private" />
            <Tab label="Group" />
            <Tab label="Completed" />
            <Tab label="In Progress" />
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
                image={plan.image}
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
    </Box>
  );
};
export default Dashboard;