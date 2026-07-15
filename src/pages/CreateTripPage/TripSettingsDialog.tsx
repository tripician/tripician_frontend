import React from 'react';
import { Dialog, DialogContent, Box, Typography, IconButton, TextField, Button, Chip, Avatar, Fade, InputBase, Tooltip } from '@mui/material';
import ImportantNotesEditor from './ImportantNotesEditor';
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
import { flagEmojiFromName, flagPngUrl, countryCodeFromName, COUNTRY_NAMES } from '../../utils/countryFlags';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { generateTripBrief, NaviaRequestError } from '../../navia/naviaService';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { CircularProgress } from '@mui/material';

/*  Vibe cards  */
const VIBES = [
  { id: 'adventure', label: 'Adventure Junkie',  emoji: '🏔️', desc: 'Trails, peaks & adrenaline',        tagline: 'Born for the wild',          bg: '#F0FDF4', activeBg: 'linear-gradient(135deg,#059669,#047857)', activeColor: '#fff', activeBorder: '#059669' },
  { id: 'culture',   label: 'Culture Seeker',    emoji: '🏛️', desc: 'History, art & local stories',      tagline: 'Every place has a tale',     bg: '#F5F3FF', activeBg: 'linear-gradient(135deg,#7C3AED,#5B21B6)', activeColor: '#fff', activeBorder: '#7C3AED' },
  { id: 'romantic',  label: 'Party Lover',       emoji: '🎉', desc: 'Vibes, music & movement',            tagline: 'Life is a dance floor',      bg: '#FFF1F2', activeBg: 'linear-gradient(135deg,#FF385C,#D91A50)', activeColor: '#fff', activeBorder: '#FF385C' },
  { id: 'luxury',    label: 'Slow Traveler',     emoji: '🌸', desc: 'Wander without a rush',              tagline: 'The journey is the goal',    bg: '#FFFBEB', activeBg: 'linear-gradient(135deg,#D97706,#B45309)', activeColor: '#fff', activeBorder: '#D97706' },
  { id: 'spiritual', label: 'Spiritual Explorer',emoji: '🕌', desc: 'Temples, peace & inner purpose',     tagline: 'Travel as transformation',   bg: '#FEFCE8', activeBg: 'linear-gradient(135deg,#CA8A04,#A16207)', activeColor: '#fff', activeBorder: '#CA8A04' },
  { id: 'urban',     label: 'Urban Explorer',    emoji: '🌆', desc: 'City breaks & hidden gems',          tagline: 'The city never sleeps',      bg: '#EFF6FF', activeBg: 'linear-gradient(135deg,#2563EB,#1D4ED8)', activeColor: '#fff', activeBorder: '#2563EB' },
  { id: 'scenic',    label: 'Scenic Chaser',     emoji: '🌅', desc: 'Landscapes & golden hours',          tagline: 'Always chasing sunsets',     bg: '#ECFDF5', activeBg: 'linear-gradient(135deg,#10B981,#059669)', activeColor: '#fff', activeBorder: '#10B981' },
];

interface Member { id: string; name: string; handle: string; email?: string; avatar?: string; role: 'Owner' | 'Editor' | 'Viewer'; }

interface TripSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tripId?: string;
  startDate: string;
  endDate: string;
  privacy: string;
  members?: Member[];
  bannerUrl?: string;
  onChangeBanner?: (data: { url: string; file?: File }) => void;
  onChangeTitle?: (t: string) => void;
  onChangeStartDate?: (d: string) => void;
  onChangeEndDate?: (d: string) => void;
  onChangePrivacy?: (p: string) => void;
  onDeleteTrip?: () => void;
  onInviteEmail?: (email: string) => Promise<void> | void;
  description?: string;
  vibe?: string;
  onChangeDescription?: (d: string) => void;
  onChangeVibe?: (v: string) => void;
  countries?: string[];
  onRemoveCountry?: (country: string) => void;
  onAddCountry?: (country: string) => void;
  currentUserIsOwner?: boolean;
  importantNotes?: string;
  onChangeImportantNotes?: (notes: string) => void;
}

type TabId = 'overview' | 'details' | 'vibe' | 'crew';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details',  label: 'Details'  },
  { id: 'vibe',     label: 'Vibe'     },
  { id: 'crew',     label: 'Crew'     },
];

const primary = '#FF385C';

