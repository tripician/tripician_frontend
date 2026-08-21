/**
 * /story/:slugOrId , the public face of a story.
 *
 * Same posture as TripShowcase: a visitor meets a finished thing, not the
 * workshop. No editor chrome, no completion meters, no prompts to add anything.
 *
 * The one commercial element is the plan card. A story is a far better entry
 * object than an itinerary, and it hands the reader a clonable plan at the exact
 * moment they have decided they want to go.
 */

import React from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconArrowLeft,
  IconBookmark,
  IconBookmarkFilled,
  IconCopy,
  IconDotsVertical,
  IconFlag,
  IconHeart,
  IconHeartFilled,
  IconMapPin,
  IconBook,
  IconPencil,
  IconShare2,
  IconCalendar,
} from '@tabler/icons-react';
import Seo, { SITE_URL } from '../components/Seo';
import { resolveStoryCover, formatTravelWindow } from './storyFormat';
import AfterStoryReader from './render/AfterStoryReader';
import StoryVideoCover from './render/StoryVideoCover';
import ReportStoryDialog from './ReportStoryDialog';
import BookPreviewDialog from './book/BookPreviewDialog';
import BookCheckoutDialog from './book/BookCheckoutDialog';
import { FEATURE_FLAGS } from '../config/featureFlags';
import StoryQuestions from './StoryQuestions';
import { afterStoryService, AfterStoryError } from './afterStoryService';
import { parseBlocks, readingMinutes } from './blockSchema';
import { templateStyle } from './render/templates';
import { toProviderKey } from './videoEmbed';
import { storyEditPath } from './storySlug';
import { VIBES } from '../pages/CommunityPage/vibes';
import { useAuthToken } from '../hooks/useAuth0Token';
import type { AfterStoryDto, StoryBlock, StoryReactionSummary } from './types';

const CONTENT_MAX = 1280;

