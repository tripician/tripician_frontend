import React from 'react';
import { Dialog, DialogContent, DialogTitle, Box, Typography, IconButton, TextField, Button, Chip, Avatar, Fade, InputBase } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface Member { id: string; name: string; handle: string; avatar?: string; role: 'Owner' | 'Editor' | 'Viewer'; }

interface TripSettingsDialogProps {
  open: boolean;
  onClose: ()=>void;
  title: string;
  startDate: string;
  endDate: string;
  privacy: string;
  members?: Member[];
  onChangeTitle?: (t:string)=>void;
  onChangeStartDate?: (d:string)=>void;
  onChangeEndDate?: (d:string)=>void;
  onChangePrivacy?: (p:string)=>void;
  onDeleteTrip?: ()=>void;
  onInviteEmail?: (email:string)=> Promise<void>|void;
}

const PRIVACY_OPTIONS = ['Trip members','My followers','Everyone'];

const TripSettingsDialog: React.FC<TripSettingsDialogProps> = ({ open, onClose, title, startDate, endDate, privacy, members = [], onChangeTitle, onChangeStartDate, onChangeEndDate, onChangePrivacy, onDeleteTrip, onInviteEmail }) => {
  const [copyMain, setCopyMain] = React.useState(false);
  const shareUrl = `stippi.io/username/trip/${encodeURIComponent(title||'trip')}`; // placeholder
  const [view, setView] = React.useState<'main'|'invite'>('main');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviting, setInviting] = React.useState(false);

  const copy = (text:string) => {
    navigator.clipboard.writeText(text).then(()=> {
      setCopyMain(true);
      setTimeout(()=> setCopyMain(false), 1800);
    });
  };

  const handleInvite = async () => {
    if(!inviteEmail) return;
    try {
      setInviting(true);
      await onInviteEmail?.(inviteEmail);
      setInviteEmail('');
    } finally { setInviting(false); }
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
            <Box sx={(t)=>({ display:'flex', alignItems:'center', border:`1px solid ${t.palette.divider}`, borderRadius:2, overflow:'hidden' })}>
              <InputBase placeholder="Enter your friend's email.." value={inviteEmail} onChange={e=> setInviteEmail(e.target.value)} sx={{ flex:1, px:1.5, py:1 }} />
              <Button disabled={!inviteEmail || inviting} onClick={handleInvite} variant='contained' sx={{ m:0.5, px:2.5, textTransform:'none', borderRadius:3 }}>{inviting? 'Inviting...':'Invite'}</Button>
            </Box>
            <Typography variant='subtitle2' fontWeight={700} gutterBottom>Trip members</Typography>
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
            <TextField label='Start date' type='date' value={startDate} onChange={e=> onChangeStartDate?.(e.target.value)} InputLabelProps={{ shrink:true }} size='small' sx={{ flex:1, minWidth:160 }} />
            <TextField label='End date' type='date' value={endDate} onChange={e=> onChangeEndDate?.(e.target.value)} InputLabelProps={{ shrink:true }} size='small' sx={{ flex:1, minWidth:160 }} />
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
            {PRIVACY_OPTIONS.map(p=> (
              <Chip key={p} label={p} onClick={()=> onChangePrivacy?.(p)} color={privacy===p? 'primary': 'default'} variant={privacy===p? 'filled':'outlined'} sx={{ fontWeight:500 }} />
            ))}
          </Box>
        </Box>

        {/* Invite section removed as per updated design instructions */}

        {/* Members */}
        <Box>
          <Typography variant='subtitle2' fontWeight={700} gutterBottom>Trip members</Typography>
          <Box sx={{ display:'flex', flexDirection:'column', gap:1, mt:1 }}>
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

        {/* Danger zone */}
        <Box sx={{ display:'flex', justifyContent:'center', mt:1 }}>
          <Button variant='outlined' color='error' startIcon={<DeleteOutlineIcon />} onClick={onDeleteTrip} sx={{ textTransform:'none', borderRadius:3 }}>Delete trip</Button>
        </Box>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TripSettingsDialog;
