import React from 'react';
import {
  Box, Card, CircularProgress, IconButton, InputBase, ListItemIcon, Menu, MenuItem, Skeleton, TextField, Tooltip, Typography, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconBed, IconCheck, IconDots, IconGripVertical, IconMapPin, IconMinus, IconNote, IconPencil, IconPlus, IconStar,
  IconStarFilled, IconToolsKitchen2, IconTrash, IconX,
} from '@tabler/icons-react';
import { fetchUnsplashImage } from '../../services/unsplashService';
import TripicianAIOrb from '../../tripicianai/TripicianAIOrb';
import { isEmptyStop } from './stopIdeas';
import LaneQuickAdd, { type QuickAddKind } from './LaneQuickAdd';
import type { PickedPlace } from '../../components/places/pickedPlace';
import type { PlannerDestination } from '../../store/plannerSlice';

export interface StopCardProps {
  destination: PlannerDestination;
  /** 1-based first day of this stop, for the "Day 3-5" badge. */
  dayFrom: number;
  readOnly?: boolean;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  onRename?: (id: string, name: string) => void;
  onChangeNights?: (id: string, delta: number) => void;
  onChangeNotes?: (id: string, notes: string) => void;
  onRemove?: (id: string) => void;
  onOpenPlaces?: (id: string) => void;
  onOpenFood?: (id: string) => void;
  onOpenStay?: (id: string) => void;
  onFillWithAI?: (id: string) => void;
  /** This stop is being filled by TripicianAI right now. */
  aiBusy?: boolean;
  /** Inline adds, so the common case never opens a dialog. */
  onAddPlace?: (id: string, place: PickedPlace) => void;
  onAddPlaceText?: (id: string, name: string) => void;
  onAddStay?: (id: string, name: string) => void;
  onAddFood?: (id: string, name: string) => void;
  onRemoveSpot?: (id: string, spotId: string) => void;
  onRemoveStay?: (id: string, stayId: string) => void;
  onRemoveFood?: (id: string, foodId: string) => void;
  onToggleMustVisit?: (id: string, spotId: string) => void;
}

const MotionCard = motion.create(Card);
const MotionChip = motion.create(Box);
const MAX_CHIPS = 4;

const shortDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

interface LaneItem { id: string; name: string; star?: boolean }

