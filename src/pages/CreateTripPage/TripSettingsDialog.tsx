import React from 'react';
import { Dialog, DialogContent, Box, Typography, IconButton, TextField, Button, Chip, Avatar, Fade, InputBase, Tooltip } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIconSmall from '@mui/icons-material/Close';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import covers from '../../assets/covers.json';
import { fetchUnsplashImage } from '../../services/unsplashService';

/* ── Vibe image cards (mirrors TripCreationModal exactly) ── */
const VIBES = [
  { id: 'adventure', label: 'Adventure Junkie',   img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=75', desc: 'Trails, peaks & thrills',       bg: '#F0FDF4', activeBg: 'linear-gradient(135deg,#059669,#047857)', activeColor: '#fff', activeBorder: '#059669' },
  { id: 'culture',   label: 'Culture Seeker',     img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=400&q=75', desc: 'History, art & local life',     bg: '#F5F3FF', activeBg: 'linear-gradient(135deg,#7C3AED,#5B21B6)', activeColor: '#fff', activeBorder: '#7C3AED' },
  { id: 'romantic',  label: 'Party Lover',        img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=75', desc: 'Vibes, music & movement',       bg: '#FFF1F2', activeBg: 'linear-gradient(135deg,#FF385C,#D91A50)', activeColor: '#fff', activeBorder: '#FF385C' },
  { id: 'luxury',    label: 'Slow Traveler',      img: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=400&q=75', desc: 'Wander, rest, repeat',           bg: '#FFFBEB', activeBg: 'linear-gradient(135deg,#D97706,#B45309)', activeColor: '#fff', activeBorder: '#D97706' },
  { id: 'spiritual', label: 'Spiritual Explorer', img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=75', desc: 'Temples, peace & purpose',       bg: '#FEFCE8', activeBg: 'linear-gradient(135deg,#CA8A04,#A16207)', activeColor: '#fff', activeBorder: '#CA8A04' },
  { id: 'urban',     label: 'Urban',              img: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=400&q=75', desc: 'City breaks & nightlife',        bg: '#EFF6FF', activeBg: 'linear-gradient(135deg,#2563EB,#1D4ED8)', activeColor: '#fff', activeBorder: '#2563EB' },
  { id: 'scenic',    label: 'Scenic',             img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=75', desc: 'Landscapes & golden hours',      bg: '#ECFDF5', activeBg: 'linear-gradient(135deg,#10B981,#059669)', activeColor: '#fff', activeBorder: '#10B981' },
];

interface Member { id: string; name: string; handle: string; email?: string; avatar?: string; role: 'Owner' | 'Editor' | 'Viewer'; }

interface TripSettingsDialogProps {
  open: boolean;
  onClose: ()=>void;
  title: string;
  tripId?: string; // new: use for stable share URL
  startDate: string;
  endDate: string;
  privacy: string;
  members?: Member[];
  bannerUrl?: string; // current banner image
  onChangeBanner?: (data: { url: string; file?: File })=>void; // callback when new banner chosen
  onChangeTitle?: (t:string)=>void;
  onChangeStartDate?: (d:string)=>void;
  onChangeEndDate?: (d:string)=>void;
  onChangePrivacy?: (p:string)=>void;
  onDeleteTrip?: ()=>void;
  onInviteEmail?: (email:string)=> Promise<void>|void;
  description?: string;
  vibe?: string;
  onChangeDescription?: (d:string)=>void;
  onChangeVibe?: (v:string)=>void;
  countries?: string[]; // list of selected countries
  onRemoveCountry?: (country:string)=>void; // removal callback
  onAddCountry?: (country:string)=>void; // add callback
  currentUserIsOwner?: boolean; // allow member removal in invite view
}



import { flagEmojiFromName, flagPngUrl, countryCodeFromName, COUNTRY_NAMES } from '../../utils/countryFlags';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';

const TripSettingsDialog: React.FC<TripSettingsDialogProps> = ({ open, onClose, title, tripId, startDate, endDate, privacy: _privacy, members = [], bannerUrl, onChangeBanner, onChangeTitle, onChangeStartDate, onChangeEndDate, onChangePrivacy: _onChangePrivacy, onDeleteTrip, onInviteEmail, countries = [], onRemoveCountry, onAddCountry, currentUserIsOwner, description = '', onChangeDescription, vibe = '', onChangeVibe }) => {
  const [copyMain, setCopyMain] = React.useState(false);
  // Derive username from first owner/editor member handle (strip leading @) or 'user'
  // Share URL now based solely on tripId; member handle retrieval removed.
  const baseDomain = import.meta.env.VITE_ENV === 'production' ? 'https://www.tripician.com' : 'http://localhost:5173';
  // Use tripId for canonical share link if available; fallback to title slug
  const tripSlug = tripId ? encodeURIComponent(tripId) : encodeURIComponent(title||'trip');
  const shareUrl = `${baseDomain}/trip/${tripSlug}`; // stable share URL using tripId
  const [view, setView] = React.useState<'main'|'invite'>('main');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviting, setInviting] = React.useState(false);
  const { token: authToken } = useAuthToken();
  const [searchError, setSearchError] = React.useState<string>('');
  const [foundUser, setFoundUser] = React.useState<{id:number; fname:string; lname:string; email:string; country?:string; profilepicture?:string; profilePicture?:string; profilePic?:string; avatar?:string} | null>(null);
  const [pendingUsers, setPendingUsers] = React.useState<Array<{id:number; fname:string; lname:string; email:string; country?:string; profilepicture?:string; profilePicture?:string; profilePic?:string; avatar?:string}>>([]);
  const [addingMembers, setAddingMembers] = React.useState(false);
  // Unsplash-fetched banner for trips without a saved photoUrl
  const [unsplashBanner, setUnsplashBanner] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (bannerUrl && bannerUrl.trim()) { setUnsplashBanner(null); return; } // already has a real banner
    // Use same query as Dashboard so both share the same localStorage cache key
    const query = countries?.[0] || 'travel';
    let cancelled = false;
    fetchUnsplashImage(query).then(url => { if (!cancelled && url) setUnsplashBanner(url); });
    return () => { cancelled = true; };
  }, [bannerUrl, countries?.[0]]);

  const [countrySearch, setCountrySearch] = React.useState('');
  const [countryDropOpen, setCountryDropOpen] = React.useState(false);
  const countryAnchorRef = React.useRef<HTMLDivElement>(null);
  const filteredCountries = React.useMemo(()=> COUNTRY_NAMES.filter(n=> n.toLowerCase().includes(countrySearch.toLowerCase()) && !countries.includes(n)), [countrySearch, countries]);
  // Member list UX controls (scales to large sets)
  // Simplified member list (no search/filter). Owners first for clarity.
  const orderedMembers = React.useMemo(()=> {
    return [...members].sort((a,b)=> (a.role==='Owner'?0:1) - (b.role==='Owner'?0:1));
  }, [members]);

  const copy = (text:string) => {
    navigator.clipboard.writeText(text).then(()=> {
      setCopyMain(true);
      setTimeout(()=> setCopyMain(false), 1800);
    });
  };

  const handleSearchUser = async () => {
    if(!inviteEmail || !inviteEmail.includes('@')) {
      setSearchError('Please enter a valid email address');
      return;
    }
    setSearchError('');
    setFoundUser(null);
    setInviting(true);
    try {
      const email = inviteEmail.trim().toLowerCase();
      const token = authToken || localStorage.getItem('accessToken') || '';
      if(!token) { setSearchError('Authentication required'); return; }
      console.log('[InviteSearch] Searching user by email', email);
      const resp = await apiServices.getUserProfileByEmail(token, email);
      const userData = resp.data;
      if(!userData) { setSearchError('No user data returned'); return; }
      setFoundUser(userData);
      console.log('[InviteSearch] User found', userData);
    } catch(err:any) {
      if(err?.response?.status === 404) setSearchError('No user found with this email');
      else setSearchError('Search failed. Please try again.');
      console.warn('[InviteSearch] Search failed', err);
    } finally { setInviting(false); }
  };

  const handleAddToPending = () => {
    if(!foundUser) return;
    // Check if already pending
    if(pendingUsers.some(u=> u.id === foundUser.id)) {
      setSearchError('User already added to pending list');
      return;
    }
    setPendingUsers(prev=> [...prev, foundUser]);
    setInviteEmail('');
    setFoundUser(null);
    setSearchError('');
  };

  const handleRemovePending = (userId: number) => {
    setPendingUsers(prev=> prev.filter(u=> u.id !== userId));
  };

  const handleDone = async () => {
    if(pendingUsers.length === 0) {
      setView('main');
      return;
    }
    if(!tripId) {
      setSearchError('Trip ID missing');
      return;
    }
    setAddingMembers(true);
    try {
      const token = authToken || localStorage.getItem('accessToken') || '';
      if(!token) { setSearchError('Authentication required'); return; }
      const userIds = pendingUsers.map(u=> u.id);
      console.log('[InviteMembers] Adding users', userIds);
      await apiServices.addTripUsers(token, tripId, userIds);
      console.log('[InviteMembers] Users added successfully');
      // Clear pending and return to main
      setPendingUsers([]);
      setView('main');
      // Optionally trigger a refresh callback if parent needs to reload members
      // Dispatch a custom event so TripPlanner can refetch and update member list
      try {
        window.dispatchEvent(new CustomEvent('trip:members:updated', { detail: { tripId, userIds } }));
      } catch {}
      await onInviteEmail?.(''); // legacy callback (kept for backward compatibility)
    } catch(err:any) {
      setSearchError('Failed to add members. Please try again.');
      console.warn('[InviteMembers] Add failed', err);
    } finally {
      setAddingMembers(false);
    }
  };

  const handleDiscard = () => {
    setPendingUsers([]);
    setInviteEmail('');
    setFoundUser(null);
    setSearchError('');
    setView('main');
  };

  const handleRemoveMember = async (userId: string) => {
    if(!currentUserIsOwner || !tripId) return;
    try {
      const token = authToken || localStorage.getItem('accessToken') || '';
      if(!token) { setSearchError('Authentication required'); return; }
      await apiServices.removeTripUser(token, tripId, userId);
      // Trigger refresh in parent
      window.dispatchEvent(new CustomEvent('trip:members:updated', { detail:{ tripId, removedUserId: userId } }));
    } catch(err:any){
      setSearchError('Failed to remove member');
    }
  };

  const canManageMembers = Boolean(currentUserIsOwner);
  React.useEffect(() => {
    if(!canManageMembers && view === 'invite') {
      setView('main');
    }
  }, [canManageMembers, view]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      TransitionComponent={Fade}
      keepMounted
      PaperProps={{
        sx: (t: any) => ({
          borderRadius: 4,
          overflow: 'hidden',
          background: t.palette.mode === 'dark'
            ? 'linear-gradient(160deg,#111214 0%,#1a1c20 100%)'
            : 'linear-gradient(160deg,#ffffff 0%,#f9fafb 100%)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.28)',
          maxHeight: '94vh',
          '::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }),
      }}
    >
      {/* ── Invite view ── */}
      {view === 'invite' && (
        <>
          {/* Invite header */}
          <Box sx={(t: any) => ({
            display: 'flex', alignItems: 'center', gap: 1,
            px: 3, pt: 2.5, pb: 2,
            borderBottom: `1px solid ${t.palette.divider}`,
            background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
          })}>
            <IconButton size='small' onClick={() => setView('main')} sx={{ mr: .5 }}>
              <ArrowBackIcon fontSize='small' />
            </IconButton>
            <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>
              Invite Members
            </Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton size='small' onClick={onClose} sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, overflowY: 'auto' }}>
            {/* Search row */}
            <Box sx={(t: any) => ({
              display: 'flex', alignItems: 'center',
              border: `1.5px solid ${t.palette.divider}`, borderRadius: 3, overflow: 'hidden',
              background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              '&:focus-within': { borderColor: '#FF385C', boxShadow: '0 0 0 3px rgba(255,56,92,0.10)' },
              transition: 'all .2s',
            })}>
              <InputBase
                placeholder="Search by email address…"
                value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); setSearchError(''); setFoundUser(null); }}
                onKeyPress={e => e.key === 'Enter' && handleSearchUser()}
                sx={{ flex: 1, px: 2, py: 1.1, fontSize: 14 }}
              />
              <Button
                disabled={!inviteEmail || inviting}
                onClick={handleSearchUser}
                variant='contained'
                sx={{
                  m: 0.6, px: 2.5, textTransform: 'none', borderRadius: 2.5,
                  background: 'linear-gradient(135deg,#FF385C,#E31C5F)',
                  fontWeight: 700, fontSize: 13, boxShadow: 'none',
                  '&:hover': { background: 'linear-gradient(135deg,#e02d50,#c91855)', boxShadow: 'none' },
                }}
              >
                {inviting ? 'Searching…' : 'Search'}
              </Button>
            </Box>

            {searchError && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: .75, px: 1.5, py: 1, borderRadius: 2, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <Typography variant='caption' color='error' sx={{ fontWeight: 600 }}>{searchError}</Typography>
              </Box>
            )}

            {/* Found user card */}
            {foundUser && (
              <Box sx={(t: any) => ({
                p: 1.5, borderRadius: 3,
                border: `1.5px solid ${t.palette.divider}`,
                background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff',
                display: 'flex', alignItems: 'center', gap: 1.5,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              })}>
                <Avatar
                  src={foundUser.profilepicture || foundUser.profilePicture || foundUser.profilePic || foundUser.avatar || undefined}
                  imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any}
                  sx={{ width: 42, height: 42, bgcolor: '#FF385C', fontWeight: 700 }}
                >
                  {foundUser.fname?.[0]}{foundUser.lname?.[0]}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant='body2' fontWeight={700} noWrap>{foundUser.fname} {foundUser.lname}</Typography>
                  <Typography variant='caption' color='text.secondary' noWrap>{foundUser.email}</Typography>
                </Box>
                <IconButton size='small' onClick={handleAddToPending} sx={{
                  bgcolor: '#FF385C', color: '#fff', width: 32, height: 32,
                  '&:hover': { bgcolor: '#E31C5F' }, transition: 'background .15s',
                }}>
                  <PersonAddAltIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            )}

            {/* Pending list */}
            {pendingUsers.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'text.disabled', mb: 1 }}>
                  Pending ({pendingUsers.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: .75 }}>
                  {pendingUsers.map(u => (
                    <Box key={u.id} sx={(t: any) => ({
                      px: 1.5, py: 1, borderRadius: 2.5,
                      border: `1.5px solid rgba(255,56,92,0.25)`,
                      background: t.palette.mode === 'dark' ? 'rgba(255,56,92,0.06)' : 'rgba(255,56,92,0.03)',
                      display: 'flex', alignItems: 'center', gap: 1.25,
                    })}>
                      <Avatar
                        src={u.profilepicture || u.profilePicture || u.profilePic || u.avatar || undefined}
                        imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any}
                        sx={{ width: 34, height: 34, bgcolor: 'rgba(255,56,92,0.18)', color: '#FF385C', fontWeight: 700, fontSize: 13 }}
                      >
                        {u.fname?.[0]}{u.lname?.[0]}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant='body2' fontWeight={600} noWrap>{u.fname} {u.lname}</Typography>
                        <Typography variant='caption' color='text.secondary' noWrap>{u.email}</Typography>
                      </Box>
                      <IconButton size='small' onClick={() => handleRemovePending(u.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                        <CloseIconSmall sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Action row */}
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', mt: 1 }}>
              <Button variant='outlined' onClick={handleDiscard} disabled={addingMembers} sx={{ textTransform: 'none', borderRadius: 20, px: 3, fontWeight: 600, borderColor: 'divider' }}>
                Discard
              </Button>
              <Button variant='contained' onClick={handleDone} disabled={addingMembers} sx={{
                textTransform: 'none', borderRadius: 20, px: 3.5, fontWeight: 700,
                background: 'linear-gradient(135deg,#FF385C,#E31C5F)',
                boxShadow: '0 4px 14px rgba(255,56,92,0.25)',
                '&:hover': { background: 'linear-gradient(135deg,#e02d50,#c91855)' },
              }}>
                {addingMembers ? 'Adding…' : 'Done'}
              </Button>
            </Box>

            {/* Current members */}
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'text.disabled', mb: 1 }}>
                Current members
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: .75 }}>
                {members.map(m => (
                  <Box key={m.id} sx={(t: any) => ({
                    display: 'flex', alignItems: 'center', px: 1.5, py: 1, borderRadius: 2.5,
                    background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff',
                    border: `1px solid ${t.palette.divider}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  })}>
                    <Avatar src={m.avatar} sx={{ width: 38, height: 38, mr: 1.25, fontWeight: 700, fontSize: 14, bgcolor: m.role === 'Owner' ? '#FF385C' : '#6b7280', border: m.role === 'Owner' ? '2px solid #FF385C' : 'none' }}>
                      {!m.avatar && m.name?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant='body2' fontWeight={600} noWrap>{m.name}</Typography>
                      <Typography variant='caption' color='text.secondary' noWrap>{m.handle}</Typography>
                    </Box>
                    <Chip label={m.role} size='small' sx={{
                      fontWeight: 700, fontSize: 10, height: 22,
                      background: m.role === 'Owner' ? 'rgba(255,56,92,0.12)' : 'rgba(0,0,0,0.06)',
                      color: m.role === 'Owner' ? '#FF385C' : 'text.secondary',
                      mr: currentUserIsOwner && m.role !== 'Owner' ? 1 : 0,
                    }} />
                    {currentUserIsOwner && m.role !== 'Owner' && (
                      <IconButton size='small' onClick={() => handleRemoveMember(m.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                        <CloseIconSmall sx={{ fontSize: 15 }} />
                      </IconButton>
                    )}
                  </Box>
                ))}
                {members.length === 0 && (
                  <Typography sx={{ fontSize: 13, color: 'text.disabled', py: 1 }}>No members yet.</Typography>
                )}
              </Box>
            </Box>
          </DialogContent>
        </>
      )}

      {/* ── Main settings view ── */}
      {view === 'main' && (
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '94vh' }}>

          {/* ── Hero Banner ── */}
          {(() => {
            const countryKey = countries?.length ? countries[0].toLowerCase().replace(/\s+/g, '') : '';
            const coversTyped = covers as Record<string, string>;
            // Priority: 1) bannerUrl from backend  2) Unsplash fetched  3) covers.json country  4) covers.json default
            const coversSrc = (countryKey && coversTyped[countryKey] && coversTyped[countryKey].trim())
              ? coversTyped[countryKey]
              : coversTyped['default'];
            const imgSrc = (bannerUrl && bannerUrl.trim()) ? bannerUrl
              : (unsplashBanner || coversSrc);
            return (
              <Box
                sx={{
                  position: 'relative', width: '100%', height: { xs: 140, sm: 170 },
                  overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                  '&:hover .banner-overlay': { opacity: 1 },
                }}
                onClick={() => {
                  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
                  input.onchange = async () => {
                    const f = input.files?.[0]; if (!f) return;
                    const r = new FileReader(); r.onload = () => { const url = typeof r.result === 'string' ? r.result : ''; onChangeBanner?.({ url, file: f }); }; r.readAsDataURL(f);
                  };
                  input.click();
                }}
              >
                <Box
                  component='img' src={imgSrc} alt='Trip banner'
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s ease', '&:hover': { transform: 'scale(1.03)' } }}
                  onError={(e: any) => { e.currentTarget.src = coversTyped['default']; }}
                />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)', pointerEvents: 'none' }} />
                <Box className='banner-overlay' sx={{
                  position: 'absolute', inset: 0, opacity: 0, transition: 'opacity .2s',
                  background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(3px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: .75, px: 2.5, py: 1, borderRadius: 20, background: 'rgba(255,255,255,0.92)', color: '#111', fontSize: 12, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>📷&nbsp;Change cover</Box>
                </Box>
                <IconButton
                  size='small' onClick={e => { e.stopPropagation(); onClose(); }}
                  sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', color: '#fff', width: 30, height: 30, '&:hover': { background: 'rgba(0,0,0,0.65)' } }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <Box sx={{ position: 'absolute', bottom: 12, left: 16, right: 48 }}>
                  <Typography sx={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: { xs: 18, sm: 22 }, color: '#fff', textShadow: '0 2px 16px rgba(0,0,0,0.6)', letterSpacing: '-0.5px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title || 'Untitled Trip'}
                  </Typography>
                </Box>
              </Box>
            );
          })()}

          {/* ── Scrollable body ── */}
          <Box sx={{ overflowY: 'auto', flex: 1, '::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Trip name + description stacked */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Trip name row — share copy inline */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: .85 }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.1px', color: 'text.disabled' }}>Trip name</Typography>
                    <Tooltip title={copyMain ? 'Link copied!' : 'Copy share link'} placement='top'>
                      <Box
                        onClick={() => copy(shareUrl)}
                        sx={{ display: 'flex', alignItems: 'center', gap: .45, fontSize: 11, fontWeight: 700, color: copyMain ? 'success.main' : 'text.disabled', cursor: 'pointer', transition: 'color .2s', '&:hover': { color: copyMain ? 'success.main' : '#FF385C' } }}
                      >
                        {copyMain ? <CheckIcon sx={{ fontSize: 13 }} /> : <LinkIcon sx={{ fontSize: 13 }} />}
                        {copyMain ? 'Copied!' : 'Share link'}
                      </Box>
                    </Tooltip>
                  </Box>
                  <TextField
                    value={title} fullWidth size='small'
                    onChange={e => onChangeTitle?.(e.target.value)}
                    placeholder='Give your trip a name'
                    inputProps={{ maxLength: 80 }}
                    sx={fieldSx}
                  />
                </Box>

                {/* Description inline under trip name */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: .85 }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.1px', color: 'text.disabled' }}>Description</Typography>
                    {description.length > 0 && <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{description.length}/300</Typography>}
                  </Box>
                  <TextField
                    value={description} fullWidth multiline minRows={2} maxRows={4}
                    onChange={e => onChangeDescription?.(e.target.value)}
                    placeholder='Describe the mood, goal or story of this trip…'
                    inputProps={{ maxLength: 300 }}
                    sx={fieldSx}
                  />
                </Box>
              </Box>

              {/* ── Countries ── */}
              <FieldBlock label='Countries'>
                <Box ref={countryAnchorRef} sx={{ position: 'relative' }}>
                  <Box
                    sx={(t: any) => ({
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                      gap: .5, px: 1.25, py: .75, borderRadius: 2,
                      border: `1.5px solid ${countryDropOpen ? '#FF385C' : t.palette.divider}`,
                      background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff',
                      cursor: 'text', transition: 'border-color .2s, box-shadow .2s', minHeight: 44,
                      boxShadow: countryDropOpen ? '0 0 0 3px rgba(255,56,92,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
                    })}
                    onClick={() => setCountryDropOpen(true)}
                  >
                    {countries.map(c => {
                      const code = countryCodeFromName(c);
                      const png = flagPngUrl(code, 16);
                      const emoji = flagEmojiFromName(c);
                      return (
                        <Box key={c} sx={(t: any) => ({
                          display: 'flex', alignItems: 'center', gap: .4,
                          pl: .75, pr: .5, py: .3, borderRadius: 20,
                          fontSize: 12, fontWeight: 600,
                          background: t.palette.mode === 'dark' ? 'rgba(255,56,92,0.15)' : 'rgba(255,56,92,0.08)',
                          border: '1px solid rgba(255,56,92,0.2)', color: '#FF385C', flexShrink: 0,
                        })}>
                          {png
                            ? <Box component='img' src={png} alt='' sx={{ width: 16, height: 12, borderRadius: '2px', objectFit: 'cover' }} />
                            : <Box sx={{ fontSize: 14, lineHeight: 1 }}>{emoji || '🌍'}</Box>}
                          {c}
                          <Box component='span'
                            onClick={(e: any) => { e.stopPropagation(); onRemoveCountry?.(c); }}
                            sx={{ display: 'flex', alignItems: 'center', ml: .2, cursor: 'pointer', opacity: .5, '&:hover': { opacity: 1 }, fontSize: 15, lineHeight: 1 }}>
                            ×
                          </Box>
                        </Box>
                      );
                    })}
                    <InputBase
                      placeholder={countries.length === 0 ? 'Search and add countries…' : ''}
                      value={countrySearch}
                      onChange={e => { setCountrySearch(e.target.value); setCountryDropOpen(true); }}
                      onFocus={() => setCountryDropOpen(true)}
                      sx={{ minWidth: 100, flex: 1, fontSize: 13, '& input': { p: 0 } }}
                    />
                  </Box>
                  {countryDropOpen && (
                    <Box sx={(t: any) => ({
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 1400,
                      borderRadius: 2.5, border: `1px solid ${t.palette.divider}`,
                      background: t.palette.mode === 'dark' ? '#1e1e22' : '#fff',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
                      maxHeight: 220, overflowY: 'auto',
                    })} onMouseDown={e => e.preventDefault()}>
                      {filteredCountries.length === 0
                        ? <Box sx={{ px: 2, py: 1.5, fontSize: 13, color: 'text.disabled' }}>No matches</Box>
                        : filteredCountries.slice(0, 60).map(name => {
                          const code = countryCodeFromName(name);
                          const png = flagPngUrl(code, 20);
                          const emoji = flagEmojiFromName(name);
                          return (
                            <Box key={name}
                              onClick={() => { onAddCountry?.(name); setCountrySearch(''); setCountryDropOpen(false); }}
                              sx={(t: any) => ({
                                display: 'flex', alignItems: 'center', gap: 1,
                                px: 1.5, py: .9, fontSize: 13, cursor: 'pointer',
                                '&:hover': { background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,56,92,0.05)' },
                              })}>
                              {png
                                ? <Box component='img' src={png} alt='' sx={{ width: 20, height: 15, borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} />
                                : <Box sx={{ fontSize: 16, lineHeight: 1 }}>{emoji || '🌍'}</Box>}
                              {name}
                            </Box>
                          );
                        })
                      }
                    </Box>
                  )}
                  {countryDropOpen && <Box sx={{ position: 'fixed', inset: 0, zIndex: 1399 }} onClick={() => { setCountryDropOpen(false); setCountrySearch(''); }} />}
                </Box>
              </FieldBlock>

              {/* ── Dates ── */}
              <FieldBlock label='Dates'>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                    {(() => {
                      const sanitize = (d: string) => (d && d.length >= 10 ? d.slice(0, 10) : d);
                      const sd = dayjs(sanitize(startDate));
                      const ed = dayjs(sanitize(endDate));
                      return (
                        <>
                          <DatePicker label='Start' value={sd.isValid() ? sd : null}
                            onChange={v => { onChangeStartDate?.(v ? v.format('YYYY-MM-DD') : ''); }}
                            slotProps={{ textField: { size: 'small', fullWidth: true, sx: { flex: 1, ...datePickerSx } } }}
                          />
                          <DatePicker label='End' value={ed.isValid() ? ed : null} minDate={sd.isValid() ? sd : undefined}
                            onChange={v => { onChangeEndDate?.(v ? v.format('YYYY-MM-DD') : ''); }}
                            slotProps={{ textField: { size: 'small', fullWidth: true, sx: { flex: 1, ...datePickerSx } } }}
                          />
                        </>
                      );
                    })()}
                  </Box>
                </LocalizationProvider>
              </FieldBlock>

              {/* ── Vibe image cards ── */}
              <FieldBlock
                label='Vibe'
                action={vibe ? (
                  <Box onClick={() => onChangeVibe?.('')} sx={{ fontSize: 11, color: 'text.disabled', cursor: 'pointer', '&:hover': { color: 'text.secondary' } }}>clear</Box>
                ) : undefined}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: { xs: .75, sm: 1 } }}>
                  {VIBES.map(v => {
                    const selected = vibe === v.id;
                    return (
                      <Box
                        key={v.id}
                        onClick={() => onChangeVibe?.(selected ? '' : v.id)}
                        sx={{
                          position: 'relative', height: { xs: 72, sm: 80 },
                          borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', userSelect: 'none',
                          outline: selected ? `2.5px solid ${v.activeBorder}` : '2.5px solid transparent',
                          outlineOffset: '2px',
                          boxShadow: selected ? `0 6px 20px ${v.activeBorder}50` : '0 2px 8px rgba(0,0,0,0.10)',
                          transition: 'transform .2s ease, box-shadow .2s ease',
                          transform: selected ? 'scale(1.04) translateY(-2px)' : 'none',
                          '&:hover': !selected ? { transform: 'translateY(-2px)', boxShadow: '0 6px 18px rgba(0,0,0,0.16)' } : {},
                        }}
                      >
                        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${v.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        <Box sx={{ position: 'absolute', inset: 0, background: selected ? `linear-gradient(to top,${v.activeBorder}CC 0%,rgba(0,0,0,0.18) 100%)` : 'linear-gradient(to top,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.10) 100%)', transition: 'background .2s' }} />
                        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: '5px 7px 6px' }}>
                          <Typography sx={{ fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontWeight: 700, fontSize: { xs: '0.62rem', sm: '0.68rem' }, color: '#fff', lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>{v.label}</Typography>
                        </Box>
                        {selected && (
                          <Box sx={{ position: 'absolute', top: 5, right: 5, width: 14, height: 14, borderRadius: '50%', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: v.activeBorder }} />
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </FieldBlock>



              {/* ── Divider ── */}
              <SectionDivider />

              {/* ── Members ── */}
              <FieldBlock
                label={`Members (${orderedMembers.length})`}
                action={canManageMembers ? (
                  <Box onClick={() => setView('invite')} sx={{ display: 'flex', alignItems: 'center', gap: .4, fontSize: 12, fontWeight: 700, color: '#FF385C', cursor: 'pointer', '&:hover': { opacity: .75 }, transition: 'opacity .15s' }}>
                    <PersonAddAltIcon sx={{ fontSize: 15 }} /> Add member
                  </Box>
                ) : undefined}
              >
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', minHeight: 40 }}>
                  {orderedMembers.map(m => {
                    const isOwner = m.role === 'Owner';
                    const avatarSrc = m.avatar || (m as any).Avatar || (m as any).profileImage || (m as any).photo || undefined;
                    return (
                      <Tooltip key={m.id} title={`${m.name}${isOwner ? ' · Owner' : ''}`} placement='top'>
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                          <Avatar
                            src={avatarSrc || undefined}
                            imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any}
                            sx={{
                              width: 36, height: 36, fontWeight: 700, fontSize: 13, cursor: 'default',
                              bgcolor: isOwner ? '#FF385C' : '#6b7280',
                              border: isOwner ? '2.5px solid #FF385C' : (t: any) => `2px solid ${t.palette.background.paper}`,
                              boxShadow: isOwner ? '0 0 0 2px rgba(255,56,92,0.3)' : '0 2px 6px rgba(0,0,0,0.12)',
                              transition: 'transform .18s', '&:hover': { transform: 'scale(1.1)' },
                            }}
                          >
                            {/* Always provide initials — MUI uses them as fallback when src fails to load */}
                            {m.name?.[0]?.toUpperCase() ?? '?'}
                          </Avatar>
                          {isOwner && (
                            <Box sx={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg,#FF385C,#E31C5F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>👑</Box>
                          )}
                        </Box>
                      </Tooltip>
                    );
                  })}
                  {orderedMembers.length === 0 && (
                    <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontStyle: 'italic' }}>No collaborators yet. Invite someone!</Typography>
                  )}
                </Box>
              </FieldBlock>

              {/* ── Divider ── */}
              <SectionDivider />

              {/* ── Footer actions ── */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 3 }}>
                {canManageMembers ? (
                  <Box
                    onClick={onDeleteTrip}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: .5,
                      fontSize: 12.5, fontWeight: 600, color: 'text.disabled', cursor: 'pointer',
                      px: 1.5, py: .7, borderRadius: 2,
                      '&:hover': { color: 'error.main', background: 'rgba(220,38,38,0.07)' },
                      transition: 'all .15s',
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} /> Delete trip
                  </Box>
                ) : <Box />}
                <Button
                  variant='contained'
                  onClick={() => window.dispatchEvent(new CustomEvent('trip:settings:save'))}
                  sx={{
                    textTransform: 'none', fontWeight: 800, fontSize: 14,
                    borderRadius: 20, px: 4, py: 1,
                    background: 'linear-gradient(135deg,#FF385C,#E31C5F)',
                    boxShadow: '0 6px 20px rgba(255,56,92,0.35)',
                    letterSpacing: '.01em',
                    '&:hover': {
                      background: 'linear-gradient(135deg,#e02d50,#c91855)',
                      boxShadow: '0 8px 28px rgba(255,56,92,0.45)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all .2s',
                  }}
                >
                  Save settings
                </Button>
              </Box>

            </Box>
          </Box>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default TripSettingsDialog;

/* ── helper sub-components (file-local) ── */

const fieldSx = (t: any) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    fontSize: 14,
    fontWeight: 500,
    background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    '&:hover fieldset': { borderColor: '#FF385C' },
    '&.Mui-focused fieldset': { borderColor: '#FF385C', borderWidth: '1.5px' },
    '& fieldset': { transition: 'border-color .2s' },
  },
});

const datePickerSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    fontSize: 13,
    background: 'transparent',
    '&:hover fieldset': { borderColor: '#FF385C' },
    '&.Mui-focused fieldset': { borderColor: '#FF385C', borderWidth: '1.5px' },
  },
};

function SectionDivider() {
  return <Box sx={(t: any) => ({ height: '1px', background: t.palette.divider, mx: -1 })} />;
}

function FieldBlock({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: .85 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.1px', color: 'text.disabled' }}>
          {label}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}
