import React from 'react';
import { Avatar, Box, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '../../services/APIs/apiServices';
import SectionHeader from '../../components/ui/SectionHeader';
import ScrollRail from '../../components/ui/ScrollRail';
import CardTypeTag from '../../components/ui/CardTypeTag';
import type { CardTypeKind } from '../../components/ui/cardTypes';
import { formatRelativeTime } from '../../utils/relativeTime';

export interface ActivityItem {
  id: string;
  kind: string;
  occurredAt: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  href: string | null;
  actorUserId: number | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
}

/**
 * What each event is called, and which kind of thing it is about.
 *
 * Only the verb lives here. The ribbon's label, icon and tone come from
 * CARD_TYPES, so a published plan looks the same in this rail as it does on a
 * trip card. It did not use to: this map carried its own icons and had already
 * drifted to a map glyph where the card used a route.
 */
const ACTIVITY: Record<string, { verb: string; type: CardTypeKind }> = {
  trip_published: { verb: 'published a plan', type: 'plan' },
  story_published: { verb: 'published an after story', type: 'story' },
  trip_listed: { verb: 'is looking for people', type: 'recruiting' },
  trip_comment: { verb: 'commented', type: 'comment' },
  story_question: { verb: 'asked the author', type: 'storyQuestion' },
  identity_verified: { verb: 'is now identity verified', type: 'verified' },
  organization_post: { verb: 'posted', type: 'organization' },
  platform_notice: { verb: 'from Tripician', type: 'notice' },
  // No traveller posts or questions. The road is already on this page twice, and
  // this rail is for what people made.
};

/**
 * What the community has actually been doing.
 *
 * Every card is one real record with a real timestamp and somewhere to go. No
 * counters, no "trending", nothing inferred: ordering is chronological, because
 * there is not enough traffic yet to rank against and a fabricated ranking would
 * be a claim the page cannot back.
 *
 * Renders nothing when empty, so a quiet week is not a broken-looking rail.
 */
const ActivityFeed: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const border = theme.custom.surface.border;
  const [items, setItems] = React.useState<ActivityItem[]>([]);

  React.useEffect(() => {
    let active = true;
    apiClient.get<ActivityItem[]>('/api/community/activity?take=18')
      .then((r) => { if (active) setItems(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, []);

  /*
   * A row this build has no name for is dropped, not guessed at.
   *
   * The alternative was a fallback that rendered an "Update" with a map glyph
   * and no verb at all, which is how a server still serving a retired kind
   * showed up: as a mystery card nobody could explain. A missing row during a
   * deploy skew is a smaller lie than a mislabelled one.
   */
  const visible = React.useMemo(
    () => items.filter((item) => item.kind in ACTIVITY),
    [items],
  );

  if (visible.length === 0) return null;

  return (
    <Box sx={{ mt: { xs: 4, md: 5 } }}>
      <SectionHeader
        title="Happening now"
        subtitle="Real things people did here, newest first"
      />

      <ScrollRail ariaLabel="Recent community activity">
        {visible.map((item) => {
          const meta = ACTIVITY[item.kind];
          const clickable = Boolean(item.href);

          return (
            <Box
              key={item.id}
              component={clickable ? 'button' : 'div'}
              type={clickable ? 'button' : undefined}
              onClick={clickable ? () => navigate(item.href!) : undefined}
              sx={{
                position: 'relative',
                flexShrink: 0,
                width: { xs: 250, sm: 280 },
                /*
                 * `p: 0` is load-bearing. A <button> carries the browser's own
                 * padding, which inset the cover photograph from both edges and
                 * made every card look like a picture in a mount.
                 *
                 * The flex column is the other half of that: a button centres its
                 * content, so a card with no photograph floated its text into the
                 * middle while its neighbours started at the top.
                 */
                p: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                textAlign: 'left',
                font: 'inherit',
                border: `1px solid ${border}`,
                borderRadius: '16px',
                bgcolor: 'background.paper',
                overflow: 'hidden',
                cursor: clickable ? 'pointer' : 'default',
                transition: `border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
                '&:hover': clickable ? { borderColor: 'text.disabled' } : {},
                '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
              }}
            >
              <CardTypeTag kind={meta.type} />

              {item.imageUrl && (
                <Box
                  component="img"
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  sx={{ width: '100%', height: 132, objectFit: 'cover', display: 'block' }}
                />
              )}

              <Box sx={{ p: 1.75, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9, mb: 1, pr: item.imageUrl ? 0 : 3 }}>
                  <Avatar
                    src={item.actorAvatarUrl ?? undefined}
                    sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main', flexShrink: 0 }}
                  >
                    {(item.actorName ?? 'T').charAt(0).toUpperCase()}
                  </Avatar>

                  {/* Two lines, not one. Sharing a single noWrap line meant the
                      longer verbs were the ones that got cut, so the card told you
                      who but not what. */}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}
                      noWrap
                    >
                      {item.actorName ?? 'A traveller'}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.3 }}
                      noWrap
                    >
                      {meta.verb}
                    </Typography>
                  </Box>
                </Box>

                {/* Not every row has a headline. A note written without a place has
                    nothing to put here, and the alternative was a bold "posted"
                    saying the same word as the verb above it. */}
                {item.title && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700, color: 'text.primary', lineHeight: 1.35,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}
                  >
                    {item.title}
                  </Typography>
                )}

                {item.body && (
                  <Typography
                    variant={item.title ? 'caption' : 'body2'}
                    sx={{
                      color: item.title ? 'text.secondary' : 'text.primary',
                      display: '-webkit-box',
                      mt: item.title ? 0.4 : 0,
                      lineHeight: item.title ? undefined : 1.4,
                      /*
                       * A rail stretches every card to the tallest, which is set by
                       * whichever one carries a photograph. A card without one was
                       * three lines of text and then 200px of nothing, so it read as
                       * broken rather than short. Spending that height on more of
                       * the text fills it with something worth reading.
                       */
                      WebkitLineClamp: item.imageUrl ? 2 : (item.title ? 6 : 8),
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.body}
                  </Typography>
                )}

                {/* Pushed to the foot so the timestamp lines up across a row of
                    cards whose bodies are different lengths. */}
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 'auto', pt: 1 }}>
                  {formatRelativeTime(item.occurredAt)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </ScrollRail>
    </Box>
  );
};

export default ActivityFeed;
