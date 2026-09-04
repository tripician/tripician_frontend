import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { IconUsersPlus } from '@tabler/icons-react';
import SeeAllLink from '../../components/ui/SeeAllLink';
import VerifiedTripBadge from '../../components/CommonComponents/VerifiedTripBadge';
import { tripCoverPhoto } from '../../utils/tripCover';
import { describeSpots } from '../../seats/types';

interface RecruitingRailProps {
  trips: any[];
  onTripClick: (trip: any) => void;
}

/**
 * The one module on this page you can act on, given a permanent home.
 *
 * It keeps its slot whether or not anybody is recruiting, which is the whole
 * point: an empty panel that says nobody is recruiting is information, while a
 * blank column beside the feed is just a hole. The empty state also does the
 * only useful thing available to it, which is to tell the reader they could be
 * the one filling it.
 *
 * Compact rows rather than the full trip card, because four cards would run to
 * roughly a thousand pixels and leave the column dangling far below the feed
 * beside it. Everything a row shows already travels with the trip list, so this
 * costs no extra request.
 */
const RecruitingRail: React.FC<RecruitingRailProps> = ({ trips, onTripClick }) => {
  const theme = useTheme();
  const border = theme.custom.surface.border;

  return (
    <Box
      component="aside"
      sx={{
        borderRadius: '16px',
        border: `1px solid ${border}`,
        bgcolor: theme.custom.surface.hover,
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
        <IconUsersPlus size={16} stroke={1.9} color={theme.palette.text.secondary} />
        <Typography sx={{ fontWeight: 800, fontSize: 15 }}>
          Trips looking for people
        </Typography>
      </Box>

      {trips.length > 0 ? (
        <>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
            The organiser approves everyone who joins.
          </Typography>

          <Box sx={{ display: 'grid', gap: 1.25 }}>
            {trips.map((t) => {
              const photo = tripCoverPhoto(t);
              const countries: string[] = Array.isArray(t.countries) ? t.countries : [];
              const spots = describeSpots({ spotsLeft: t.spotsLeft ?? null });
              const reviewed = (t.verified ?? t.Verified) === true;
              // Said on the row rather than left to the absent badge, because a
              // missing mark is only legible next to a present one.
              const meta = [countries[0] || null, spots, reviewed ? null : 'not reviewed']
                .filter(Boolean).join(' · ');

              return (
                <Box
                  key={t.id || t.Id}
                  component="button"
                  type="button"
                  onClick={() => onTripClick(t)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25, width: '100%',
                    border: 'none', bgcolor: 'transparent', cursor: 'pointer',
                    p: 0.75, mx: -0.75, borderRadius: '10px', textAlign: 'left',
                    fontFamily: 'inherit',
                    '&:hover': { bgcolor: 'background.paper' },
                  }}
                >
                  <Box
                    sx={{
                      width: 42, height: 42, flexShrink: 0, borderRadius: '10px',
                      bgcolor: theme.custom.surface.active,
                      backgroundImage: photo ? `url(${photo})` : 'none',
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    }}
                  />

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5, minWidth: 0 }} noWrap>
                        {t.name}
                      </Typography>
                      <VerifiedTripBadge verified={reviewed} verifiedAt={t.verifiedAt ?? t.VerifiedAt} />
                    </Box>
                    {meta && (
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                        {meta}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ mt: 1.5 }}>
            <SeeAllLink to="/trips/looking-for-people" />
          </Box>
        </>
      ) : (
        <>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, mb: 1.5, fontSize: 13.5 }}>
            Nobody is looking for company at the moment. If you have a spare place on
            a trip, open it to join requests and it lands here.
          </Typography>

          <Typography
            component={RouterLink}
            to="/profile?tab=trips"
            variant="caption"
            sx={{
              fontWeight: 700, color: 'primary.main', textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Open one of your trips
          </Typography>
        </>
      )}
    </Box>
  );
};

export default RecruitingRail;