/** One line of a stop: an icon, what it holds as chips, and a way to add more. */
const Lane: React.FC<{
  Icon: React.ElementType;
  tone: string;
  label: string;
  items: LaneItem[];
  addLabel: string;
  onOpen?: () => void;
  readOnly?: boolean;
  /** Shows placeholder chips while TripicianAI is filling this stop. */
  busy?: boolean;
  onRemoveItem?: (itemId: string) => void;
  onToggleStar?: (itemId: string) => void;
  /** The inline field, rendered in place of the "+ Add" chip while it is open. */
  quickAdd?: React.ReactNode;
  onQuickAdd?: () => void;
}> = ({ Icon, tone, label, items, addLabel, onOpen, readOnly, busy, onRemoveItem, onToggleStar, quickAdd, onQuickAdd }) => {
  const theme = useTheme();
  const shown = items.slice(0, MAX_CHIPS);
  const more = items.length - shown.length;
  const chipSx = {
    display: 'inline-flex', alignItems: 'center', gap: 0.4, maxWidth: 200, minWidth: 0,
    height: 28, px: 1.1, borderRadius: '999px', font: 'inherit', fontSize: 12.5, fontWeight: 500,
    border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper', color: 'text.primary',
    cursor: onOpen ? 'pointer' : 'default',
    transition: `border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
    '&:hover': onOpen ? { borderColor: 'text.secondary' } : {},
    '@media (hover: hover)': { '&:hover .chip-remove, &:hover .chip-star': { opacity: 1 } },
    '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
  } as const;

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
      <Box sx={{ width: 28, height: 28, borderRadius: '9px', display: 'grid', placeItems: 'center', flexShrink: 0, bgcolor: alpha(tone, 0.12), color: tone }}>
        <Icon size={16} stroke={1.9} />
      </Box>
      <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' }, width: 104, flexShrink: 0, pt: 0.75, fontWeight: 600, color: 'text.disabled' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.6, flex: 1, minWidth: 0 }}>
        <AnimatePresence initial={false}>
          {shown.map((item, i) => (
            <MotionChip
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              // A small step per chip, so a stop TripicianAI just filled arrives one place at a time.
              transition={{ type: 'spring', stiffness: 520, damping: 34, delay: Math.min(i * 0.045, 0.25) }}
              title={item.name}
              sx={{ ...chipSx, pr: onRemoveItem && !readOnly ? 0.4 : undefined, cursor: 'default' }}
            >
              {onToggleStar && !readOnly ? (
                <Box
                  component="button"
                  type="button"
                  aria-label={item.star ? `${item.name} is a must see. Remove the star.` : `Mark ${item.name} as a must see`}
                  aria-pressed={!!item.star}
                  className={item.star ? undefined : 'chip-star'}
                  onClick={() => onToggleStar(item.id)}
                  sx={{
                    display: 'inline-flex', border: 0, p: 0, bgcolor: 'transparent', flexShrink: 0, cursor: 'pointer',
                    color: item.star ? theme.palette.warning.main : 'text.disabled',
                    // An empty star on every chip is noise; it appears when you reach for it.
                    ...(item.star ? {} : {
                      '@media (hover: hover)': {
                        opacity: 0,
                        transition: `opacity ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
                      },
                    }),
                    '&:hover': { color: theme.palette.warning.main },
                    '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2, borderRadius: '50%' },
                  }}
                >
                  {item.star ? <IconStarFilled size={11} /> : <IconStar size={11} stroke={2} />}
                </Box>
              ) : item.star ? (
                <IconStarFilled size={11} style={{ color: theme.palette.warning.main, flexShrink: 0 }} />
              ) : null}

              <Box
                component={onOpen ? 'button' : 'span'}
                type={onOpen ? 'button' : undefined}
                onClick={onOpen}
                sx={{
                  border: 0, p: 0, bgcolor: 'transparent', font: 'inherit', color: 'inherit', minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  cursor: onOpen ? 'pointer' : 'default',
                }}
              >
                {item.name}
              </Box>

              {onRemoveItem && !readOnly && (
                <Box
                  component="button"
                  type="button"
                  className="chip-remove"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => onRemoveItem(item.id)}
                  sx={{
                    display: 'inline-flex', border: 0, p: 0.25, ml: 0.1, bgcolor: 'transparent', flexShrink: 0,
                    color: 'text.disabled', cursor: 'pointer', borderRadius: '50%',
                    // Always there on touch, where there is no hover to reveal it.
                    '@media (hover: hover)': { opacity: 0, transition: `opacity ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}` },
                    '&:hover': { color: 'error.main' },
                    '&:focus-visible': { opacity: 1, outline: `2px solid ${theme.custom.ring}`, outlineOffset: 1 },
                  }}
                >
                  <IconX size={11} stroke={2.4} />
                </Box>
              )}
            </MotionChip>
          ))}
        </AnimatePresence>

        {busy && items.length === 0 && [72, 96, 64].map((w) => (
          <Skeleton key={w} variant="rounded" width={w} height={28} sx={{ borderRadius: '999px' }} />
        ))}
        {more > 0 && (
          <Box component={onOpen ? 'button' : 'span'} type={onOpen ? 'button' : undefined} onClick={onOpen} sx={{ ...chipSx, color: 'text.secondary' }}>
            {`+${more} more`}
          </Box>
        )}
        {!readOnly && quickAdd}
        {!readOnly && !quickAdd && (onQuickAdd || onOpen) && (
          <Box
            component="button"
            type="button"
            onClick={onQuickAdd ?? onOpen}
            sx={{
              ...chipSx,
              borderStyle: 'dashed',
              color: items.length ? 'text.secondary' : 'text.primary',
              fontWeight: 600,
              '&:hover': { borderColor: tone, color: 'text.primary' },
            }}
          >
            <IconPlus size={13} stroke={2.2} />
            {items.length ? 'Add' : addLabel}
          </Box>
        )}
        {readOnly && items.length === 0 && (
          <Typography variant="caption" sx={{ pt: 0.75, color: 'text.disabled' }}>Nothing yet</Typography>
        )}
      </Box>
    </Box>
  );
};

