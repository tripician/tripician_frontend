import React from 'react';
import { Dialog, DialogContent, DialogTitle, Box, Typography, IconButton, TextField, Button, Chip, Avatar, Fade, InputBase } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIconSmall from '@mui/icons-material/Close';

interface Member { id: string; name: string; handle: string; avatar?: string; role: 'Owner' | 'Editor' | 'Viewer'; }

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
  countries?: string[]; // list of selected countries
  onRemoveCountry?: (country:string)=>void; // removal callback
}

// Align with planner's internal privacy state values for correct highlighting
const PRIVACY_OPTIONS = ['Private','Trip Members','My Followers','Everyone'];

import { flagEmojiFromName, flagPngUrl, countryCodeFromName } from '../../utils/countryFlags';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';

interface CountryRowProps { name: string; onRemove?: (name:string)=>void; }
const CountryRow: React.FC<CountryRowProps> = ({ name, onRemove }) => {
  const code = countryCodeFromName(name);
  const png = flagPngUrl(code, 24);
  const emoji = flagEmojiFromName(name);
  return (
    <Box sx={(t)=>({ display:'flex', alignItems:'center', gap:1, px:1.25, py:.6, borderRadius:2, background: t.palette.mode==='dark'? t.palette.grey[900]: t.palette.grey[50], border:`1px solid ${t.palette.divider}` })}>
      {png ? (
        <Box component='img' src={png} alt={name+ ' flag'} sx={{ width:24, height:18, borderRadius:'3px', objectFit:'cover', flexShrink:0 }} />
      ) : (
        <Box sx={{ fontSize:18, lineHeight:1 }}>{emoji || '🌍'}</Box>
      )}
      <Typography variant='body2' fontWeight={600} sx={{ flex:1 }}>{name}</Typography>
      <IconButton size='small' onClick={()=> onRemove?.(name)} aria-label={'Remove ' + name}>
        <CloseIconSmall fontSize='small' />
      </IconButton>
    </Box>
  );
};

