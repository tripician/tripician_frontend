import React from 'react';
import { Avatar, AvatarGroup, Box, Button, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { IconSettings, IconUsers } from '@tabler/icons-react';
import PlannerHeaderShell from './PlannerHeaderShell';

export interface RealityCheckPill {
  label: string;
  tip: string;
  icon: React.ReactNode;
  color?: string;
  borderColor?: string;
  bg?: string;
}

export interface PlanHeaderProps {
  title: string;
  origin?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  stopCount: number;
  /** Nights the stops add up to. */
  plannedNights: number;
  travelers: Array<{ id?: string | number; name?: string; avatar?: string }>;
  canEdit: boolean;
  onOpenSettings: () => void;
  onOpenShare: () => void;
  realityCheck?: RealityCheckPill | null;
  onRealityCheck?: () => void;
  /** Publish, Published and Share, built once by the planner. */
  actions?: React.ReactNode;
}

const shortDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const spanNights = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 0;
  const diff = Math.round((new Date(`${end.slice(0, 10)}T00:00:00`).getTime() - new Date(`${start.slice(0, 10)}T00:00:00`).getTime()) / 86400000);
  return diff > 0 ? diff : 0;
};

// The one band above the route: the facts of the trip, its name, and what you can do with it.
const PlanHeader: React.FC<PlanHeaderProps> = ({
  title, origin, startDate, endDate, stopCount, plannedNights, travelers, canEdit,
  onOpenSettings, onOpenShare, realityCheck, onRealityCheck, actions,
}) => {
  const theme = useTheme();
  const start = shortDate(startDate);
  const end = shortDate(endDate);
  const span = spanNights(startDate, endDate);
  const short = span > 0 && stopCount > 0 && plannedNights < span;
  const nightsText = short ? `${plannedNights} of ${span} nights planned` : `${span || plannedNights} ${(span || plannedNights) === 1 ? 'night' : 'nights'}`;

  const factSx = { color: 'text.secondary', lineHeight: 1.4, whiteSpace: 'nowrap' } as const;
  const linkSx = {
    ...factSx, border: 0, bgcolor: 'transparent', p: 0, font: 'inherit', cursor: canEdit ? 'pointer' : 'default',
    textDecoration: 'underline', textDecorationColor: 'transparent', textUnderlineOffset: '3px',
    '&:hover': canEdit ? { color: 'text.primary', textDecorationColor: 'currentColor' } : {},
    '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
  } as const;
  const facts: React.ReactNode[] = [];
  if (origin) facts.push(<Typography key="o" component="button" type="button" variant="overline" onClick={() => canEdit && onOpenSettings()} sx={linkSx}>{`From ${origin}`}</Typography>);
  facts.push(
    <Typography key="d" component="button" type="button" variant="overline" onClick={() => canEdit && onOpenSettings()} sx={{ ...linkSx, color: start ? 'text.secondary' : 'text.primary' }}>
      {start && end ? `${start} to ${end}` : 'Add dates'}
    </Typography>,
  );
  facts.push(<Typography key="n" variant="overline" sx={{ ...factSx, color: short ? theme.palette.warning.dark : 'text.secondary' }}>{nightsText}</Typography>);
  if (stopCount > 0) facts.push(<Typography key="s" variant="overline" sx={factSx}>{`${stopCount} ${stopCount === 1 ? 'stop' : 'stops'}`}</Typography>);

  return (
    <PlannerHeaderShell>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 0.9, rowGap: 0.25 }}>
          {facts.map((node, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Box aria-hidden sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />}
              {node}
            </React.Fragment>
          ))}
        </Box>
        <Tooltip title={canEdit ? 'Rename, change dates and more' : ''} placement="bottom-start">
          <Typography
            variant="h5"
            component="h1"
            onClick={() => canEdit && onOpenSettings()}
            noWrap
            sx={{ mt: 0.25, cursor: canEdit ? 'pointer' : 'default', minWidth: 0 }}
          >
            {title}
          </Typography>
        </Tooltip>
        {stopCount === 0 && canEdit && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            Add your first stop below, or let TripicianAI plan it for you.
          </Typography>
        )}
      </Box>

      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
        {canEdit && realityCheck && (
          <Tooltip title={realityCheck.tip} arrow placement="bottom">
            <Box
              component="button"
              type="button"
              data-tour="reality-check"
              onClick={onRealityCheck}
              aria-label={`Reality check: ${realityCheck.label}`}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.6, height: 32, px: 1.25, borderRadius: '999px', flexShrink: 0, whiteSpace: 'nowrap',
                border: `1px solid ${realityCheck.borderColor ?? theme.custom.surface.border}`, bgcolor: realityCheck.bg ?? 'transparent',
                color: realityCheck.color ?? 'text.primary', font: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                '&:hover': { borderColor: 'text.secondary' },
                '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
              }}
            >
              {realityCheck.icon}
              {realityCheck.label}
            </Box>
          </Tooltip>
        )}

        <Button
          size="small"
          variant="outlined"
          onClick={onOpenShare}
          startIcon={travelers.length > 1 ? undefined : <IconUsers size={14} stroke={1.9} />}
          sx={{
            height: 32, px: 1.4, borderRadius: '999px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            color: 'text.primary', borderColor: theme.custom.surface.border, '& .MuiButton-startIcon': { mr: 0.6 },
            '&:hover': { borderColor: 'text.secondary', bgcolor: 'transparent' },
          }}
        >
          {travelers.length > 1 && (
            <AvatarGroup max={3} sx={{ mr: 0.7, '& .MuiAvatar-root': { width: 19, height: 19, fontSize: 9, fontWeight: 700, border: '1.5px solid', borderColor: 'background.default' } }}>
              {travelers.map((u, i) => (
                <Avatar key={u.id ?? i} src={u.avatar || undefined} sx={{ bgcolor: 'primary.main' }}>{(u.name || 'T').charAt(0).toUpperCase()}</Avatar>
              ))}
            </AvatarGroup>
          )}
          {travelers.length > 1 ? `${travelers.length} going` : 'Invite'}
        </Button>

        {actions}

        {canEdit && (
          <Tooltip title="Trip settings" arrow>
            <IconButton aria-label="Trip settings" onClick={onOpenSettings} sx={{ border: `1px solid ${theme.custom.surface.border}`, width: 32, height: 32 }}>
              <IconSettings size={17} stroke={1.8} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </PlannerHeaderShell>
  );
};

export default PlanHeader;
