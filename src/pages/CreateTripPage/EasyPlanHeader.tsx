import React from 'react';
import { Box, Typography, Tooltip, AvatarGroup, Avatar, Button } from '@mui/material';
import { IconUsers, IconLayoutGrid, IconSparkles } from '@tabler/icons-react';
import SegmentedControl from '../../components/ui/SegmentedControl';
import type { PlannerMode } from '../../utils/normalizeTrip';

export interface EasyPlanHeaderProps {
  stopCount: number;
  totalNights: number;
  startDate?: string | null;
  endDate?: string | null;
  travelers: Array<{ id?: string | number; name?: string; avatar?: string }>;
  canEdit: boolean;
  mode: PlannerMode;
  onModeChange: (mode: PlannerMode) => void;
  onOpenSettings: () => void;
  onOpenShare: () => void;
}

const fmt = (iso?: string | null) => {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }
  catch { return null; }
};

/**
 * The Easy-mode replacement for the advanced planner's vitals bar.
 *
 * The advanced bar is a toolbar: seven pills, a readiness ring, reality check,
 * publish, share. That is the right density for someone who already knows what
 * they are doing and the wrong one for the users this mode exists for - the
 * reviews said "from where should I start?", so this header answers exactly
 * that question in one sentence and gets out of the way.
 */
const EasyPlanHeader: React.FC<EasyPlanHeaderProps> = ({
  stopCount, totalNights, startDate, endDate, travelers, canEdit,
  mode, onModeChange, onOpenSettings, onOpenShare,
}) => {
  const start = fmt(startDate);
  const end = fmt(endDate);
  const hasDates = Boolean(start && end);

  // One instruction, matched to what is actually missing. Only ever one line -
  // a list of next steps is the same overwhelm in a smaller font.
  const guidance = stopCount === 0
    ? 'Start by adding your first stop, anywhere you know you want to go.'
    : !hasDates
      ? 'Add your travel dates so the days line up against your stops.'
      : stopCount === 1
        ? 'Add your next stop, or open a stop to jot down a note.'
        : 'Drag stops to reorder your route · tap the note icon on any stop.';

  return (
    <Box
      sx={(t) => ({
        // px MUST stay identical to DestinationCardsPanel's root, at every
        // breakpoint, or the header text and the stop cards sit on two different
        // left edges. Change one, change the other.
        px: { xs: 2, sm: 2.5 }, py: { xs: 1.75, sm: 2.25 },
        borderBottom: `1px solid ${t.custom.surface.border}`,
        bgcolor: 'background.default',
        position: 'sticky', top: 0, zIndex: 2,
      })}
    >
      {/*
        Stacks into rows on a phone. Side by side, the controls cluster claims ~260px
        of a 390px viewport, which squeezed the text column to ~115px: the facts
        kicker broke onto THREE lines ("1 STOP ·" / "3 NIGHTS ·" / "30 AUG - 3 SEPT")
        and the guidance sentence onto four. Full-width rows fix both.
      */}
      <Box
        sx={{
          maxWidth: 900, mx: 'auto', width: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 1.25, sm: 2 },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>

          {/*
            Facts as an OVERLINE KICKER above the title - the house pattern
            (SectionHeader is overline then title). A short run of trip facts is
            exactly what small-caps metadata type is for; sitting *underneath* the
            sentence as ordinary grey body text it read like a stray caption.
            Uses `variant` rather than a bespoke fontSize, per the theme rule.
          */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 0.85, mb: 0.4 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
              {stopCount} stop{stopCount === 1 ? '' : 's'}
            </Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
            <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
              {totalNights} night{totalNights === 1 ? '' : 's'}
            </Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
            <Tooltip title={canEdit ? 'Edit trip dates' : 'Trip dates'} arrow placement="bottom">
              <Typography
                component="button"
                type="button"
                variant="overline"
                onClick={() => { if (canEdit) onOpenSettings(); }}
                sx={(t) => ({
                  border: 'none', bgcolor: 'transparent', p: 0, lineHeight: 1.4,
                  fontFamily: 'inherit',
                  color: hasDates ? 'text.secondary' : 'primary.main',
                  cursor: canEdit ? 'pointer' : 'default',
                  textDecoration: 'underline',
                  textDecorationColor: 'transparent',
                  textUnderlineOffset: '3px',
                  transition: `color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}, text-decoration-color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
                  '&:hover': canEdit ? { color: 'primary.main', textDecorationColor: 'currentColor' } : {},
                  '&:focus-visible': { outline: `2px solid ${t.custom.ring}`, outlineOffset: 2 },
                })}
              >
                {hasDates ? `${start} - ${end}` : 'Add dates'}
              </Typography>
            </Tooltip>
          </Box>

          {/*
            The guidance sentence is the TITLE of this header - the one line this
            whole mode exists to deliver ("from where should I start?").
          */}
          <Typography variant="subtitle1" sx={{ color: 'text.primary', lineHeight: 1.35 }}>
            {guidance}
          </Typography>
        </Box>

        {/*
          One right-hand cluster, vertically centred against the two-line block.
          The crew button and the mode switch were previously separated by a void
          with the switch top-aligned, which read as two unrelated strays.
        */}
        <Box
          sx={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1,
            // On a phone this is its own full-width row, so spread the two controls
            // to the edges rather than leaving them huddled on the left.
            justifyContent: { xs: 'space-between', sm: 'flex-end' },
          }}
        >
          <Tooltip title={travelers.length > 1 ? 'Manage travelers & invite more' : 'Invite people to plan with you'} arrow placement="bottom">
            <Button
              size="small"
              variant="outlined"
              onClick={onOpenShare}
              startIcon={travelers.length > 1 ? undefined : <IconUsers size={14} stroke={1.9} />}
              sx={{
                height: 32, px: 1.4, borderRadius: 999,
                textTransform: 'none', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
                color: 'text.primary', borderColor: 'divider', flexShrink: 0,
                '& .MuiButton-startIcon': { mr: 0.6 },
                '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'transparent' },
              }}
            >
              {travelers.length > 1 && (
                <AvatarGroup max={3} sx={{ mr: 0.7, '& .MuiAvatar-root': { width: 19, height: 19, fontSize: 9, fontWeight: 700, border: '1.5px solid', borderColor: 'background.default' } }}>
                  {travelers.map((u, i) => (
                    <Avatar key={u.id ?? i} src={u.avatar || undefined} sx={{ bgcolor: 'primary.main' }}>
                      {(u.name || 'T').charAt(0).toUpperCase()}
                    </Avatar>
                  ))}
                </AvatarGroup>
              )}
              {travelers.length > 1 ? `${travelers.length} travelers` : 'Invite crew'}
            </Button>
          </Tooltip>

          {canEdit && (
            <Box data-tour="planner-mode" sx={{ display: 'inline-flex' }}>
              <SegmentedControl<PlannerMode>
                aria-label="Planner mode"
                value={mode}
                onChange={onModeChange}
                options={[
                  { value: 'easy', label: 'Simple', Icon: IconSparkles, tip: 'Just stops, nights and notes' },
                  { value: 'advanced', label: 'Advanced', Icon: IconLayoutGrid, tip: 'Stays, places, budget, packing and publishing' },
                ]}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default EasyPlanHeader;
