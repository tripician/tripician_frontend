import React from 'react';
import { Box, Card, Typography, IconButton, Tooltip, TextField, InputBase, Popover } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchUnsplashImage } from '../../services/unsplashService';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HotelIcon from '@mui/icons-material/Hotel';
import AttractionsIcon from '@mui/icons-material/Attractions';
import LabelIcon from '@mui/icons-material/Label';
import ExploreIcon from '@mui/icons-material/Explore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import type { PlannerDestination, PlannerSpot } from '../../store/plannerSlice';
import { type DestinationAlert, ALERT_META } from '../../services/APIs/alerts/alertService';

const CATEGORY_COLORS: Record<NonNullable<PlannerDestination['category']>, { bg: string; fg: string; icon: React.ReactNode; label: string }> = {
  general:      { bg: '#334155', fg: '#fff', icon: <LabelIcon fontSize='inherit' />,       label: 'General'      },
  must_visit:   { bg: '#16a34a', fg: '#fff', icon: <AttractionsIcon fontSize='inherit' />, label: 'Must Visit'   },
  skippable:    { bg: '#64748b', fg: '#fff', icon: <LabelIcon fontSize='inherit' />,       label: 'Skippable'    },
  tentative:    { bg: '#ea580c', fg: '#fff', icon: <LabelIcon fontSize='inherit' />,       label: 'Tentative'    },
  decide_later: { bg: '#7c3aed', fg: '#fff', icon: <LabelIcon fontSize='inherit' />,       label: 'Decide Later' },
};

export interface DestinationCardProps {
  destination: PlannerDestination;
  index?: number;
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
  onSuggestAI?: (id: string) => void;
  onOpenDiscover?: (id: string) => void;
  onOpenDocs?: (id: string) => void;
  onOpenStay?: (id: string) => void;
  onChangeNights?: (id: string, delta: number) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnter?: (id: string) => void;
  onDragEnd?: () => void;
  alertCount?: number;
  alerts?: DestinationAlert[];
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  checklist?: DestinationCardChecklist;
  onChecklistChange?: (id: string, cl: DestinationCardChecklist) => void;
  onRequestNaviaTip?: (name: string) => void;
}

export interface DestinationCardChecklist {
  accommodation: boolean;
  transport: boolean;
  activities: boolean;
}

const MotionCard = motion.create(Card);



/* 6-dot drag grid rendered as white dots on the photo */
const DragDots = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
    {[0, 1, 2].map(row => (
      <Box key={row} sx={{ display: 'flex', gap: '4px' }}>
        {[0, 1].map(col => (
          <Box key={col} sx={{ width: 3.5, height: 3.5, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.92)', boxShadow: '0 1px 2px rgba(0,0,0,0.5)' }} />
        ))}
      </Box>
    ))}
  </Box>
);

