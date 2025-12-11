import React, { useEffect, useState } from 'react';
import TripCard from './TripCard';
import '../../assets/css/Dashboard.css';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import Footer from '../PageLayout/CommonLayouts/Footer';
import { Tabs, Tab, Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import covers from '../../assets/covers.json';

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
          <div className="trip-cards-container" style={{ marginBottom: '32px' }}>
            {loading && (
              <Box sx={{ display:'flex', justifyContent:'center', py:6 }}>
                <CircularProgress />
              </Box>
            )}
            {error && !loading && (
              <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>
            )}
            {!loading && !error && plans.length === 0 && (
              <Typography variant="body2" sx={{ color:'text.secondary', px:2, py:4 }}>
                No trips yet. Create your first trip to get started.
              </Typography>
            )}
            {!loading && !error && plans.map((plan) => (
              <TripCard
                key={plan.id || plan.title}
                title={plan.title}
                location={plan.location}
                countries={plan.countries}
                image={plan.image}
                progress={plan.progress}
                edited={plan.edited}                
                members={plan.members}
                onClick={()=> {
                  // Force planner slice reset BEFORE route transition to avoid itinerary bleed.
                  // We prefer passing trip meta under state.trip so TripPlanner can hydrate once.
                  // Adding a unique navigation key ensures React Router remount even if same path reused quickly.
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
                      __ts: Date.now() // debug timestamp to help differentiate rapid clicks
                    }
                  });
                }}
              />
            ))}
          </div>
      </Box>
    </Box>
  );
};
export default Dashboard;