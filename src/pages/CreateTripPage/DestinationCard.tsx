import React from 'react';
import { Box, Card, CardContent, Typography, IconButton, Tooltip, Chip, Menu, MenuItem, InputBase } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotesIcon from '@mui/icons-material/Notes';
import HotelIcon from '@mui/icons-material/Hotel';
import AttractionsIcon from '@mui/icons-material/Attractions';
import LabelIcon from '@mui/icons-material/Label';
import ExploreIcon from '@mui/icons-material/Explore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { PlannerDestination } from '../../store/plannerSlice';

// New category mapping
const CATEGORY_COLORS: Record<NonNullable<PlannerDestination['category']>, { bg: string; fg: string; icon: React.ReactNode; label: string; }> = {
  general: { bg: '#334155', fg: '#ffffff', icon: <LabelIcon fontSize='inherit' />, label: 'General' },
  must_visit: { bg: '#16a34a', fg: '#ffffff', icon: <AttractionsIcon fontSize='inherit' />, label: 'Must Visit' },
  skippable: { bg: '#64748b', fg: '#ffffff', icon: <LabelIcon fontSize='inherit' />, label: 'Skippable' },
  tentative: { bg: '#ea580c', fg: '#ffffff', icon: <LabelIcon fontSize='inherit' />, label: 'Tentative' },
  decide_later: { bg: '#7c3aed', fg: '#ffffff', icon: <LabelIcon fontSize='inherit' />, label: 'Decide Later' }
};

/**
 * DestinationCard
 * Presentational + lightweight interactive unit for a single destination in the card layout.
 * Responsibilities:
 *  - Inline rename (double click)
 *  - Category assignment via color-coded menu
 *  - Completion toggle (visual strike-through + status chip)
 *  - Duplicate / Delete / More actions
 *  - Surface basic meta: nights + date range
 *  - Provide drag handle + up/down buttons (accessible reordering) while delegating
 *    actual reorder logic to the parent via callbacks.
 *  - Emit placeholder hooks for future booking / notes / share / AI suggestion features.
 */
export interface DestinationCardProps {
  destination: PlannerDestination;
  index?: number; // for DnD future
  disabled?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onRename?: (id: string, name: string) => void;
  onChangeCategory?: (id: string, category: PlannerDestination['category']) => void;
  onToggleComplete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRemove?: (id: string) => void;
  onOpenNotes?: (id: string) => void;
  onSuggestAI?: (id: string) => void; // Placeholder for AI suggestions
  onOpenDiscover?: (id: string) => void; // Open spots/foods discover dialog
  onOpenDocs?: (id: string) => void; // Open documents dialog
  onOpenStay?: (id: string) => void; // Open stay/accommodation dialog
  onChangeNights?: (id: string, delta: number) => void; // Adjust nights
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnter?: (id: string) => void;
  onDragEnd?: () => void;
}

