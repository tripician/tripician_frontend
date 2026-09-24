import React from 'react';
import { Box, ButtonBase, Popover, Tooltip, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  IconCalendar, IconMapPin, IconRosetteDiscountCheckFilled, IconRoute, IconWorld,
} from '@tabler/icons-react';
import { apiServices } from '../../services/APIs/apiServices';
import CountryFlag from '../../components/ui/CountryFlag';
import SectionHeader from '../../components/ui/SectionHeader';
import { tripPath } from '../../utils/tripSlug';
import { travelHistoryView, type TravelMap, type TravelNode, type TravelTier } from './travelHistory';

interface TravelHistoryPanelProps {
  userId: number;
  /** Changes the wording, and only the owner is told what could not be read. */
  isOwner?: boolean;
}

/**
 * Somebody's countries, in the order they reached them.
 *
 * ## Why this is not a map
 *
 * There are no country coordinates anywhere in this codebase, and none are
 * invented here. Countries are grouped by the year they were first reached, so
 * what a reader sees is the shape of somebody's travelling rather than a
 * geography we would be guessing at.
 *
 * ## Why the tiers matter more than the picture
 *
 * A country typed into a plan costs nothing, so it stays planned. One on a trip
 * that has ended counts as travelled. One that somebody OTHER than the traveller
 * can attest to, because another member was there, a story was published, or
 * Tripician reviewed it, is confirmed, and that is the only mark on this panel
 * beyond the reach of a person filling in a form.
 *
 * This deliberately does not unlock by geolocation. A browser coordinate is set
 * from the DevTools Sensors panel in three clicks, so a mark earned that way
 * would look more authoritative than the evidence above while being worth less.
 */
