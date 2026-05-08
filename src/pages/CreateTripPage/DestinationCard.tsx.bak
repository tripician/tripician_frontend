import React from 'react';
import { Box, Card, CardContent, Typography, IconButton, Tooltip, Chip, Collapse, TextField, InputBase, Popover } from '@mui/material';
import { motion } from 'framer-motion';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import HotelIcon from '@mui/icons-material/Hotel';
import AttractionsIcon from '@mui/icons-material/Attractions';
import LabelIcon from '@mui/icons-material/Label';
import ExploreIcon from '@mui/icons-material/Explore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { PlannerDestination } from '../../store/plannerSlice';
import { type DestinationAlert, ALERT_META } from '../../services/APIs/alerts/alertService';

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
  onChangeNotes?: (id: string, notes: string) => void;
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
  alertCount?: number;
  alerts?: DestinationAlert[];
}

const MotionCard = motion.create(Card);

const DestinationCard: React.FC<DestinationCardProps> = ({ destination, disabled, onRename, onToggleComplete, onDuplicate, onRemove, onOpenNotes, onChangeNotes, onOpenDiscover, onOpenDocs, onOpenStay, onChangeNights, alertCount = 0, alerts = [] }) => {
  const { id, name, startDate, endDate, nights, category='general', completed, notes, spots, foods, stay, stays, docs } = destination as any;
  const [editing, setEditing] = React.useState(false);
  const [localName, setLocalName] = React.useState(name);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [alertAnchor, setAlertAnchor] = React.useState<HTMLElement | null>(null);

  React.useEffect(()=> setLocalName(name), [name]);

  const commitName = () => { if(localName.trim() && localName !== name) onRename?.(id, localName.trim()); setEditing(false); };
  const handleKey: React.KeyboardEventHandler<HTMLInputElement> = (e) => { if(e.key==='Enter') { commitName(); } else if(e.key==='Escape'){ setLocalName(name); setEditing(false);} };

  const catKey = (category || 'general') as NonNullable<PlannerDestination['category']>;
  const catInfo = CATEGORY_COLORS[catKey];
  const dateFmt = (iso?: string) => { if(!iso) return ''; try { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString(undefined, { month:'short', day:'2-digit' }); } catch { return iso || ''; } };

  return (
    <MotionCard
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(255,56,92,0.15)' }}
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
            { key:'alerts',   icon:<WarningAmberIcon sx={{fontSize:13}}/>, tip:alertCount>0?`${alertCount} alert${alertCount>1?'s':''}  — click to view`:'No alerts',   count:alertCount,            onClick:(e: React.MouseEvent<HTMLElement>)=>{ if(alertCount>0) setAlertAnchor(e.currentTarget); },                   active:alertCount>0,           warn:true,  disabled:false },
          ];
          return (
            <Box onClick={e=>e.stopPropagation()} sx={{ display:'flex', alignItems:'center', gap:.1, borderLeft:(t)=>`1px solid ${t.palette.divider}`, pl:.75, mr:.25 }}>
              {strip.map(s=>(
                <Tooltip key={s.key} title={s.tip} enterDelay={400}>
                  <Box onClick={s.disabled?undefined:(e: any)=>{ e.stopPropagation(); s.onClick(e); }} sx={(t)=>({
                    position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
                    width:28, height:28, borderRadius:'8px', cursor:s.disabled?'default':'pointer',
                    color: s.warn&&s.count>0?'#ef4444':s.warn?(t.palette.mode==='dark'?'#fbbf24':'#d97706'):s.active?'#FF385C':t.palette.text.disabled,
                    transition:'background .12s, color .12s',
                    '&:hover': s.disabled?{}:{ background:s.warn?'rgba(217,119,6,0.1)':'rgba(255,56,92,0.08)', color:s.warn?'#b45309':'#E31C5F' },
                    ...(s.warn&&s.count>0?{ '@keyframes alertPulse':{ '0%,100%':{ filter:'drop-shadow(0 0 3px rgba(239,68,68,0.6))' }, '50%':{ filter:'drop-shadow(0 0 8px rgba(239,68,68,0.9))' } }, animation:'alertPulse 1.8s ease-in-out infinite' }:{})
                  })}>
                    {s.icon}
                    {s.count>0 && <Box sx={{ position:'absolute', top:3, right:3, background:s.warn?'#ef4444':'#FF385C', color:'#fff', borderRadius:'50%', width:8, height:8, fontSize:0, ...(s.warn?{ '@keyframes alertDot':{ '0%,100%':{ opacity:1 }, '50%':{ opacity:.3 } }, animation:'alertDot 1.2s ease-in-out infinite' }:{}) }} />}
                  </Box>
                </Tooltip>
              ))}
            </Box>
          );
        })()}

        {/* ── Dropdown arrow for notes ── */}
        <Tooltip title={notesOpen ? 'Hide notes' : (notes ? 'Show notes' : 'Add notes')} enterDelay={400}>
          <IconButton size='small' onClick={(e) => { e.stopPropagation(); setNotesOpen(v => !v); }} sx={{ p: .45, color: notes ? '#FF385C' : 'text.disabled', transition: 'transform .2s, color .15s', transform: notesOpen ? 'rotate(180deg)' : 'rotate(0deg)', '&:hover': { color: '#FF385C' } }}>
            <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        {/* ── Delete (visible on hover) ── */}
        {onRemove && (
          <Tooltip title='Remove destination' enterDelay={400}>
            <IconButton size='small' onClick={(e) => { e.stopPropagation(); onRemove(id); }} sx={{ p: .45, opacity: 0, transition: 'opacity .15s, color .15s', color: 'text.disabled', '.MuiCard-root:hover &': { opacity: 1 }, '&:hover': { color: '#ef4444' } }}>
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}

      </CardContent>

      {/* ── Alerts popover ── */}
      <Popover
        open={!!alertAnchor}
        anchorEl={alertAnchor}
        onClose={() => setAlertAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { mt: 1, borderRadius: '12px', maxWidth: 340, minWidth: 260, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden' } } }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon sx={{ fontSize: 16, color: '#ef4444' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{alertCount} Alert{alertCount !== 1 ? 's' : ''}</Typography>
        </Box>
        <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
          {alerts.map((a) => {
            const meta = ALERT_META[a.type];
            return (
              <Box key={a.id} sx={{ px: 2, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: 'action.hover' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: .75, mb: .4 }}>
                  <Box sx={{ fontSize: 12 }}>{meta.emoji}</Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: .5 }}>{a.type}</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35, mb: .3 }}>{a.title}</Typography>
                {a.summary && <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.summary}</Typography>}
              </Box>
            );
          })}
        </Box>
      </Popover>

      {/* ── Expandable notes section ── */}
      <Collapse in={notesOpen} timeout={200} unmountOnExit>
        <Box sx={{ px: 2, pb: 1.5, pt: 0.5 }}>
          <TextField
            multiline
            minRows={2}
            maxRows={6}
            fullWidth
            placeholder='Write notes for this destination...'
            value={notes || ''}
            onChange={(e) => onChangeNotes?.(id, e.target.value)}
            variant='outlined'
            size='small'
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: 12,
                borderRadius: '8px',
                bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                '& fieldset': { borderColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                '&:hover fieldset': { borderColor: 'rgba(255,56,92,0.3)' },
                '&.Mui-focused fieldset': { borderColor: '#FF385C', borderWidth: '1.5px' },
              },
            }}
          />
        </Box>
      </Collapse>
    </MotionCard>
  );
};

export default DestinationCard;