const TripSettingsDialog: React.FC<TripSettingsDialogProps> = ({ open, onClose, title, tripId, startDate, endDate, privacy, members = [], bannerUrl, onChangeBanner, onChangeTitle, onChangeStartDate, onChangeEndDate, onChangePrivacy, onDeleteTrip, onInviteEmail, countries = [], onRemoveCountry }) => {
  const [copyMain, setCopyMain] = React.useState(false);
  // Derive username from first owner/editor member handle (strip leading @) or 'user'
  // Share URL now based solely on tripId; member handle retrieval removed.
  const baseDomain = import.meta.env.MODE === 'production' ? 'https://www.tripician.com' : 'http://localhost:5173';
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth TransitionComponent={Fade} keepMounted>
      <DialogTitle sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', pr:1.5 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
          {view==='invite' && (
            <IconButton size='small' onClick={()=> setView('main')} aria-label='Back to settings'><ArrowBackIcon fontSize='small' /></IconButton>
          )}
          <Typography fontWeight={700} fontSize={20}>{view==='main'? 'Trip settings':'Invite members'}</Typography>
        </Box>
        <IconButton onClick={onClose} size='small' aria-label='Close settings dialog'><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p:3, display:'flex', flexDirection:'column', gap:3 }}>
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
                  <Chip label={m.role} size='small' color={m.role==='Owner' ? 'primary':'default'} sx={{ fontWeight:600 }} />
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
        {/* Banner & Countries side-by-side */}
        <Box sx={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {/* Vertical Banner */}
          <Box sx={{ flex:'0 0 220px', display:'flex', flexDirection:'column', gap:1 }}>
            <Typography variant='subtitle2' fontWeight={700}>Banner image</Typography>
            <Box sx={(t)=>({ position:'relative', width:'100%', height:300, borderRadius:3, overflow:'hidden', border:`1px solid ${t.palette.divider}`, background:t.palette.mode==='dark'? t.palette.grey[900]:'#f5f7fa', display:'flex', alignItems:'center', justifyContent:'center' })}>
              {bannerUrl ? (
                <Box component='img' src={bannerUrl} alt='Trip banner' sx={{ width:'100%', height:'100%', objectFit:'cover' }} onError={(e:any)=> { e.currentTarget.style.opacity='0.35'; }} />
              ) : (
                <Typography variant='caption' color='text.secondary'>No image</Typography>
              )}
              <Box sx={{ position:'absolute', top:8, right:8, display:'flex', flexDirection:'column', gap:.75 }}>
                <Button size='small' variant='contained' color='primary' onClick={()=> {
                  const input = document.createElement('input');
                  input.type='file';
                  input.accept='image/*';
                  input.onchange = async ()=> {
                    const f = input.files?.[0];
                    if(!f) return;
                    const reader = new FileReader();
                    reader.onload = ()=> { const url = typeof reader.result==='string'? reader.result: ''; onChangeBanner?.({ url, file: f }); };
                    reader.readAsDataURL(f);
                  };
                  input.click();
                }} sx={{ textTransform:'none', borderRadius:2 }}>Change</Button>
                {bannerUrl && (
                  <Button size='small' variant='outlined' color='error' onClick={()=> onChangeBanner?.({ url:'', file: undefined })} sx={{ textTransform:'none', borderRadius:2 }}>Remove</Button>
                )}
              </Box>
            </Box>
          </Box>
          {/* Countries Vertical List */}
          <Box sx={{ flex:1, minWidth:240, display:'flex', flexDirection:'column', gap:1 }}>
            <Typography variant='subtitle2' fontWeight={700}>Trip countries</Typography>
            <Box sx={{ display:'flex', flexDirection:'column', gap:.75 }}>
              {countries.length===0 && (
                <Typography variant='caption' color='text.secondary'>No countries selected.</Typography>
              )}
              {countries.map(c=> (
                <CountryRow key={c} name={c} onRemove={onRemoveCountry} />
              ))}
            </Box>
            <Typography variant='caption' color='text.secondary'>Removing a country saves immediately.</Typography>
          </Box>
        </Box>
        {/* Title & Dates */}
        <Box>
          <TextField
            label='Trip name'
            value={title}
            fullWidth
            onChange={e=> onChangeTitle?.(e.target.value)}
            size='small'
            inputProps={{ maxLength:80 }}
            sx={{ '& .MuiInputBase-root':{ fontWeight:600 } }}
          />
          <Box sx={{ mt:2, display:'flex', gap:2, flexWrap:'wrap' }}>
            {/* Sanitize incoming date strings that may include time component (e.g. 2025-10-26T00:00:00) for HTML date input */}
            {(() => { const sanitize = (d:string) => (d && d.length >= 10 ? d.slice(0,10) : d); return (
              <>
                <TextField label='Start date' type='date' value={sanitize(startDate)} onChange={e=> onChangeStartDate?.(e.target.value)} InputLabelProps={{ shrink:true }} size='small' sx={{ flex:1, minWidth:160, '& .MuiInputBase-input':{ cursor:'default' } }} InputProps={{ readOnly:true }} />
                <TextField label='End date' type='date' value={sanitize(endDate)} onChange={e=> onChangeEndDate?.(e.target.value)} InputLabelProps={{ shrink:true }} size='small' sx={{ flex:1, minWidth:160, '& .MuiInputBase-input':{ cursor:'default' } }} InputProps={{ readOnly:true }} />
              </>
            ); })()}
          </Box>
        </Box>

        {/* Share link */}
        <Box>
          <Typography variant='subtitle2' fontWeight={700} gutterBottom>Share your trip</Typography>
          <Box sx={(t)=>({ display:'flex', alignItems:'center', background: t.palette.mode==='dark'? t.palette.grey[900]: t.palette.grey[100], border:`1px solid ${t.palette.divider}`, p:1, borderRadius:2, gap:1, flexWrap:'wrap' })}>
            <LinkIcon fontSize='small' color='primary' />
            <Typography variant='body2' sx={{ flex:1, fontFamily:'monospace', minWidth:180 }} noWrap>{shareUrl}</Typography>
            <Button size='small' variant='contained' color={copyMain? 'success':'primary'} startIcon={<ContentCopyIcon fontSize='small' />} onClick={()=> copy(shareUrl)} sx={{ textTransform:'none', borderRadius:2 }}>{copyMain? 'Copied':'Copy link'}</Button>
            <Button size='small' variant='outlined' startIcon={<EmailIcon fontSize='small' />} onClick={()=> setView('invite')} sx={{ textTransform:'none', borderRadius:2 }}>Invite by email</Button>
          </Box>
        </Box>

        {/* Privacy */}
        <Box>
          <Typography variant='subtitle2' fontWeight={700} gutterBottom>Who can view your trip?</Typography>
          <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
            {PRIVACY_OPTIONS.map(p=> {
              const selected = privacy === p;
              return (
                <Chip
                  key={p}
                  label={p}
                  onClick={()=> onChangePrivacy?.(p)}
                  color={selected? 'primary': 'default'}
                  variant={selected? 'filled':'outlined'}
                  sx={{ fontWeight:500 }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Invite section removed as per updated design instructions */}

        {/* Members */}
        <Box>
          <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1 }}>
            <Typography variant='subtitle2' fontWeight={700}>Trip members</Typography>
            <Button 
              size='small' 
              variant='outlined' 
              startIcon={<EmailIcon fontSize='small' />} 
              onClick={()=> setView('invite')} 
              sx={{ textTransform:'none', borderRadius:2 }}
            >
              Add member
            </Button>
          </Box>
          <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
            {members.map(m=> (
              <Box key={m.id} sx={(t)=>({ display:'flex', alignItems:'center', p:1, borderRadius:2, background: t.palette.mode==='dark'? t.palette.grey[900]: t.palette.grey[50], border:`1px solid ${t.palette.divider}` })}>
                <Avatar src={m.avatar} sx={{ width:40, height:40, mr:1 }} />
                <Box sx={{ flex:1, minWidth:0 }}>
                  <Typography variant='body2' fontWeight={600} noWrap>{m.name}</Typography>
                  <Typography variant='caption' color='text.secondary' noWrap>{m.handle}</Typography>
                </Box>
                <Chip label={m.role} size='small' color={m.role==='Owner' ? 'primary':'default'} sx={{ fontWeight:600 }} />
              </Box>
            ))}
            {members.length===0 && (
              <Typography variant='body2' color='text.secondary'>No members yet.</Typography>
            )}
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display:'flex', justifyContent:'center', gap:2, mt:1 }}>
          <Button variant='contained' color='primary' onClick={()=> {
            // parent handles via settings save (prop added later)
            const event = new CustomEvent('trip:settings:save');
            window.dispatchEvent(event);
          }} sx={{ textTransform:'none', borderRadius:3, minWidth:120 }}>Save settings</Button>
          <Button variant='outlined' color='error' startIcon={<DeleteOutlineIcon />} onClick={onDeleteTrip} sx={{ textTransform:'none', borderRadius:3, minWidth:120 }}>Delete trip</Button>
        </Box>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TripSettingsDialog;
