// TripView: Read-only view of a trip with optional Edit transition to TripPlanner
import React from 'react';
import { Box, Button, Alert, CircularProgress } from '@mui/material';
import TripPlanner from '../CreateTripPage/TripPlanner';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import type { RootState } from '../CreateTripPage/../../store';
import TripPlannerNav from '../CreateTripPage/TripPlannerNav';
import { useAuthToken } from '../../hooks/useAuth0Token';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { apiServices } from '../../services/APIs/apiServices';
import { fetchUserProfile } from '../../store/userSlice';

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
  const dispatch = useDispatch<AppDispatch>();
  React.useEffect(() => {
    if (!userProfile && !userLoading) {
      // Only fetch if not already loading and profile is missing
      dispatch(fetchUserProfile());
    }
  }, [userProfile, userLoading, dispatch]);
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

    if(!tripId) { setLoading(false); return; }
    if(trip && hasFetched) { setLoading(false); return; }
    if(!effectiveToken) { setLoading(false); return; }
    (async()=> {
      setLoading(true);
      try {
        console.log('[TripView] Fetching trip', { tripId, effectiveTokenExists: !!effectiveToken });
        const resp = await apiServices.getTripById(effectiveToken, tripId);
        console.log('TripView: fetched trip data', resp);
        const data = resp?.data;
        if (data) {
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

  // Robust meta extraction: backend may nest under Trip/ trip keys or flatten data
  const rawTrip: any = trip as any;
  let tripRoot: any = rawTrip;
  if (rawTrip && typeof rawTrip === 'object') {
    if (rawTrip.trip && typeof rawTrip.trip === 'object') {
      tripRoot = rawTrip.trip;
    } else if (rawTrip.Trip && typeof rawTrip.Trip === 'object') {
      tripRoot = rawTrip.Trip;
    }
  }
  // Backend returns OwnerUserId (user id) and Members (array of emails)
  const ownerId = tripRoot?.OwnerUserId || tripRoot?.ownerUserId || tripRoot?.ownerId || rawTrip?.OwnerUserId || rawTrip?.ownerId;
  const memberEmailsSource: any[] = Array.isArray(tripRoot?.Members) ? tripRoot.Members
    : Array.isArray(rawTrip?.Members) ? rawTrip.Members
    : Array.isArray(tripRoot?.memberEmails) ? tripRoot.memberEmails
    : Array.isArray(tripRoot?.members) ? tripRoot.members
    : [];
  const memberEmails: string[] = memberEmailsSource
    .map((m: any) => {
      if (typeof m === 'string') return m;
      return m?.email || m?.Email || m?.userEmail || null;
    })
    .filter((email: any): email is string => typeof email === 'string' && email.length > 0);
  const currentUserEmail = userProfile?.email ?? userProfile?.email ?? null;
  const visibilityRaw = tripRoot?.visibility || tripRoot?.Visibility || rawTrip?.visibility || rawTrip?.Visibility || 'private';
  const visibility = (visibilityRaw || 'private').toLowerCase();
  const isPrivate = visibility.startsWith('priv');
  const profileResolved = !userLoading; // profile fetch finished (success or fail)
  const isOwner = Boolean(ownerId && currentUserId && String(ownerId) === String(currentUserId));
  const isMember = isOwner || Boolean(currentUserEmail && memberEmails.some(email => String(email).toLowerCase() === String(currentUserEmail).toLowerCase()));
  // Only decide readability after profile resolved if private
  const readable = trip ? (
    isPrivate ? (profileResolved && (isOwner || isMember)) : true
  ) : false;

  // Loading guard: wait for both user profile and trip meta
  if (loading || userLoading || !userProfile || !trip) {
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
    navigate(`/tripplanner/${tripId}`, { state: { tripId, trip, isOwner, isMember, canEdit: isOwner || isMember } });
  };

  return (
    <Box sx={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <TripPlanner
        tripId={tripId}
        initialTrip={trip}
        readOnly
        hideSections={(!isOwner && !isMember) || isPrivate ? ['docs','packing'] : []}
        isOwnerExternal={!!isOwner}
        effectiveCanEdit={false}
        canAccessDocs={isMember || isOwner}
        onRequestEdit={handleEdit}
        showPlannerActions={false}
        showViewEditAction={isOwner || isMember}
        isExternalNonOwner={!isOwner}
      />
    </Box>
  );
};

export default TripView;