const TripSettingsDialog: React.FC<TripSettingsDialogProps> = ({
  open, onClose, title, tripId, startDate, endDate,
  privacy: _privacy, members = [], bannerUrl, onChangeBanner,
  onChangeTitle, onChangeStartDate, onChangeEndDate,
  onChangePrivacy: _onChangePrivacy, onDeleteTrip, onInviteEmail,
  countries = [], onRemoveCountry, onAddCountry, currentUserIsOwner,
  description = '', onChangeDescription, vibe = '', onChangeVibe,
  importantNotes = '', onChangeImportantNotes,
}) => {
  const [copyMain, setCopyMain] = React.useState(false);
  const baseDomain = import.meta.env.VITE_ENV === 'production' ? 'https://www.tripician.com' : 'http://localhost:5173';
  const tripSlug = tripId ? encodeURIComponent(tripId) : encodeURIComponent(title || 'trip');
  const shareUrl = `${baseDomain}/trip/${tripSlug}`;

  const [view, setView]         = React.useState<'main' | 'invite'>('main');
  const [tab, setTab]           = React.useState<TabId>('overview');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviting, setInviting] = React.useState(false);
  const { token: authToken }    = useAuthToken();
  const [searchError, setSearchError] = React.useState<string>('');
  const [foundUser, setFoundUser] = React.useState<{ id: number; fname: string; lname: string; email: string; country?: string; profilepicture?: string; profilePicture?: string; profilePic?: string; avatar?: string } | null>(null);
  const [pendingUsers, setPendingUsers] = React.useState<Array<{ id: number; fname: string; lname: string; email: string; country?: string; profilepicture?: string; profilePicture?: string; profilePic?: string; avatar?: string }>>([]);
  const [addingMembers, setAddingMembers] = React.useState(false);
  const [userSearchResults, setUserSearchResults] = React.useState<Array<{ id: number; fname: string; lname: string; email: string; country?: string; profilepicture?: string; profilePicture?: string; profilePic?: string; avatar?: string }>>([]);

  const [unsplashBanner, setUnsplashBanner] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (bannerUrl && bannerUrl.trim()) { setUnsplashBanner(null); return; }
    const query = countries?.[0] || 'travel';
    let cancelled = false;
    fetchUnsplashImage(query).then(url => { if (!cancelled && url) setUnsplashBanner(url); });
    return () => { cancelled = true; };
  }, [bannerUrl, countries?.[0]]);

  // "Write with Navia" — AI-drafted trip description (costs 1 trip credit)
  const [briefLoading, setBriefLoading] = React.useState(false);
  const [briefError, setBriefError] = React.useState('');
  const handleWriteWithNavia = React.useCallback(async () => {
    if (!tripId || !authToken || briefLoading) return;
    setBriefLoading(true);
    setBriefError('');
    try {
      const brief = await generateTripBrief(tripId, authToken);
      if (brief.description) onChangeDescription?.(brief.description.slice(0, 300));
    } catch (err) {
      if (err instanceof NaviaRequestError && err.status === 402) {
        setBriefError('This trip is out of Navia credits.');
      } else {
        setBriefError('Navia could not write a description right now. Try again shortly.');
      }
    } finally {
      setBriefLoading(false);
    }
  }, [tripId, authToken, briefLoading, onChangeDescription]);

  const [countrySearch, setCountrySearch]   = React.useState('');
  const [countryDropOpen, setCountryDropOpen] = React.useState(false);
  const countryAnchorRef = React.useRef<HTMLDivElement>(null);
  const filteredCountries = React.useMemo(
    () => COUNTRY_NAMES.filter(n => n.toLowerCase().includes(countrySearch.toLowerCase()) && !countries.includes(n)),
    [countrySearch, countries],
  );
  const orderedMembers = React.useMemo(
    () => [...members].sort((a, b) => (a.role === 'Owner' ? 0 : 1) - (b.role === 'Owner' ? 0 : 1)),
    [members],
  );
  const canManageMembers = Boolean(currentUserIsOwner);

  /*  Banner image  */
  const coversTyped  = covers as Record<string, string>;
  const countryKey   = countries?.length ? countries[0].toLowerCase().replace(/\s+/g, '') : '';
  const coversSrc    = (countryKey && coversTyped[countryKey]?.trim()) ? coversTyped[countryKey] : coversTyped['default'];
  const imgSrc       = (bannerUrl && bannerUrl.trim()) ? bannerUrl : (unsplashBanner || coversSrc);

  /* Accent gradient follows vibe */
  const activeVibeData = VIBES.find(v => v.id === vibe);
  const accentGradient = activeVibeData
    ? activeVibeData.activeBg
    : `linear-gradient(90deg, ${primary} 0%, #FF6B35 50%, #FFB347 100%)`;

  /*  Helpers  */
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopyMain(true); setTimeout(() => setCopyMain(false), 1800); });
  };

  const handleSearchUser = async () => {
    if (!inviteEmail || inviteEmail.trim().length < 2) {
      setSearchError('Enter a name or email to search');
      return;
    }
    setSearchError('');
    setFoundUser(null);
    setInviting(true);
    try {
      const query = inviteEmail.trim();
      const token = authToken || localStorage.getItem('accessToken') || '';
      if (!token) { setSearchError('Authentication required'); return; }
      const isEmail = /.+@.+\..+/.test(query);
      if (isEmail) {
        const resp = await apiServices.getUserProfileByEmail(token, query.toLowerCase());
        if (resp.data) setFoundUser(resp.data);
        else setSearchError('No user found');
      } else {
        const resp = await apiServices.searchUsersByName(token, query);
        if (resp.data && Array.isArray(resp.data) && resp.data.length > 0) {
          setUserSearchResults(resp.data);
        } else {
          setSearchError('No users found');
        }
      }
    } catch (err: any) {
      if (err?.response?.status === 404) setSearchError('No user found');
      else setSearchError('Search failed. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleUserSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    try {
      const token = authToken || localStorage.getItem('accessToken') || '';
      if (!token) return;
      // Search by email or name
      const emailRegex = /.+@.+\..+/.test(query);
      if (emailRegex) {
        const resp = await apiServices.getUserProfileByEmail(token, query.toLowerCase());
        if (resp.data) {
          setUserSearchResults([resp.data]);
        }
      } else {
        // Search by name
        const resp = await apiServices.searchUsersByName(token, query);
        if (resp.data && Array.isArray(resp.data)) {
          setUserSearchResults(resp.data);
        }
      }
    } catch (err) {
      setUserSearchResults([]);
    }
  };

  const handleSelectUser = (user: any) => {
    if (!foundUser) return;
    if (pendingUsers.some(u => u.id === user.id)) { setSearchError('User already added'); return; }
    setPendingUsers(prev => [...prev, user]);
    setInviteEmail(''); setFoundUser(null); setUserSearchResults([]); setSearchError('');
  };

  const handleAddToPending = () => {
    if (!foundUser) return;
    if (pendingUsers.some(u => u.id === foundUser.id)) { setSearchError('User already added'); return; }
    setPendingUsers(prev => [...prev, foundUser]);
    setInviteEmail(''); setFoundUser(null); setSearchError('');
  };

  const handleRemovePending = (userId: number) => setPendingUsers(prev => prev.filter(u => u.id !== userId));

  const handleDone = async () => {
    if (pendingUsers.length === 0) { setView('main'); return; }
    if (!tripId) { setSearchError('Trip ID missing'); return; }
    setAddingMembers(true);
    try {
      const token = authToken || localStorage.getItem('accessToken') || '';
      if (!token) { setSearchError('Authentication required'); return; }
      const userIds = pendingUsers.map(u => u.id);
      await apiServices.addTripUsers(token, tripId, userIds);
      setPendingUsers([]); setView('main');
      try { window.dispatchEvent(new CustomEvent('trip:members:updated', { detail: { tripId, userIds } })); } catch {}
      await onInviteEmail?.('');
    } catch { setSearchError('Failed to add members. Please try again.'); }
    finally { setAddingMembers(false); }
  };

  const handleDiscard = () => { setPendingUsers([]); setInviteEmail(''); setFoundUser(null); setSearchError(''); setView('main'); };

  const handleRemoveMember = async (userId: string) => {
    if (!currentUserIsOwner || !tripId) return;
    try {
      const token = authToken || localStorage.getItem('accessToken') || '';
      if (!token) { setSearchError('Authentication required'); return; }
      await apiServices.removeTripUser(token, tripId, userId);
      window.dispatchEvent(new CustomEvent('trip:members:updated', { detail: { tripId, removedUserId: userId } }));
    } catch { setSearchError('Failed to remove member'); }
  };

  React.useEffect(() => { if (!canManageMembers && view === 'invite') setView('main'); }, [canManageMembers, view]);

  const handleBannerClick = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { const url = typeof r.result === 'string' ? r.result : ''; onChangeBanner?.({ url, file: f }); };
      r.readAsDataURL(f);
    };
    input.click();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      keepMounted
      PaperProps={{
        sx: (t: any) => ({
          borderRadius: '24px',
          overflow: 'hidden',
          bgcolor: t.palette.mode === 'dark' ? '#111214' : '#FFFFFF',
          boxShadow: '0 40px 100px rgba(0,0,0,0.18), 0 12px 32px rgba(255,56,92,0.12)',
          maxHeight: '92vh',
          '::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }),
      }}
    >
      {/*  Top accent strip  */}
      <Box sx={{ height: 3, flexShrink: 0, background: accentGradient, transition: 'background 0.5s ease' }} />

      {/* ════════════════════════════════
          INVITE VIEW
      ════════════════════════════════ */}
      {view === 'invite' && (
        <>
          <Box sx={(t: any) => ({
            display: 'flex', alignItems: 'center', gap: 1,
            px: 3, pt: 2.5, pb: 2,
            borderBottom: `1px solid ${t.palette.divider}`,
          })}>
            <IconButton size="small" onClick={() => setView('main')} sx={{ mr: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>Invite Members</Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton size="small" onClick={onClose} sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, overflowY: 'auto' }}>
            {/* Search row */}
            <Box sx={{ position: 'relative' }}>
              <Box sx={(t: any) => ({
                display: 'flex', alignItems: 'center',
                border: `1.5px solid ${t.palette.divider}`, borderRadius: 3, overflow: 'hidden',
                background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff',
                '&:focus-within': { borderColor: primary, boxShadow: '0 0 0 3px rgba(255,56,92,0.10)' },
                transition: 'all .2s',
              })}>
                <InputBase
                  placeholder="Search by name or email…"
                  value={inviteEmail}
                  onChange={e => { 
                    setInviteEmail(e.target.value); 
                    setSearchError(''); 
                    setFoundUser(null);
                    handleUserSearch(e.target.value);
                  }}
                  onKeyPress={e => e.key === 'Enter' && handleSearchUser()}
                  sx={{ flex: 1, px: 2, py: 1.1, fontSize: 14 }}
                />
                <Button
                  disabled={!inviteEmail || inviting}
                  onClick={handleSearchUser}
                  variant="contained"
                  sx={{
                    m: 0.6, px: 2.5, textTransform: 'none', borderRadius: 2.5,
                    background: 'linear-gradient(135deg,#FF385C,#E31C5F)',
                    fontWeight: 700, fontSize: 13, boxShadow: 'none',
                    '&:hover': { background: 'linear-gradient(135deg,#e02d50,#c91855)', boxShadow: 'none' },
                  }}
                >{inviting ? 'Searching…' : 'Search'}</Button>
              </Box>
              
              {/* User search results dropdown */}
              {userSearchResults.length > 0 && (
                <Box sx={{
                  position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5,
                  backgroundColor: '#fff', borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  maxHeight: 200, overflowY: 'auto',
                  zIndex: 20,
                  border: '1px solid rgba(0,0,0,0.08)',
                }}>
                  {userSearchResults.map((user) => (
                    <Box
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        px: 2, py: 1.5,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(255,56,92,0.05)' },
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                      }}
                    >
                      <Avatar
                        src={user.profilepicture || user.profilePicture || user.profilePic || user.avatar || undefined}
                        sx={{ width: 36, height: 36, bgcolor: primary, fontWeight: 700, fontSize: 14 }}
                        imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' as any }}
                      >
                        {user.fname?.[0]}{user.lname?.[0]}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', fontFamily: "'Inter', sans-serif" }}>
                          {user.fname} {user.lname}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: "'Inter', sans-serif" }}>
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {searchError && (
              <Box sx={{ px: 1.5, py: 1, borderRadius: 2, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>{searchError}</Typography>
              </Box>
            )}

            {foundUser && (
              <Box sx={(t: any) => ({ p: 1.5, borderRadius: 3, border: `1.5px solid ${t.palette.divider}`, background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff', display: 'flex', alignItems: 'center', gap: 1.5, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' })}>
                <Avatar src={foundUser.profilepicture || foundUser.profilePicture || foundUser.profilePic || foundUser.avatar || undefined} imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any} sx={{ width: 42, height: 42, bgcolor: primary, fontWeight: 700 }}>
                  {foundUser.fname?.[0]}{foundUser.lname?.[0]}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>{foundUser.fname} {foundUser.lname}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{foundUser.email}</Typography>
                </Box>
                <IconButton size="small" onClick={handleAddToPending} sx={{ bgcolor: primary, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#E31C5F' } }}>
                  <PersonAddAltIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            )}

            {pendingUsers.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'text.disabled', mb: 1 }}>Pending ({pendingUsers.length})</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {pendingUsers.map(u => (
                    <Box key={u.id} sx={{ px: 1.5, py: 1, borderRadius: 2.5, border: '1.5px solid rgba(255,56,92,0.25)', background: 'rgba(255,56,92,0.03)', display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Avatar src={u.profilepicture || u.profilePicture || u.profilePic || u.avatar || undefined} imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any} sx={{ width: 34, height: 34, bgcolor: 'rgba(255,56,92,0.18)', color: primary, fontWeight: 700, fontSize: 13 }}>
                        {u.fname?.[0]}{u.lname?.[0]}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{u.fname} {u.lname}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>{u.email}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => handleRemovePending(u.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                        <CloseIconSmall sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', mt: 1 }}>
              <Button variant="outlined" onClick={handleDiscard} disabled={addingMembers} sx={{ textTransform: 'none', borderRadius: 20, px: 3, fontWeight: 600 }}>Discard</Button>
              <Button variant="contained" onClick={handleDone} disabled={addingMembers} sx={{ textTransform: 'none', borderRadius: 20, px: 3.5, fontWeight: 700, background: 'linear-gradient(135deg,#FF385C,#E31C5F)', boxShadow: '0 4px 14px rgba(255,56,92,0.25)', '&:hover': { background: 'linear-gradient(135deg,#e02d50,#c91855)' } }}>
                {addingMembers ? 'Adding…' : 'Done'}
              </Button>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'text.disabled', mb: 1 }}>Current members</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {members.map(m => (
                  <Box key={m.id} sx={(t: any) => ({ display: 'flex', alignItems: 'center', px: 1.5, py: 1, borderRadius: 2.5, background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff', border: `1px solid ${t.palette.divider}` })}>
                    <Avatar src={m.avatar} sx={{ width: 38, height: 38, mr: 1.25, fontWeight: 700, fontSize: 14, bgcolor: m.role === 'Owner' ? primary : '#6b7280', border: m.role === 'Owner' ? `2px solid ${primary}` : 'none' }}>
                      {!m.avatar && m.name?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{m.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{m.handle}</Typography>
                    </Box>
                    <Chip label={m.role} size="small" sx={{ fontWeight: 700, fontSize: 10, height: 22, background: m.role === 'Owner' ? 'rgba(255,56,92,0.12)' : 'rgba(0,0,0,0.06)', color: m.role === 'Owner' ? primary : 'text.secondary', mr: currentUserIsOwner && m.role !== 'Owner' ? 1 : 0 }} />
                    {currentUserIsOwner && m.role !== 'Owner' && (
                      <IconButton size="small" onClick={() => handleRemoveMember(m.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                        <CloseIconSmall sx={{ fontSize: 15 }} />
                      </IconButton>
                    )}
                  </Box>
                ))}
                {members.length === 0 && <Typography sx={{ fontSize: 13, color: 'text.disabled', py: 1 }}>No members yet.</Typography>}
              </Box>
            </Box>
          </DialogContent>
        </>
      )}

      {/* ════════════════════════════════
          MAIN VIEW
      ════════════════════════════════ */}
      {view === 'main' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 'calc(92vh - 3px)' }}>

          {/*  Header  */}
          <Box sx={{ px: 3, pt: 2.5, pb: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
            <Box>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.4, borderRadius: '50px', background: 'rgba(255,56,92,0.08)', mb: 0.7 }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: primary, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: primary, fontFamily: "'Inter', sans-serif" }}>Trip Settings</Typography>
              </Box>
              <Typography sx={(t: any) => ({ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.75rem' }, color: t.palette.mode === 'dark' ? '#fff' : '#111', lineHeight: 1.1, letterSpacing: '-0.03em', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
                {title || 'Untitled Trip'}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small" sx={(t: any) => ({ color: '#999', bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#EFEFEF', borderRadius: '50%', width: 34, height: 34, mt: 0.5, '&:hover': { bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.14)' : '#E5E5E5', color: '#111' } })}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/*  Tab pills  */}
          <Box sx={{ px: 3, pt: 2, pb: 0, display: 'flex', gap: 0.75, flexShrink: 0, flexWrap: 'wrap' }}>
            {TABS.map(t => {
              const isActive = tab === t.id;
              const label = t.id === 'crew' ? `Crew (${members.length})` : t.label;
              return (
                <Box
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  sx={{
                    px: 1.8, py: 0.65, borderRadius: '50px', cursor: 'pointer',
                    fontSize: '0.78rem', fontWeight: isActive ? 700 : 500,
                    fontFamily: "'Inter', sans-serif",
                    background: isActive ? primary : 'rgba(0,0,0,0.05)',
                    color: isActive ? '#fff' : 'text.secondary',
                    transition: 'all 0.2s ease',
                    userSelect: 'none',
                    '&:hover': isActive ? {} : { background: 'rgba(0,0,0,0.09)', color: 'text.primary' },
                    boxShadow: isActive ? '0 4px 12px rgba(255,56,92,0.30)' : 'none',
                  }}
                >{label}</Box>
              );
            })}
          </Box>

          {/*  Divider  */}
          <Box sx={(t: any) => ({ height: '1px', background: t.palette.divider, mx: 3, mt: 1.5, flexShrink: 0 })} />

          {/*  Scrollable content  */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pt: 2.5, pb: 1, '::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>

            {/* ══ OVERVIEW ══ */}
            {tab === 'overview' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                {/* Banner */}
                <Box
                  onClick={handleBannerClick}
                  sx={{
                    position: 'relative', height: 130, borderRadius: '16px',
                    overflow: 'hidden', cursor: 'pointer',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.12)',
                    '&:hover .ban-ovr': { opacity: 1 },
                    '&:hover img': { transform: 'scale(1.04)' },
                  }}
                >
                  <Box component="img" src={imgSrc} alt="Banner"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', display: 'block' }}
                    onError={(e: any) => { e.currentTarget.src = coversTyped['default']; }}
                  />
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.52) 0%,transparent 58%)', pointerEvents: 'none' }} />
                  <Box className="ban-ovr" sx={{ position: 'absolute', inset: 0, opacity: 0, transition: 'opacity 0.2s', background: 'rgba(0,0,0,0.34)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 2.5, py: 1, borderRadius: 20, background: 'rgba(255,255,255,0.92)', color: '#111', fontSize: 12.5, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
                      📷&nbsp;Change cover
                    </Box>
                  </Box>
                </Box>

                {/* Trip name */}
                <FieldBlock
                  label="Trip name"
                  action={
                    <Tooltip title={copyMain ? 'Copied!' : 'Copy share link'} placement="top">
                      <Box onClick={() => copy(shareUrl)} sx={{ display: 'flex', alignItems: 'center', gap: 0.45, fontSize: 11, fontWeight: 700, color: copyMain ? 'success.main' : 'text.disabled', cursor: 'pointer', transition: 'color .2s', '&:hover': { color: copyMain ? 'success.main' : primary } }}>
                        {copyMain ? <CheckIcon sx={{ fontSize: 13 }} /> : <LinkIcon sx={{ fontSize: 13 }} />}
                        {copyMain ? 'Copied!' : 'Share link'}
                      </Box>
                    </Tooltip>
                  }
                >
                  <TextField
                    value={title} fullWidth size="small"
                    onChange={e => onChangeTitle?.(e.target.value)}
                    placeholder="Give your trip a name"
                    inputProps={{ maxLength: 80 }}
                    sx={fieldSx}
                  />
                </FieldBlock>

                {/* Description */}
                <FieldBlock
                  label="Description"
                  action={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      {tripId && (
                        <Tooltip title="Let Navia draft a description from your route, dates and vibe (1 trip credit)" placement="top">
                          <Box
                            onClick={handleWriteWithNavia}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 0.45,
                              fontSize: 11, fontWeight: 700,
                              color: briefLoading ? 'text.disabled' : primary,
                              cursor: briefLoading ? 'default' : 'pointer',
                              transition: 'opacity .2s',
                              '&:hover': { opacity: briefLoading ? 1 : 0.75 },
                            }}
                          >
                            {briefLoading
                              ? <CircularProgress size={11} sx={{ color: 'inherit' }} />
                              : <AutoAwesomeIcon sx={{ fontSize: 13 }} />}
                            {briefLoading ? 'Writing…' : 'Write with Navia'}
                          </Box>
                        </Tooltip>
                      )}
                      {description.length > 0 && <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{description.length}/300</Typography>}
                    </Box>
                  }
                >
                  <TextField
                    value={description} fullWidth multiline minRows={3} maxRows={5}
                    onChange={e => onChangeDescription?.(e.target.value)}
                    placeholder="Describe the mood, goal or story of this trip…"
                    inputProps={{ maxLength: 300 }}
                    sx={fieldSx}
                  />
                  {briefError && (
                    <Typography sx={{ fontSize: 11, color: 'error.main', mt: 0.5 }}>{briefError}</Typography>
                  )}
                </FieldBlock>
              </Box>
            )}

            {/* ══ DETAILS ══ */}
            {tab === 'details' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                {/* Countries */}
                <FieldBlock label="Countries">
                  <Box ref={countryAnchorRef} sx={{ position: 'relative' }}>
                    <Box
                      sx={(t: any) => ({
                        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                        gap: 0.5, px: 1.25, py: 0.75, borderRadius: 2,
                        border: `1.5px solid ${countryDropOpen ? primary : t.palette.divider}`,
                        background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff',
                        cursor: 'text', transition: 'border-color .2s, box-shadow .2s', minHeight: 44,
                        boxShadow: countryDropOpen ? '0 0 0 3px rgba(255,56,92,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
                      })}
                      onClick={() => setCountryDropOpen(true)}
                    >
                      {countries.map(c => {
                        const code = countryCodeFromName(c);
                        const png  = flagPngUrl(code, 16);
                        const emoji = flagEmojiFromName(c);
                        return (
                          <Box key={c} sx={{ display: 'flex', alignItems: 'center', gap: 0.4, pl: 0.75, pr: 0.5, py: 0.3, borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(255,56,92,0.08)', border: '1px solid rgba(255,56,92,0.2)', color: primary, flexShrink: 0 }}>
                            {png ? <Box component="img" src={png} alt="" sx={{ width: 16, height: 12, borderRadius: '2px', objectFit: 'cover' }} /> : <Box sx={{ fontSize: 14, lineHeight: 1 }}>{emoji || '🌍'}</Box>}
                            {c}
                            <Box component="span" onClick={(e: any) => { e.stopPropagation(); onRemoveCountry?.(c); }} sx={{ display: 'flex', alignItems: 'center', ml: 0.2, cursor: 'pointer', opacity: 0.5, '&:hover': { opacity: 1 }, fontSize: 15, lineHeight: 1 }}>×</Box>
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
                      <Box sx={(t: any) => ({ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 1400, borderRadius: 2.5, border: `1px solid ${t.palette.divider}`, background: t.palette.mode === 'dark' ? '#1e1e22' : '#fff', boxShadow: '0 16px 48px rgba(0,0,0,0.18)', maxHeight: 220, overflowY: 'auto' })} onMouseDown={e => e.preventDefault()}>
                        {filteredCountries.length === 0
                          ? <Box sx={{ px: 2, py: 1.5, fontSize: 13, color: 'text.disabled' }}>No matches</Box>
                          : filteredCountries.slice(0, 60).map(name => {
                            const code  = countryCodeFromName(name);
                            const png   = flagPngUrl(code, 20);
                            const emoji = flagEmojiFromName(name);
                            return (
                              <Box key={name} onClick={() => { onAddCountry?.(name); setCountrySearch(''); setCountryDropOpen(false); }} sx={(t: any) => ({ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.9, fontSize: 13, cursor: 'pointer', '&:hover': { background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,56,92,0.05)' } })}>
                                {png ? <Box component="img" src={png} alt="" sx={{ width: 20, height: 15, borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} /> : <Box sx={{ fontSize: 16, lineHeight: 1 }}>{emoji || '🌍'}</Box>}
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

                {/* Dates */}
                <FieldBlock label="Dates">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                      {(() => {
                        const sanitize = (d: string) => (d && d.length >= 10 ? d.slice(0, 10) : d);
                        const sd = dayjs(sanitize(startDate));
                        const ed = dayjs(sanitize(endDate));
                        return (
                          <>
                            <DatePicker label="Start" value={sd.isValid() ? sd : null}
                              onChange={v => onChangeStartDate?.(v ? v.format('YYYY-MM-DD') : '')}
                              slotProps={{ textField: { size: 'small', fullWidth: true, sx: { flex: 1, ...datePickerSx } } }}
                            />
                            <DatePicker label="End" value={ed.isValid() ? ed : null} minDate={sd.isValid() ? sd : undefined}
                              onChange={v => onChangeEndDate?.(v ? v.format('YYYY-MM-DD') : '')}
                              slotProps={{ textField: { size: 'small', fullWidth: true, sx: { flex: 1, ...datePickerSx } } }}
                            />
                          </>
                        );
                      })()}
                    </Box>
                  </LocalizationProvider>
                </FieldBlock>

                {/* Important Notes */}
                <FieldBlock label="Important Notes">
                  <ImportantNotesEditor value={importantNotes} onChange={onChangeImportantNotes} compact />
                </FieldBlock>
              </Box>
            )}

            {/* ══ VIBE ══ */}
            {tab === 'vibe' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontFamily: "'Inter', sans-serif", mb: 0.5 }}>Pick the vibe that best captures this trip ,or leave it open.</Typography>

                {/* Active vibe banner */}
                {vibe && activeVibeData && (
                  <Box sx={{ mb: 0.5, borderRadius: '14px', background: activeVibeData.activeBg, p: '12px 18px', display: 'flex', alignItems: 'center', gap: 1.5, boxShadow: `0 6px 20px ${activeVibeData.activeBorder}40` }}>
                    <Typography sx={{ fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 }}>{activeVibeData.emoji}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '0.95rem', color: '#fff', lineHeight: 1.2 }}>{activeVibeData.label}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.72)', fontFamily: "'Inter', sans-serif", mt: 0.2, fontStyle: 'italic' }}>{activeVibeData.tagline}</Typography>
                    </Box>
                    <Box onClick={() => onChangeVibe?.('')} sx={{ px: 1.2, py: 0.4, borderRadius: '20px', bgcolor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' } }}>
                      <Typography sx={{ fontSize: '0.52rem', fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em' }}>CLEAR</Typography>
                    </Box>
                  </Box>
                )}

                {/* Vibe grid ,2 columns, emoji card style matching TripCreationModal */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1 }}>
                  {VIBES.map(v => {
                    const selected = vibe === v.id;
                    return (
                      <Box
                        key={v.id}
                        onClick={() => onChangeVibe?.(selected ? '' : v.id)}
                        sx={{
                          borderRadius: '14px',
                          border: selected ? `2px solid ${v.activeBorder}` : '2px solid rgba(0,0,0,0.07)',
                          background: selected ? v.activeBg : v.bg,
                          p: '14px 12px 12px',
                          cursor: 'pointer', userSelect: 'none', textAlign: 'center',
                          transition: 'all 0.22s ease',
                          boxShadow: selected ? `0 6px 20px ${v.activeBorder}35` : '0 1px 4px rgba(0,0,0,0.05)',
                          transform: selected ? 'translateY(-2px)' : 'none',
                          '&:hover': !selected ? { border: `2px solid ${v.activeBorder}60`, background: v.bg, transform: 'translateY(-2px)', boxShadow: `0 6px 18px ${v.activeBorder}20` } : {},
                        }}
                      >
                        <Typography sx={{ fontSize: '1.7rem', lineHeight: 1, mb: 0.7 }}>{v.emoji}</Typography>
                        <Typography sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.69rem', color: selected ? '#fff' : '#333', lineHeight: 1.3 }}>{v.label}</Typography>
                        <Typography sx={{ fontSize: '0.58rem', color: selected ? 'rgba(255,255,255,0.72)' : '#AAAAAA', fontFamily: "'Inter', sans-serif", mt: 0.3, lineHeight: 1.3 }}>{v.desc}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* ══ CREW ══ */}
            {tab === 'crew' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <FieldBlock
                  label={`Members · ${orderedMembers.length}`}
                  action={canManageMembers ? (
                    <Box onClick={() => setView('invite')} sx={{ display: 'flex', alignItems: 'center', gap: 0.4, fontSize: 12, fontWeight: 700, color: primary, cursor: 'pointer', '&:hover': { opacity: 0.75 }, transition: 'opacity .15s' }}>
                      <PersonAddAltIcon sx={{ fontSize: 15 }} /> Add member
                    </Box>
                  ) : undefined}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {orderedMembers.map(m => {
                      const isOwner  = m.role === 'Owner';
                      const avatarSrc = m.avatar || (m as any).Avatar || (m as any).profileImage || undefined;
                      return (
                        <Box key={m.id} sx={(t: any) => ({
                          display: 'flex', alignItems: 'center', px: 1.5, py: 1.1, borderRadius: '12px',
                          background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : isOwner ? 'rgba(255,56,92,0.03)' : 'rgba(0,0,0,0.02)',
                          border: `1px solid ${isOwner ? 'rgba(255,56,92,0.18)' : t.palette.divider}`,
                        })}>
                          <Box sx={{ position: 'relative', mr: 1.5, flexShrink: 0 }}>
                            <Avatar
                              src={avatarSrc}
                              imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any}
                              sx={{ width: 38, height: 38, fontWeight: 700, fontSize: 13, bgcolor: isOwner ? primary : '#6b7280', border: isOwner ? `2.5px solid ${primary}` : '2.5px solid transparent', boxShadow: isOwner ? '0 0 0 2px rgba(255,56,92,0.25)' : 'none' }}
                            >{m.name?.[0]?.toUpperCase() ?? '?'}</Avatar>
                            {isOwner && (
                              <Box sx={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg,#FF385C,#E31C5F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>👑</Box>
                            )}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.2 }} noWrap>{m.name}</Typography>
                            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.2 }} noWrap>{m.handle}</Typography>
                          </Box>
                          <Chip label={m.role} size="small" sx={{ fontWeight: 700, fontSize: 10, height: 22, background: isOwner ? 'rgba(255,56,92,0.12)' : 'rgba(0,0,0,0.06)', color: isOwner ? primary : 'text.secondary', mr: canManageMembers && !isOwner ? 0.75 : 0 }} />
                          {canManageMembers && !isOwner && (
                            <IconButton size="small" onClick={() => handleRemoveMember(m.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                              <CloseIconSmall sx={{ fontSize: 15 }} />
                            </IconButton>
                          )}
                        </Box>
                      );
                    })}
                    {orderedMembers.length === 0 && (
                      <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontSize: 13, color: 'text.disabled', fontStyle: 'italic' }}>No collaborators yet.</Typography>
                        {canManageMembers && (
                          <Button size="small" variant="outlined" onClick={() => setView('invite')} startIcon={<PersonAddAltIcon />} sx={{ textTransform: 'none', borderRadius: 20, borderColor: 'rgba(255,56,92,0.3)', color: primary, fontWeight: 600, '&:hover': { borderColor: primary, background: 'rgba(255,56,92,0.05)' } }}>
                            Invite someone
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                </FieldBlock>
              </Box>
            )}

            <Box sx={{ height: 16 }} />
          </Box>

          {/*  Footer  */}
          <Box sx={(t: any) => ({ px: 3, py: 2, borderTop: `1px solid ${t.palette.divider}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: t.palette.mode === 'dark' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.015)' })}>
            {canManageMembers ? (
              <Box onClick={onDeleteTrip} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12.5, fontWeight: 600, color: 'text.disabled', cursor: 'pointer', px: 1.5, py: 0.7, borderRadius: 2, '&:hover': { color: 'error.main', background: 'rgba(220,38,38,0.07)' }, transition: 'all .15s' }}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} /> Delete trip
              </Box>
            ) : <Box />}
            <Button
              variant="contained"
              onClick={() => window.dispatchEvent(new CustomEvent('trip:settings:save'))}
              sx={{
                textTransform: 'none', fontWeight: 800, fontSize: 14,
                borderRadius: 20, px: 4, py: 1,
                background: 'linear-gradient(135deg,#FF385C,#E31C5F)',
                boxShadow: '0 6px 20px rgba(255,56,92,0.35)',
                letterSpacing: '.01em',
                '&:hover': { background: 'linear-gradient(135deg,#e02d50,#c91855)', boxShadow: '0 8px 28px rgba(255,56,92,0.45)', transform: 'translateY(-1px)' },
                transition: 'all .2s',
              }}
            >Save changes</Button>
          </Box>
        </Box>
      )}
    </Dialog>
  );
};

export default TripSettingsDialog;

/*  File-local helpers  */

const fieldSx = (t: any) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    fontSize: 14,
    fontWeight: 500,
    background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F7F7F8',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    transition: 'background 0.2s',
    '&:hover fieldset': { borderColor: '#FF385C' },
    '&.Mui-focused': { background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff' },
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

function FieldBlock({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.85 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.1px', color: 'text.disabled' }}>
          {label}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}