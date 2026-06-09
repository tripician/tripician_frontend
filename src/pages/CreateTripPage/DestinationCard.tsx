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
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsTransitIcon from '@mui/icons-material/DirectionsTransit';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
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
  readonly?: boolean;
  onRename?: (id: string, name: string) => void;
  /** Day plan headline (e.g. "Coffee & explore the market") — separate from Google place name */
  onChangeTitle?: (id: string, title: string) => void;
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
  /** Fills Discover + Journal for this stop via plan-destination API (does not touch Stay). */
  onPlanDestination?: (destinationId: string) => void;
  
}

export interface DestinationCardChecklist {
  accommodation: boolean;
  transport: boolean;
  activities: boolean;
}

const MotionCard = motion.create(Card);

const GOOGLE_LOGO = import.meta.env.VITE_GOOGLE_LOGO
  || 'https://developers.google.com/static/maps/documentation/images/google_on_white.png';

const buildGoogleMapsUrl = (dest: { name: string; placeId?: string; lat?: number; lng?: number }) => {
  if (dest.placeId) return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(dest.placeId)}`;
  if (dest.lat != null && dest.lng != null) return `https://www.google.com/maps/search/?api=1&query=${dest.lat},${dest.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.name)}`;
};

type PlanLaneKey = 'spots' | 'stay' | 'notes';

/* Inline location chip — opens Google Maps; edit via pencil */
const LocationTag: React.FC<{
  name: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  editing: boolean;
  localName: string;
  onLocalNameChange: (v: string) => void;
  onCommit: () => void;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onStartEdit?: () => void;
  mapsOnly?: boolean;
}> = ({ name, placeId, lat, lng, editing, localName, onLocalNameChange, onCommit, onKeyDown, onStartEdit, mapsOnly }) => {
  const mapsUrl = buildGoogleMapsUrl({ name, placeId, lat, lng });
  const openMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  if (editing) {
    return (
      <InputBase
        value={localName} autoFocus size='small'
        onChange={e => onLocalNameChange(e.target.value)}
        onBlur={onCommit} onKeyDown={onKeyDown}
        onClick={e => e.stopPropagation()}
        sx={{ fontSize: 11, fontWeight: 600, width: 120, px: .75, py: .2, borderRadius: '8px', border: (t) => `1px solid ${t.palette.primary.main}` }}
      />
    );
  }

  return (
    <Box
      onClick={openMaps}
      sx={(t) => ({
        display: 'inline-flex', alignItems: 'center', gap: .4, flexShrink: 0, maxWidth: mapsOnly ? 118 : 160,
        pl: mapsOnly ? .55 : .65, pr: .5, py: .28, borderRadius: '9px', cursor: 'pointer',
        background: t.palette.mode === 'dark'
          ? 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)'
          : 'linear-gradient(180deg, #fff 0%, #f8f9fb 100%)',
        border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
        boxShadow: t.palette.mode === 'dark' ? '0 1px 4px rgba(0,0,0,0.35)' : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'transform .15s, box-shadow .15s, border-color .15s',
        '&:hover': {
          transform: 'translateY(-1px)',
          borderColor: 'rgba(66,133,244,0.45)',
          boxShadow: '0 4px 12px rgba(66,133,244,0.14)',
        },
        '&:hover .edit-place-btn': { opacity: 1 },
      })}
    >
      <LocationOnIcon sx={{ fontSize: 12, color: '#4285F4', flexShrink: 0 }} />
      {!mapsOnly && (
        <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.secondary', lineHeight: 1, letterSpacing: '-0.15px' }}>
          {name}
        </Typography>
      )}
      {mapsOnly ? (
        <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#4285F4', lineHeight: 1, whiteSpace: 'nowrap' }}>Maps</Typography>
      ) : (
        <Box component='img' alt='Google Maps' src={GOOGLE_LOGO} sx={{ height: 10, opacity: .7, flexShrink: 0 }} />
      )}
      <OpenInNewRoundedIcon sx={{ fontSize: 11, color: 'text.disabled', flexShrink: 0, opacity: .75 }} />
      {onStartEdit && !mapsOnly && (
        <Box
          component='span'
          className='edit-place-btn'
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onStartEdit(); }}
          sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '6px', ml: -.1,
            color: 'text.disabled', opacity: 0,
            transition: 'opacity .12s, background .12s, color .12s',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.06)', color: 'text.primary' },
          }}
        >
          <EditOutlinedIcon sx={{ fontSize: 11 }} />
        </Box>
      )}
    </Box>
  );
};

