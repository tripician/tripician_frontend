// TripView: Read-only view of a trip with optional Edit transition to TripPlanner
import React from 'react';
import { Box, Button, Alert, CircularProgress } from '@mui/material';
import TripPlanner from '../CreateTripPage/TripPlanner';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../CreateTripPage/../../store';
import TripPlannerNav from '../CreateTripPage/TripPlannerNav';
import TopBar from '../PageLayout/CommonLayouts/TopBar';

// Basic shape of trip meta we expect (extend later when backend schema finalized)
interface TripDTO { id: string; name?: string; visibility?: string; ownerId?: string; memberIds?: string[]; }

interface LocationState { trip?: TripDTO; }

const TripView: React.FC = () => {
  const { tripId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as LocationState;
  const initialTrip = state.trip && state.trip.id === tripId ? state.trip : undefined;
  const userProfile = useSelector((s:RootState)=> s.user.profile);
  const currentUserId = userProfile?.id; // real user id (may be undefined until loaded)
  const [loading, setLoading] = React.useState(!initialTrip);
  const [trip, setTrip] = React.useState<TripDTO | undefined>(initialTrip);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  // Fallback fetch if trip not passed in state (placeholder; integrate real API when available)
  React.useEffect(()=> {
    let active = true;
    if(trip || !tripId) { setLoading(false); return; }
    (async()=> {
      setLoading(true);
      try {
        // TODO integrate real API: const resp = await apiServices.getTripById(token, tripId);
        // Simulate minimal public stub (remove when backend ready)
        const stub: TripDTO = { id: tripId, name: 'Trip', visibility: 'everyone', ownerId: 'unknown', memberIds: [] };
        if(active){ setTrip(stub); }
      } catch(err:any){ if(active){ setFetchError('Failed to load trip'); } }
      finally { if(active) setLoading(false); }
    })();
    return ()=> { active=false; };
  }, [trip, tripId]);

  const ownerId = trip?.ownerId;
  const memberIds = trip?.memberIds || [];
  const visibility = (trip?.visibility || 'private').toLowerCase();
  const isOwner = ownerId === currentUserId;
  const isMember = isOwner || (currentUserId !== undefined && memberIds.includes(currentUserId));

  const isPrivate = visibility.startsWith('priv');
  const readable = trip ? (!isPrivate || isMember) : false;

  if(loading){
    return (
      <Box sx={{ display:'flex', flexDirection:'column', height:'100vh' }}>
        <TopBar showSearch={false} />
        <Box sx={{ display:'flex', flex:1 }}>
          <TripPlannerNav active='plan' hideSections={['docs']} />
          <Box sx={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <CircularProgress />
          </Box>
        </Box>
  {/* Footer removed for TripView loading state */}
      </Box>
    );
  }

  if (!readable) {
    return (
      <Box sx={{ display:'flex', flexDirection:'column', height:'100vh' }}>
        <TopBar showSearch={false} />
        <Box sx={{ display:'flex', flex:1, minHeight:0 }}>
          <TripPlannerNav active='plan' hideSections={['docs','news','packing']} />
          <Box sx={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, p:3 }}>
            {fetchError && <Alert severity='error' sx={{ maxWidth:480, width:'100%' }}>{fetchError}</Alert>}
            <Alert severity='error' variant='outlined' sx={{ maxWidth:520, width:'100%' }}>Access denied. This trip is private.</Alert>
            <Button variant='contained' onClick={()=> {/* future request access flow */}} sx={{ textTransform:'none', borderRadius:2 }}>Request Access</Button>
          </Box>
        </Box>
  {/* Footer removed for access denied state */}
      </Box>
    );
  }

  const handleEdit = () => {
    // Navigate to full planner for editing (reuse planner route)
    navigate(`/tripplanner/${tripId}`, { state: { tripId, trip: initialTrip } });
  };

  return (
    <Box sx={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <TripPlanner
        tripId={tripId}
        initialTrip={trip}
        readOnly={!isOwner}
        hideSections={(!isOwner && !isMember) || isPrivate ? ['docs','packing'] : []}
        isOwnerExternal={!!isOwner}
        onRequestEdit={handleEdit}
      />
    </Box>
  );
};

export default TripView;
