import React from 'react';
import { Box, Typography, TextField, Button, IconButton, Avatar, Paper, Tooltip, CircularProgress, Fade } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState, type AppDispatch } from '../../store';
import { addComment, updateComment, removeComment } from '../../store/plannerSlice';

// Simple mock current user (replace with auth user later)
const CURRENT_USER = { id: 'me', name: "Rover's Compass", avatar: undefined } as const;

const TripComments: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const comments = useSelector((s:RootState)=> s.planner.comments) || [];
  // Ensure chronological order (oldest -> newest)
  const sorted = React.useMemo(()=> [...comments].sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [comments]);

  // Infinite scroll window management (load from newest backwards)
  const PAGE_SIZE = 25;
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement|null>(null);
  const prevScrollHeightRef = React.useRef<number>(0);
  const autoStickRef = React.useRef(true); // whether to auto-scroll on new messages
  const [showJumpLatest, setShowJumpLatest] = React.useState(false);
  const [text, setText] = React.useState('');
  const [editingId, setEditingId] = React.useState<string|null>(null);

  // Reset visible count if comments shrink drastically (e.g., deletion) so we don't overshoot
  React.useEffect(()=> {
    setVisibleCount(v=> Math.min(Math.max(PAGE_SIZE, v), sorted.length));
  }, [sorted.length]);

  // Auto-scroll to bottom when new comments arrive IF user was at (or near) bottom
  React.useEffect(()=> {
    if(!scrollRef.current) return;
    if(autoStickRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sorted.length]);

  const visibleSlice = React.useMemo(()=> {
    const startIndex = Math.max(0, sorted.length - visibleCount);
    return sorted.slice(startIndex);
  }, [sorted, visibleCount]);

  const canLoadOlder = sorted.length > visibleSlice.length;

  const handleScroll = () => {
    const el = scrollRef.current;
    if(!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const nearBottom = scrollHeight - (scrollTop + clientHeight) < 56;
    autoStickRef.current = nearBottom; // update autostick flag
    setShowJumpLatest(!nearBottom);

    if(scrollTop <= 24 && canLoadOlder && !loadingOlder){
      // Load older messages
      setLoadingOlder(true);
      prevScrollHeightRef.current = scrollHeight; // store before expanding
      // Simulate async (could be server fetch later)
      setTimeout(()=> {
        setVisibleCount(v=> Math.min(sorted.length, v + PAGE_SIZE));
        setLoadingOlder(false);
        requestAnimationFrame(()=> {
          const newEl = scrollRef.current;
          if(newEl){
            // Maintain visual position relative to previously visible messages
            const delta = newEl.scrollHeight - prevScrollHeightRef.current;
            newEl.scrollTop = delta + newEl.scrollTop;
          }
        });
      }, 300);
    }
  };

  const send = () => {
    const body = text.trim();
    if(!body) return;
    if(editingId){
      dispatch(updateComment({ id: editingId, text: body }));
      setEditingId(null);
    } else {
      dispatch(addComment({ userId: CURRENT_USER.id, displayName: CURRENT_USER.name, text: body }));
    }
    setText('');
    // After sending, ensure we stick to bottom
    autoStickRef.current = true;
  };

  const startEdit = (id:string, currentText:string) => { setEditingId(id); setText(currentText); };
  const cancelEdit = () => { setEditingId(null); setText(''); };

  return (
    <Box sx={{ p: 2.5, display:'flex', flexDirection:'column', height:'100%', maxHeight: '100%' }}>
      <Typography variant='subtitle2' sx={{ mb:1.5, fontWeight:700 }}>Comments</Typography>
      <Paper ref={scrollRef} onScroll={handleScroll} elevation={0} variant='outlined' sx={{ position:'relative', flex:1, p:1.5, borderRadius:3, overflowY:'auto', display:'flex', flexDirection:'column', gap:1.25, background:(t)=> t.palette.mode==='dark'? '#10171e':'#f7f9fb' }}>
        {loadingOlder && (
          <Box sx={{ display:'flex', justifyContent:'center', py:1 }}>
            <CircularProgress size={20} />
          </Box>
        )}
        {visibleSlice.length === 0 && !loadingOlder && (
          <Typography variant='body2' color='text.secondary'>No comments yet. Start the conversation!</Typography>
        )}
        {visibleSlice.map(c=> {
          const mine = c.userId === CURRENT_USER.id;
          return (
            <Box key={c.id} sx={{ display:'flex', flexDirection: mine? 'row-reverse':'row', alignItems:'flex-end', gap:1 }}>
              <Avatar src={c.avatarUrl} sx={{ width:32, height:32, fontSize:14 }}>{c.displayName.charAt(0)}</Avatar>
              <Box sx={{ maxWidth:'70%', display:'flex', flexDirection:'column', alignItems: mine? 'flex-end':'flex-start' }}>
                <Typography variant='caption' sx={{ mb:.25, fontWeight:500, opacity:.75 }}>{mine? 'You': c.displayName}</Typography>
                <Paper sx={{ px:1.25, py:.75, borderRadius: mine? '16px 4px 16px 16px':'4px 16px 16px 16px', background: mine? 'linear-gradient(135deg,#2563eb,#1d4ed8)':'linear-gradient(135deg,#e2e8f0,#f1f5f9)', color: mine? '#fff':'inherit', position:'relative' }}>
                  <Typography variant='body2' sx={{ whiteSpace:'pre-wrap' }}>{c.text}</Typography>
                </Paper>
                <Box sx={{ display:'flex', gap:.5, mt:.3 }}>
                  <Typography variant='caption' color='text.secondary'>{new Date(c.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}{c.editedAt? ' · edited':''}</Typography>
                  {mine && (
                    <>
                      <Tooltip title='Edit'>
                        <IconButton size='small' onClick={()=> startEdit(c.id, c.text)} sx={{ width:24, height:24 }}><EditIcon sx={{ fontSize:14 }} /></IconButton>
                      </Tooltip>
                      <Tooltip title='Delete'>
                        <IconButton size='small' onClick={()=> dispatch(removeComment({ id: c.id }))} sx={{ width:24, height:24 }}><DeleteIcon sx={{ fontSize:14 }} /></IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Paper>
      <Box component='form' onSubmit={(e)=> { e.preventDefault(); send(); }} sx={{ mt:1.5, display:'flex', alignItems:'flex-end', gap:1 }}>
        <TextField
          value={text}
          onChange={e=> setText(e.target.value)}
          placeholder={editingId? 'Edit your message...':'Write a message'}
          multiline
          minRows={1}
          maxRows={6}
          fullWidth
          size='small'
          autoFocus
          sx={{ '& .MuiOutlinedInput-root':{ borderRadius:3, background:(t)=> t.palette.mode==='dark'? '#0f151b':'#fff' } }}
        />
        {editingId && <Button variant='text' onClick={cancelEdit} sx={{ textTransform:'none' }}>Cancel</Button>}
        <IconButton type='submit' color='primary' disabled={!text.trim()} sx={{ bgcolor:'primary.main', color:'primary.contrastText', borderRadius:3, width:46, height:46, '&:hover':{ bgcolor:'primary.dark' }, '&.Mui-disabled':{ bgcolor:'action.disabledBackground' } }}>
          <SendIcon />
        </IconButton>
      </Box>
      <Fade in={showJumpLatest} unmountOnExit>
        <Button size='small' variant='contained' onClick={()=> {
          if(scrollRef.current){
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            autoStickRef.current = true;
            setShowJumpLatest(false);
          }
        }} sx={{ position:'absolute', bottom: 110, right: 16, borderRadius: 20, textTransform:'none', boxShadow:2, px:1.5, py:0.5 }}>
          Latest
        </Button>
      </Fade>
    </Box>
  );
};

export default TripComments;