/** Integrated itinerary lanes — part of the card, not a separate button row */
const JourneyPlanStrip: React.FC<{
  activeLane: PlanLaneKey | null;
  placeName: string;
  nights: number;
  spots: PlannerSpot[];
  foodsCount: number;
  stayCount: number;
  stayPreview?: string;
  hasNotes: boolean;
  notesPreview?: string;
  spotsChecked: number;
  onSpots: () => void;
  onStay: () => void;
  onNotes: () => void;
  onNavia?: () => void;
  naviaThinking?: boolean;
}> = ({
  activeLane, placeName, nights, spots, foodsCount, stayCount, stayPreview, hasNotes, notesPreview,
  spotsChecked, onSpots, onStay, onNotes, onNavia, naviaThinking,
}) => {
  const spotPreview = spots.slice(0, 2).map(s => s.name).join(' · ');
  const spotsProgress = spots.length > 0 ? spotsChecked / spots.length : 0;

  const lanes: Array<{
    key: PlanLaneKey;
    kicker: string;
    title: string;
    preview: string;
    empty: string;
    icon: React.ReactNode;
    onClick: () => void;
    progress?: number;
    hint?: string;
  }> = [
    {
      key: 'spots',
      kicker: 'Discover',
      title: 'Places to visit',
      preview: spotPreview || (foodsCount > 0 ? `${foodsCount} food picks` : ''),
      empty: `Build your ${placeName} list`,
      icon: <ExploreIcon sx={{ fontSize: 14 }} />,
      onClick: onSpots,
      progress: spotsProgress,
      hint: spots.length > 0 ? `${spotsChecked}/${spots.length} done` : undefined,
    },
    {
      key: 'stay',
      kicker: `${nights} night${nights !== 1 ? 's' : ''}`,
      title: 'Where you rest',
      preview: stayPreview || '',
      empty: 'Add your lodging',
      icon: <HotelIcon sx={{ fontSize: 14 }} />,
      onClick: onStay,
      hint: stayCount === 0 ? 'Needed' : undefined,
    },
    {
      key: 'notes',
      kicker: 'Journal',
      title: 'Trip notes',
      preview: notesPreview || '',
      empty: 'Reservations, timing, tips…',
      icon: <EditNoteIcon sx={{ fontSize: 14 }} />,
      onClick: onNotes,
    },
  ];

  return (
    <Box
      sx={(t) => ({
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr 1fr', md: '1fr 1fr 1fr auto' },
        alignItems: 'stretch',
        borderTop: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        background: t.palette.mode === 'dark'
          ? 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)'
          : 'linear-gradient(180deg, rgba(255,56,92,0.025) 0%, transparent 55%)',
      })}
    >
      {lanes.map((lane, idx) => {
        const isActive = activeLane === lane.key;
        const filled = !!(lane.preview || (lane.key === 'notes' && hasNotes));
        return (
          <Box
            key={lane.key}
            onClick={(e) => { e.stopPropagation(); lane.onClick(); }}
            sx={(t) => ({
              position: 'relative', cursor: 'pointer', minWidth: 0, px: { xs: 1, sm: 1.25 }, py: 1,
              borderRight: idx < 2 ? `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` : 'none',
              transition: 'background .2s ease',
              '&::before': {
                content: '""', position: 'absolute', left: 0, top: '18%', bottom: '18%', width: 2, borderRadius: 2,
                bgcolor: isActive ? '#FF385C' : 'transparent',
                transition: 'background .2s',
              },
              '&:hover': {
                bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(255,56,92,0.03)',
              },
            })}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: .5, mb: .35 }}>
              <Box sx={{ color: isActive ? '#FF385C' : 'text.disabled', display: 'flex', opacity: isActive ? 1 : .75 }}>{lane.icon}</Box>
              <Typography sx={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.disabled', lineHeight: 1 }}>
                {lane.kicker}
              </Typography>
              {lane.hint && (
                <Typography sx={{ fontSize: 8.5, fontWeight: 700, color: lane.key === 'stay' && stayCount === 0 ? '#FF385C' : 'text.disabled', ml: 'auto', letterSpacing: '0.02em' }}>
                  {lane.hint}
                </Typography>
              )}
            </Box>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '-0.2px', lineHeight: 1.2, color: isActive ? '#FF385C' : 'text.primary', mb: .25 }}>
              {lane.title}
            </Typography>
            <Typography
              noWrap
              sx={{
                fontSize: 10.5, lineHeight: 1.35, letterSpacing: '-0.1px',
                color: filled ? 'text.secondary' : 'text.disabled',
                fontStyle: filled ? 'normal' : 'italic',
                fontWeight: filled ? 500 : 400,
              }}
            >
              {filled ? lane.preview : lane.empty}
            </Typography>
            {lane.progress !== undefined && spots.length > 0 && (
              <Box sx={{ mt: .65, height: 2, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <Box sx={{ width: `${lane.progress * 100}%`, height: '100%', borderRadius: 1, bgcolor: '#FF385C', transition: 'width .35s ease' }} />
              </Box>
            )}
          </Box>
        );
      })}
      {onNavia && (
        <Box
          onClick={(e) => { e.stopPropagation(); if (!naviaThinking) onNavia(); }}
          sx={(t) => ({
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            px: 1.25, cursor: naviaThinking ? 'default' : 'pointer',
            borderLeft: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            color: '#E31C5F', minWidth: 56,
            transition: 'background .15s',
            '&:hover': naviaThinking ? {} : { bgcolor: 'rgba(255,56,92,0.04)' },
          })}
        >
          <AutoAwesomeIcon sx={{ fontSize: 17, color: '#FF385C', mb: .25, opacity: naviaThinking ? .5 : 1 }} />
          <Typography sx={{ fontSize: 9, fontWeight: 700, letterSpacing: '-0.1px' }}>{naviaThinking ? '…' : 'Navia'}</Typography>
        </Box>
      )}
    </Box>
  );
};

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
  destination, disabled, readonly, onRename, onChangeTitle, onRemove, onChangeNotes,
  onOpenDiscover, onOpenStay, onChangeNights,
  alertCount = 0, alerts = [], isDragging = false, dragHandleProps, onRequestNaviaTip, onPlanDestination,
}) => {
  const { id, name, title, startDate, endDate, nights, category = 'general', completed, notes, spots, foods, stay, stays, transport, budget, placeId, lat, lng } = destination as PlannerDestination & { transport?: string; budget?: number };

  const [editingTitle, setEditingTitle]   = React.useState(false);
  const [editingPlace, setEditingPlace]   = React.useState(false);
  const [localTitle, setLocalTitle]       = React.useState(title || '');
  const [localName, setLocalName]         = React.useState(name);
  const [alertAnchor, setAlertAnchor]     = React.useState<HTMLElement | null>(null);
  const [resolvedPhoto, setResolvedPhoto] = React.useState<string | null>((destination as any).photoUrl || null);
  const [naviaThinking, setNaviaThinking] = React.useState(false);
  const [notesExpanded, setNotesExpanded] = React.useState(false);

  React.useEffect(() => {
    const photo = (destination as any).photoUrl;
    if (photo) { setResolvedPhoto(photo); return; }
    let cancelled = false;
    fetchUnsplashImage(name).then(url => { if (!cancelled && url) setResolvedPhoto(url); });
    return () => { cancelled = true; };
  }, [(destination as any).photoUrl, name]);

  React.useEffect(() => setLocalName(name), [name]);
  React.useEffect(() => setLocalTitle(title || ''), [title]);

  React.useEffect(() => {
    const handler = () => setNaviaThinking(false);
    window.addEventListener('navia:response', handler);
    return () => window.removeEventListener('navia:response', handler);
  }, []);

  const commitTitle = () => {
    const next = localTitle.trim();
    if (next !== (title || '').trim()) onChangeTitle?.(id, next);
    setEditingTitle(false);
  };
  const commitPlace = () => {
    if (localName.trim() && localName !== name) onRename?.(id, localName.trim());
    setEditingPlace(false);
  };
  const handleTitleKey: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === 'Enter') commitTitle();
    else if (e.key === 'Escape') { setLocalTitle(title || ''); setEditingTitle(false); }
  };
  const handlePlaceKey: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === 'Enter') commitPlace();
    else if (e.key === 'Escape') { setLocalName(name); setEditingPlace(false); }
  };

  const planTitle = (title || '').trim();
  const hasPlanTitle = planTitle.length > 0;
  const displayHeading = hasPlanTitle ? planTitle : name;

  const catKey  = (category || 'general') as NonNullable<PlannerDestination['category']>;
  const catInfo = CATEGORY_COLORS[catKey];
  const naviaContext = hasPlanTitle ? `"${planTitle}" in ${name}` : name;
  const triggerNaviaPlan = () => {
    if (naviaThinking || !onPlanDestination) return;
    setNaviaThinking(true);
    onPlanDestination(id);
  };

  const dateFmt = (iso?: string) => {
    if (!iso) return '';
    try { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    catch { return iso || ''; }
  };

  const hasNotes      = !!(notes && notes.trim());
  const spotsList     = (spots ?? []) as PlannerSpot[];
  const spotsChecked  = spotsList.filter(s => s.checked).length;
  const stayCount     = Array.isArray(stays) ? stays.length : ((stay?.name || stay?.reference || stay?.notes) ? 1 : 0);
  const stayPreviewName = (Array.isArray(stays) && stays[0]?.name)
    || stay?.name
    || undefined;
  const notesPreviewLine = (notes || '').trim().split('\n')[0]?.slice(0, 48);
  const transportLabel = transport?.trim();
  const budgetVal = typeof budget === 'number' && budget > 0 ? budget : 0;
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

          {/* Plan title + location tag (inline) */}
          <Box sx={{ flex: '1 1 120px', minWidth: 0, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: .75, minWidth: 0, flexWrap: 'wrap' }}>
              {editingTitle ? (
                <InputBase
                  value={localTitle} autoFocus
                  onChange={e => setLocalTitle(e.target.value)}
                  onBlur={commitTitle} onKeyDown={handleTitleKey}
                  placeholder='e.g. Coffee & explore the market'
                  sx={{ fontSize: 14, fontWeight: 700, flex: '1 1 120px', minWidth: 80, px: .6, py: .15, border: (t) => `1.5px solid ${t.palette.primary.main}`, borderRadius: '8px', background: (t) => t.palette.background.paper }}
                />
              ) : (
                <Tooltip title={onChangeTitle ? 'Double-click to edit your day plan' : ''} enterDelay={500}>
                  <Typography
                    onDoubleClick={() => { if (onChangeTitle) setEditingTitle(true); }}
                    noWrap
                    sx={{
                      fontSize: 14, fontWeight: 700, flex: '1 1 auto', minWidth: 0, maxWidth: '100%',
                      cursor: onChangeTitle ? 'text' : 'default', lineHeight: 1.2, letterSpacing: '-0.25px',
                      textDecoration: completed ? 'line-through' : 'none', color: completed ? 'text.disabled' : 'text.primary',
                    }}
                  >
                    {displayHeading}
                  </Typography>
                </Tooltip>
              )}
              {!editingTitle && (
                <Tooltip title='Open in Google Maps' enterDelay={300}>
                  <Box component='span' sx={{ display: 'inline-flex', flexShrink: 0 }}>
                    <LocationTag
                      name={name}
                      placeId={placeId}
                      lat={lat}
                      lng={lng}
                      editing={editingPlace}
                      localName={localName}
                      onLocalNameChange={setLocalName}
                      onCommit={commitPlace}
                      onKeyDown={handlePlaceKey}
                      onStartEdit={onRename ? () => setEditingPlace(true) : undefined}
                      mapsOnly={!hasPlanTitle}
                    />
                  </Box>
                </Tooltip>
              )}
            </Box>
            {!hasPlanTitle && !editingTitle && onChangeTitle && (
              <Typography
                onClick={() => setEditingTitle(true)}
                sx={{ fontSize: 9.5, color: 'text.disabled', mt: .35, cursor: 'pointer', lineHeight: 1.2, '&:hover': { color: '#FF385C' } }}
              >
                + Add what you&apos;re doing this day
              </Typography>
            )}
            <Box sx={(t) => ({ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', mt: .35, height: 18, fontSize: 9.5, fontWeight: 600, color: t.palette.text.secondary, letterSpacing: '-0.1px', whiteSpace: 'nowrap' })}>
              {dateFmt(startDate)} → {dateFmt(endDate)}
            </Box>
            {!editingTitle && onRequestNaviaTip && !readonly &&(
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: .4, flexWrap: 'nowrap', overflow: 'hidden', mt: .45 }}>
                {['Best time?', 'Top spots?', 'Pack?'].map(prompt => (
                  <Box
                    key={prompt}
                    onClick={(e) => { e.stopPropagation(); onRequestNaviaTip(`${naviaContext} - ${prompt}`); }}
                    sx={(t) => ({
                      fontSize: 9.5, fontWeight: 600, color: 'text.disabled', cursor: 'pointer', whiteSpace: 'nowrap',
                      px: .7, py: .2, borderRadius: '8px',
                      bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      '&:hover': { color: '#FF385C', borderColor: 'rgba(255,56,92,0.28)', bgcolor: 'rgba(255,56,92,0.05)' },
                      transition: 'all .14s',
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
            {!readonly ? (<Box component='button' type='button'
              onClick={(e: any) => { e.stopPropagation(); onChangeNights?.(id, -1); }} disabled={nights <= 1}
              style={{ border: 'none', background: 'transparent', cursor: nights > 1 ? 'pointer' : 'default', padding: '0 3px', fontSize: 13, fontWeight: 900, color: '#FF385C', opacity: nights > 1 ? 1 : .3, lineHeight: 1 }}>
              -
            </Box>) : ""}
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#FF385C', lineHeight: 1, px: .15, letterSpacing: '-0.3px' }}>{nights} nights</Typography>
            {!readonly ? (<Box component='button' type='button'
              onClick={(e: any) => { e.stopPropagation(); onChangeNights?.(id, +1); }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 3px', fontSize: 13, fontWeight: 900, color: '#FF385C', lineHeight: 1 }}>
              +
            </Box>) : ""}
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

        {/* ── Meta chips (transport / budget) ── */}
        {(transportLabel || budgetVal > 0) && (
          <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex', flexWrap: 'wrap', gap: .5, px: 1.25, pb: .35, alignItems: 'center' }}>
            {transportLabel && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .3, px: .65, py: .2, borderRadius: '20px', bgcolor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <DirectionsTransitIcon sx={{ fontSize: 11, color: '#6366f1' }} />
                <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'capitalize' }}>{transportLabel}</Typography>
              </Box>
            )}
            {budgetVal > 0 && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .3, px: .65, py: .2, borderRadius: '20px', bgcolor: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)' }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 11, color: '#16a34a' }} />
                <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary' }}>Budget {budgetVal}</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ── Journey plan strip (integrated footer) ── */}
        <Box onClick={e => e.stopPropagation()}>
          <JourneyPlanStrip
            activeLane={notesExpanded ? 'notes' : null}
            placeName={name}
            nights={nights}
            spots={spotsList}
            foodsCount={foods?.length || 0}
            stayCount={stayCount}
            stayPreview={stayPreviewName}
            hasNotes={hasNotes}
            notesPreview={notesPreviewLine}
            spotsChecked={spotsChecked}
            onSpots={() => onOpenDiscover?.(id)}
            onStay={() => onOpenStay?.(id)}
            onNotes={() => setNotesExpanded(p => !p)}
            onNavia={onPlanDestination ? triggerNaviaPlan : undefined}
            naviaThinking={naviaThinking}
          />
          {onPlanDestination && (
            <Box
              onClick={(e) => { e.stopPropagation(); triggerNaviaPlan(); }}
              sx={{
                display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'center', gap: .5,
                py: .65, cursor: 'pointer', color: '#E31C5F', borderTop: '1px solid', borderColor: 'divider',
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 14, color: '#FF385C' }} />
              <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{naviaThinking ? 'Navia is thinking…' : 'Ask Navia to plan this stop'}</Typography>
            </Box>
          )}
        </Box>

        {/* ── Inline notes (only expandable lane) ── */}
        <AnimatePresence initial={false}>
          {notesExpanded && (
            <motion.div
              key='notes'
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <Box
                onClick={e => e.stopPropagation()}
                sx={(t) => ({
                  px: 1.5, pb: 1.25, pt: .5,
                  borderTop: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                  background: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(255,56,92,0.015)',
                })}
              >
                {onChangeNotes ? (
                  <TextField
                    multiline minRows={3} maxRows={6} fullWidth autoFocus
                    placeholder='Train times, reservation codes, what to pack, rainy-day backup…'
                    value={notes || ''}
                    onChange={(e) => onChangeNotes(id, e.target.value)}
                    variant='outlined' size='small'
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: 12.5, lineHeight: 1.55, borderRadius: '12px',
                        bgcolor: (th) => th.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#fff',
                        '& fieldset': { borderColor: (th) => th.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,56,92,0.25)' },
                        '&.Mui-focused fieldset': { borderColor: '#FF385C', borderWidth: '1.5px' },
                      },
                    }}
                  />
                ) : hasNotes ? (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>{notes}</Typography>
                ) : (
                  <Typography sx={{ fontSize: 11.5, color: 'text.disabled', fontStyle: 'italic' }}>No notes yet</Typography>
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