const TravelHistoryPanel: React.FC<TravelHistoryPanelProps> = ({ userId, isOwner }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [map, setMap] = React.useState<TravelMap | null>(null);
  const [open, setOpen] = React.useState<{ el: HTMLElement; node: TravelNode } | null>(null);

  // Matched on the request's own id rather than a cleanup flag: an effect that
  // is torn down and re-invoked would otherwise discard its own reply.
  React.useEffect(() => {
    if (!Number.isFinite(userId) || userId <= 0) return;
    let wanted = userId;
    void apiServices.getTravelMap(userId)
      .then((resp) => { if (wanted === userId) setMap(resp.data); })
      .catch(() => { if (wanted === userId) setMap({ countries: [], legs: [] }); });
    return () => { wanted = -1; };
  }, [userId]);

  const view = React.useMemo(() => travelHistoryView(map), [map]);

  if (!map) return null;

  // A stranger with no countries already gets told so by the empty trips grid
  // below. Saying it twice makes the page look broken rather than new.
  if (view.countries === 0 && !isOwner) return null;

  if (view.countries === 0) {
    return (
      <Box>
        <SectionHeader title="Travel history" />
        <Box sx={{ borderRadius: '16px', border: `1px dashed ${theme.custom.surface.border}`, px: 3, py: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {view.dropped > 0
              ? `None of the ${view.dropped} places stored on your trips could be read as a country. Open a trip and set its countries, and your travel history appears here.`
              : 'Your travel history starts with your first published trip. Plan one and it appears here.'}
          </Typography>
        </Box>
      </Box>
    );
  }

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  const facts: Array<{ Icon: React.ElementType; text: string; tip: string; brand?: boolean }> = [
    {
      Icon: IconMapPin,
      text: plural(view.travelled, 'country', 'countries'),
      tip: 'Distinct countries on trips that have ended. Countries only planned for are not counted.',
    },
    {
      Icon: IconWorld,
      text: plural(view.continents, 'continent', 'continents'),
      tip: 'The continents those countries are in.',
    },
    ...(view.firstYear !== null ? [{
      Icon: IconCalendar,
      text: `Travelling since ${view.firstYear}`,
      tip: isOwner
        ? 'The start of your earliest trip that has ended.'
        : 'The start of their earliest trip that has ended.',
    }] : []),
    ...(view.confirmed > 0 ? [{
      Icon: IconRosetteDiscountCheckFilled,
      text: `${view.confirmed} confirmed by someone else`,
      tip: 'Another member was on the trip, a story about it was published, or someone on our team reviewed it. This is the only mark here that cannot be given to yourself.',
      brand: true,
    }] : []),
    ...(view.planned > 0 ? [{
      Icon: IconRoute,
      text: `${view.planned} planned`,
      tip: isOwner
        ? 'Countries on trips of yours that have not happened yet.'
        : 'Countries on trips that have not happened yet.',
    }] : []),
  ];

  const tierWord = (node: TravelNode): string => {
    if (node.tier === 'gold') return 'confirmed by someone else';
    if (node.tier === 'unlocked') return 'trip finished';
    return node.published ? 'planned' : 'on a trip you have not published';
  };

  const chipSx = (tier: TravelTier) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
    px: 1, py: 0.75, minWidth: 76, maxWidth: 120, borderRadius: '12px',
    bgcolor: tier === 'gold' ? theme.custom.surface.brandTint : 'transparent',
    border: tier === 'gold'
      ? `1.5px solid ${theme.palette.primary.main}`
      : `1px ${tier === 'locked' ? 'dashed' : 'solid'} ${theme.custom.surface.border}`,
    transition: `border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
    '@media (hover: hover)': { '&:hover': { borderColor: tier === 'gold' ? 'primary.main' : 'text.disabled' } },
    '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
  });

  return (
    <Box>
      <SectionHeader
        title="Travel history"
        subtitle={isOwner
          ? view.unpublished > 0
            ? 'In the order you reached them. Countries from trips you have not published show here and nowhere else.'
            : 'In the order you reached them. Published trips only.'
          : 'In the order they were reached. Published trips only.'}
      />

      <Box
        sx={{
          borderRadius: '16px',
          border: `1px solid ${theme.custom.surface.border}`,
          bgcolor: 'background.paper',
          p: { xs: 2, sm: 2.5 },
        }}
      >
        {view.travelled > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, pb: 2, mb: 2.5, borderBottom: `1px solid ${theme.custom.surface.border}` }}>
            {facts.map((fact) => (
              <Tooltip key={fact.text} title={fact.tip} arrow>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, cursor: 'default', color: fact.brand ? 'primary.main' : 'text.secondary' }}>
                  <fact.Icon size={15} stroke={1.9} />
                  <Typography variant="caption" sx={{ color: 'inherit', fontWeight: fact.brand ? 700 : 500 }}>
                    {fact.text}
                  </Typography>
                </Box>
              </Tooltip>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary', pb: 2, mb: 2.5, borderBottom: `1px solid ${theme.custom.surface.border}` }}>
            {plural(view.countries, 'country', 'countries')} planned, none travelled yet.
          </Typography>
        )}

        {view.rows.map((row, i) => (
          <Box
            key={row.label}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '56px 1fr' },
              columnGap: 2, rowGap: 0.5, alignItems: 'start',
              mb: i === view.rows.length - 1 ? 0 : 2,
            }}
          >
            <Typography variant="overline" sx={{ color: row.year === null ? 'text.disabled' : 'text.secondary', pt: 1 }}>
              {row.label}
            </Typography>
            <Box
              role="list"
              aria-label={row.year === null
                ? `${row.label}: ${plural(row.nodes.length, 'country', 'countries')}`
                : `${row.label}: ${plural(row.nodes.length, 'country', 'countries')}, in the order they were reached`}
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
            >
              {row.nodes.map((node) => (
                // The list item wraps the button: putting the role on the control itself takes its button semantics away.
                <Box key={node.code} role="listitem" sx={{ display: 'inline-flex' }}>
                <ButtonBase
                  aria-haspopup="dialog"
                  aria-label={`${node.name}, ${tierWord(node)}`}
                  onClick={(e) => setOpen({ el: e.currentTarget, node })}
                  sx={chipSx(node.tier)}
                >
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <Box sx={node.tier === 'locked' ? { display: 'inline-flex', filter: 'grayscale(1)', opacity: 0.45 } : { display: 'inline-flex' }}>
                      <CountryFlag country={node.name} size={node.tier === 'gold' ? 30 : 26} variant="circle" />
                    </Box>
                    {/* The one tier nobody can give themselves carries a mark as well as a colour. */}
                    {node.tier === 'gold' && (
                      <Box sx={{
                        position: 'absolute', right: -3, bottom: -3, display: 'grid', placeItems: 'center',
                        width: 15, height: 15, borderRadius: '50%', bgcolor: 'background.paper', color: 'primary.main',
                      }}>
                        <IconRosetteDiscountCheckFilled size={13} />
                      </Box>
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      maxWidth: '100%', textOverflow: 'ellipsis',
                      fontWeight: node.tier === 'gold' ? 700 : 500,
                      color: node.tier === 'locked' ? 'text.disabled' : 'text.primary',
                    }}
                  >
                    {node.name}
                  </Typography>
                </ButtonBase>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* A colour that means "somebody else can attest to this" has to say so
          somewhere, or it is decoration. */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.25, px: 0.5 }}>
        {([
          ['gold', 'Confirmed by someone else'],
          ['unlocked', 'Trip finished'],
          // Locked covers two things on your own map: not published, and not yet
          // taken. A stranger only ever sees the second.
          ['locked', view.unpublished > 0 ? 'Not published, or not yet taken' : 'Planned, not yet taken'],
        ] as Array<[TravelTier, string]>).map(([tier, label]) => (
          <Box key={tier} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
            <Box
              sx={{
                width: 9, height: 9, borderRadius: '50%',
                border: `1.5px ${tier === 'locked' ? 'dashed' : 'solid'} ${tier === 'gold' ? theme.palette.primary.main : theme.palette.text.primary}`,
                bgcolor: tier === 'gold' ? 'primary.main' : 'transparent',
                ...(tier === 'locked' ? { borderColor: theme.palette.text.disabled } : {}),
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>{label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Their data, so they can fix it. A stranger is never shown somebody else's mess. */}
      {isOwner && view.dropped > 0 && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, px: 0.5, color: 'text.disabled' }}>
          {view.dropped === 1
            ? '1 stored value on your trips could not be read as a country, so it is not shown. Open a trip and set its countries to fix that.'
            : `${view.dropped} stored values on your trips could not be read as a country, so they are not shown. Open a trip and set its countries to fix that.`}
        </Typography>
      )}

      <Popover
        open={Boolean(open)}
        anchorEl={open?.el ?? null}
        onClose={() => setOpen(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { p: 1.5, maxWidth: 280, borderRadius: '14px' } } }}
      >
        {open && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{open.node.name}</Typography>
            <Typography variant="caption" sx={{ display: 'block', color: open.node.tier === 'gold' ? 'primary.main' : 'text.secondary', mb: open.node.trips.length ? 1 : 0 }}>
              {open.node.tier === 'gold' ? 'Confirmed by someone else.'
                : open.node.tier === 'unlocked' ? 'Trip finished.'
                  : open.node.published ? 'Planned, not yet taken.' : 'On a trip you have not published.'}
            </Typography>
            {open.node.trips.length === 0 ? (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>No trip recorded for this country.</Typography>
            ) : (
              <>
                {open.node.trips.slice(0, 3).map((trip) => (
                  <ButtonBase
                    key={trip.id}
                    onClick={() => { setOpen(null); navigate(tripPath({ id: trip.id, name: trip.name })); }}
                    sx={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%',
                      px: 1, py: 0.75, borderRadius: '10px', textAlign: 'left',
                      '&:hover': { bgcolor: theme.custom.surface.hover },
                      '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
                    }}
                  >
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600, maxWidth: '100%' }}>{trip.name || 'Untitled trip'}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {trip.startDate
                        ? new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })
                        : 'No dates'}
                      {trip.published === false ? ' · Draft' : ''}
                    </Typography>
                  </ButtonBase>
                ))}
                {open.node.trips.length > 3 && (
                  <Typography variant="caption" sx={{ display: 'block', px: 1, pt: 0.5, color: 'text.disabled' }}>
                    {open.node.trips.length - 3 === 1 ? 'and 1 more' : `and ${open.node.trips.length - 3} more`}
                  </Typography>
                )}
              </>
            )}
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default TravelHistoryPanel;
