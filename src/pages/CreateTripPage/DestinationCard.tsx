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

const DestinationCard: React.FC<DestinationCardProps> = ({ destination, disabled, onRename, onToggleComplete, onDuplicate, onRemove, onOpenNotes, onOpenDiscover, onOpenDocs, onOpenStay, onChangeNights }) => {
  const { id, name, startDate, endDate, nights, category='general', completed, notes, spots, foods, stay, stays, docs } = destination as any;
  const [editing, setEditing] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [localName, setLocalName] = React.useState(name);

  React.useEffect(()=> setLocalName(name), [name]);

  const openMenu = (e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); };
  const closeMenu = () => setMenuAnchor(null);

  const commitName = () => { if(localName.trim() && localName !== name) onRename?.(id, localName.trim()); setEditing(false); };
  const handleKey: React.KeyboardEventHandler<HTMLInputElement> = (e) => { if(e.key==='Enter') { commitName(); } else if(e.key==='Escape'){ setLocalName(name); setEditing(false);} };

  const catKey = (category || 'general') as NonNullable<PlannerDestination['category']>;
  const catInfo = CATEGORY_COLORS[catKey];
  const dateFmt = (iso?: string) => { if(!iso) return ''; try { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString(undefined, { month:'short', day:'2-digit' }); } catch { return iso || ''; } };

  return (
    <Card
      elevation={0}
      sx={(t)=>({
        position:'relative', overflow:'hidden', opacity: disabled? .6:1,
        display:'flex', flexDirection:'column',
        borderRadius:'10px',
        border:`1px solid ${t.palette.mode==='dark'? 'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)'}`,
        background: t.palette.mode==='dark'? t.palette.background.paper : '#fff',
        boxShadow: t.palette.mode==='dark'? '0 1px 4px rgba(0,0,0,0.5)':'0 1px 4px rgba(0,0,0,0.05)',
        '&:hover': {
          borderColor:'rgba(255,56,92,0.35)',
          boxShadow: t.palette.mode==='dark'? '0 6px 24px rgba(0,0,0,0.5)':'0 4px 20px rgba(255,56,92,0.12)',
          transform:'translateY(-1px)',
        }
      })}
    >
      {/* Rose accent bar */}
      <Box sx={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:'linear-gradient(180deg,#FF385C,#E31C5F)', borderRadius:'3px 0 0 3px', pointerEvents:'none' }} />
      <CardContent sx={{ pl:2, pr:.5, py:'0 !important', minHeight:48, display:'flex', alignItems:'center', gap:.75 }}>

        {/* ── Name ── */}
        <Box sx={{ flex:'1 1 100px', minWidth:60, maxWidth:'34%', overflow:'hidden' }}>
          {editing ? (
            <InputBase value={localName} autoFocus onChange={e=>setLocalName(e.target.value)} onBlur={commitName} onKeyDown={handleKey}
              sx={{ fontSize:14, fontWeight:700, width:'100%', px:.5, py:.15, border:(t)=>`1px solid ${t.palette.divider}`, borderRadius:1, background:(t)=>t.palette.background.paper }} />
          ) : (
            <Typography onDoubleClick={()=>setEditing(true)} noWrap sx={{ fontSize:14, fontWeight:700, cursor:'text', lineHeight:1.2,
              textDecoration:completed?'line-through':'none', color:completed?'text.disabled':'text.primary' }}>{name}</Typography>
          )}
        </Box>

        <Box sx={{ flex:1 }} />

        {/* ── Nights pill ── */}
        <Box onClick={e=>e.stopPropagation()} sx={{ display:'flex', alignItems:'center', background:'rgba(255,56,92,0.07)', border:'1px solid rgba(255,56,92,0.20)', borderRadius:20, px:.6, height:22, gap:.25, flexShrink:0 }}>
          <Box component='button' type='button' onClick={(e:any)=>{e.stopPropagation();onChangeNights?.(id,-1);}} disabled={nights<=1}
            style={{ border:'none',background:'transparent',cursor:nights>1?'pointer':'default',padding:'0 2px',fontSize:12,fontWeight:800,color:'#FF385C',opacity:nights>1?1:.3,lineHeight:1 }}>−</Box>
          <Typography sx={{ fontSize:11, fontWeight:700, color:'#FF385C', lineHeight:1, whiteSpace:'nowrap', px:.2 }}>{nights}n</Typography>
          <Box component='button' type='button' onClick={(e:any)=>{e.stopPropagation();onChangeNights?.(id,+1);}}
            style={{ border:'none',background:'transparent',cursor:'pointer',padding:'0 2px',fontSize:12,fontWeight:800,color:'#FF385C',lineHeight:1 }}>+</Box>
        </Box>

        {/* ── Date pill ── */}
        <Box sx={(t)=>({ height:22, px:.8, borderRadius:20, border:`1px solid ${t.palette.divider}`, fontSize:11, fontWeight:600, whiteSpace:'nowrap', flexShrink:0, color:t.palette.text.secondary, display:'flex', alignItems:'center' })}>
          {dateFmt(startDate)} – {dateFmt(endDate)}
        </Box>

        {completed && <Chip size='small' label='✓' color='success' sx={{ height:16, minWidth:0, fontSize:10, fontWeight:700, '& .MuiChip-label':{ px:.6 } }} />}

        {/* ── Feature icon strip (icon-only, tooltip labels) ── */}
        {(()=>{
          const discoverCount=(spots?.length||0)+(foods?.length||0);
          const stayCount=Array.isArray(stays)?stays.length:((stay?.name||stay?.reference||stay?.notes)?1:0);
          const docsCount=docs?.length||0;
          const strip=[
            { key:'discover', icon:<ExploreIcon sx={{fontSize:13}}/>,    tip:'Discover',  count:discoverCount, onClick:()=>onOpenDiscover?.(id), active:discoverCount>0, warn:false, disabled:true  },
            { key:'stay',     icon:<HotelIcon sx={{fontSize:13}}/>,       tip:'Stay',      count:stayCount,    onClick:()=>onOpenStay?.(id),     active:stayCount>0,    warn:false, disabled:true  },
            { key:'docs',     icon:<UploadFileIcon sx={{fontSize:13}}/>,   tip:'Docs',      count:docsCount,    onClick:()=>onOpenDocs?.(id),     active:docsCount>0,    warn:false, disabled:true  },
            { key:'notes',    icon:<NotesIcon sx={{fontSize:13}}/>,       tip:'Notes',     count:0,            onClick:()=>onOpenNotes?.(id),    active:!!notes, warn:false, disabled:false },
            { key:'alerts',   icon:<WarningAmberIcon sx={{fontSize:13}}/>, tip:'Alerts',   count:0,            onClick:()=>{},                   active:true,           warn:true,  disabled:false },
          ];
          return (
            <Box onClick={e=>e.stopPropagation()} sx={{ display:'flex', alignItems:'center', gap:.1, borderLeft:(t)=>`1px solid ${t.palette.divider}`, pl:.75, mr:.25 }}>
              {strip.map(s=>(
                <Tooltip key={s.key} title={s.tip} enterDelay={400}>
                  <Box onClick={s.disabled?undefined:(e)=>{ e.stopPropagation(); s.onClick(); }} sx={(t)=>({
                    position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
                    width:28, height:28, borderRadius:'8px', cursor:s.disabled?'default':'pointer',
                    color: s.warn?(t.palette.mode==='dark'?'#fbbf24':'#d97706'):s.active?'#FF385C':t.palette.text.disabled,
                    transition:'background .12s, color .12s',
                    '&:hover': s.disabled?{}:{ background:s.warn?'rgba(217,119,6,0.1)':'rgba(255,56,92,0.08)', color:s.warn?'#b45309':'#E31C5F' }
                  })}>
                    {s.icon}
                    {s.count>0 && <Box sx={{ position:'absolute', top:3, right:3, background:s.warn?'#d97706':'#FF385C', color:'#fff', borderRadius:'50%', width:8, height:8, fontSize:0 }} />}
                  </Box>
                </Tooltip>
              ))}
            </Box>
          );
        })()}

        {/* ── Management icons ── */}
        <Box onClick={e=>e.stopPropagation()} sx={{ display:'flex', alignItems:'center', borderLeft:(t)=>`1px solid ${t.palette.divider}`, pl:.5 }}>
          <Tooltip title={completed?'Mark incomplete':'Mark complete'}>
            <IconButton size='small' onClick={(e)=>{ e.stopPropagation(); onToggleComplete?.(id); }} sx={{ p:.45, color:'text.disabled', '&:hover':{ color:'success.main' } }}>
              {completed?<CheckCircleOutlineIcon sx={{fontSize:15}} color='success'/>:<RadioButtonUncheckedIcon sx={{fontSize:15}}/>}
            </IconButton>
          </Tooltip>
          <Tooltip title='Duplicate'>
            <IconButton size='small' onClick={(e)=>{ e.stopPropagation(); onDuplicate?.(id); }} sx={{ p:.45, color:'text.disabled', '&:hover':{ color:'text.secondary' } }}>
              <ContentCopyIcon sx={{fontSize:13}}/>
            </IconButton>
          </Tooltip>
          <Tooltip title='Delete'>
            <IconButton size='small' onClick={(e)=>{ e.stopPropagation(); onRemove?.(id); }} sx={{ p:.45, color:'text.disabled', '&:hover':{ color:'error.main' } }}>
              <DeleteIcon sx={{fontSize:14}}/>
            </IconButton>
          </Tooltip>
          <Tooltip title='More'>
            <IconButton size='small' onClick={(e)=>{ e.stopPropagation(); openMenu(e); }} sx={{ p:.45, color:'text.disabled', '&:hover':{ color:'text.secondary' } }}>
              <MoreVertIcon sx={{fontSize:15}}/>
            </IconButton>
          </Tooltip>
        </Box>

      </CardContent>
      {/* Overflow Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} elevation={3} PaperProps={{ sx:{ borderRadius:2, minWidth:160 } }}>
        <MenuItem disabled dense sx={{ fontSize:12, opacity:.6, fontWeight:600 }}>Actions</MenuItem>
        <MenuItem dense onClick={()=>{ closeMenu(); setEditing(true); }}>Rename</MenuItem>
        <MenuItem dense onClick={()=>{ closeMenu(); onDuplicate?.(id); }}>Duplicate</MenuItem>
        <MenuItem dense onClick={()=>{ closeMenu(); onToggleComplete?.(id); }}>{completed?'Mark Incomplete':'Mark Complete'}</MenuItem>
        <MenuItem dense onClick={()=>{ closeMenu(); onRemove?.(id); }} sx={{ color:'error.main' }}>Delete</MenuItem>
      </Menu>
    </Card>
  );
};

export default DestinationCard;