// One stop on the route: where, how long, what to see, where to sleep, what to eat, and a note.
const StopCard: React.FC<StopCardProps> = ({
  destination, dayFrom, readOnly = false, isDragging = false, dragHandleProps,
  onRename, onChangeNights, onChangeNotes, onRemove, onOpenPlaces, onOpenFood, onOpenStay, onFillWithAI, aiBusy = false,
  onAddPlace, onAddPlaceText, onAddStay, onAddFood, onRemoveSpot, onRemoveStay, onRemoveFood, onToggleMustVisit,
}) => {
  const theme = useTheme();
  const { id, name, startDate, endDate, nights, notes } = destination;
  const [editingName, setEditingName] = React.useState(false);
  const [localName, setLocalName] = React.useState(name);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [adding, setAdding] = React.useState<QuickAddKind | null>(null);
  const [photo, setPhoto] = React.useState<string | null>(destination.photoUrl || null);

  React.useEffect(() => setLocalName(name), [name]);
  React.useEffect(() => {
    if (destination.photoUrl) { setPhoto(destination.photoUrl); return; }
    let live = true;
    void fetchUnsplashImage(name).then((url) => { if (live && url) setPhoto(url); });
    return () => { live = false; };
  }, [destination.photoUrl, name]);

  const commitName = () => {
    const next = localName.trim();
    if (next && next !== name) onRename?.(id, next);
    setEditingName(false);
  };

  const spots: LaneItem[] = (destination.spots ?? []).map((s) => ({ id: s.id, name: s.name, star: s.mustVisit }));
  const stays: LaneItem[] = (destination.stays ?? []).filter((s) => s.name?.trim()).map((s) => ({ id: s.id, name: s.name!.trim() }));
  if (stays.length === 0 && destination.stay?.name?.trim()) stays.push({ id: 'legacy-stay', name: destination.stay.name.trim() });
  const foods: LaneItem[] = (destination.foods ?? []).map((f) => ({ id: f.id, name: f.name }));
  const hasNotes = !!notes?.trim();
  const dayLabel = nights > 1 ? `Day ${dayFrom}-${dayFrom + nights - 1}` : `Day ${dayFrom}`;
  const dates = startDate && endDate ? `${shortDate(startDate)} to ${shortDate(endDate)}` : null;
  const canFill = !readOnly && !!onFillWithAI && isEmptyStop(destination);
  const ready = spots.length > 0 && stays.length > 0 && foods.length > 0;

  const quickAddFor = (kind: QuickAddKind, onOpenSheet?: () => void, tone?: string) => (adding === kind ? (
    <LaneQuickAdd
      kind={kind}
      stopName={name}
      lat={destination.lat}
      lng={destination.lng}
      tone={tone ?? theme.palette.text.primary}
      onAddPlace={(place) => {
        if (kind === 'stay') onAddStay?.(id, place.name);
        else onAddPlace?.(id, place);
      }}
      onAddText={(text) => {
        if (kind === 'stay') onAddStay?.(id, text);
        else if (kind === 'food') onAddFood?.(id, text);
        else onAddPlaceText?.(id, text);
      }}
      onClose={() => setAdding(null)}
      onOpenSheet={onOpenSheet ? () => { setAdding(null); onOpenSheet(); } : undefined}
    />
  ) : undefined);

  return (
    <MotionCard
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      elevation={0}
      sx={{
        position: 'relative', overflow: 'hidden', borderRadius: '18px',
        border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper',
        boxShadow: isDragging ? theme.custom.shadows.cardHover : 'none',
        transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
        '&:hover': { boxShadow: theme.custom.shadows.card },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, px: { xs: 1.25, sm: 2 }, pt: 1.75, pb: 1.25 }}>
        {dragHandleProps && !readOnly && (
          <Box
            {...dragHandleProps}
            aria-label={`Move ${name}`}
            sx={{
              display: 'flex', flexShrink: 0, color: 'text.disabled', cursor: isDragging ? 'grabbing' : 'grab',
              // A 17px glyph with a padded tap area on touch; touchAction stops the page claiming the drag as a scroll.
              px: { xs: 0.75, sm: 0 }, py: { xs: 1, sm: 0 }, mx: { xs: -0.5, sm: 0 }, touchAction: 'none',
              '&:hover': { color: 'text.secondary' },
            }}
          >
            <IconGripVertical size={17} stroke={1.7} />
          </Box>
        )}

        <Box sx={{ width: { xs: 44, sm: 62 }, height: { xs: 44, sm: 62 }, borderRadius: '14px', overflow: 'hidden', flexShrink: 0, bgcolor: theme.custom.surface.hover }}>
          {photo && <Box component="img" src={photo} alt="" loading="lazy" onError={() => setPhoto(null)} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            {/* On a phone the photo, the chip and the nights stepper together leave nothing for the name, so the day moves down a line. */}
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline-block' }, flexShrink: 0, px: 0.9, py: 0.3, borderRadius: '8px', bgcolor: theme.custom.surface.hover, color: 'text.secondary', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {dayLabel}
            </Box>
            {editingName ? (
              <InputBase
                value={localName}
                autoFocus
                fullWidth
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  else if (e.key === 'Escape') { setLocalName(name); setEditingName(false); }
                }}
                inputProps={{ 'aria-label': 'Stop name' }}
                sx={{ fontSize: 15.5, fontWeight: 700, px: 0.75, borderRadius: '8px', border: `1.5px solid ${theme.palette.text.primary}` }}
              />
            ) : (
              <Typography
                noWrap
                onDoubleClick={() => { if (onRename && !readOnly) setEditingName(true); }}
                sx={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.3, minWidth: 0 }}
              >
                {name}
              </Typography>
            )}
            {/* Earned, not decorative: this stop has somewhere to go, somewhere to sleep and something to eat. */}
            {ready && !editingName && (
              <Tooltip title="Places, a stay and food are all in" arrow>
                <Box
                  component={motion.span}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 24 }}
                  sx={{
                    display: 'grid', placeItems: 'center', flexShrink: 0, width: 17, height: 17, borderRadius: '50%',
                    bgcolor: alpha(theme.palette.success.main, 0.14), color: theme.palette.success.main,
                  }}
                >
                  <IconCheck size={11} stroke={3} />
                </Box>
              </Tooltip>
            )}
          </Box>
          <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' }, fontWeight: 700 }}>
              {dayLabel}{dates ? ' · ' : ''}
            </Box>
            {dates}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', height: { xs: 36, sm: 32 }, borderRadius: '999px', border: `1px solid ${theme.custom.surface.border}`, px: 0.4, flexShrink: 0 }}>
          {!readOnly && (
            <IconButton size="small" aria-label="One night fewer" disabled={nights <= 1} onClick={() => onChangeNights?.(id, -1)} sx={{ width: { xs: 30, sm: 24 }, height: { xs: 30, sm: 24 } }}>
              <IconMinus size={14} />
            </IconButton>
          )}
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, px: 0.6, whiteSpace: 'nowrap' }}>
            {nights} {nights === 1 ? 'night' : 'nights'}
          </Typography>
          {!readOnly && (
            <IconButton size="small" aria-label="One night more" onClick={() => onChangeNights?.(id, 1)} sx={{ width: { xs: 30, sm: 24 }, height: { xs: 30, sm: 24 } }}>
              <IconPlus size={14} />
            </IconButton>
          )}
        </Box>

        {!readOnly && (
          <>
            <IconButton size="small" aria-label={`More for ${name}`} onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ color: 'text.secondary', flexShrink: 0 }}>
              <IconDots size={18} />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
              {onRename && (
                <MenuItem onClick={() => { setMenuAnchor(null); setEditingName(true); }}>
                  <ListItemIcon><IconPencil size={16} /></ListItemIcon>Rename
                </MenuItem>
              )}
              {onFillWithAI && (
                <MenuItem onClick={() => { setMenuAnchor(null); onFillWithAI(id); }} disabled={aiBusy}>
                  <ListItemIcon><TripicianAIOrb size={16} /></ListItemIcon>Get ideas from TripicianAI
                </MenuItem>
              )}
              {onRemove && (
                <MenuItem onClick={() => { setMenuAnchor(null); onRemove(id); }} sx={{ color: 'error.main' }}>
                  <ListItemIcon sx={{ color: 'inherit' }}><IconTrash size={16} /></ListItemIcon>Remove stop
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Box>

      <Box data-tour="stop-lanes" sx={{ display: 'grid', gap: 1.1, px: { xs: 1.25, sm: 2 }, pb: 1.5 }}>
        <Lane
          Icon={IconMapPin} tone={theme.palette.info.main} label="Places to see" items={spots} addLabel="Add places to see"
          onOpen={onOpenPlaces ? () => onOpenPlaces(id) : undefined} readOnly={readOnly} busy={aiBusy}
          onRemoveItem={onRemoveSpot ? (spotId) => onRemoveSpot(id, spotId) : undefined}
          onToggleStar={onToggleMustVisit ? (spotId) => onToggleMustVisit(id, spotId) : undefined}
          onQuickAdd={onAddPlace ? () => setAdding('place') : undefined}
          quickAdd={quickAddFor('place', onOpenPlaces ? () => onOpenPlaces(id) : undefined, theme.palette.info.main)}
        />
        <Lane
          Icon={IconBed} tone={theme.palette.success.main} label="Where you'll stay" items={stays} addLabel="Add a stay"
          onOpen={onOpenStay ? () => onOpenStay(id) : undefined} readOnly={readOnly}
          onRemoveItem={onRemoveStay ? (stayId) => onRemoveStay(id, stayId) : undefined}
          onQuickAdd={onAddStay ? () => setAdding('stay') : undefined}
          quickAdd={quickAddFor('stay', onOpenStay ? () => onOpenStay(id) : undefined, theme.palette.success.main)}
        />
        <Lane
          Icon={IconToolsKitchen2} tone={theme.palette.warning.dark} label="Food to try" items={foods} addLabel="Add food"
          onOpen={onOpenFood ? () => onOpenFood(id) : undefined} readOnly={readOnly} busy={aiBusy}
          onRemoveItem={onRemoveFood ? (foodId) => onRemoveFood(id, foodId) : undefined}
          onQuickAdd={onAddFood ? () => setAdding('food') : undefined}
          quickAdd={quickAddFor('food', onOpenFood ? () => onOpenFood(id) : undefined, theme.palette.warning.dark)}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', px: { xs: 1.25, sm: 2 }, py: 0.9, borderTop: `1px solid ${alpha(theme.custom.surface.border, 0.6)}` }}>
        <Box
          component="button"
          type="button"
          data-tour="stop-note"
          onClick={() => { if (onChangeNotes || hasNotes) setNotesOpen((o) => !o); }}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0, p: 0.25, border: 0, bgcolor: 'transparent',
            font: 'inherit', textAlign: 'left', cursor: onChangeNotes || hasNotes ? 'pointer' : 'default',
            color: hasNotes ? 'text.secondary' : 'text.disabled', '&:hover': { color: 'text.primary' },
            '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2, borderRadius: '6px' },
          }}
        >
          <IconNote size={16} stroke={1.8} style={{ flexShrink: 0 }} />
          <Typography variant="body2" noWrap sx={{ color: 'inherit' }}>
            {hasNotes ? notes!.trim().split('\n')[0] : readOnly ? 'No notes' : 'Add a note'}
          </Typography>
        </Box>
        {canFill && (
          <Tooltip title="Adds places to see, food to try and a few tips. Uses trip credits." arrow>
            <Box
              component="button"
              type="button"
              disabled={aiBusy}
              onClick={() => onFillWithAI?.(id)}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.75, height: 30, px: 1.25, borderRadius: '999px', flexShrink: 0,
                border: `1px solid ${theme.custom.surface.border}`, bgcolor: theme.custom.surface.brandTint, color: 'text.primary',
                font: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: aiBusy ? 'default' : 'pointer',
                '&:hover': aiBusy ? {} : { borderColor: 'text.secondary' },
                '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
              }}
            >
              {aiBusy ? <CircularProgress size={14} color="inherit" /> : <TripicianAIOrb size={16} />}
              {aiBusy ? 'Filling this stop' : 'Fill this stop for me'}
            </Box>
          </Tooltip>
        )}
      </Box>

      <AnimatePresence initial={false}>
        {notesOpen && (
          <motion.div
            key="note"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <Box sx={{ px: { xs: 1.25, sm: 2 }, pb: 1.5 }}>
              {onChangeNotes && !readOnly ? (
                <TextField
                  multiline minRows={3} maxRows={8} fullWidth autoFocus size="small"
                  placeholder="Anything to remember here: a booking code, a train time, a rainy-day plan"
                  value={notes || ''}
                  onChange={(e) => onChangeNotes(id, e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { fontSize: 13.5, lineHeight: 1.6, borderRadius: '12px' } }}
                />
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>{notes}</Typography>
              )}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionCard>
  );
};

export default StopCard;
