// TripView: Read-only view of a trip with optional Edit transition to TripPlanner
import React from 'react';
import { Box, Button, Alert, CircularProgress } from '@mui/material';
import TripPlanner from '../CreateTripPage/TripPlanner';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../CreateTripPage/../../store';
import TripPlannerNav from '../CreateTripPage/TripPlannerNav';
import { useAuthToken } from '../../hooks/useAuth0Token';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { apiServices } from '../../services/APIs/apiServices';

// Basic shape of trip meta we expect (extend later when backend schema finalized)
interface TripDTO { 
  id: string; 
  name?: string; 
  visibility?: string; 
  ownerId?: string; 
  memberIds?: string[]; 
  targetNights?: number; 
  startDate?: string;
  endDate?: string;
}

interface LocationState { trip?: TripDTO; }

const TripView: React.FC = () => {
  const { tripId = '' } = useParams();
  // Pull token + loading so we can defer trip fetch until auth finished resolving
  const { token } = useAuthToken();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as LocationState;
  const initialTrip = state.trip && state.trip.id === tripId ? state.trip : undefined;
  const userProfile = useSelector((s:RootState)=> s.user.profile);
  const userLoading = useSelector((s:RootState)=> s.user.loading);
  const currentUserId = userProfile?.id; // real user id (may be undefined until loaded)
  const [loading, setLoading] = React.useState(!initialTrip);
  const [trip, setTrip] = React.useState<TripDTO | undefined>(initialTrip);
  const [hasFetched, setHasFetched] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  // Fallback fetch if trip not passed in state (placeholder; integrate real API when available)
  React.useEffect(()=> {
    let active = true;
    const rawLocalStorageToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    // Treat undefined authLoading defensively as true until we know
    const effectiveToken = token == null ? rawLocalStorageToken : token;
    console.log('[TripView] State Snapshot', {
      initialTrip,
      tripId,
      tripPresent: !!trip,
      hookToken: token,
      rawLocalStorageToken,
      effectiveToken,
    });
    console.log('[TripView] Stage 2');
    console.log(tripId);
    if(!tripId) { console.log('[TripView] Skip fetch: missing tripId'); setLoading(false); return; }
    if(trip && hasFetched) { console.log('[TripView] Skip fetch: already loaded'); setLoading(false); return; }
    console.log('[TripView] Stage 3');
    if(!effectiveToken) { console.log('[TripView] Skip fetch: effectiveToken null after auth resolved'); setLoading(false); return; }
    (async()=> {
      setLoading(true);
      try {
        console.log('[TripView] Fetching trip', { tripId, effectiveTokenExists: !!effectiveToken });
        const resp = await apiServices.getTripById(effectiveToken, tripId);
        console.log('TripView: fetched trip data', resp);
        const data = resp?.data;
        debugger;
        if (data) {
          // Minimal meta normalization with defaults
          // const meta: TripDTO = {
          //   id: data.trip?.id || data.id || tripId,
          //   name: data.trip?.name || data.trip?.title || data.name || 'Untitled Trip',
          //   visibility: data.trip?.privacy || data.trip?.visibility || data.visibility || 'PRIVATE',
          //   endDate: data.trip?.endDate, 
          //   startDate: data.trip?.startDate,
          //   ownerId: data.trip?.ownerId || data.ownerId,
          //   memberIds: Array.isArray(data.trip?.memberIds) ? data.trip.memberIds : Array.isArray(data.memberIds)? data.memberIds : [],
          // };
          setTrip(data);
          setHasFetched(true);
        } else {
          setFetchError('Trip not found');
        }
      } catch(err:any){ if(active){ setFetchError('Failed to load trip'); } }
      finally { if(active) setLoading(false); }
    })();
    return ()=> { active=false; };
  }, [tripId, token, hasFetched]);

  // Robust meta extraction: backend may nest under trip.trip or use alternative keys
  const rawTrip: any = trip as any;
  const nested = rawTrip && typeof rawTrip === 'object' && rawTrip.trip && typeof rawTrip.trip === 'object' ? rawTrip.trip : rawTrip;
  const tripRoot: any = nested;
  const ownerId = tripRoot?.ownerId || tripRoot?.ownerID || tripRoot?.owner_id || rawTrip?.ownerId;
  const memberIds: string[] = Array.isArray(tripRoot?.memberIds) ? tripRoot.memberIds
    : Array.isArray(tripRoot?.members) ? tripRoot.members.map((m:any)=> typeof m==='string'? m : (m?.id || m?.userId)).filter(Boolean)
    : Array.isArray(rawTrip?.memberIds) ? rawTrip.memberIds
    : [];
  const visibilityRaw = tripRoot?.visibility || tripRoot?.privacy || rawTrip?.visibility || rawTrip?.privacy || 'private';
  const visibility = (visibilityRaw || 'private').toLowerCase();
  const isPrivate = visibility.startsWith('priv');
  const profileResolved = !userLoading; // profile fetch finished (success or fail)
  const isOwner = ownerId != null && currentUserId != null && ownerId === currentUserId;
  const isMember = isOwner || (currentUserId != null && memberIds.includes(currentUserId));
  // Only decide readability after profile resolved if private
  const readable = trip ? (
    isPrivate ? (profileResolved && (isOwner || isMember)) : true
  ) : false;

  // While trip is loaded but profile still loading and trip is private, keep loading spinner instead of premature denial
  const waitingForProfile = !loading && trip && isPrivate && !profileResolved;

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

  if (waitingForProfile) {
    return (
      <Box sx={{ display:'flex', flexDirection:'column', height:'100vh' }}>
        <TopBar showSearch={false} />
        <Box sx={{ display:'flex', flex:1 }}>
          <TripPlannerNav active='plan' hideSections={['docs']} />
          <Box sx={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <CircularProgress />
          </Box>
        </Box>
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
    // Pass current `trip` meta under `trip` key for planner hydration.
    navigate(`/tripplanner/${tripId}`, { state: { tripId, trip } });
  };

  return (
    <Box sx={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <TripPlanner
        tripId={tripId}
        initialTrip={trip}
        readOnly={!isOwner}
        hideSections={(!isOwner && !isMember) || isPrivate ? ['docs','packing'] : []}
        isOwnerExternal={!!isOwner}
        effectiveCanEdit={isOwner}
        canAccessDocs={isMember || isOwner}
        onRequestEdit={handleEdit}
        showPlannerActions={isOwner}
        showViewEditAction={!isOwner}
        isExternalNonOwner={!isOwner}
      />
    </Box>
  );
};

export default TripView;