const DestinationCard: React.FC<DestinationCardProps> = ({ destination, disabled, onRename, onChangeCategory, onToggleComplete, onDuplicate, onRemove, onOpenNotes, onOpenDiscover, onOpenDocs, onOpenStay, onChangeNights }) => {
  const { id, name, startDate, endDate, nights, category='general', completed, notes, spots, foods, stay, docs, photoUrl } = destination;
  const [editing, setEditing] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [catAnchor, setCatAnchor] = React.useState<HTMLElement | null>(null);
  const [localName, setLocalName] = React.useState(name);

  React.useEffect(()=> setLocalName(name), [name]);

  const openMenu = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget);
  const closeMenu = () => setMenuAnchor(null);
  const openCategory = (e: React.MouseEvent<HTMLElement>) => setCatAnchor(e.currentTarget);
  const closeCategory = () => setCatAnchor(null);

  const commitName = () => { if(localName.trim() && localName !== name) onRename?.(id, localName.trim()); setEditing(false); };
  const handleKey: React.KeyboardEventHandler<HTMLInputElement> = (e) => { if(e.key==='Enter') { commitName(); } else if(e.key==='Escape'){ setLocalName(name); setEditing(false);} };

  const catInfo = CATEGORY_COLORS[category];
  const dateFmt = (iso?: string) => { if(!iso) return ''; try { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString(undefined, { month:'short', day:'2-digit' }); } catch { return iso || ''; } };

  return (
    <Card
      elevation={0}
      sx={(t)=>({ 
        position:'relative', 
        overflow:'hidden', 
        opacity: disabled? .6:1, 
        display:'flex', 
        flexDirection:'column', 
        borderRadius:2, /* reduced corner roundness */
        border:'1px solid '+t.palette.divider,
        background: t.palette.mode==='dark'? t.palette.background.paper : t.palette.common.white, 
        boxShadow: t.palette.mode==='dark'? '0 1px 3px rgba(0,0,0,0.7)':'0 1px 2px rgba(0,0,0,0.05)',
        transition:'box-shadow .2s, border-color .2s, background .25s', 
        minWidth: 650, /* further widened card */
        '&:hover': {
          borderColor: t.palette.primary.main,
          boxShadow: t.palette.mode==='dark'? '0 4px 14px -4px rgba(0,0,0,0.85)': '0 4px 10px -2px rgba(0,0,0,0.12)'
        }
      })}
    >
      {/* Decorative diagonal photo background */}
      {photoUrl && (
        <Box aria-hidden='true' sx={(t)=>({
          position:'absolute',
          inset:0,
          pointerEvents:'none',
          '&:before': {
            content:'""',
            position:'absolute',
            top:0,
            right:0,
            bottom:0,
            left:'45%', // start image roughly mid card
            backgroundImage:`url(${photoUrl})`,
            backgroundSize:'cover',
            backgroundPosition:'center',
            opacity: t.palette.mode==='dark'? 0.18:0.22,
            filter:'grayscale(15%) saturate(105%) contrast(105%)',
            /* Create a 45deg diagonal dividing line: polygon from mid-top to right-top to right-bottom to mid-bottom */
            clipPath:'polygon(55% 0%, 100% 0%, 100% 100%, 45% 100%)',
            transition:'opacity .3s'
          },
          '&:after': {
            content:'""',
            position:'absolute',
            inset:0,
            background: t.palette.mode==='dark'? 'linear-gradient(90deg, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.55) 95%)':'linear-gradient(90deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.85) 95%)',
            mixBlendMode: t.palette.mode==='dark'? 'normal':'multiply',
            pointerEvents:'none'
          }
        })} />
      )}
      {/* Category Bar */}
  <Box sx={{ position:'absolute', top:0, left:0, bottom:0, width:4, background: catInfo.bg, opacity:.95, borderRadius:'3px 0 0 3px' }} />
  <CardContent sx={{ pl:2, pr:1.5, py:1.5, flex:1, display:'flex', flexDirection:'column', gap:1.5, minHeight:120, pb:6 }}> {/* increased minHeight & extra bottom padding */}
        {/* Top row: Destination name (left) then meta chips then actions (right) */}
        <Box sx={{ display:'flex', alignItems:'center', width:'100%' }}>
          {/* Name (constrained to max 35% width) */}
          <Box sx={{ pr:2, display:'flex', alignItems:'center', flex:'0 0 35%', maxWidth:'35%', minWidth:0, overflow:'hidden' }}>
            {editing ? (
              <InputBase
                value={localName}
                autoFocus
                onChange={e=> setLocalName(e.target.value)}
                onBlur={commitName}
                onKeyDown={handleKey}
                multiline
                maxRows={3}
                sx={{
                  fontSize:20,
                  fontWeight:700,
                  lineHeight:1.2,
                  px:0.5,
                  py:0.25,
                  borderRadius:1,
                  border:(t)=>`1px solid ${t.palette.divider}`,
                  background:(t)=> t.palette.background.paper,
                  boxShadow:'none',
                  width:'100%',
                  overflow:'hidden'
                }}
              />
            ) : (
              <Typography
                variant='h6'
                onDoubleClick={()=> setEditing(true)}
                sx={{
                  fontSize:20,
                  fontWeight:700,
                  lineHeight:1.2,
                  cursor:'text',
                  userSelect:'text',
                  textDecoration: completed? 'line-through':'none',
                  color: completed? 'text.secondary':'text.primary',
                  display:'-webkit-box',
                  WebkitLineClamp:3,
                  WebkitBoxOrient:'vertical',
                  overflow:'hidden',
                  wordBreak:'break-word'
                }}
              >
                {name}
              </Typography>
            )}
          </Box>
          {/* Meta chips */}
          <Box sx={{ display:'flex', alignItems:'center', gap:0.75, flexWrap:'wrap', flexShrink:1, minWidth:0, maxWidth:'38%' }}>
            <Chip
              size='small'
              onClick={(e)=> { e.stopPropagation(); }}
              label={
                <Box sx={{ display:'flex', alignItems:'center', gap:0.5, fontWeight:600 }}>
                  <Box component='button' type='button' onClick={(ev)=> { ev.stopPropagation(); onChangeNights?.(id, -1); }} disabled={nights<=1} style={{ border:'none', background:'transparent', cursor: nights>1? 'pointer':'not-allowed', padding:0, lineHeight:1, fontSize:14, opacity:nights>1?1:.4, fontWeight:700 }}>−</Box>
                  <span style={{ fontWeight:600 }}>{nights} night{nights!==1?'s':''}</span>
                  <Box component='button' type='button' onClick={(ev)=> { ev.stopPropagation(); onChangeNights?.(id, +1); }} style={{ border:'none', background:'transparent', cursor:'pointer', padding:0, lineHeight:1, fontSize:14, fontWeight:700 }}>＋</Box>
                </Box>
              }
              sx={{ fontSize:11, height:22, fontWeight:600 }}
            />
            <Chip size='small' label={`${dateFmt(startDate)} – ${dateFmt(endDate)}`} variant='outlined' sx={{ fontSize:11, height:22, fontWeight:600 }} />
            <Chip size='small' onClick={openCategory} label={catInfo.label} sx={{ fontSize:11, height:22, bgcolor:catInfo.bg, color:catInfo.fg, '&:hover':{ bgcolor:catInfo.bg } }} icon={<Box component='span' sx={{ display:'flex', alignItems:'center', fontSize:16, color:catInfo.fg }}>{catInfo.icon}</Box>} />
            {completed && <Chip size='small' label='Completed' color='success' sx={{ fontSize:11, height:22 }} />}
          </Box>
          {/* Spacer */}
          <Box sx={{ flex:1 }} />
          {/* Action buttons */}
          <Box sx={{ display:'flex', alignItems:'center', gap:.5, ml:1 }}>
            <Tooltip title={completed? 'Mark incomplete':'Mark complete'}>
              <IconButton size='small' onClick={()=> onToggleComplete?.(id)} sx={(t)=>({ color:t.palette.text.secondary })}>
                {completed? <CheckCircleOutlineIcon fontSize='small' color='success' />: <RadioButtonUncheckedIcon fontSize='small' />}
              </IconButton>
            </Tooltip>
            <Tooltip title='Duplicate'>
              <IconButton size='small' onClick={()=> onDuplicate?.(id)} sx={(t)=>({ color:t.palette.text.secondary })}>
                <ContentCopyIcon fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Delete'>
              <IconButton size='small' onClick={()=> onRemove?.(id)} sx={(t)=>({ color:t.palette.text.secondary, '&:hover':{ color:t.palette.error.main } })}>
                <DeleteIcon fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='More'>
              <IconButton size='small' onClick={openMenu} sx={(t)=>({ color:t.palette.text.secondary })}>
                <MoreVertIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Action chips repositioned to bottom-right corner */}
        <Box sx={{ position:'absolute', right:12, bottom:10, display:'flex', alignItems:'center', gap:1, flexWrap:'nowrap' }}>
          {/* Discover chip with count (spots + foods) */}
          <Tooltip title='Discover spots & foods'>
            <Box sx={{ position:'relative' }}>
              <Chip onClick={()=> onOpenDiscover?.(id)} icon={<ExploreIcon color={(spots?.length||0)+(foods?.length||0)>0? 'primary': 'inherit'} />} label='Discover' size='small' sx={(t)=>({ cursor:'pointer', fontWeight:600, bgcolor: ((spots?.length||0)+(foods?.length||0)>0)? (t.palette.mode==='dark'? t.palette.primary.main+'22': t.palette.primary.light+'33') : (t.palette.mode==='dark'? t.palette.grey[800]: t.palette.grey[100]), color: ((spots?.length||0)+(foods?.length||0)>0)? t.palette.primary.main: t.palette.text.secondary })} />
              {((spots?.length||0)+(foods?.length||0))>0 && (
                <Box sx={(t)=>({ position:'absolute', top:-4, right:-4, background:t.palette.primary.main, color:t.palette.primary.contrastText, minWidth:18, height:18, px:0.5, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, boxShadow:'0 0 0 2px '+t.palette.background.paper })}>{(spots?.length||0)+(foods?.length||0)}</Box>
              )}
            </Box>
          </Tooltip>
          {/* Stay chip shows count of filled fields */}
          <Tooltip title='Stay / accommodation info'>
            <Box sx={{ position:'relative' }}>
              <Chip onClick={()=> onOpenStay?.(id)} icon={<HotelIcon color={(stay?.name||stay?.reference||stay?.notes)? 'primary':'inherit'} />} label='Stay' size='small' sx={(t)=>({ cursor:'pointer', fontWeight:600, bgcolor:(stay?.name||stay?.reference||stay?.notes)? (t.palette.mode==='dark'? t.palette.primary.main+'22': t.palette.primary.light+'33'):(t.palette.mode==='dark'? t.palette.grey[800]: t.palette.grey[100]), color:(stay?.name||stay?.reference||stay?.notes)? t.palette.primary.main: t.palette.text.secondary })} />
              {((stay?.name?1:0)+(stay?.reference?1:0)+(stay?.notes?1:0))>0 && (
                <Box sx={(t)=>({ position:'absolute', top:-4, right:-4, background:t.palette.primary.main, color:t.palette.primary.contrastText, minWidth:18, height:18, px:0.5, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, boxShadow:'0 0 0 2px '+t.palette.background.paper })}>{(stay?.name?1:0)+(stay?.reference?1:0)+(stay?.notes?1:0)}</Box>
              )}
            </Box>
          </Tooltip>
          {/* Docs chip with doc count */}
          <Tooltip title='Documents'>
            <Box sx={{ position:'relative' }}>
              <Chip onClick={()=> onOpenDocs?.(id)} icon={<UploadFileIcon color={(docs?.length||0)>0? 'primary':'inherit'} />} label='Docs' size='small' sx={(t)=>({ cursor:'pointer', fontWeight:600, bgcolor:(docs?.length||0)>0? (t.palette.mode==='dark'? t.palette.primary.main+'22': t.palette.primary.light+'33'):(t.palette.mode==='dark'? t.palette.grey[800]: t.palette.grey[100]), color:(docs?.length||0)>0? t.palette.primary.main: t.palette.text.secondary })} />
              {(docs?.length||0)>0 && (
                <Box sx={(t)=>({ position:'absolute', top:-4, right:-4, background:t.palette.primary.main, color:t.palette.primary.contrastText, minWidth:18, height:18, px:0.5, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, boxShadow:'0 0 0 2px '+t.palette.background.paper })}>{docs!.length}</Box>
              )}
            </Box>
          </Tooltip>
            {/* Notes chip highlight if notes exist */}
          <Tooltip title='Notes'>
            <Chip onClick={()=> onOpenNotes?.(id)} icon={<NotesIcon color={notes? 'primary':'inherit'} />} label='Notes' size='small' sx={(t)=>({ cursor:'pointer', fontWeight:600, bgcolor:notes? (t.palette.mode==='dark'? t.palette.primary.main+'22': t.palette.primary.light+'33'):(t.palette.mode==='dark'? t.palette.grey[800]: t.palette.grey[100]), color:notes? t.palette.primary.main: t.palette.text.secondary })} />
          </Tooltip>
          {/* Alerts chip (replaces Share) - currently placeholder count 0 */}
          <Tooltip title='Alerts'>
            <Chip onClick={()=> {/* future alerts */}} icon={<WarningAmberIcon color='warning' />} label='Alerts' size='small' sx={(t)=>({ cursor:'pointer', fontWeight:600, bgcolor: t.palette.mode==='dark'? t.palette.warning.main+'22':'#fef3c7', color: t.palette.mode==='dark'? t.palette.warning.light : '#92400e' })} />
          </Tooltip>
        </Box>
      </CardContent>
      {/* Overflow Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} elevation={3}>
        <MenuItem disabled dense sx={{ fontSize:12, opacity:.7 }}>More Actions</MenuItem>
        <MenuItem onClick={()=> { closeMenu(); setEditing(true); }}>Rename</MenuItem>
        <MenuItem onClick={()=> { closeMenu(); onDuplicate?.(id); }}>Duplicate</MenuItem>
        <MenuItem onClick={()=> { closeMenu(); onToggleComplete?.(id); }}>{completed? 'Mark Incomplete':'Mark Complete'}</MenuItem>
        <MenuItem onClick={()=> { closeMenu(); onRemove?.(id); }} sx={{ color:'error.main' }}>Delete</MenuItem>
      </Menu>
      {/* Category Menu */}
      <Menu anchorEl={catAnchor} open={Boolean(catAnchor)} onClose={closeCategory} elevation={3}>
        {(Object.keys(CATEGORY_COLORS) as Array<keyof typeof CATEGORY_COLORS>).map(key => (
          <MenuItem key={key} selected={category===key} onClick={()=> { closeCategory(); onChangeCategory?.(id, key); }}>
            <Box sx={{ width:14, height:14, borderRadius:.5, bgcolor:CATEGORY_COLORS[key].bg, mr:1 }} />
            <Typography variant='body2'>{CATEGORY_COLORS[key].label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </Card>
  );
};

export default DestinationCard;
