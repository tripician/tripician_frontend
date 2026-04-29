import React from 'react';
import { Dialog, DialogContent, Box, Typography, IconButton, TextField, Button, Chip, Avatar, Fade, InputBase } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIconSmall from '@mui/icons-material/Close';
import covers from '../../assets/covers.json';

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
  onChangeDescription?: (d:string)=>void;
  countries?: string[]; // list of selected countries
  onRemoveCountry?: (country:string)=>void; // removal callback
  onAddCountry?: (country:string)=>void; // add callback
  currentUserIsOwner?: boolean; // allow member removal in invite view
}

// Align with planner's internal privacy state values for correct highlighting
const PRIVACY_OPTIONS = ['Private','Trip Members'];

import { flagEmojiFromName, flagPngUrl, countryCodeFromName, COUNTRY_NAMES } from '../../utils/countryFlags';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';

const TripSettingsDialog: React.FC<TripSettingsDialogProps> = ({ open, onClose, title, tripId, startDate, endDate, privacy, members = [], bannerUrl, onChangeBanner, onChangeTitle, onChangeStartDate, onChangeEndDate, onChangePrivacy, onDeleteTrip, onInviteEmail, countries = [], onRemoveCountry, onAddCountry, currentUserIsOwner, description = '', onChangeDescription }) => {
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
  const [foundUser, setFoundUser] = React.useState<{id:number; fname:string; lname:string; email:string; country?:string} | null>(null);
  const [pendingUsers, setPendingUsers] = React.useState<Array<{id:number; fname:string; lname:string; email:string; country?:string}>>([]);
  const [addingMembers, setAddingMembers] = React.useState(false);
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
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth TransitionComponent={Fade} keepMounted
      PaperProps={{ sx:(t:any)=>({
        borderRadius:4,
        overflow:'hidden',
        background: t.palette.mode==='dark'?'#141414':'#fff',
        boxShadow:'0 32px 96px rgba(0,0,0,0.22)',
        maxHeight: '92vh',
        '::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }) }}
    >
      {/* Header */}
      {view==='invite' && (
        <Box sx={(t:any)=>({ display:'flex', alignItems:'center', gap:1, px:3, pt:2, pb:1.5, borderBottom:`1px solid ${t.palette.divider}` })}>
          <IconButton size='small' onClick={()=> setView('main')} aria-label='Back to settings' sx={{ mr:.5 }}><ArrowBackIcon fontSize='small' /></IconButton>
          <Typography sx={{ fontFamily:"'Inter', system-ui, sans-serif", fontWeight:700, fontSize:17, letterSpacing:'-0.3px' }}>
            Invite <Box component='span' sx={{ fontWeight:800 }}>members</Box>
          </Typography>
          <Box sx={{ flex:1 }} />
          <IconButton onClick={onClose} size='small' aria-label='Close' sx={{ color:'text.disabled', '&:hover':{ color:'text.primary' } }}><CloseIcon sx={{ fontSize:18 }} /></IconButton>
        </Box>
      )}
      <DialogContent sx={{ p:0, display:'flex', flexDirection:'column', overflow:'visible', maxHeight:'none' }}>
        {view==='invite' && (
          <Box sx={{ display:'flex', flexDirection:'column', gap:3 }}>
            <Box sx={{ display:'flex', flexDirection:'column', gap:1.5 }}>
              <Box sx={(t)=>({ display:'flex', alignItems:'center', border:`1px solid ${t.palette.divider}`, borderRadius:2, overflow:'hidden' })}>
                <InputBase 
                  placeholder="Enter user's email to search.." 
                  value={inviteEmail} 
                  onChange={e=> { setInviteEmail(e.target.value); setSearchError(''); setFoundUser(null); }} 
                  onKeyPress={e=> e.key==='Enter' && handleSearchUser()}
                  sx={{ flex:1, px:1.5, py:1 }} 
                />
                <Button disabled={!inviteEmail || inviting} onClick={handleSearchUser} variant='contained' sx={{ m:0.5, px:2.5, textTransform:'none', borderRadius:3, position:'relative' }}>
                  {inviting? 'Searching...':'Search'}
                  {inviting && (
                    <Box sx={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, border:'2px solid rgba(255,255,255,0.6)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .8s linear infinite', '@keyframes spin':{ to:{ transform:'translateY(-50%) rotate(360deg)' } } }} />
                  )}
                </Button>
              </Box>
              {searchError && (
                <Typography variant='caption' color='error' sx={{ px:0.5 }}>{searchError}</Typography>
              )}
              {foundUser && (
                <Box sx={(t)=>({ p:1.25, borderRadius:2, border:`1px solid ${t.palette.divider}`, background: t.palette.mode==='dark'? t.palette.grey[900]: t.palette.grey[50], display:'flex', alignItems:'center', gap:1.5 })}>
                  <Avatar sx={{ width:40, height:40, bgcolor:'primary.main' }}>
                    {foundUser.fname?.[0]}{foundUser.lname?.[0]}
                  </Avatar>
                  <Box sx={{ flex:1, minWidth:0 }}>
                    <Typography variant='body2' fontWeight={600} noWrap>{foundUser.fname} {foundUser.lname}</Typography>
                    <Typography variant='caption' color='text.secondary' noWrap>{foundUser.email}</Typography>
                  </Box>
                  <IconButton size='small' onClick={handleAddToPending} color='primary' sx={{ bgcolor:'primary.main', color:'#fff', '&:hover':{ bgcolor:'primary.dark' } }}>
                    <Box component='span' sx={{ fontSize:20, fontWeight:600 }}>+</Box>
                  </IconButton>
                </Box>
              )}
              {/* Pending users list */}
              {pendingUsers.length > 0 && (
                <Box sx={{ display:'flex', flexDirection:'column', gap:1, mt:1 }}>
                  <Typography variant='subtitle2' fontWeight={700} color='primary'>Pending members ({pendingUsers.length})</Typography>
                  {pendingUsers.map(u=> (
                    <Box key={u.id} sx={(t)=>({ p:1.25, borderRadius:2, border:`1px solid ${t.palette.primary.light}`, background: t.palette.mode==='dark'? t.palette.grey[900]: t.palette.grey[50], display:'flex', alignItems:'center', gap:1.5 })}>
                      <Avatar sx={{ width:36, height:36, bgcolor:'primary.light' }}>
                        {u.fname?.[0]}{u.lname?.[0]}
                      </Avatar>
                      <Box sx={{ flex:1, minWidth:0 }}>
                        <Typography variant='body2' fontWeight={600} noWrap>{u.fname} {u.lname}</Typography>
                        <Typography variant='caption' color='text.secondary' noWrap>{u.email}</Typography>
                      </Box>
                      <IconButton size='small' onClick={()=> handleRemovePending(u.id)}>
                        <CloseIconSmall fontSize='small' />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
            {/* Action buttons */}
            <Box sx={{ display:'flex', gap:2, justifyContent:'flex-end', mt:2 }}>
              <Button variant='outlined' onClick={handleDiscard} disabled={addingMembers} sx={{ textTransform:'none', borderRadius:2, minWidth:100 }}>
                Discard
              </Button>
              <Button variant='contained' onClick={handleDone} disabled={addingMembers} sx={{ textTransform:'none', borderRadius:2, minWidth:100 }}>
                {addingMembers? 'Adding...':'Done'}
              </Button>
            </Box>
            <Typography variant='subtitle2' fontWeight={700} gutterBottom>Current members</Typography>
            <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
              {members.map(m=> (
                <Box key={m.id} sx={(t)=>({ display:'flex', alignItems:'center', p:1.1, borderRadius:2, background: t.palette.mode==='dark'? t.palette.grey[900]: t.palette.grey[50], border:`1px solid ${t.palette.divider}` })}>
                  <Avatar src={m.avatar} sx={{ width:40, height:40, mr:1 }} />
                  <Box sx={{ flex:1, minWidth:0 }}>
                    <Typography variant='body2' fontWeight={600} noWrap>{m.name}</Typography>
                    <Typography variant='caption' color='text.secondary' noWrap>{m.handle}</Typography>
                  </Box>
                  <Chip label={m.role} size='small' color={m.role==='Owner' ? 'primary':'default'} sx={{ fontWeight:600, mr: currentUserIsOwner && m.role!=='Owner'? 1:0 }} />
                  {currentUserIsOwner && m.role!=='Owner' && (
                    <IconButton size='small' aria-label='Remove member' onClick={()=> handleRemoveMember(m.id)}>
                      <CloseIconSmall fontSize='small' />
                    </IconButton>
                  )}
                </Box>
              ))}
              {members.length===0 && (
                <Typography variant='body2' color='text.secondary'>No members yet.</Typography>
              )}
            </Box>
          </Box>
        )}
        {view==='main' && (
        <>
        {/* ─── Hero Banner ─── */}
        <Box sx={{ position:'relative', width:'100%', height:160, overflow:'hidden', cursor:'pointer', flexShrink:0,
          '&:hover .banner-hover':{ opacity:1 }
        }} onClick={()=>{
          const input=document.createElement('input'); input.type='file'; input.accept='image/*';
          input.onchange=async()=>{ const f=input.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const url=typeof r.result==='string'?r.result:''; onChangeBanner?.({url,file:f}); }; r.readAsDataURL(f); };
          input.click();
        }}>
          <Box component='img'
            src={bannerUrl || covers[(countries?.length && covers.hasOwnProperty(countries[0].toLowerCase()) ? (countries[0].toLowerCase() as keyof typeof covers) : 'default') as keyof typeof covers]}
            alt='Trip banner' sx={{ width:'100%', height:'100%', objectFit:'cover' }}
            onError={(e:any)=>{ e.currentTarget.style.opacity='0.3'; }}
          />
          <Box sx={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 40%, transparent 100%)', pointerEvents:'none' }} />
          {/* Removed close button from banner */}
          {/* Hover overlay */}
          <Box className='banner-hover' sx={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center',
            opacity:0, transition:'opacity .2s ease', backdropFilter:'blur(2px)' }}>
            <Box sx={{ display:'flex', alignItems:'center', gap:.75, px:2, py:.75, borderRadius:20, background:'rgba(255,255,255,0.92)', color:'#222' }}>
              <Box sx={{ fontSize:14 }}>📷</Box>
              <Typography sx={{ fontSize:12, fontWeight:700 }}>Change cover</Typography>
            </Box>
          </Box>
          {/* Title overlay on banner */}
          <Box sx={{ position:'absolute', bottom:14, left:20, right:20 }}>
            <Typography sx={{ fontFamily:"'Playfair Display', Georgia, serif", fontWeight:700, fontSize:22, color:'#fff', textShadow:'0 2px 12px rgba(0,0,0,0.5)', letterSpacing:'-0.5px' }}>
              {title || 'Untitled Trip'}
            </Typography>
          </Box>
        </Box>

        {/* ─── Form Body ─── */}
        <Box sx={{ px:3, py:2.5, display:'flex', flexDirection:'column', gap:2.5 }}>

          {/* Trip Name */}
          <Box>
            <Typography sx={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'text.disabled', mb:.75 }}>Trip name</Typography>
            <TextField
              value={title}
              fullWidth
              onChange={e=> onChangeTitle?.(e.target.value)}
              size='small'
              placeholder='Give your trip a name'
              inputProps={{ maxLength:80 }}
              sx={(t:any)=>({ '& .MuiOutlinedInput-root':{ borderRadius:2, fontWeight:600, fontSize:15, background: t.palette.mode==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.02)',
                '&:hover fieldset':{ borderColor:'#FF385C' }, '&.Mui-focused fieldset':{ borderColor:'#FF385C' } } })}
            />
          </Box>

          {/* Countries */}
          <Box>
            <Typography sx={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'text.disabled', mb:.75 }}>Countries</Typography>
            <Box ref={countryAnchorRef} sx={{ position:'relative' }}>
              <Box
                sx={(t:any)=>({ display:'flex', flexWrap:'wrap', alignItems:'center', gap:.5, px:1.25, py:.75, borderRadius:2,
                  border:`1.5px solid ${countryDropOpen?'#FF385C':t.palette.divider}`,
                  background: t.palette.mode==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.02)',
                  cursor:'text', transition:'border-color .2s', minHeight:42 })}
                onClick={()=>setCountryDropOpen(true)}
              >
                {countries.map(c=>{
                  const code = countryCodeFromName(c);
                  const png = flagPngUrl(code, 16);
                  const emoji = flagEmojiFromName(c);
                  return (
                    <Box key={c} sx={(t:any)=>({ display:'flex', alignItems:'center', gap:.4, pl:.75, pr:.5, py:.3,
                      borderRadius:20, fontSize:12, fontWeight:600,
                      background: t.palette.mode==='dark'?'rgba(255,56,92,0.15)':'rgba(255,56,92,0.08)',
                      border:'1px solid rgba(255,56,92,0.2)', color:'#FF385C', flexShrink:0 })}>
                      {png
                        ? <Box component='img' src={png} alt='' sx={{ width:16, height:12, borderRadius:'2px', objectFit:'cover' }} />
                        : <Box sx={{ fontSize:14, lineHeight:1 }}>{emoji||'🌍'}</Box>}
                      {c}
                      <Box component='span' onClick={(e:any)=>{ e.stopPropagation(); onRemoveCountry?.(c); }}
                        sx={{ display:'flex', alignItems:'center', ml:.2, cursor:'pointer', opacity:.5, '&:hover':{ opacity:1 }, fontSize:15, lineHeight:1 }}>×</Box>
                    </Box>
                  );
                })}
                <InputBase
                  placeholder={countries.length===0 ? 'Search and add countries…' : ''}
                  value={countrySearch}
                  onChange={e=>{ setCountrySearch(e.target.value); setCountryDropOpen(true); }}
                  onFocus={()=>setCountryDropOpen(true)}
                  sx={{ minWidth:80, flex:1, fontSize:13, '& input':{ p:0 } }}
                />
              </Box>
              {countryDropOpen && (
                <Box
                  sx={(t:any)=>({ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:1400,
                    borderRadius:2.5, border:`1px solid ${t.palette.divider}`,
                    background: t.palette.mode==='dark'?'#1e1e1e':'#fff',
                    boxShadow:'0 12px 40px rgba(0,0,0,0.15)',
                    maxHeight:200, overflowY:'auto' })}
                  onMouseDown={e=>e.preventDefault()}
                >
                  {filteredCountries.length===0
                    ? <Box sx={{ px:2, py:1.5, fontSize:13, color:'text.disabled' }}>No matches</Box>
                    : filteredCountries.slice(0,60).map(name=>{
                        const code = countryCodeFromName(name);
                        const png = flagPngUrl(code, 20);
                        const emoji = flagEmojiFromName(name);
                        return (
                          <Box key={name} onClick={()=>{ onAddCountry?.(name); setCountrySearch(''); setCountryDropOpen(false); }}
                            sx={(t:any)=>({ display:'flex', alignItems:'center', gap:1, px:1.5, py:.85, fontSize:13, cursor:'pointer',
                              '&:hover':{ background: t.palette.mode==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)' } })}>
                            {png
                              ? <Box component='img' src={png} alt='' sx={{ width:20, height:15, borderRadius:'2px', objectFit:'cover', flexShrink:0 }} />
                              : <Box sx={{ fontSize:16, lineHeight:1 }}>{emoji||'🌍'}</Box>}
                            {name}
                          </Box>
                        );
                      })
                  }
                </Box>
              )}
              {countryDropOpen && <Box sx={{ position:'fixed', inset:0, zIndex:1399 }} onClick={()=>{ setCountryDropOpen(false); setCountrySearch(''); }} />}
            </Box>
          </Box>

          {/* Dates Row */}
          <Box>
            <Typography sx={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'text.disabled', mb:.75 }}>Dates</Typography>
            <Box sx={{ display:'flex', gap:1.5 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                {(() => { const sanitize = (d:string) => (d && d.length >= 10 ? d.slice(0,10) : d); const sd = dayjs(sanitize(startDate)); const ed = dayjs(sanitize(endDate)); return (
                  <>
                    <DatePicker
                      label="Start"
                      value={sd.isValid()? sd : null}
                      onChange={(v)=> { const iso = v? v.format('YYYY-MM-DD') : ''; onChangeStartDate?.(iso); }}
                      slotProps={{ textField: { size:'small', sx:{ flex:1, '& .MuiOutlinedInput-root':{ borderRadius:2, fontSize:13, '&:hover fieldset':{ borderColor:'#FF385C' }, '&.Mui-focused fieldset':{ borderColor:'#FF385C' } } } } }}
                    />
                    <DatePicker
                      label="End"
                      value={ed.isValid()? ed : null}
                      minDate={sd.isValid()? sd : undefined}
                      onChange={(v)=> { const iso = v? v.format('YYYY-MM-DD') : ''; onChangeEndDate?.(iso); }}
                      slotProps={{ textField: { size:'small', sx:{ flex:1, '& .MuiOutlinedInput-root':{ borderRadius:2, fontSize:13, '&:hover fieldset':{ borderColor:'#FF385C' }, '&.Mui-focused fieldset':{ borderColor:'#FF385C' } } } } }}
                    />
                  </>
                ); })()}
              </LocalizationProvider>
            </Box>
          </Box>

          {/* Description */}
          <Box>
            <Typography sx={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'text.disabled', mb:.75 }}>Description</Typography>
            <TextField
              value={description}
              fullWidth
              multiline
              minRows={2}
              maxRows={3}
              onChange={e=> onChangeDescription?.(e.target.value)}
              placeholder='Describe your trip…'
              inputProps={{ maxLength:300 }}
              sx={(t:any)=>({ '& .MuiOutlinedInput-root':{ borderRadius:2, fontSize:13, lineHeight:1.6, background: t.palette.mode==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.02)',
                '&:hover fieldset':{ borderColor:'#FF385C' }, '&.Mui-focused fieldset':{ borderColor:'#FF385C' } } })}
            />
          </Box>

          {/* ─── Divider ─── */}
          <Box sx={(t:any)=>({ height:'1px', background:t.palette.divider, mx:-0.5 })} />

          {/* Sharing & Privacy */}
          <Box>
            <Typography sx={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'text.disabled', mb:1 }}>Sharing & Privacy</Typography>
            {/* Share link */}
            <Box sx={(t:any)=>({ display:'flex', alignItems:'center', gap:.75, px:1.5, py:1, borderRadius:2, border:`1px solid ${t.palette.divider}`,
              background: t.palette.mode==='dark'?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.015)', mb:1.25 })}>
              <LinkIcon sx={{ fontSize:17, color:'text.disabled', flexShrink:0 }} />
              <Typography sx={{ flex:1, fontSize:12, fontFamily:"'JetBrains Mono', 'Fira Code', monospace", color:'text.secondary', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shareUrl}</Typography>
              <IconButton size='small' onClick={()=> copy(shareUrl)}
                sx={{ color: copyMain?'success.main':'text.disabled', '&:hover':{ color: copyMain?'success.main':'#FF385C' }, transition:'color .2s' }}>
                <ContentCopyIcon sx={{ fontSize:15 }} />
              </IconButton>
              <Box onClick={()=>setView('invite')}
                sx={{ display:'flex', alignItems:'center', gap:.4, fontSize:11, fontWeight:700, color:'#FF385C', cursor:'pointer',
                  px:1.25, py:.45, borderRadius:16, border:'1px solid rgba(255,56,92,0.25)', flexShrink:0,
                  '&:hover':{ background:'rgba(255,56,92,0.06)' }, transition:'background .15s' }}>
                <EmailIcon sx={{ fontSize:13 }}/> Invite
              </Box>
            </Box>
            {/* Privacy toggle */}
            <Box sx={{ display:'flex', gap:.75 }}>
              {PRIVACY_OPTIONS.map(p=> {
                const selected = privacy === p;
                return (
                  <Box key={p} onClick={()=> onChangePrivacy?.(p)} sx={{
                    px:2, py:.65, borderRadius:20, fontSize:12.5, fontWeight:600, cursor:'pointer', userSelect:'none', transition:'all .2s',
                    background: selected ? 'linear-gradient(135deg,#FF385C,#E31C5F)' : 'transparent',
                    color: selected ? '#fff' : 'text.secondary',
                    border: selected ? '1.5px solid transparent' : (t:any)=> `1.5px solid ${t.palette.divider}`,
                    boxShadow: selected ? '0 2px 12px rgba(255,56,92,0.25)' : 'none',
                    '&:hover': selected ? {} : { borderColor:'#FF385C', color:'#FF385C' },
                  }}>{p}</Box>
                );
              })}
            </Box>
          </Box>

          {/* ─── Divider ─── */}
          <Box sx={(t:any)=>({ height:'1px', background:t.palette.divider, mx:-0.5 })} />

          {/* Members */}
          <Box>
            <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1 }}>
              <Typography sx={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'text.disabled' }}>
                Members ({orderedMembers.length})
              </Typography>
              {canManageMembers && (
                <Box onClick={()=>setView('invite')} sx={{ display:'flex', alignItems:'center', gap:.4, fontSize:12, fontWeight:600, color:'#FF385C', cursor:'pointer', '&:hover':{ opacity:.75 }, transition:'opacity .15s' }}>
                  <EmailIcon sx={{ fontSize:14 }}/> Add member
                </Box>
              )}
            </Box>
            <Box sx={{ display:'flex', gap:1.5, alignItems:'center', minHeight:48 }}>
              {orderedMembers.map(m => {
                const isOwner = m.role === 'Owner';
                return (
                  <Box key={m.id} sx={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
                    <Box
                      sx={{ cursor:'pointer', borderRadius:'50%', boxShadow:'0 2px 8px rgba(0,0,0,0.10)', transition:'box-shadow .18s', '&:hover':{ boxShadow:'0 4px 16px rgba(255,56,92,0.18)' } }}
                    >
                      <Avatar src={m.avatar} sx={{ width:38, height:38, fontSize:15, fontWeight:700, bgcolor: isOwner?'#FF385C':'#6b7280', border: isOwner?'2.5px solid #FF385C':'2px solid #fff' }}>
                        {!m.avatar && m.name?.[0]}
                      </Avatar>
                    </Box>
                    {/* Name tooltip on hover */}
                    <Box
                      sx={{
                        pointerEvents:'none',
                        opacity:0,
                        position:'absolute',
                        left:'50%',
                        bottom:-2,
                        transform:'translateX(-50%) translateY(100%)',
                        minWidth:90,
                        bgcolor:'#222',
                        color:'#fff',
                        px:1.5,
                        py:.5,
                        borderRadius:1.5,
                        fontSize:13,
                        fontWeight:600,
                        whiteSpace:'nowrap',
                        zIndex:10,
                        boxShadow:'0 4px 16px rgba(0,0,0,0.18)',
                        transition:'opacity .18s',
                      }}
                      className="member-name-tooltip"
                    >
                      {isOwner && <Box component='span' sx={{ fontSize:14, mr:.5 }}>👑</Box>}{m.name}
                    </Box>
                    <style>{`
                      .member-name-tooltip {
                        pointer-events: none;
                      }
                      [data-member-avatar]:hover + .member-name-tooltip,
                      .member-name-tooltip:hover {
                        opacity: 1 !important;
                        pointer-events: auto;
                      }
                    `}</style>
                  </Box>
                );
              })}
              {orderedMembers.length === 0 && (
                <Typography sx={{ fontSize:13, color:'text.disabled', py:1 }}>No members yet. Invite someone to collaborate!</Typography>
              )}
            </Box>
          </Box>

          {/* ─── Actions ─── */}
          <Box sx={(t:any)=>({ display:'flex', justifyContent:'space-between', alignItems:'center', pt:1.5, mt:.5, borderTop:`1px solid ${t.palette.divider}` })}>            {canManageMembers
              ? <Box onClick={onDeleteTrip} sx={{ display:'flex', alignItems:'center', gap:.5, fontSize:12, fontWeight:600, color:'text.disabled', cursor:'pointer',
                  px:1.5, py:.6, borderRadius:8, '&:hover':{ color:'error.main', background:'rgba(220,38,38,0.06)' }, transition:'all .15s' }}>
                  <DeleteOutlineIcon sx={{ fontSize:16 }}/> Delete trip
                </Box>
              : <Box />}
            <Button variant='contained' onClick={()=>{ window.dispatchEvent(new CustomEvent('trip:settings:save')); }}
              sx={{ textTransform:'none', fontWeight:700, fontSize:13, borderRadius:20, px:3.5, py:.75,
                background:'linear-gradient(135deg,#FF385C,#E31C5F)', boxShadow:'0 4px 14px rgba(255,56,92,0.3)',
                '&:hover':{ background:'linear-gradient(135deg,#e02d50,#c91855)', boxShadow:'0 6px 20px rgba(255,56,92,0.4)' },
                transition:'all .2s',
                mb: 3
              }}
            >Save settings</Button>
          </Box>
        </Box>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TripSettingsDialog;
