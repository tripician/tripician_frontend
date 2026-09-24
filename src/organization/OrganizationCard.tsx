import React from 'react';
import { Avatar, Box, Tooltip, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { IconBuildingCommunity, IconRosetteDiscountCheckFilled, IconUsersPlus } from '@tabler/icons-react';
import CardTypeTag from '../components/ui/CardTypeTag';
import type { OrganizationDirectoryEntry } from './types';

interface OrganizationCardProps {
  organization: OrganizationDirectoryEntry;
  /** Trips of theirs a traveller can still ask to join, counted by the caller from the published list. */
  openTrips: number;
  /** Fixed width for a rail; omitted, the card fills its grid cell. */
  width?: number;
}

// A group in the directory: who they are, whether Tripician verified them, and how many of their trips you can join.
const OrganizationCard: React.FC<OrganizationCardProps> = ({ organization, openTrips, width }) => {
  const theme = useTheme();
  const [coverFailed, setCoverFailed] = React.useState(false);
  const cover = coverFailed ? null : organization.coverUrl;
  const trips = organization.publishedTripCount;
  const members = organization.memberCount ?? 0;

  return (
    <Box
      component={RouterLink}
      to={`/o/${encodeURIComponent(organization.slug)}`}
      aria-label={`${organization.name}, group`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: 'inherit',
        textDecoration: 'none',
        borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        boxShadow: theme.custom.shadows.card,
        transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}, transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
        ...(width ? { flex: '0 0 auto', width } : { height: '100%' }),
        '&:hover': { boxShadow: theme.custom.shadows.cardHover, transform: 'translateY(-3px)' },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
      }}
    >
      <Box sx={{ position: 'relative', aspectRatio: '16 / 9', bgcolor: theme.custom.surface.brandTint, flexShrink: 0 }}>
        <CardTypeTag kind="organization" />
        {/* No cover: a quiet group mark rather than an empty rectangle that reads as a failed image. */}
        {!cover && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'primary.main', opacity: 0.55 }}>
            <IconBuildingCommunity size={40} stroke={1.5} />
          </Box>
        )}
        {cover && (
          <Box
            component="img"
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </Box>

      <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
        <Avatar
          src={organization.logoUrl ?? undefined}
          variant="rounded"
          alt=""
          sx={{
            width: 52,
            height: 52,
            mt: '-26px',
            borderRadius: '14px',
            border: `3px solid ${theme.palette.background.paper}`,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 700,
          }}
        >
          {organization.name.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, minWidth: 0 }}>
            {organization.name}
          </Typography>
          {organization.verified && (
            <Tooltip title="Tripician checked this business is who it says it is" arrow>
              <Box component="span" sx={{ display: 'inline-flex', color: 'primary.main', flexShrink: 0 }} aria-label="Verified business">
                <IconRosetteDiscountCheckFilled size={17} />
              </Box>
            </Tooltip>
          )}
        </Box>

        {organization.description && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {organization.description}
          </Typography>
        )}

        <Box sx={{ mt: 'auto', pt: 0.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 1.5, rowGap: 0.5 }}>
          {/* A group with nothing published yet is new, not broken, and its members are the fact worth stating. */}
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {trips === 0 ? 'No trips yet' : `${trips} published ${trips === 1 ? 'trip' : 'trips'}`}
          </Typography>
          {members > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {members} {members === 1 ? 'member' : 'members'}
            </Typography>
          )}
          {openTrips > 0 && (
            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <IconUsersPlus size={14} stroke={2} />
              {openTrips} open to join
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default OrganizationCard;
