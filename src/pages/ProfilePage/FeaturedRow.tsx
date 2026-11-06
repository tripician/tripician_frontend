import React from 'react';
import { Box, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import SectionHeader from '../../components/ui/SectionHeader';
import ScrollRail from '../../components/ui/ScrollRail';
import { apiServices } from '../../services/APIs/apiServices';
import { useTripCover } from '../../utils/tripCover';
import { FEATURED_QUOTE, featuredHref, featuredMeta, normalizeFeaturedItems, type FeaturedItem } from './featuredItems';

const CARD_WIDTH = 260;

/** A card's picture: its own cover, or for a plan or story without one, a photo of where it went. */
const FeaturedCover: React.FC<{ item: FeaturedItem }> = ({ item }) => {
  const fallback = useTripCover(
    item.type === 'photo' ? null : { photoUrl: item.coverUrl, countries: item.countries, name: item.place ?? item.title },
  );
  const src = item.type === 'photo' ? item.coverUrl : fallback;
  return (
    <Box
      sx={(theme) => ({
        aspectRatio: '4 / 3',
        borderRadius: '14px',
        overflow: 'hidden',
        bgcolor: theme.custom.surface.hover,
      })}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt=""
          loading="lazy"
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : null}
    </Box>
  );
};

/**
 * Featured: the traveller's own exhibition, up to five plans, stories and
 * photographs they chose in the app, in their order. Read only here. Always
 * drawn: an empty row (or a server without the feature) shows a quote, as the
 * app does, so the profile never looks like it is missing a piece.
 */
const FeaturedRow: React.FC<{ userId: number; isOwner?: boolean }> = ({ userId, isOwner = false }) => {
  const [items, setItems] = React.useState<FeaturedItem[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setItems([]);
    setLoaded(false);
    apiServices
      .getProfileFeatured(userId)
      .then(({ data }) => {
        if (active) setItems(normalizeFeaturedItems(data));
      })
      // An older server, or a profile the caller may not see: an empty row, not an error.
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  // Nothing until the first answer, so a full row does not flash the empty quote first.
  if (!loaded) return null;

  if (!items.length) {
    return (
      <Box component="section" aria-label="Featured" sx={{ mb: { xs: 4, md: 5 } }}>
        <SectionHeader title="Featured" subtitle="Handpicked journeys, stories and moments" />
        <Box
          sx={(theme) => ({
            borderRadius: '12px',
            bgcolor: theme.custom.surface.hover,
            px: 3,
            py: 3,
            textAlign: 'center',
          })}
        >
          <Typography sx={(theme) => ({ fontFamily: theme.typography.h1.fontFamily, fontSize: 18, lineHeight: 1.4 })}>
            “{FEATURED_QUOTE}”
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
            {isOwner ? 'Feature a plan, a story or a photo you have posted, from the Tripician app.' : 'Nothing featured yet.'}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box component="section" aria-label="Featured" sx={{ mb: { xs: 4, md: 5 } }}>
      <SectionHeader title="Featured" subtitle="Handpicked journeys, stories and moments" />
      <ScrollRail gap={2} ariaLabel="Featured">
        {items.map((item) => {
          const href = featuredHref(item);
          const card = (
            <Box sx={{ width: CARD_WIDTH, display: 'grid', gap: 1 }}>
              <FeaturedCover item={item} />
              <Box sx={{ px: 0.25, minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="p">
                  {featuredMeta(item)}
                </Typography>
              </Box>
            </Box>
          );
          return (
            <Box key={`${item.type}:${item.id}`} sx={{ flex: '0 0 auto' }}>
              {href ? (
                <Box
                  component={RouterLink}
                  to={href}
                  aria-label={`${item.title}, ${featuredMeta(item)}`}
                  sx={(theme) => ({
                    display: 'block',
                    color: 'inherit',
                    textDecoration: 'none',
                    borderRadius: '14px',
                    '&:hover img': { transform: 'scale(1.03)' },
                    '& img': { transition: `transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}` },
                    '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 3 },
                  })}
                >
                  {card}
                </Box>
              ) : (
                card
              )}
            </Box>
          );
        })}
      </ScrollRail>
    </Box>
  );
};

export default FeaturedRow;