const DestinationCard: React.FC<DestinationCardProps> = ({
  destination, disabled, onRename, onRemove, onChangeNotes,
  onOpenDiscover, onOpenStay, onChangeNights,
  alertCount = 0, alerts = [], isDragging = false, dragHandleProps, onRequestNaviaTip,
}) => {
  const { id, name, startDate, endDate, nights, category = 'general', completed, notes, spots, foods, stay, stays } = destination as any;

  const [editing, setEditing]             = React.useState(false);
  const [localName, setLocalName]         = React.useState(name);
  const [alertAnchor, setAlertAnchor]     = React.useState<HTMLElement | null>(null);
  const [resolvedPhoto, setResolvedPhoto] = React.useState<string | null>((destination as any).photoUrl || null);
  const [naviaThinking, setNaviaThinking] = React.useState(false);
  const [activePanel, setActivePanel] = React.useState<'spots' | 'stay' | 'notes' | null>(null);

  React.useEffect(() => {
    const photo = (destination as any).photoUrl;
    if (photo) { setResolvedPhoto(photo); return; }
    let cancelled = false;
    fetchUnsplashImage(name).then(url => { if (!cancelled && url) setResolvedPhoto(url); });
    return () => { cancelled = true; };
  }, [(destination as any).photoUrl, name]);

  React.useEffect(() => setLocalName(name), [name]);

  React.useEffect(() => {
    const handler = () => setNaviaThinking(false);
    window.addEventListener('navia:response', handler);
    return () => window.removeEventListener('navia:response', handler);
  }, []);

  const commitName = () => {
    if (localName.trim() && localName !== name) onRename?.(id, localName.trim());
    setEditing(false);
  };
  const handleKey: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === 'Enter') commitName();
    else if (e.key === 'Escape') { setLocalName(name); setEditing(false); }
  };

  const catKey  = (category || 'general') as NonNullable<PlannerDestination['category']>;
  const catInfo = CATEGORY_COLORS[catKey];
  const naviaMsg = `Plan my stop in ${name} in detail. Suggest the top 3 must-visit spots with a one-line description each, the best local food to try, the ideal accommodation type for my travel vibe, and any hidden gem most tourists miss. Format it clearly so I can use it directly in my plan.`;

  const dateFmt = (iso?: string) => {
    if (!iso) return '';
    try { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    catch { return iso || ''; }
  };

  const hasNotes      = !!(notes && notes.trim());
  const discoverCount = (spots?.length || 0) + (foods?.length || 0);
  const stayCount     = Array.isArray(stays) ? stays.length : ((stay?.name || stay?.reference || stay?.notes) ? 1 : 0);

  return (
    <MotionCard
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 16, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      whileHover={{ y: -2 }}
      elevation={0}
      sx={(t) => ({
        position: 'relative', overflow: 'hidden', opacity: disabled ? .55 : 1,
        display: 'flex', flexDirection: 'row',
        borderRadius: '14px',
        border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        background: t.palette.mode === 'dark' ? t.palette.background.paper : '#fff',
        boxShadow: t.palette.mode === 'dark'
          ? '0 2px 12px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3)'
          : '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        '&:hover': {
          borderColor: 'rgba(255,56,92,0.3)',
          boxShadow: t.palette.mode === 'dark'
            ? '0 4px 20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,56,92,0.18)'
            : '0 4px 24px rgba(0,0,0,0.09), 0 0 0 1px rgba(255,56,92,0.18)',
        },
      })}
    >
      {/* ── Photo panel + drag handle ── */}
      <Box
        {...(dragHandleProps || {})}
        sx={(t) => ({
          width: { xs: 62, sm: 76 }, flexShrink: 0, position: 'relative', overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          bgcolor: t.palette.mode === 'dark' ? '#1a1d22' : '#f1f3f5',
          // Category color tint when no photo
          ...(!resolvedPhoto ? { background: `linear-gradient(160deg, ${catInfo.bg}55, ${catInfo.bg}22)` } : {}),
        })}
      >
        {resolvedPhoto && (
          <>
            <Box component='img' src={resolvedPhoto} alt={name}
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {/* Dark scrim so drag dots are visible */}
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.45) 100%)' }} />
          </>
        )}

        {/* 6-dot drag indicator */}
        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: isDragging ? 1 : 0.5,
          transition: 'opacity .15s',
          '.MuiCard-root:hover &': { opacity: 0.9 },
        }}>
          <DragDots />
        </Box>

        {/* Category color pill at bottom of photo */}
        <Box sx={{
          position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
          bgcolor: catInfo.bg, borderRadius: '20px', px: .8, py: .2,
          fontSize: 8, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap',
          letterSpacing: '.3px', textTransform: 'uppercase', opacity: .9,
          maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center',
        }}>
          {catInfo.label}
        </Box>
      </Box>

      {/* ── Main content ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ── Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: .5, pl: 1.25, pr: .5, pt: .75, pb: .5, minHeight: 46, flexWrap: 'wrap' }}>

          {/* Name */}
          <Box sx={{ flex: '1 1 80px', minWidth: 50, overflow: 'hidden' }}>
            {editing ? (
              <InputBase
                value={localName} autoFocus
                onChange={e => setLocalName(e.target.value)}
                onBlur={commitName} onKeyDown={handleKey}
                sx={{ fontSize: 14, fontWeight: 700, width: '100%', px: .6, py: .15, border: (t) => `1.5px solid ${t.palette.primary.main}`, borderRadius: '8px', background: (t) => t.palette.background.paper }}
              />
            ) : (
              <Typography
                onDoubleClick={() => setEditing(true)} noWrap
                sx={{ fontSize: 14, fontWeight: 700, cursor: 'text', lineHeight: 1.2, letterSpacing: '-0.2px', textDecoration: completed ? 'line-through' : 'none', color: completed ? 'text.disabled' : 'text.primary' }}
              >
                {name}
              </Typography>
            )}
            {/* Quick prompt chips */}
            {/* Date range — shown below name on mobile only */}
            <Box sx={(t) => ({ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', mt: .25, height: 18, fontSize: 9.5, fontWeight: 600, color: t.palette.text.secondary, letterSpacing: '-0.1px', whiteSpace: 'nowrap' })}>
              {dateFmt(startDate)} → {dateFmt(endDate)}
            </Box>
            {!editing && onRequestNaviaTip && (
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: .35, flexWrap: 'nowrap', overflow: 'hidden', mt: .3 }}>
                {['Best time?', 'Top spots?', 'Pack?'].map(prompt => (
                  <Box
                    key={prompt}
                    onClick={(e) => { e.stopPropagation(); onRequestNaviaTip(`${name} - ${prompt}`); }}
                    sx={(t) => ({
                      fontSize: 9.5, fontWeight: 600, color: 'text.disabled', cursor: 'pointer', whiteSpace: 'nowrap',
                      px: .6, py: .15, borderRadius: '20px',
                      border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                      '&:hover': { color: '#FF385C', borderColor: 'rgba(255,56,92,0.35)', bgcolor: 'rgba(255,56,92,0.05)' },
                      transition: 'all .12s',
                    })}
                  >
                    {prompt}
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Nights +/- */}
          <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,56,92,0.07)', border: '1px solid rgba(255,56,92,0.2)', borderRadius: '20px', px: .5, height: 22, gap: .1, flexShrink: 0, mt: { xs: .2, sm: 0 } }}>
            <Box component='button' type='button'
              onClick={(e: any) => { e.stopPropagation(); onChangeNights?.(id, -1); }} disabled={nights <= 1}
              style={{ border: 'none', background: 'transparent', cursor: nights > 1 ? 'pointer' : 'default', padding: '0 3px', fontSize: 13, fontWeight: 900, color: '#FF385C', opacity: nights > 1 ? 1 : .3, lineHeight: 1 }}>
              -
            </Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#FF385C', lineHeight: 1, px: .15, letterSpacing: '-0.3px' }}>{nights}n</Typography>
            <Box component='button' type='button'
              onClick={(e: any) => { e.stopPropagation(); onChangeNights?.(id, +1); }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 3px', fontSize: 13, fontWeight: 900, color: '#FF385C', lineHeight: 1 }}>
              +
            </Box>
          </Box>

          {/* Date range */}
          <Box sx={(t) => ({ height: 22, px: .75, borderRadius: '20px', border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, color: t.palette.text.secondary, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', letterSpacing: '-0.2px' })}>
            {dateFmt(startDate)} &rarr; {dateFmt(endDate)}
          </Box>

          {/* Action icons */}
          <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center', gap: .25, ml: .25, flexShrink: 0 }}>

            {/* Alerts */}
            {alertCount > 0 && (
              <Tooltip title={`${alertCount} alert${alertCount > 1 ? 's' : ''}`} enterDelay={200}>
                <Box
                  onClick={(e: any) => { e.stopPropagation(); setAlertAnchor(e.currentTarget); }}
                  sx={{
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 26, height: 26, borderRadius: '8px', cursor: 'pointer',
                    color: '#ef4444',
                    '@keyframes warnPulse': { '0%,100%': { filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.5))' }, '50%': { filter: 'drop-shadow(0 0 7px rgba(239,68,68,0.85))' } },
                    animation: 'warnPulse 2s ease-in-out infinite',
                    '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' },
                    transition: 'background .12s',
                  }}
                >
                  <WarningAmberIcon sx={{ fontSize: 13 }} />
                  <Box sx={{ position: 'absolute', top: 3, right: 3, background: '#ef4444', borderRadius: '50%', width: 5, height: 5, '@keyframes dotBlink': { '0%,100%': { opacity: 1 }, '50%': { opacity: .25 } }, animation: 'dotBlink 1.4s ease-in-out infinite' }} />
                </Box>
              </Tooltip>
            )}

            {/* Delete on hover */}
            {onRemove && (
              <Tooltip title='Remove' enterDelay={400}>
                <IconButton size='small' onClick={(e) => { e.stopPropagation(); onRemove(id); }}
                  sx={{ p: .35, opacity: 0, transition: 'opacity .15s, color .15s', color: 'text.disabled', '.MuiCard-root:hover &': { opacity: 1 }, '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' } }}>
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>{/* end header */}

        {/* ── Tab pill bar ── */}
        <Box
          onClick={e => e.stopPropagation()}
          sx={(t) => ({
            display: 'flex', gap: .6, px: 1.25, pb: .85, pt: .35,
            borderTop: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
          })}
        >
          {(['spots', 'stay', 'notes'] as const).map(key => {
            const meta = {
              spots: { icon: <ExploreIcon sx={{ fontSize: 11 }} />, label: 'Spots', count: discoverCount },
              stay:  { icon: <HotelIcon sx={{ fontSize: 11 }} />,   label: 'Stay',  count: stayCount },
              notes: { icon: <EditNoteIcon sx={{ fontSize: 11 }} />, label: 'Notes', count: hasNotes ? 1 : 0 },
            }[key];
            const active = activePanel === key;
            return (
              <Box
                key={key}
                onClick={() => setActivePanel(p => p === key ? null : key)}
                sx={(t) => ({
                  display: 'flex', alignItems: 'center', gap: .35,
                  px: .85, height: 24, borderRadius: '20px', cursor: 'pointer', flexShrink: 0,
                  border: `1px solid ${active ? 'rgba(255,56,92,0.38)' : t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)'}`,
                  bgcolor: active ? 'rgba(255,56,92,0.08)' : 'transparent',
                  transition: 'all .15s',
                  '&:hover': { borderColor: 'rgba(255,56,92,0.3)', bgcolor: 'rgba(255,56,92,0.05)' },
                })}
              >
                <Box sx={{ color: active ? '#FF385C' : 'text.disabled', display: 'flex', alignItems: 'center', lineHeight: 1 }}>{meta.icon}</Box>
                <Typography sx={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? '#FF385C' : 'text.secondary', lineHeight: 1, letterSpacing: '-0.1px' }}>
                  {meta.label}
                </Typography>
                {meta.count > 0 && (
                  <Box sx={{ fontSize: 9, fontWeight: 700, bgcolor: active ? '#FF385C' : 'rgba(255,56,92,0.12)', color: active ? '#fff' : '#FF385C', borderRadius: '20px', px: .5, lineHeight: '16px', minWidth: 14, textAlign: 'center' }}>
                    {meta.count}
                  </Box>
                )}
              </Box>
            );
          })}

          {/* Navia button — right side */}
          {onRequestNaviaTip && (
            <Tooltip title={naviaThinking ? 'Navia is thinking...' : 'Ask Navia to plan this stop'} enterDelay={200}>
              <Box
                onClick={(e) => { e.stopPropagation(); if (!naviaThinking) { onRequestNaviaTip(naviaMsg); setNaviaThinking(true); } }}
                sx={{
                  ml: 'auto', flexShrink: 0,
                  display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: .35,
                  px: .85, height: 24, borderRadius: '20px', cursor: naviaThinking ? 'default' : 'pointer',
                  border: '1px solid rgba(255,56,92,0.3)',
                  background: 'linear-gradient(135deg, rgba(255,56,92,0.08), rgba(227,28,95,0.04))',
                  transition: 'all .15s',
                  '&:hover': naviaThinking ? {} : {
                    borderColor: 'rgba(255,56,92,0.55)',
                    background: 'linear-gradient(135deg, rgba(255,56,92,0.14), rgba(227,28,95,0.09))',
                  },
                  '@keyframes thinkBlink': { '0%,100%': { opacity: 1 }, '50%': { opacity: .4 } },
                  animation: naviaThinking ? 'thinkBlink 0.9s ease-in-out infinite' : 'none',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 11, color: '#FF385C' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#E31C5F', lineHeight: 1, letterSpacing: '-0.1px', whiteSpace: 'nowrap' }}>
                  {naviaThinking ? 'Thinking...' : 'Ask Navia'}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* ── Expanded panel ── */}
        <AnimatePresence initial={false}>
          {activePanel && (
            <motion.div
              key={activePanel}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <Box
                onClick={e => e.stopPropagation()}
                sx={(t) => ({
                  px: 1.5, pb: 1.25, pt: .75,
                  borderTop: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                })}
              >
                {/* Spots panel */}
                {activePanel === 'spots' && (() => {
                  const spotsList = (spots ?? []) as PlannerSpot[];
                  return (
                    <>
                      {spotsList.length === 0 ? (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.5, mb: 1 }}>
                          No spots added yet
                        </Typography>
                      ) : spotsList.map(spot => (
                        <Box key={spot.id} sx={{ display: 'flex', alignItems: 'center', gap: .6, py: .55, borderBottom: '0.5px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                          <Typography noWrap sx={{ fontSize: 12, flex: 1, color: 'text.primary', lineHeight: 1.3 }}>{spot.name}</Typography>
                          {spot.description && <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', maxWidth: 90, flexShrink: 0 }}>{spot.description}</Typography>}
                        </Box>
                      ))}
                      <Box
                        onClick={(e) => { e.stopPropagation(); onOpenDiscover?.(id); }}
                        sx={(t) => ({
                          display: 'inline-flex', alignItems: 'center', gap: .4, mt: .75,
                          px: 1, py: .35, borderRadius: '20px', cursor: 'pointer',
                          border: `1px dashed ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`,
                          color: 'text.secondary', fontSize: 11, fontWeight: 600,
                          transition: 'all .13s',
                          '&:hover': { borderColor: '#FF385C', color: '#FF385C', bgcolor: 'rgba(255,56,92,0.05)' },
                        })}
                      >
                        <Box sx={{ fontSize: 14, lineHeight: 1, fontWeight: 400 }}>+</Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1 }}>Add spot</Typography>
                      </Box>
                    </>
                  );
                })()}

                {/* Stay panel */}
                {activePanel === 'stay' && (() => {
                  const staysList = (Array.isArray(stays) && stays.length > 0
                    ? stays
                    : (stay?.name || stay?.reference || stay?.notes)
                      ? [{ id: 'legacy', name: stay.name as string | undefined, reference: (stay.reference || stay.notes) as string | undefined }]
                      : []) as Array<{ id: string; name?: string; reference?: string }>;
                  return (
                    <>
                      {staysList.length === 0 ? (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.5, mb: 1 }}>
                          No accommodation added yet
                        </Typography>
                      ) : staysList.map(s => (
                        <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: .6, py: .55, borderBottom: '0.5px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                          <Typography noWrap sx={{ fontSize: 12, flex: 1, color: 'text.primary', lineHeight: 1.3 }}>{s.name || 'Accommodation'}</Typography>
                          {s.reference && <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', maxWidth: 100, flexShrink: 0 }}>{s.reference}</Typography>}
                        </Box>
                      ))}
                      <Box
                        onClick={(e) => { e.stopPropagation(); onOpenStay?.(id); }}
                        sx={(t) => ({
                          display: 'inline-flex', alignItems: 'center', gap: .4, mt: .75,
                          px: 1, py: .35, borderRadius: '20px', cursor: 'pointer',
                          border: `1px dashed ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`,
                          color: 'text.secondary', fontSize: 11, fontWeight: 600,
                          transition: 'all .13s',
                          '&:hover': { borderColor: '#FF385C', color: '#FF385C', bgcolor: 'rgba(255,56,92,0.05)' },
                        })}
                      >
                        <Box sx={{ fontSize: 14, lineHeight: 1, fontWeight: 400 }}>+</Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1 }}>Add stay</Typography>
                      </Box>
                    </>
                  );
                })()}

                {/* Notes panel */}
                {activePanel === 'notes' && (
                  onChangeNotes ? (
                    <TextField
                      multiline minRows={2} maxRows={5} fullWidth
                      placeholder='Add notes for this stop...'
                      value={notes || ''}
                      onChange={(e) => onChangeNotes(id, e.target.value)}
                      variant='outlined' size='small'
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          fontSize: 12, borderRadius: '10px',
                          bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                          '& fieldset': { borderColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,56,92,0.3)' },
                          '&.Mui-focused fieldset': { borderColor: '#FF385C', borderWidth: '1.5px' },
                        },
                      }}
                    />
                  ) : hasNotes ? (
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.55 }}>{notes}</Typography>
                  ) : (
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic' }}>No notes yet</Typography>
                  )
                )}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

      </Box>{/* end content */}

      {/* ── Alerts popover ── */}
      <Popover
        open={!!alertAnchor}
        anchorEl={alertAnchor}
        onClose={() => setAlertAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { mt: 1, borderRadius: '14px', maxWidth: 340, minWidth: 260, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', overflow: 'hidden' } } }}
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
    </MotionCard>
  );
};

export default DestinationCard;
