// TripView: Read-only view of a trip with optional Edit transition to TripPlanner
import React from 'react';
import { Box, Button, Alert } from '@mui/material';
import TripPlanner from '../CreateTripPage/TripPlanner';
import PageLoader from '../../components/CommonComponents/PageLoader';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import type { RootState } from '../CreateTripPage/../../store';
import TripPlannerNav from '../CreateTripPage/TripPlannerNav';
import { useAuthToken } from '../../hooks/useAuth0Token';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { apiServices } from '../../services/APIs/apiServices';
import { fetchUserProfile } from '../../store/userSlice';
import Seo, { SITE_URL } from '../../components/Seo';
import { extractTripId, tripPath } from '../../utils/tripSlug';

// Basic shape of trip meta we expect (extend later when backend schema finalized)
interface TripDTO { 
  id: string; 
  name?: string; 
  visibility?: string;
  privacy?: string;
  ownerId?: string; 
  memberIds?: string[]; 
  targetNights?: number; 
  startDate?: string;
  endDate?: string;
}

interface LocationState { trip?: TripDTO; }

const TripView: React.FC = () => {
  // Route param may be a bare GUID or an SEO slug ending in the GUID
  const { tripId: tripParam = '' } = useParams();
  const tripId = extractTripId(tripParam);
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
    // Only attempt profile fetch when a token exists ,guests have no token so
    // dispatching would fail, set loading=false, and re-trigger the effect forever.
    const hasToken = !!token || !!localStorage.getItem('accessToken');
    if (hasToken && !userProfile && !userLoading) {
      dispatch(fetchUserProfile());
    }
  }, [userProfile, userLoading, dispatch, token]);
  const currentUserId = userProfile?.id; // real user id (may be undefined for guests)
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

    if(!tripId) { setLoading(false); return; }
    if(trip && hasFetched) { setLoading(false); return; }
    // No token bail-out: published/shared trips are viewable anonymously. The request is sent
    // with an optional token (null for guests); the backend gates private trips server-side.
    (async()=> {
      setLoading(true);
      try {
        const resp = await apiServices.getTripById(effectiveToken, tripId);
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
  // Visibility can come from either visibility or privacy depending on endpoint/DTO shape.
  const visibilityRaw =
    tripRoot?.visibility ||
    tripRoot?.Visibility ||
    tripRoot?.privacy ||
    tripRoot?.Privacy ||
    rawTrip?.visibility ||
    rawTrip?.Visibility ||
    rawTrip?.privacy ||
    rawTrip?.Privacy ||
    'private';
  const visibility = String(visibilityRaw || 'private').toLowerCase();
  // 'readonly' = link-sharing enabled ,anyone with the link can view (not truly private)
  const isLinkShare = visibility === 'readonly';
  const isPrivate = !isLinkShare && visibility.startsWith('priv');
  const publishedRaw =
    tripRoot?.published ??
    tripRoot?.Published ??
    tripRoot?.isPublished ??
    tripRoot?.IsPublished ??
    rawTrip?.published ??
    rawTrip?.Published ??
    rawTrip?.isPublished ??
    rawTrip?.IsPublished;
  const statusRaw =
    tripRoot?.status ||
    tripRoot?.Status ||
    rawTrip?.status ||
    rawTrip?.Status ||
    '';
  const isPublished =
    publishedRaw === true ||
    (typeof statusRaw === 'string' && statusRaw.toUpperCase() === 'PUBLISHED');
  const profileResolved = !userLoading; // profile fetch finished (success or fail)
  const isOwner = Boolean(ownerId && currentUserId && String(ownerId) === String(currentUserId));
  const isMember = isOwner || Boolean(currentUserEmail && memberEmails.some(email => String(email).toLowerCase() === String(currentUserEmail).toLowerCase()));
  // Only decide readability after profile resolved if private
  // Link-shared trips (ReadOnly visibility) are always readable (like Google Drive link sharing)
  const readable = trip ? (
    isPublished || isLinkShare ? true : (isPrivate ? (profileResolved && (isOwner || isMember)) : true)
  ) : false;

  // Loading guard: wait for trip fetch + (private trips also wait for profile to determine access)
  if (loading || (isPrivate && !fetchError && userLoading)) {
    return (
      <Box sx={{ display:'flex', flexDirection:'column', height:'100vh' }}>
        <TopBar showSearch={false} />
        <Box sx={{ display:'flex', flex:1 }}>
          <TripPlannerNav active='plan' hideSections={['docs']} />
          <Box sx={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <PageLoader variant="inline" messages={['Loading trip details…', 'Fetching your itinerary…', 'Getting destination info…', 'Almost there…']} />
          </Box>
        </Box>
      </Box>
    );
  }

  // Trip not found or fetch error (no infinite spinner)
  if (!trip) {
    return (
      <Box sx={{ display:'flex', flexDirection:'column', height:'100vh' }}>
        <TopBar showSearch={false} />
        <Box sx={{ display:'flex', flex:1, minHeight:0 }}>
          <TripPlannerNav active='plan' hideSections={['docs','news','packing']} />
          <Box sx={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, p:3 }}>
            <Alert severity='warning' variant='outlined' sx={{ maxWidth:520, width:'100%' }}>
              {fetchError === 'Trip not found' ? 'This trip does not exist or has been removed.' : 'This trip could not be loaded. You may not have permission to view it, or the link may be invalid.'}
            </Alert>
            <Button variant='outlined' onClick={() => navigate('/')} sx={{ textTransform:'none', borderRadius:2 }}>Back to Home</Button>
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
            <Alert severity='error' variant='outlined' sx={{ maxWidth:520, width:'100%' }}>This trip is private. Only the owner and members can access it.</Alert>
            <Button variant='outlined' onClick={() => navigate('/')} sx={{ textTransform:'none', borderRadius:2 }}>Back to Home</Button>
          </Box>
        </Box>
      </Box>
    );
  }

  const handleEdit = () => {
    // Navigate to full planner for editing (reuse planner route)
    // Pass current `trip` meta under `trip` key for planner hydration.
    // Use replace: true to avoid adding extra history entry
    navigate(`/tripplanner/${tripId}`, { state: { tripId, trip, isOwner, isMember, canEdit: isOwner || isMember }, replace: true });
  };

  // ── SEO: published trips are public landing pages; everything else stays out of indexes ──
  const seoName: string = tripRoot?.name || tripRoot?.Name || 'Trip itinerary';
  const seoDescriptionRaw: string = tripRoot?.description || tripRoot?.Description || '';
  const seoCountries: string[] = Array.isArray(tripRoot?.countries) ? tripRoot.countries
    : Array.isArray(tripRoot?.Countries) ? tripRoot.Countries : [];
  const seoPhoto: string | undefined = tripRoot?.photoUrl || tripRoot?.PhotoUrl || undefined;
  const seoStart: string | undefined = tripRoot?.startDate || tripRoot?.StartDate || undefined;
  const seoEnd: string | undefined = tripRoot?.endDate || tripRoot?.EndDate || undefined;
  const seoDescription = (seoDescriptionRaw ||
    `${seoName} ,a complete travel itinerary${seoCountries.length ? ` through ${seoCountries.slice(0, 3).join(', ')}` : ''} on Tripician. See the route, stops, and plan, then clone it for your own trip.`
  ).slice(0, 300);
  const canonicalPath = tripPath({ id: tripId, name: seoName });
  const tripJsonLd = isPublished ? {
    '@context': 'https://schema.org',
    '@type': 'Trip',
    name: seoName,
    description: seoDescription,
    url: `${SITE_URL}${canonicalPath}`,
    ...(seoPhoto ? { image: seoPhoto } : {}),
    ...(seoStart ? { startDate: seoStart } : {}),
    ...(seoEnd ? { endDate: seoEnd } : {}),
    ...(seoCountries.length ? {
      itinerary: seoCountries.map((c) => ({ '@type': 'Place', name: c })),
    } : {}),
    provider: { '@type': 'Organization', name: 'Tripician', url: SITE_URL },
  } : undefined;

  return (
    <Box sx={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <Seo
        title={seoCountries.length ? `${seoName} ,${seoCountries.slice(0, 2).join(' & ')} itinerary` : seoName}
        description={seoDescription}
        path={canonicalPath}
        image={seoPhoto}
        noindex={!isPublished}
        jsonLd={tripJsonLd}
      />
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
