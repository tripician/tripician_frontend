import React from 'react';
import { Box, Typography, TextField, Button, IconButton, Avatar, CircularProgress, Fade, Divider, Chip, Collapse } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import EditIcon from '@mui/icons-material/Edit';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import { useSelector } from 'react-redux';
import { type RootState } from '../../store';
import { apiServices } from '../../services/APIs/apiServices';
import type { TripComment } from '../../store/plannerSlice';

interface TripCommentsProps {
  tripId: string;
  authToken: string | null;
}

// Config
const PAGE_SIZE = 25;
const MAX_COMMENT_CHARS = 1200; // silent hard limit
const FLOOD_WINDOW_MS = 10_000;
const MAX_IN_WINDOW = 5;
const SCROLL_STORAGE_KEY = 'tripCommentsScrollV1';

// Basic markdown & link parsing
function renderMarkdown(md: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  let html = md
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;'); // quote-escape blocks href attribute breakout in linkified URLs
  html = html.replace(/`([^`]+)`/g,'<code class="tc-code">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  html = html.replace(/(^|\s)\*([^*]+)\*/g,'$1<em>$2</em>');
  html = html.replace(urlRegex, (m)=> {
    const href = m.startsWith('http')? m : 'https://'+m; return `<a href="${href}" target="_blank" rel="noopener noreferrer">${m}</a>`;
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

const TripComments: React.FC<TripCommentsProps> = ({ tripId, authToken }) => {
  const userProfile = useSelector((s: RootState) => s.user.profile);
  const navigate = useNavigate();

  // Derive current-user display values from Redux profile
  const myName = userProfile
    ? (`${userProfile.fname || ''} ${userProfile.lname || ''}`).trim() ||
      (userProfile.email ? userProfile.email.split('@')[0] : 'You')
    : 'You';
  const myAvatar: string | undefined = userProfile?.profilepicture || undefined;
  const myInitial = myName.charAt(0).toUpperCase() || 'Y';
  const myId = String(userProfile?.id || 'me');
  const canPost = !!authToken;

  // Local comments state (source of truth from backend)
  const [comments, setComments] = React.useState<TripComment[]>([]);
  const [loadingComments, setLoadingComments] = React.useState(true);

  // Normalize a single backend comment DTO to TripComment
  const normalizeComment = (c: any): TripComment => ({
    id: String(c.id),
    userId: String(c.userId),
    displayName: c.displayName || c.userName || c.name || 'Member',
    avatarUrl: c.avatarUrl || undefined,
    text: c.content || c.text || '',
    createdAt: c.createdAt || new Date().toISOString(),
    editedAt: c.updatedAt || c.editedAt || undefined,
    parentId: c.parentCommentId ? String(c.parentCommentId) : undefined,
    upvoterIds: c.upvoterIds || [],
  });

  // Flatten nested backend response (replies array) into flat list
  const flattenComments = (raw: any[]): TripComment[] => {
    const flat: TripComment[] = [];
    for (const c of raw) {
      flat.push(normalizeComment(c));
      if (Array.isArray(c.replies)) {
        for (const r of c.replies) flat.push(normalizeComment(r));
      }
    }
    return flat;
  };

  // Fetch comments from backend — works for guests too (published trips are public)
  React.useEffect(() => {
    if (!tripId) { setLoadingComments(false); return; }
    let active = true;
    setLoadingComments(true);
    apiServices.getTripComments(authToken, tripId)
      .then(resp => {
        if (!active) return;
        const data = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp?.data?.comments) ? resp.data.comments : []);
        setComments(flattenComments(data));
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadingComments(false); });
    return () => { active = false; };
  }, [tripId, authToken]);

  const sorted = React.useMemo(() => [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [comments]);

  // Infinite pagination window
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement|null>(null);
  const autoStickRef = React.useRef(true);
  const prevScrollHeightRef = React.useRef(0);
  const [showJumpLatest, setShowJumpLatest] = React.useState(false);

  // Draft & states
  const [text, setText] = React.useState(''); // root draft
  const [editingId, setEditingId] = React.useState<string|null>(null);
  const [expandedThreads, setExpandedThreads] = React.useState<Record<string, boolean>>({});
  const [floodBlocked, setFloodBlocked] = React.useState(false);
  const recentRef = React.useRef<number[]>([]);
  const [activeReplyParentId, setActiveReplyParentId] = React.useState<string|null>(null);
  const [replyDraft, setReplyDraft] = React.useState('');



  // Scroll restore
  React.useEffect(()=> { const s = sessionStorage.getItem(SCROLL_STORAGE_KEY); if(s && scrollRef.current) scrollRef.current.scrollTop = parseInt(s,10); }, []);
  React.useEffect(()=> { const el = scrollRef.current; if(!el) return; const h=()=> sessionStorage.setItem(SCROLL_STORAGE_KEY, String(el.scrollTop)); el.addEventListener('scroll',h); return ()=> el.removeEventListener('scroll',h); }, [scrollRef.current]);

  React.useEffect(()=> { setVisibleCount(v=> Math.min(Math.max(PAGE_SIZE,v), sorted.length)); }, [sorted.length]);
  React.useEffect(()=> { if(scrollRef.current && autoStickRef.current){ scrollRef.current.scrollTop = scrollRef.current.scrollHeight; } }, [sorted.length]);

  const visibleSlice = React.useMemo(()=> { const start = Math.max(0, sorted.length - visibleCount); return sorted.slice(start); }, [sorted, visibleCount]);
  const canLoadOlder = sorted.length > visibleSlice.length;

  const handleScroll = () => {
    const el = scrollRef.current; if(!el) return; const { scrollTop, scrollHeight, clientHeight } = el;
    const nearBottom = scrollHeight - (scrollTop + clientHeight) < 48; autoStickRef.current = nearBottom; setShowJumpLatest(!nearBottom);
    if(scrollTop <= 24 && canLoadOlder && !loadingOlder){
      setLoadingOlder(true); prevScrollHeightRef.current = scrollHeight;
      setTimeout(()=> { setVisibleCount(v=> Math.min(sorted.length, v+PAGE_SIZE)); setLoadingOlder(false); requestAnimationFrame(()=> { if(scrollRef.current){ const delta = scrollRef.current.scrollHeight - prevScrollHeightRef.current; scrollRef.current.scrollTop = delta + scrollRef.current.scrollTop; } }); }, 250);
    }
  };

  const send = async () => {
    const body = text.trim(); if (!body || body.length > MAX_COMMENT_CHARS) return; if (!canPost || !authToken) return;
    const now = Date.now(); recentRef.current = recentRef.current.filter(t => now - t < FLOOD_WINDOW_MS); if (recentRef.current.length >= MAX_IN_WINDOW) { setFloodBlocked(true); setTimeout(() => setFloodBlocked(false), 4000); return; }
    recentRef.current.push(now);
    if (editingId) {
      // Optimistic update
      setComments(prev => prev.map(c => c.id === editingId ? { ...c, text: body, editedAt: new Date().toISOString() } : c));
      setEditingId(null); setText('');
      try { await apiServices.updateTripComment(authToken, tripId, editingId, body); } catch { /* revert not needed; UI stays */ }
    } else {
      // Optimistic insert
      const tempId = `tmp_${Date.now()}`;
      const optimistic: TripComment = { id: tempId, userId: myId, displayName: myName, avatarUrl: myAvatar, text: body, createdAt: new Date().toISOString(), upvoterIds: [] };
      setComments(prev => [...prev, optimistic]);
      setText(''); autoStickRef.current = true;
      try {
        const resp = await apiServices.createTripComment(authToken, tripId, body);
        const created = normalizeComment(resp?.data);
        setComments(prev => prev.map(c => c.id === tempId ? created : c));
      } catch {
        setComments(prev => prev.filter(c => c.id !== tempId));
      }
    }
  };
  const startEdit = (id: string, current: string) => { setEditingId(id); setActiveReplyParentId(null); setReplyDraft(''); setText(current); };
  const openReply = (id: string) => { setActiveReplyParentId(id); setReplyDraft(''); setExpandedThreads(p => ({ ...p, [id]: true })); };
  const cancelEdit = () => { setEditingId(null); setText(''); };
  const cancelReply = () => { setActiveReplyParentId(null); setReplyDraft(''); };
  const deleteComment = async (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id && c.parentId !== id));
    try { if (authToken) await apiServices.deleteTripComment(authToken, tripId, id); } catch { /* already removed optimistically */ }
  };
  const sendReply = async (parentId: string) => {
    const body = replyDraft.trim(); if (!body || body.length > MAX_COMMENT_CHARS) return; if (!canPost || !authToken) return;
    const now = Date.now(); recentRef.current = recentRef.current.filter(t => now - t < FLOOD_WINDOW_MS); if (recentRef.current.length >= MAX_IN_WINDOW) { setFloodBlocked(true); setTimeout(() => setFloodBlocked(false), 4000); return; }
    recentRef.current.push(now);
    const tempId = `tmp_${Date.now()}`;
    const optimistic: TripComment = { id: tempId, userId: myId, displayName: myName, avatarUrl: myAvatar, text: body, createdAt: new Date().toISOString(), parentId, upvoterIds: [] };
    setComments(prev => [...prev, optimistic]);
    setActiveReplyParentId(null); setReplyDraft(''); autoStickRef.current = true;
    try {
      const resp = await apiServices.createTripComment(authToken, tripId, body, parentId);
      const created = normalizeComment(resp?.data);
      setComments(prev => prev.map(c => c.id === tempId ? created : c));
    } catch {
      setComments(prev => prev.filter(c => c.id !== tempId));
    }
  };
  const toggleUpvoteLocal = (id: string) => {
    setComments(prev => prev.map(c => {
      if (c.id !== id) return c;
      const already = c.upvoterIds?.includes(myId);
      return { ...c, upvoterIds: already ? (c.upvoterIds || []).filter(u => u !== myId) : [...(c.upvoterIds || []), myId] };
    }));
  };
  const toggleThread = (id:string) => setExpandedThreads(p=> ({ ...p, [id]: !p[id] }));

  // Group by day
  const dayGroups = React.useMemo(()=> {
    const groups: { day:string; items: typeof visibleSlice }[] = []; let last='';
    for(const c of visibleSlice){ const day = new Date(c.createdAt).toLocaleDateString(undefined,{ month:'short', day:'numeric', year:'numeric'}); if(day!==last){ last=day; groups.push({ day, items:[c] }); } else { groups[groups.length-1].items.push(c); } }
    return groups;
  }, [visibleSlice]);

  const textareaRef = React.useRef<HTMLTextAreaElement|null>(null);

  return (
    <Box sx={{ display:'flex', flexDirection:'column', height:'100%', position:'relative', pt:2, px:{ xs:2.5, xl:3 } }}>
      <Box sx={{ maxWidth:900, width:'100%', mx:'auto', display:'flex', alignItems:'center', justifyContent:'space-between', mb:0.5 }}>
        <Typography variant='h6' sx={{ fontSize:17, fontWeight:650, letterSpacing:'-.3px' }}>Comments</Typography>
        <Chip size='small' label={`${sorted.length} comment${sorted.length===1?'':'s'}`} sx={{ fontWeight:500, fontSize:12, bgcolor:(t)=> t.palette.mode==='dark'? '#1d2731':'#f3f4f6' }} />
      </Box>
      <Typography sx={{ maxWidth:900, width:'100%', mx:'auto', fontSize:11.5, color:'text.secondary', mb:1.5 }}>
        Public ,visible to everyone who can see this trip
      </Typography>
      <Box ref={scrollRef} onScroll={handleScroll} sx={{ flex:1, overflowY:'auto', pb:4 }}>
        <Box sx={{ maxWidth:900, width:'100%', mx:'auto', display:'flex', flexDirection:'column', gap:4 }}>
          {loadingOlder && <Box sx={{ display:'flex', justifyContent:'center' }}><CircularProgress size={18} /></Box>}
          {loadingComments && <Box sx={{ display:'flex', justifyContent:'center', pt:4 }}><CircularProgress size={22} /></Box>}
          {!loadingComments && visibleSlice.length === 0 && !loadingOlder && <Typography variant='body2' color='text.secondary'>Be the first to comment on this trip.</Typography>}
          {dayGroups.map(group => (
            <Box key={group.day} sx={{ display:'flex', flexDirection:'column', gap:3 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, opacity:.8 }}>
                <Divider sx={{ flex:1 }} />
                <Chip label={group.day} size='small' sx={{ fontSize:11, fontWeight:500 }} />
                <Divider sx={{ flex:1 }} />
              </Box>
              {group.items.filter(c=> !c.parentId).map((c, ci)=> { const mine = c.userId === myId; const replies = group.items.filter(r=> r.parentId===c.id).sort((a,b)=> new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()); const expanded = expandedThreads[c.id]; const upCount = c.upvoterIds?.length || 0; return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25, delay: ci * 0.04 }}>
                <Box sx={{ display:'flex', alignItems:'flex-start', gap:1.75, position:'relative', '&:hover .comment-inline-actions':{ opacity:1 } }}>
                      <Avatar src={c.avatarUrl} imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any} sx={{ width:38, height:38, fontSize:15 }}>{c.displayName.charAt(0)}</Avatar>
                  <Box sx={{ flex:1, minWidth:0 }}>
                    <Box sx={{ display:'flex', alignItems:'baseline', gap:1, flexWrap:'wrap' }}>
                      <Typography variant='subtitle2' sx={{ fontWeight:600, fontSize:14 }}>{mine? 'You': c.displayName}</Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ fontSize:11 }}>{new Date(c.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}{c.editedAt? ' · edited':''}</Typography>
                    </Box>
                    <Typography variant='body2' sx={{ mt:.5, lineHeight:1.55, fontSize:14, '& a':{ color:'primary.main', textDecoration:'none', '&:hover':{ textDecoration:'underline' } }, '& code.tc-code':{ background:(t)=> t.palette.mode==='dark'? '#1e2932':'#eceff1', padding:'2px 4px', borderRadius:4 } }}>{renderMarkdown(c.text)}</Typography>
                    <Box className='comment-inline-actions' sx={{ display:'flex', alignItems:'center', gap:1.25, mt:.75, opacity:0, transition:'opacity .2s' }}>
                      <Button size='small' disabled={!canPost} onClick={()=> toggleUpvoteLocal(c.id)} startIcon={<ThumbUpAltOutlinedIcon sx={{ fontSize:14, transform: c.upvoterIds?.includes(myId)?'scale(1.2)':'scale(1)', transition:'transform .15s' }} />} variant='text' sx={{ textTransform:'none', fontSize:12, px:0.5, minWidth:40, color: (c.upvoterIds?.includes(myId)? 'primary.main':'text.secondary'), '&:hover':{ color:'primary.main', background:'transparent' } }}>{upCount? upCount:'Upvote'}</Button>
                      <Button size='small' disabled={!canPost} onClick={()=> openReply(c.id)} variant='text' sx={{ textTransform:'none', fontSize:12, px:0.5, minWidth:40, color:'text.secondary', '&:hover':{ color:'text.primary', background:'transparent' } }}>Reply</Button>
                      {replies.length>0 && <Button size='small' onClick={()=> toggleThread(c.id)} variant='text' sx={{ textTransform:'none', fontSize:12, px:0.5, minWidth:54, color:'text.secondary', '&:hover':{ color:'text.primary', background:'transparent' } }}>{expanded? 'Hide replies': `Replies (${replies.length})`}</Button>}
                      {mine && <>
                        <Button size='small' variant='text' onClick={()=> startEdit(c.id, c.text)} sx={{ textTransform:'none', fontSize:12, px:0.5, minWidth:40, color:'text.secondary', '&:hover':{ color:'text.primary', background:'transparent' } }}>Edit</Button>
                        <Button size='small' variant='text' onClick={()=> deleteComment(c.id)} sx={{ textTransform:'none', fontSize:12, px:0.5, minWidth:48, color:'text.secondary', '&:hover':{ color:'error.main', background:'transparent' } }}>Delete</Button>
                      </>}  
                    </Box>
                    {replies.length>0 && (
                      <Collapse in={expanded} timeout='auto' unmountOnExit>
                        <Box sx={{ mt:1.25, display:'flex', flexDirection:'column', gap:1, borderLeft:'2px solid', borderColor:'divider', pl:2 }}>
                          {replies.map(r=> { const mineR = r.userId===myId; const upCountR = r.upvoterIds?.length||0; return (
                            <Box key={r.id} sx={{ position:'relative', display:'flex', gap:1, px:1, py:0.75, pr:1.5, borderRadius:1, '&:hover':{ background:(t)=> t.palette.mode==='dark'? 'rgba(255,255,255,0.03)':'#f7f9fa' }, '&:before':{ content:'""', position:'absolute', left:-10, top:18, width:6, height:6, borderRadius:'50%', background:(t)=> t.palette.mode==='dark'? '#2e3c49':'#d0d7dd' } }}>
                              <Avatar src={r.avatarUrl} imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any} sx={{ width:28, height:28, fontSize:12 }}>{r.displayName.charAt(0)}</Avatar>
                              <Box sx={{ flex:1, minWidth:0 }}>
                                <Box sx={{ display:'flex', alignItems:'baseline', gap:.6, flexWrap:'wrap' }}>
                                  <Typography variant='subtitle2' sx={{ fontWeight:600, fontSize:12.5 }}>{mineR? 'You': r.displayName}</Typography>
                                  <Typography variant='caption' color='text.secondary' sx={{ fontSize:10 }}>{new Date(r.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}{r.editedAt? ' · edited':''}</Typography>
                                </Box>
                                <Typography variant='body2' sx={{ mt:.15, fontSize:12.75, lineHeight:1.45, '& a':{ color:'primary.main', textDecoration:'none', '&:hover':{ textDecoration:'underline' } }, '& code.tc-code':{ background:(t)=> t.palette.mode==='dark'? '#1e2932':'#eceff1', padding:'1px 4px', borderRadius:4, fontSize:12 } }}>{renderMarkdown(r.text)}</Typography>
                                <Box sx={{ display:'flex', gap:1, mt:.35 }}>
                                  <Button size='small' disabled={!canPost} onClick={()=> toggleUpvoteLocal(r.id)} startIcon={<ThumbUpAltOutlinedIcon sx={{ fontSize:11, transform: r.upvoterIds?.includes(myId)?'scale(1.15)':'scale(1)', transition:'transform .15s' }} />} variant='text' sx={{ textTransform:'none', fontSize:10.5, px:0.4, minWidth:32, color: (r.upvoterIds?.includes(myId)? 'primary.main':'text.secondary'), '&:hover':{ color:'primary.main', background:'transparent' } }}>{upCountR? upCountR:'Upvote'}</Button>
                                  {mineR && <>
                                    <Button size='small' variant='text' onClick={()=> startEdit(r.id, r.text)} sx={{ textTransform:'none', fontSize:10.5, px:0.4, minWidth:30, color:'text.secondary', '&:hover':{ color:'text.primary', background:'transparent' } }}>Edit</Button>
                                    <Button size='small' variant='text' onClick={()=> deleteComment(r.id)} sx={{ textTransform:'none', fontSize:10.5, px:0.4, minWidth:38, color:'text.secondary', '&:hover':{ color:'error.main', background:'transparent' } }}>Delete</Button>
                                  </>}
                                </Box>
                              </Box>
                            </Box>
                          ); })}
                          {activeReplyParentId === c.id && (
                            <Box sx={{ display:'flex', gap:1, px:1, py:0.6, pr:1.5, mt:0.5, borderRadius:1, background:(t)=> t.palette.mode==='dark'? 'rgba(255,255,255,0.02)':'#fafbfc' }}>
                              <Avatar src={myAvatar} imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any} sx={{ width:28, height:28, fontSize:12, bgcolor:'#FF385C' }}>{myInitial}</Avatar>
                              <Box component='form' onSubmit={(e)=> { e.preventDefault(); sendReply(c.id); }} sx={{ flex:1, display:'flex', alignItems:'center', gap:1 }}>
                                <TextField value={replyDraft} onChange={e=> setReplyDraft(e.target.value.slice(0, MAX_COMMENT_CHARS))} placeholder='Reply...' multiline minRows={1} maxRows={4} fullWidth variant='standard' InputProps={{ disableUnderline:true, sx:{ fontSize:13, lineHeight:1.4 } }} />
                                <IconButton disabled={!replyDraft.trim() || floodBlocked || !canPost} type='submit' sx={{ bgcolor:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.main, color:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? t.palette.text.disabled: t.palette.primary.contrastText, width:32, height:32, borderRadius:2, '&:hover':{ bgcolor:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.dark } }}>
                                  <SendRoundedIcon sx={{ fontSize:18 }} />
                                </IconButton>
                                <Button onClick={cancelReply} size='small' variant='text' sx={{ textTransform:'none', fontSize:10.5, minWidth:38 }}>Cancel</Button>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    )}
                    {replies.length===0 && activeReplyParentId === c.id && (
                      <Box sx={{ mt:1, borderLeft:'2px solid', borderColor:'divider', pl:2 }}>
                        <Box sx={{ display:'flex', gap:1, px:1, py:0.6, pr:1.5, borderRadius:1, background:(t)=> t.palette.mode==='dark'? 'rgba(255,255,255,0.02)':'#fafbfc' }}>
                          <Avatar src={myAvatar} imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any} sx={{ width:28, height:28, fontSize:12, bgcolor:'#FF385C' }}>{myInitial}</Avatar>
                          <Box component='form' onSubmit={(e)=> { e.preventDefault(); sendReply(c.id); }} sx={{ flex:1, display:'flex', alignItems:'center', gap:1 }}>
                            <TextField value={replyDraft} onChange={e=> setReplyDraft(e.target.value.slice(0, MAX_COMMENT_CHARS))} placeholder='Reply...' multiline minRows={1} maxRows={4} fullWidth variant='standard' InputProps={{ disableUnderline:true, sx:{ fontSize:13, lineHeight:1.4 } }} />
                            <IconButton disabled={!replyDraft.trim() || floodBlocked || !canPost} type='submit' sx={{ bgcolor:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.main, color:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? t.palette.text.disabled: t.palette.primary.contrastText, width:32, height:32, borderRadius:2, '&:hover':{ bgcolor:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.dark } }}>
                              <SendRoundedIcon sx={{ fontSize:18 }} />
                            </IconButton>
                            <Button onClick={cancelReply} size='small' variant='text' sx={{ textTransform:'none', fontSize:10.5, minWidth:38 }}>Cancel</Button>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
                </motion.div>
              ); })}
            </Box>
          ))}
        </Box>
      </Box>
      <Divider sx={{ my:2 }} />
      {!authToken ? (
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', gap:1.5, pb:2, pt:0.5 }}>
          <Typography variant='body2' sx={{ color:'text.secondary' }}>Sign in to join the conversation.</Typography>
          <Button variant='contained' size='small' onClick={()=> navigate('/signin')}>Sign in</Button>
        </Box>
      ) : (
      <Box component='form' onSubmit={(e)=> { e.preventDefault(); send(); }} sx={{ maxWidth:900, width:'100%', mx:'auto', display:'flex', alignItems:'flex-start', gap:1.25, pb:1, position:'relative' }}>
        <Avatar src={myAvatar} imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any} sx={{ width:42, height:42, fontSize:16, bgcolor:'#FF385C' }}>{myInitial}</Avatar>
        <Box sx={{ flex:1, display:'flex', alignItems:'center', gap:1, background:(t)=> t.palette.mode==='dark'? '#111a23':'#fafafa', border:'1px solid', borderColor:(t)=> t.palette.divider, borderRadius:8, px:1.25, py:0.75 }}>
          <TextField inputRef={textareaRef} value={text} onChange={e=> setText(e.target.value.slice(0, MAX_COMMENT_CHARS))} placeholder={editingId? 'Edit your comment...': canPost? 'Add a public comment…':'View only'} multiline minRows={1} maxRows={5} fullWidth variant='standard' InputProps={{ disableUnderline:true, sx:{ fontSize:14, lineHeight:1.5 } }} />
          {editingId && <Button onClick={cancelEdit} size='small' variant='text' sx={{ textTransform:'none', mr:1 }}>Cancel</Button>}
          <IconButton type='submit' disabled={!text.trim() || floodBlocked || !canPost} sx={{ bgcolor:(t)=> (!text.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.main, color:(t)=> (!text.trim()||floodBlocked||!canPost)? t.palette.text.disabled: t.palette.primary.contrastText, width:40, height:40, borderRadius:3, '&:hover':{ bgcolor:(t)=> (!text.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.dark } }}>
            {editingId? <EditIcon sx={{ fontSize:20 }} /> : <SendRoundedIcon sx={{ fontSize:20 }} />}
          </IconButton>
        </Box>
      </Box>
      )}
      <Fade in={showJumpLatest} unmountOnExit>
        <Button size='small' variant='contained' onClick={()=> { if(scrollRef.current){ scrollRef.current.scrollTop = scrollRef.current.scrollHeight; autoStickRef.current = true; setShowJumpLatest(false);} }} sx={{ position:'fixed', bottom:118, right:42, borderRadius:24, textTransform:'none', boxShadow:3, px:1.4, py:0.35, fontSize:12 }}>Newest</Button>
      </Fade>
    </Box>
  );
};

export default TripComments;