const StoryPage: React.FC = () => {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();

  const [story, setStory] = React.useState<AfterStoryDto | null>(null);
  const [blocks, setBlocks] = React.useState<StoryBlock[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ message: string; gone: boolean } | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [reporting, setReporting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [reactions, setReactions] = React.useState<StoryReactionSummary | null>(null);
  const [bookOpen, setBookOpen] = React.useState(false);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [reactionBusy, setReactionBusy] = React.useState(false);
  const [coverFailed, setCoverFailed] = React.useState(false);

  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  const { token } = useAuthToken();


  React.useEffect(() => {
    if (!slugOrId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    afterStoryService
      .get(slugOrId)
      .then((dto) => {
        if (cancelled) return;
        setStory(dto);
        setBlocks(parseBlocks(dto.bodyJson));
      })
      .catch((err) => {
        if (cancelled) return;
        const e = err instanceof AfterStoryError ? err : null;
        setError({ message: e?.message ?? 'Could not load that story.', gone: e?.gone ?? false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slugOrId]);

  // Reading progress, measured against the body rather than the document, so
  // the cover and the footer do not count as reading.
  React.useEffect(() => {
    const onScroll = () => {
      const el = bodyRef.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const scrolled = Math.max(0, viewport - top);
      setProgress(Math.min(100, (scrolled / (height + viewport)) * 100));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [blocks]);

  // Loaded after the story rather than with it, so the reading experience is
  // never waiting on a counter.
  React.useEffect(() => {
    if (!story || story.status === 'Draft') return;
    let cancelled = false;
    void afterStoryService.getReactions(story.id).then((r) => {
      if (!cancelled) setReactions(r);
    });
    return () => {
      cancelled = true;
    };
  }, [story]);

  const react = async (type: 'like' | 'save') => {
    if (!story) return;
    if (!token) {
      navigate('/signin');
      return;
    }
    if (reactionBusy) return;

    setReactionBusy(true);
    // Optimistic, because a heart that waits for a round trip feels broken. The
    // server response replaces this either way, so a failure self-corrects.
    setReactions((prev) =>
      prev
        ? type === 'like'
          ? { ...prev, userLiked: !prev.userLiked, likes: prev.likes + (prev.userLiked ? -1 : 1) }
          : { ...prev, userSaved: !prev.userSaved, saves: prev.saves + (prev.userSaved ? -1 : 1) }
        : prev,
    );

    try {
      setReactions(await afterStoryService.toggleReaction(story.id, type));
    } catch {
      setReactions(await afterStoryService.getReactions(story.id));
    } finally {
      setReactionBusy(false);
    }
  };

  const share = async () => {
    if (!story) return;
    // /s/ rather than /story/ : that route serves crawlers real Open Graph tags,
    // and redirects people into the app. A shared /story/ link previews blank.
    const url = `${SITE_URL}/s/${story.slug ?? story.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: story.title, text: story.summary ?? undefined, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // A cancelled share sheet throws. Nothing went wrong and nothing to say.
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error || !story) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', px: 3, py: 10, textAlign: 'center' }}>
        <Seo
          title={error?.gone ? 'Story removed' : 'Story not found'}
          description="This story is not available on Tripician."
          path={`/story/${slugOrId ?? ''}`}
          noindex
        />
        <Typography variant="h5" sx={{ fontFamily: theme.custom.fontDisplay, fontWeight: 700, mb: 1 }}>
          {error?.gone ? 'This story was taken down' : 'This story is not here'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          {error?.message ?? 'It may have been removed, or the link may be wrong.'}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/community')}>
          Browse the community
        </Button>
      </Box>
    );
  }

  const style = templateStyle(story.template);
  const providerKey = toProviderKey(story.coverVideoProvider);
  const hasVideoCover = story.coverKind === 'Video' && providerKey && story.coverVideoId;
  // Shared with the card and the hero, so a video whose maxresdefault does not
  // exist steps down to hqdefault here too. It used to render broken.
  const coverImage = resolveStoryCover(story, coverFailed) ?? undefined;

  const canonicalPath = `/story/${story.slug ?? story.id}`;
  const isPublic = story.status === 'Published';
  const vibe = story.vibe ? VIBES[story.vibe] : null;
  const travelWhen = formatTravelWindow(story.travelStartDate, story.travelEndDate);

  const placeNames = blocks
    .filter((b): b is Extract<StoryBlock, { type: 'place' }> => b.type === 'place')
    .map((b) => b.name)
    .slice(0, 12);

  const jsonLd = isPublic
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: story.title,
          description: story.summary ?? undefined,
          image: coverImage ?? undefined,
          datePublished: story.publishedAt ?? story.createdAt,
          dateModified: story.updatedAt,
          author: {
            '@type': 'Person',
            name: story.author?.displayName ?? 'Tripician traveller',
            ...(story.author?.userId ? { url: `${SITE_URL}/traveler/${story.author.userId}` } : {}),
          },
          publisher: { '@type': 'Organization', name: 'Tripician', url: SITE_URL },
          mainEntityOfPage: `${SITE_URL}${canonicalPath}`,
          ...(story.destination
            ? { about: { '@type': 'TouristDestination', name: story.destination } }
            : {}),
          ...(placeNames.length > 0
            ? { mentions: placeNames.map((name) => ({ '@type': 'TouristAttraction', name })) }
            : {}),
          ...(hasVideoCover && story.coverVideoThumbUrl
            ? {
                video: {
                  '@type': 'VideoObject',
                  name: story.title,
                  thumbnailUrl: story.coverVideoThumbUrl,
                  uploadDate: story.publishedAt ?? story.createdAt,
                  embedUrl:
                    providerKey === 'youtube'
                      ? `https://www.youtube.com/embed/${story.coverVideoId}`
                      : `https://player.vimeo.com/video/${story.coverVideoId}`,
                },
              }
            : {}),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Community', item: `${SITE_URL}/community` },
            { '@type': 'ListItem', position: 2, name: story.title, item: `${SITE_URL}${canonicalPath}` },
          ],
        },
      ]
    : undefined;

  const heroContent = (
    <Box
      sx={{
        width: '100%',
        maxWidth: CONTENT_MAX,
        mx: 'auto',
        px: { xs: 2.5, sm: 3, md: 4 },
        pb: { xs: 4, md: 6 },
      }}
    >
      {vibe && (
        <Chip
          size="small"
          icon={<vibe.Icon size={13} />}
          label={vibe.label}
          sx={{
            mb: 1.5,
            height: 24,
            fontSize: 11,
            fontWeight: 600,
            color: '#fff',
            bgcolor: 'rgba(15,15,19,0.45)',
            backdropFilter: 'blur(6px)',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      )}

      <Typography
        variant="h1"
        sx={{
          fontFamily: theme.custom.fontDisplay,
          fontWeight: 700,
          color: '#fff',
          textShadow: '0 2px 24px rgba(0,0,0,0.35)',
          maxWidth: '18ch',
        }}
      >
        {story.title}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: { xs: 1.25, md: 2 },
          mt: 2,
          color: 'rgba(255,255,255,0.92)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            src={story.author?.profilePicture ?? undefined}
            sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 13 }}
          >
            {story.author?.displayName?.[0] ?? 'T'}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {story.author?.displayName ?? 'A traveller'}
          </Typography>
        </Box>

        {story.destination && (
          <Meta Icon={IconMapPin} text={story.destination} />
        )}
        {travelWhen && <Meta Icon={IconCalendar} text={travelWhen} />}
        {blocks.length > 0 && <Meta text={`${readingMinutes(blocks)} min read`} />}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title={story.title}
        description={
          story.summary ??
          `${story.destination ? `${story.destination}. ` : ''}A trip written up by the traveller who took it.`
        }
        path={canonicalPath}
        image={coverImage ?? undefined}
        type="article"
        // Unlisted means "anyone with the link", which is not the same as
        // "indexed". Only Published is crawlable.
        noindex={!isPublic}
        jsonLd={jsonLd}
      />

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          height: 3,
          bgcolor: 'transparent',
          '& .MuiLinearProgress-bar': { transition: 'transform 80ms linear' },
        }}
      />

      {/* Owner-only strip. A reader never sees it, and the author never has to
          guess whether the thing they are looking at is live. */}
      {story.canEdit && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: { xs: 2, md: 4 },
            py: 1,
            bgcolor: theme.custom.surface.brandTint,
            borderBottom: `1px solid ${theme.custom.surface.border}`,
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {story.status === 'Published'
              ? 'This story is public.'
              : story.status === 'Unlisted'
                ? 'Only people with the link can read this.'
                : story.status === 'Removed'
                  ? 'This story was taken down by a moderator.'
                  : 'This is a draft. Only you can see it.'}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {story.status !== 'Removed' && (
            <>
              <Button
                size="small"
                startIcon={<IconBook size={14} />}
                onClick={() => setBookOpen(true)}
              >
                See it as a book
              </Button>
              <Button
                size="small"
                startIcon={<IconPencil size={14} />}
                onClick={() => navigate(storyEditPath(story.id))}
              >
                Edit
              </Button>
            </>
          )}
        </Box>
      )}

      <Box sx={{ position: 'relative' }}>
        {hasVideoCover ? (
          <StoryVideoCover
            provider={providerKey}
            videoId={story.coverVideoId as string}
            thumbUrl={story.coverVideoThumbUrl}
            title={story.title}
          >
            {heroContent}
          </StoryVideoCover>
        ) : (
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              minHeight: { xs: 420, md: 560 },
              bgcolor: '#0F0F13',
            }}
          >
            {coverImage && (
              <Box
                component="img"
                src={coverImage}
                alt=""
                aria-hidden
                onError={() => setCoverFailed(true)}
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(15,15,19,0.30) 0%, rgba(15,15,19,0.10) 35%, rgba(15,15,19,0.78) 100%)',
              }}
            />
            <Box sx={{ position: 'relative', width: '100%' }}>{heroContent}</Box>
          </Box>
        )}

        <IconButton
          onClick={() => navigate(-1)}
          aria-label="Back"
          sx={{
            position: 'absolute',
            top: { xs: 12, md: 20 },
            left: { xs: 12, md: 20 },
            color: '#fff',
            bgcolor: 'rgba(15,15,19,0.45)',
            backdropFilter: 'blur(6px)',
            '&:hover': { bgcolor: 'rgba(15,15,19,0.65)' },
          }}
        >
          <IconArrowLeft size={18} />
        </IconButton>
      </Box>

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 4, md: 6 } }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap' }}>
          {isPublic && (
            <>
              <Button
                variant="outlined"
                size="small"
                disabled={reactionBusy}
                onClick={() => void react('like')}
                startIcon={
                  reactions?.userLiked ? (
                    <IconHeartFilled size={15} style={{ color: theme.palette.primary.main }} />
                  ) : (
                    <IconHeart size={15} />
                  )
                }
              >
                {/* The count only appears once there is one. "0 likes" on a new
                    story is a worse first impression than no number at all. */}
                {reactions && reactions.likes > 0 ? reactions.likes : 'Like'}
              </Button>

              <Button
                variant="outlined"
                size="small"
                disabled={reactionBusy}
                onClick={() => void react('save')}
                startIcon={
                  reactions?.userSaved ? (
                    <IconBookmarkFilled size={15} style={{ color: theme.palette.primary.main }} />
                  ) : (
                    <IconBookmark size={15} />
                  )
                }
              >
                {reactions?.userSaved ? 'Saved' : 'Save'}
              </Button>
            </>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<IconShare2 size={15} />}
            onClick={() => void share()}
          >
            {copied ? 'Link copied' : 'Share'}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="More">
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="More options">
              <IconDotsVertical size={17} />
            </IconButton>
          </Tooltip>
        </Box>

        {story.summary && (
          <Typography
            sx={{
              maxWidth: `${style.measure}ch`,
              mb: 4,
              fontSize: { xs: '1.125rem', md: '1.25rem' },
              lineHeight: 1.6,
              color: 'text.secondary',
            }}
          >
            {story.summary}
          </Typography>
        )}

        <Box ref={bodyRef}>
          <AfterStoryReader blocks={blocks} template={story.template} />
        </Box>

        {blocks.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            This story has not been written yet.
          </Typography>
        )}

        {/* The conversion element. Only rendered when the attached trip is itself
            published, which the server decides rather than the client guessing. */}
        {story.tripId && story.tripIsPublished && (
          <Box
            sx={{
              mt: 6,
              p: { xs: 2.5, md: 3 },
              maxWidth: `${style.measure + 8}ch`,
              borderRadius: '20px',
              border: `1px solid ${theme.custom.surface.border}`,
              backgroundImage: theme.custom.gradients.brandSubtle,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="overline" sx={{ color: 'primary.main', display: 'block' }}>
              The plan behind this trip
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
              Every place on it was checked against a live listing. Take a copy and make it your own.
            </Typography>
            <Button
              variant="contained"
              startIcon={<IconCopy size={15} />}
              onClick={() => navigate(`/trip/${story.tripId}`)}
            >
              See the plan
            </Button>
          </Box>
        )}

        {story.contributors.filter((c) => c.status === 'active').length > 0 && (
          <Box sx={{ mt: 5 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              Written with
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {story.contributors
                .filter((c) => c.status === 'active')
                .map((c) => (
                  <Chip
                    key={c.userId}
                    avatar={<Avatar src={c.profilePicture ?? undefined}>{c.displayName?.[0] ?? 'T'}</Avatar>}
                    label={c.displayName ?? 'Traveller'}
                    onClick={() => navigate(`/traveler/${c.userId}`)}
                  />
                ))}
            </Box>
          </Box>
        )}

        {/* Only on a story anyone can actually reach. A draft has no readers and
            therefore no questions. */}
        {isPublic && (
          <StoryQuestions
            storyId={story.id}
            authorName={story.author?.displayName ?? undefined}
            isAuthor={story.canEdit}
          />
        )}

        {/* An invitation at the end, for the author only. The button up in the
            status bar is easy to miss and easy to read as an export; finishing
            your own story is the moment the idea of holding it actually lands. */}
        {story.canEdit && story.status !== 'Removed' && (
          <Box
            sx={{
              mt: 6,
              p: { xs: 3, md: 4 },
              borderRadius: '20px',
              border: `1px solid ${theme.custom.surface.border}`,
              bgcolor: theme.custom.surface.brandTint,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Typography variant="h4" component="h2" sx={{ color: 'text.primary' }}>
                This story makes a book
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, maxWidth: '58ch' }}>
                Laid out as an A5 hardcover, photographs at full resolution, your words set in
                print. Look through every page before you decide you like it.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
              <Button
                variant={FEATURE_FLAGS.bookOrdering ? 'outlined' : 'contained'}
                startIcon={<IconBook size={16} />}
                onClick={() => setBookOpen(true)}
              >
                See it as a book
              </Button>
              {/* Ordering stays hidden until a book can actually be printed and
                  paid for. A buy button that cannot take money is worse than
                  none at all. */}
              {FEATURE_FLAGS.bookOrdering && (
                <Button variant="contained" onClick={() => setCheckoutOpen(true)}>
                  Order a printed copy
                </Button>
              )}
            </Box>
          </Box>
        )}

        {story.status === 'Removed' && story.canEdit && (
          <Alert severity="warning" sx={{ mt: 5 }}>
            A moderator took this story down, so it is not visible to anyone else. Get in touch through the
            help page if you think that was a mistake.
          </Alert>
        )}
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setReporting(true);
          }}
        >
          <IconFlag size={15} style={{ marginRight: 10 }} />
          Report this story
        </MenuItem>
      </Menu>

      <ReportStoryDialog open={reporting} storyId={story.id} onClose={() => setReporting(false)} />

      <BookPreviewDialog
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        story={story}
        token={token}
      />

      <BookCheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        story={{ id: story.id, title: story.title }}
      />
    </Box>
  );
};

const Meta: React.FC<{ Icon?: React.ElementType; text: string }> = ({ Icon, text }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
    {Icon && <Icon size={14} />}
    <Typography variant="body2">{text}</Typography>
  </Box>
);

export default StoryPage;
