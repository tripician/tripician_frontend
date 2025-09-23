import React from 'react';
import { Box, Typography, TextField, Button, IconButton, Avatar, CircularProgress, Fade, Divider, Chip, Collapse } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import EditIcon from '@mui/icons-material/Edit';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState, type AppDispatch } from '../../store';
import { addComment, updateComment, removeComment, addReply, toggleUpvote } from '../../store/plannerSlice';

// Assumption: Real user object will supply id/role; placeholder now.
const CURRENT_USER = { id: 'me', name: "Rover's Compass", avatar: undefined, role: 'contributor' as 'viewer'|'contributor'|'owner' };

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
    .replace(/>/g,'&gt;');
  html = html.replace(/`([^`]+)`/g,'<code class="tc-code">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  html = html.replace(/(^|\s)\*([^*]+)\*/g,'$1<em>$2</em>');
  html = html.replace(urlRegex, (m)=> {
    const href = m.startsWith('http')? m : 'https://'+m; return `<a href="${href}" target="_blank" rel="noopener noreferrer">${m}</a>`;
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

const TripComments: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const comments = useSelector((s:RootState)=> s.planner.comments) || [];
  const sorted = React.useMemo(()=> [...comments].sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [comments]);

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

  const canPost = CURRENT_USER.role !== 'viewer';

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

  const send = () => {
    const body = text.trim(); if(!body || body.length>MAX_COMMENT_CHARS) return; if(!canPost) return;
    const now = Date.now(); recentRef.current = recentRef.current.filter(t=> now - t < FLOOD_WINDOW_MS); if(recentRef.current.length >= MAX_IN_WINDOW){ setFloodBlocked(true); setTimeout(()=> setFloodBlocked(false),4000); return; }
    recentRef.current.push(now);
    if(editingId){ dispatch(updateComment({ id: editingId, text: body })); setEditingId(null); }
    else { dispatch(addComment({ userId: CURRENT_USER.id, displayName: CURRENT_USER.name, text: body })); }
    setText(''); autoStickRef.current = true;
  };
  const startEdit = (id:string, current:string) => { setEditingId(id); setActiveReplyParentId(null); setReplyDraft(''); setText(current); };
  const openReply = (id:string) => { setActiveReplyParentId(id); setReplyDraft(''); setExpandedThreads(p=> ({ ...p, [id]: true })); };
  const cancelEdit = () => { setEditingId(null); setText(''); };
  const cancelReply = () => { setActiveReplyParentId(null); setReplyDraft(''); };
  const sendReply = (parentId:string) => {
    const body = replyDraft.trim(); if(!body || body.length>MAX_COMMENT_CHARS) return; if(!canPost) return;
    const now = Date.now(); recentRef.current = recentRef.current.filter(t=> now - t < FLOOD_WINDOW_MS); if(recentRef.current.length >= MAX_IN_WINDOW){ setFloodBlocked(true); setTimeout(()=> setFloodBlocked(false),4000); return; }
    recentRef.current.push(now); dispatch(addReply({ parentId, userId: CURRENT_USER.id, displayName: CURRENT_USER.name, text: body })); setActiveReplyParentId(null); setReplyDraft(''); autoStickRef.current = true;
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
    <Box sx={{ display:'flex', flexDirection:'column', height:'100%', position:'relative', pt:2, px:4 }}>
      <Box sx={{ maxWidth:900, width:'100%', mx:'auto', display:'flex', alignItems:'center', justifyContent:'space-between', mb:1.5 }}>
        <Typography variant='h6' sx={{ fontSize:19, fontWeight:600, letterSpacing:'-.3px' }}>Member discussion</Typography>
        <Chip size='small' label={`${sorted.length} comment${sorted.length===1?'':'s'}`} sx={{ fontWeight:500, fontSize:12, bgcolor:(t)=> t.palette.mode==='dark'? '#1d2731':'#f3f4f6' }} />
      </Box>
      <Box ref={scrollRef} onScroll={handleScroll} sx={{ flex:1, overflowY:'auto', pb:4 }}>
        <Box sx={{ maxWidth:900, width:'100%', mx:'auto', display:'flex', flexDirection:'column', gap:4 }}>
          {loadingOlder && <Box sx={{ display:'flex', justifyContent:'center' }}><CircularProgress size={18} /></Box>}
          {visibleSlice.length === 0 && !loadingOlder && <Typography variant='body2' color='text.secondary'>Be the first to start the conversation.</Typography>}
          {dayGroups.map(group => (
            <Box key={group.day} sx={{ display:'flex', flexDirection:'column', gap:3 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, opacity:.8 }}>
                <Divider sx={{ flex:1 }} />
                <Chip label={group.day} size='small' sx={{ fontSize:11, fontWeight:500 }} />
                <Divider sx={{ flex:1 }} />
              </Box>
              {group.items.filter(c=> !c.parentId).map(c=> { const mine = c.userId === CURRENT_USER.id; const replies = group.items.filter(r=> r.parentId===c.id).sort((a,b)=> new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()); const expanded = expandedThreads[c.id]; const upCount = c.upvoterIds?.length || 0; return (
                <Box key={c.id} sx={{ display:'flex', alignItems:'flex-start', gap:1.75, position:'relative', '&:hover .comment-inline-actions':{ opacity:1 } }}>
                  <Avatar src={c.avatarUrl} sx={{ width:38, height:38, fontSize:15 }}>{c.displayName.charAt(0)}</Avatar>
                  <Box sx={{ flex:1, minWidth:0 }}>
                    <Box sx={{ display:'flex', alignItems:'baseline', gap:1, flexWrap:'wrap' }}>
                      <Typography variant='subtitle2' sx={{ fontWeight:600, fontSize:14 }}>{mine? 'You': c.displayName}</Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ fontSize:11 }}>{new Date(c.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}{c.editedAt? ' · edited':''}</Typography>
                    </Box>
                    <Typography variant='body2' sx={{ mt:.5, lineHeight:1.55, fontSize:14, '& a':{ color:'primary.main', textDecoration:'none', '&:hover':{ textDecoration:'underline' } }, '& code.tc-code':{ background:(t)=> t.palette.mode==='dark'? '#1e2932':'#eceff1', padding:'2px 4px', borderRadius:4 } }}>{renderMarkdown(c.text)}</Typography>
                    <Box className='comment-inline-actions' sx={{ display:'flex', alignItems:'center', gap:1.25, mt:.75, opacity:0, transition:'opacity .2s' }}>
                      <Button size='small' disabled={!canPost} onClick={()=> dispatch(toggleUpvote({ id: c.id, userId: CURRENT_USER.id }))} startIcon={<ThumbUpAltOutlinedIcon sx={{ fontSize:14, transform: c.upvoterIds?.includes(CURRENT_USER.id)?'scale(1.2)':'scale(1)', transition:'transform .15s' }} />} variant='text' sx={{ textTransform:'none', fontSize:12, px:0.5, minWidth:40, color: (c.upvoterIds?.includes(CURRENT_USER.id)? 'primary.main':'text.secondary'), '&:hover':{ color:'primary.main', background:'transparent' } }}>{upCount? upCount:'Upvote'}</Button>
                      <Button size='small' disabled={!canPost} onClick={()=> openReply(c.id)} variant='text' sx={{ textTransform:'none', fontSize:12, px:0.5, minWidth:40, color:'text.secondary', '&:hover':{ color:'text.primary', background:'transparent' } }}>Reply</Button>
                      {replies.length>0 && <Button size='small' onClick={()=> toggleThread(c.id)} variant='text' sx={{ textTransform:'none', fontSize:12, px:0.5, minWidth:54, color:'text.secondary', '&:hover':{ color:'text.primary', background:'transparent' } }}>{expanded? 'Hide replies': `Replies (${replies.length})`}</Button>}
                      {mine && <>
                        <Button size='small' variant='text' onClick={()=> startEdit(c.id, c.text)} sx={{ textTransform:'none', fontSize:12, px:0.5, minWidth:40, color:'text.secondary', '&:hover':{ color:'text.primary', background:'transparent' } }}>Edit</Button>
                        <Button size='small' variant='text' onClick={()=> dispatch(removeComment({ id: c.id }))} sx={{ textTransform:'none', fontSize:12, px:0.5, minWidth:48, color:'text.secondary', '&:hover':{ color:'error.main', background:'transparent' } }}>Delete</Button>
                      </>}  
                    </Box>
                    {replies.length>0 && (
                      <Collapse in={expanded} timeout='auto' unmountOnExit>
                        <Box sx={{ mt:1.5, display:'flex', flexDirection:'column', gap:2, borderLeft:'2px solid', borderColor:'divider', pl:2 }}>
                          {replies.map(r=> { const mineR = r.userId===CURRENT_USER.id; const upCountR = r.upvoterIds?.length||0; return (
                            <Box key={r.id} sx={{ display:'flex', gap:1.2 }}>
                              <Avatar src={r.avatarUrl} sx={{ width:30, height:30, fontSize:13 }}>{r.displayName.charAt(0)}</Avatar>
                              <Box sx={{ flex:1 }}>
                                <Box sx={{ display:'flex', alignItems:'baseline', gap:.75, flexWrap:'wrap' }}>
                                  <Typography variant='subtitle2' sx={{ fontWeight:600, fontSize:13 }}>{mineR? 'You': r.displayName}</Typography>
                                  <Typography variant='caption' color='text.secondary' sx={{ fontSize:10 }}>{new Date(r.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}{r.editedAt? ' · edited':''}</Typography>
                                </Box>
                                <Typography variant='body2' sx={{ mt:.25, fontSize:13.25, lineHeight:1.5, '& a':{ color:'primary.main', textDecoration:'none', '&:hover':{ textDecoration:'underline' } }, '& code.tc-code':{ background:(t)=> t.palette.mode==='dark'? '#1e2932':'#eceff1', padding:'2px 4px', borderRadius:4 } }}>{renderMarkdown(r.text)}</Typography>
                                <Box sx={{ display:'flex', gap:1, mt:.5 }}>
                                  <Button size='small' disabled={!canPost} onClick={()=> dispatch(toggleUpvote({ id: r.id, userId: CURRENT_USER.id }))} startIcon={<ThumbUpAltOutlinedIcon sx={{ fontSize:12, transform: r.upvoterIds?.includes(CURRENT_USER.id)?'scale(1.2)':'scale(1)', transition:'transform .15s' }} />} variant='text' sx={{ textTransform:'none', fontSize:11, px:0.4, minWidth:34, color: (r.upvoterIds?.includes(CURRENT_USER.id)? 'primary.main':'text.secondary'), '&:hover':{ color:'primary.main', background:'transparent' } }}>{upCountR? upCountR:'Upvote'}</Button>
                                  {mineR && <>
                                    <Button size='small' variant='text' onClick={()=> startEdit(r.id, r.text)} sx={{ textTransform:'none', fontSize:11, px:0.4, minWidth:32, color:'text.secondary', '&:hover':{ color:'text.primary', background:'transparent' } }}>Edit</Button>
                                    <Button size='small' variant='text' onClick={()=> dispatch(removeComment({ id: r.id }))} sx={{ textTransform:'none', fontSize:11, px:0.4, minWidth:40, color:'text.secondary', '&:hover':{ color:'error.main', background:'transparent' } }}>Delete</Button>
                                  </>}
                                </Box>
                              </Box>
                            </Box>
                          ); })}
                          {activeReplyParentId === c.id && (
                            <Box sx={{ display:'flex', gap:1, mt:1 }}>
                              <Avatar sx={{ width:30, height:30, fontSize:13 }}>{CURRENT_USER.name.charAt(0)}</Avatar>
                              <Box component='form' onSubmit={(e)=> { e.preventDefault(); sendReply(c.id); }} sx={{ flex:1, display:'flex', alignItems:'center', gap:1, background:(t)=> t.palette.mode==='dark'? '#0d151c':'#f7f7f7', border:'1px solid', borderColor:'divider', borderRadius:6, px:1, py:0.5 }}>
                                <TextField value={replyDraft} onChange={e=> setReplyDraft(e.target.value.slice(0, MAX_COMMENT_CHARS))} placeholder='Reply...' multiline minRows={1} maxRows={4} fullWidth variant='standard' InputProps={{ disableUnderline:true, sx:{ fontSize:13 } }} />
                                <IconButton disabled={!replyDraft.trim() || floodBlocked || !canPost} type='submit' sx={{ bgcolor:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.main, color:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? t.palette.text.disabled: t.palette.primary.contrastText, width:34, height:34, borderRadius:2, '&:hover':{ bgcolor:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.dark } }}>
                                  <SendRoundedIcon sx={{ fontSize:18 }} />
                                </IconButton>
                                <Button onClick={cancelReply} size='small' variant='text' sx={{ textTransform:'none', fontSize:11 }}>Cancel</Button>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    )}
                    {replies.length===0 && activeReplyParentId === c.id && (
                      <Box sx={{ mt:1.25, borderLeft:'2px solid', borderColor:'divider', pl:2 }}>
                        <Box sx={{ display:'flex', gap:1 }}>
                          <Avatar sx={{ width:30, height:30, fontSize:13 }}>{CURRENT_USER.name.charAt(0)}</Avatar>
                          <Box component='form' onSubmit={(e)=> { e.preventDefault(); sendReply(c.id); }} sx={{ flex:1, display:'flex', alignItems:'center', gap:1, background:(t)=> t.palette.mode==='dark'? '#0d151c':'#f7f7f7', border:'1px solid', borderColor:'divider', borderRadius:6, px:1, py:0.5 }}>
                            <TextField value={replyDraft} onChange={e=> setReplyDraft(e.target.value.slice(0, MAX_COMMENT_CHARS))} placeholder='Reply...' multiline minRows={1} maxRows={4} fullWidth variant='standard' InputProps={{ disableUnderline:true, sx:{ fontSize:13 } }} />
                            <IconButton disabled={!replyDraft.trim() || floodBlocked || !canPost} type='submit' sx={{ bgcolor:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.main, color:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? t.palette.text.disabled: t.palette.primary.contrastText, width:34, height:34, borderRadius:2, '&:hover':{ bgcolor:(t)=> (!replyDraft.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.dark } }}>
                              <SendRoundedIcon sx={{ fontSize:18 }} />
                            </IconButton>
                            <Button onClick={cancelReply} size='small' variant='text' sx={{ textTransform:'none', fontSize:11 }}>Cancel</Button>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              ); })}
            </Box>
          ))}
        </Box>
      </Box>
      <Divider sx={{ my:2 }} />
      <Box component='form' onSubmit={(e)=> { e.preventDefault(); send(); }} sx={{ maxWidth:900, width:'100%', mx:'auto', display:'flex', alignItems:'flex-start', gap:1.25, pb:1, position:'relative' }}>
        <Avatar src={CURRENT_USER.avatar} sx={{ width:42, height:42, fontSize:16 }}>{CURRENT_USER.name.charAt(0)}</Avatar>
        <Box sx={{ flex:1, display:'flex', alignItems:'center', gap:1, background:(t)=> t.palette.mode==='dark'? '#111a23':'#fafafa', border:'1px solid', borderColor:(t)=> t.palette.divider, borderRadius:8, px:1.25, py:0.75 }}>
          <TextField inputRef={textareaRef} value={text} onChange={e=> setText(e.target.value.slice(0, MAX_COMMENT_CHARS))} placeholder={editingId? 'Edit your comment...': canPost? 'Share your thoughts':'View only'} multiline minRows={1} maxRows={5} fullWidth variant='standard' InputProps={{ disableUnderline:true, sx:{ fontSize:14, lineHeight:1.5 } }} />
          {editingId && <Button onClick={cancelEdit} size='small' variant='text' sx={{ textTransform:'none', mr:1 }}>Cancel</Button>}
          <IconButton type='submit' disabled={!text.trim() || floodBlocked || !canPost} sx={{ bgcolor:(t)=> (!text.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.main, color:(t)=> (!text.trim()||floodBlocked||!canPost)? t.palette.text.disabled: t.palette.primary.contrastText, width:40, height:40, borderRadius:3, '&:hover':{ bgcolor:(t)=> (!text.trim()||floodBlocked||!canPost)? 'action.disabledBackground': t.palette.primary.dark } }}>
            {editingId? <EditIcon sx={{ fontSize:20 }} /> : <SendRoundedIcon sx={{ fontSize:20 }} />}
          </IconButton>
        </Box>
      </Box>
      <Fade in={showJumpLatest} unmountOnExit>
        <Button size='small' variant='contained' onClick={()=> { if(scrollRef.current){ scrollRef.current.scrollTop = scrollRef.current.scrollHeight; autoStickRef.current = true; setShowJumpLatest(false);} }} sx={{ position:'fixed', bottom:118, right:42, borderRadius:24, textTransform:'none', boxShadow:3, px:1.4, py:0.35, fontSize:12 }}>Newest</Button>
      </Fade>
    </Box>
  );
};

export default TripComments;
