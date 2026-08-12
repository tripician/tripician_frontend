import React from 'react';
import { Box, Card, Typography, IconButton, Tooltip, TextField, InputBase } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { IconGripVertical, IconNote, IconTrash, IconChevronRight } from '@tabler/icons-react';
import { fetchUnsplashImage } from '../../services/unsplashService';
import type { PlannerDestination } from '../../store/plannerSlice';

export interface SimpleDestinationCardProps {
  destination: PlannerDestination;
  /** 1-based position in the route, used for the "Day 3-5" badge. */
  dayFrom: number;
  readonly?: boolean;
  onRename?: (id: string, name: string) => void;
  onChangeNotes?: (id: string, notes: string) => void;
  onChangeNights?: (id: string, delta: number) => void;
  onRemove?: (id: string) => void;
  /** Called when the user taps the "saved in Advanced" hint. */
  onSwitchToAdvanced?: () => void;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

const MotionCard = motion.create(Card);

const dateFmt = (iso?: string) => {
  if (!iso) return '';
  try { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  catch { return iso || ''; }
};

/**
 * The Easy-mode stop card.
 *
 * A deliberately different object from `DestinationCard`, not a stripped-down
 * copy of it: one calm row whose only editable ideas are the place, how many
 * nights, and a note. Everything the full card carries - the Discover/Stay/
 * Journal lanes, the Navia orb, category pills, Maps chips, alert badges - is
 * absent by construction rather than hidden with breakpoints, so there is no
 * dead markup to reason about and no way for advanced affordances to leak in.
 */
const SimpleDestinationCard: React.FC<SimpleDestinationCardProps> = ({
  destination, dayFrom, readonly, onRename, onChangeNotes, onChangeNights, onRemove,
  onSwitchToAdvanced, isDragging = false, dragHandleProps,
}) => {
  const { id, name, startDate, endDate, nights, notes, spots, stays, stay } = destination;

  const [editingName, setEditingName] = React.useState(false);
  const [localName, setLocalName] = React.useState(name);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [photo, setPhoto] = React.useState<string | null>(destination.photoUrl || null);

  React.useEffect(() => setLocalName(name), [name]);

  React.useEffect(() => {
    if (destination.photoUrl) { setPhoto(destination.photoUrl); return; }
    let cancelled = false;
    fetchUnsplashImage(name).then(url => { if (!cancelled && url) setPhoto(url); });
    return () => { cancelled = true; };
  }, [destination.photoUrl, name]);

  const commitName = () => {
    const next = localName.trim();
    if (next && next !== name) onRename?.(id, next);
    setEditingName(false);
  };

  const hasNotes = !!(notes && notes.trim());
  const notePreview = (notes || '').trim().split('\n')[0]?.slice(0, 80);

  // Content Easy mode does not show. Saying so is the honest move: it is the
  // user's own data, and silence reads as "Navia did nothing".
  const spotCount = spots?.length ?? 0;
  const stayCount = Array.isArray(stays) ? stays.length : ((stay?.name || stay?.reference) ? 1 : 0);
  const hiddenBits: string[] = [];
  if (spotCount > 0) hiddenBits.push(`${spotCount} place${spotCount === 1 ? '' : 's'}`);
  if (stayCount > 0) hiddenBits.push(`${stayCount} stay${stayCount === 1 ? '' : 's'}`);

  const dayLabel = nights > 1 ? `Day ${dayFrom}-${dayFrom + nights - 1}` : `Day ${dayFrom}`;

  return (
    <MotionCard
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      elevation={0}
      sx={(t) => ({
        position: 'relative', overflow: 'hidden',
        borderRadius: '16px',
        border: `1px solid ${t.custom.surface.border}`,
        bgcolor: 'background.paper',
        boxShadow: isDragging ? t.custom.shadows.cardHover : t.custom.shadows.card,
        transition: `box-shadow ${t.custom.motion.duration.base} ${t.custom.motion.easing.standard}, transform ${t.custom.motion.duration.base} ${t.custom.motion.easing.standard}`,
        '&:hover': { boxShadow: t.custom.shadows.cardHover, transform: 'translateY(-2px)' },
      })}
    >
      {/*
        Two columns: a leading media stack, then ONE content column.
        Everything textual - title, dates, note preview, the "saved in Advanced"
        line - lives in that second column, so the card has a single content left
        edge. Previously the sub-lines were siblings of the top row and started at
        the card's own padding while the title started ~180px further in, giving
        one card two competing left edges.
      */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1, sm: 1.5 }, px: { xs: 1.25, sm: 1.5 }, py: 1.25 }}>

        {/* ── Leading media stack ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, flexShrink: 0 }}>
          {/* Drag handle - an explicit grip, not dots hidden on a photo */}
          {dragHandleProps ? (
            <Box
              {...dragHandleProps}
              aria-label={`Reorder ${name}`}
              sx={{
                // Visible on phones too. It used to be `xs: 'none'`, and since the
                // dnd-kit listeners live on THIS element that made reordering
                // impossible on mobile - while the header sat there telling people
                // to drag their stops to reorder them.
                display: 'flex', alignItems: 'center', flexShrink: 0,
                // A 17px glyph is under the 44px touch minimum, so the tap area is
                // padded out without changing how big the icon looks.
                px: { xs: 0.75, sm: 0 }, py: { xs: 1, sm: 0 }, mx: { xs: -0.5, sm: 0 },
                color: 'text.disabled',
                cursor: isDragging ? 'grabbing' : 'grab',
                // Stops the browser claiming the gesture as a scroll before dnd-kit
                // sees it, which is what makes a touch drag feel broken.
                touchAction: 'none',
                '&:hover': { color: 'text.secondary' },
              }}
            >
              <IconGripVertical size={17} stroke={1.7} />
            </Box>
          ) : null}

          {/* Day badge. Neutral, not coral: this is a LABEL, and the design system
              reserves coral for interactive accents. Three coral-tinted surfaces on
              one board (badge, add-stop card, Navia card) is the "vibe-coded" tell. */}
          <Box
            sx={(t) => ({
              flexShrink: 0, minWidth: 60, textAlign: 'center',
              px: 0.9, py: 0.55, borderRadius: '9px',
              bgcolor: t.custom.surface.hover,
              color: 'text.secondary',
            })}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              {dayLabel}
            </Typography>
          </Box>

          {/* Photo */}
          <Box
            sx={(t) => ({
              width: 56, height: 56, flexShrink: 0, borderRadius: '12px', overflow: 'hidden',
              bgcolor: t.custom.surface.hover,
              display: { xs: 'none', sm: 'block' },
            })}
          >
            {photo && (
              <Box component="img" src={photo} alt="" loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </Box>
        </Box>

        {/* ── Content column ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>

          {/* Title row: name/dates on the left, the stop's controls on the right */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {editingName ? (
                <InputBase
                  value={localName} autoFocus fullWidth
                  onChange={e => setLocalName(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitName();
                    else if (e.key === 'Escape') { setLocalName(name); setEditingName(false); }
                  }}
                  sx={(t) => ({
                    fontSize: 15, fontWeight: 600, px: 0.75, py: 0.15, borderRadius: '8px',
                    border: `1.5px solid ${t.palette.primary.main}`,
                  })}
                />
              ) : (
                <Typography
                  noWrap
                  onDoubleClick={() => { if (onRename) setEditingName(true); }}
                  title={onRename ? 'Double-click to rename' : undefined}
                  sx={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3, cursor: onRename ? 'text' : 'default' }}
                >
                  {name}
                </Typography>
              )}
              <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.4, mt: 0.2 }}>
                {startDate && endDate ? `${dateFmt(startDate)} → ${dateFmt(endDate)}` : 'Dates follow your trip start'}
              </Typography>
            </Box>

            <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
              {/* Nights stepper */}
              <Box
                sx={(t) => ({
                  display: 'flex', alignItems: 'center', height: { xs: 36, sm: 30 },
                  borderRadius: 999, px: 0.4, gap: 0.1,
                  border: `1px solid ${t.custom.surface.border}`,
                })}
              >
                {/* Bigger hit areas on touch: a 22px stepper button is well under the
                    44px guideline and these are the controls people poke most. */}
                {!readonly && (
                  <IconButton
                    size="small" aria-label="One night fewer" disabled={nights <= 1}
                    onClick={() => onChangeNights?.(id, -1)}
                    sx={{ width: { xs: 30, sm: 22 }, height: { xs: 30, sm: 22 }, fontSize: 15, fontWeight: 700, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                  >−</IconButton>
                )}
                <Typography sx={{ fontSize: 12, fontWeight: 600, px: 0.5, whiteSpace: 'nowrap' }}>
                  {nights} night{nights !== 1 ? 's' : ''}
                </Typography>
                {!readonly && (
                  <IconButton
                    size="small" aria-label="One night more"
                    onClick={() => onChangeNights?.(id, +1)}
                    sx={{ width: { xs: 30, sm: 22 }, height: { xs: 30, sm: 22 }, fontSize: 15, fontWeight: 700, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                  >+</IconButton>
                )}
              </Box>

              {/* Notes toggle */}
              <Tooltip title={hasNotes ? 'Edit note' : 'Add a note'} arrow placement="top">
                <IconButton
                  size="small"
                  // Tour anchor. querySelector takes the first match, i.e. the first
                  // stop's note button, which is the right one to point at.
                  data-tour="stop-note"
                  aria-label={hasNotes ? `Edit note for ${name}` : `Add a note for ${name}`}
                  onClick={() => setNotesOpen(o => !o)}
                  sx={{ p: { xs: 1, sm: 0.75 }, color: hasNotes ? 'text.primary' : 'text.disabled', '&:hover': { color: 'primary.main' } }}
                >
                  <IconNote size={17} stroke={1.7} />
                </IconButton>
              </Tooltip>

              {/* Remove */}
              {onRemove && (
                <Tooltip title="Remove stop" arrow placement="top">
                  <IconButton
                    size="small"
                    aria-label={`Remove ${name}`}
                    onClick={() => onRemove(id)}
                    sx={{ p: { xs: 1, sm: 0.75 }, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                  >
                    <IconTrash size={16} stroke={1.7} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Note preview - a note is content, so it stays on the card once written */}
          {hasNotes && !notesOpen && (
            <Typography
              onClick={() => setNotesOpen(true)}
              noWrap
              sx={{
                mt: 0.6, fontSize: 12.5, color: 'text.secondary', lineHeight: 1.5,
                cursor: 'pointer', transition: 'color .12s',
                '&:hover': { color: 'text.primary' },
              }}
            >
              {notePreview}
            </Typography>
          )}

          {/* Hidden-in-Easy content */}
          {hiddenBits.length > 0 && !notesOpen && (
            <Box
              component={onSwitchToAdvanced ? 'button' : 'div'}
              type={onSwitchToAdvanced ? 'button' : undefined}
              onClick={onSwitchToAdvanced}
              sx={(t) => ({
                display: 'flex', alignItems: 'center', gap: 0.3,
                mt: 0.5, p: 0, border: 'none', bgcolor: 'transparent', textAlign: 'left',
                fontFamily: 'inherit', fontSize: 11.5, fontWeight: 500, lineHeight: 1.4,
                color: 'text.disabled',
                cursor: onSwitchToAdvanced ? 'pointer' : 'default',
                transition: `color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
                '&:hover': onSwitchToAdvanced ? { color: 'primary.main' } : {},
                '&:focus-visible': { outline: `2px solid ${t.custom.ring}`, outlineOffset: 2 },
              })}
            >
              {hiddenBits.join(' · ')} saved, open {hiddenBits.length > 1 ? 'them' : 'it'} in Advanced
              {onSwitchToAdvanced && <IconChevronRight size={13} stroke={2} />}
            </Box>
          )}
        </Box>
      </Box>

      {/* Inline note editor */}
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
            <Box sx={(t) => ({ px: { xs: 1.5, sm: 2 }, pb: 1.75, pt: 0.25, borderTop: `1px solid ${t.custom.surface.border}` })}>
              {onChangeNotes ? (
                <TextField
                  multiline minRows={3} maxRows={8} fullWidth autoFocus
                  placeholder="Anything you want to remember about this stop…"
                  value={notes || ''}
                  onChange={(e) => onChangeNotes(id, e.target.value)}
                  size="small"
                  sx={{ mt: 1, '& .MuiOutlinedInput-root': { fontSize: 13, lineHeight: 1.6 } }}
                />
              ) : (
                <Typography sx={{ mt: 1, fontSize: 13, color: hasNotes ? 'text.secondary' : 'text.disabled', lineHeight: 1.6 }}>
                  {hasNotes ? notes : 'No notes yet'}
                </Typography>
              )}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionCard>
  );
};

export default SimpleDestinationCard;
