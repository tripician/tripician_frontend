import React from 'react';
import { Box, Button, ButtonBase, Skeleton, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  IconArrowDown,
  IconChevronRight,
  IconHeart,
  IconLock,
  IconMessageCircle,
  IconMessageQuestion,
  IconPencil,
  IconSend,
} from '@tabler/icons-react';
import FilterChip from '../../../components/ui/FilterChip';
import { useTripCover } from '../../../utils/tripCover';
import {
  journalCounts,
  journalDescription,
  journalHref,
  journalMeta,
  journalTitle,
  JOURNAL_FILTERS,
  JOURNAL_PAGE,
  JOURNAL_PREVIEW,
  SECTION_QUOTES,
  type JournalEntry,
  type JournalFilter,
} from './journal';
import { SectionHeader, SectionNote, SectionQuote } from './PortfolioSection';
import type { JournalState } from './usePortfolio';

const THUMB = { xs: 52, md: 60 } as const;

/** The square at a row's left: a photo of where a plan or story went, or for a post, an icon. */
const EntryThumb: React.FC<{ entry: JournalEntry }> = ({ entry }) => {
  const source =
    entry.kind === 'plan'
      ? { photoUrl: entry.trip.image || null, countries: entry.trip.countries, name: entry.trip.title }
      : entry.kind === 'story'
        ? { photoUrl: entry.story.coverImageUrl ?? entry.story.coverVideoThumbUrl ?? null, countries: entry.story.countries ?? [], name: entry.story.destination ?? entry.story.title }
        : null;
  const cover = useTripCover(source);
  const box = {
    width: THUMB,
    height: THUMB,
    flexShrink: 0,
    borderRadius: '10px',
    overflow: 'hidden',
  } as const;

  if (entry.kind === 'question' || entry.kind === 'note') {
    const Icon = entry.kind === 'question' ? IconMessageQuestion : IconPencil;
    return (
      <Box sx={(theme) => ({ ...box, bgcolor: theme.custom.surface.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.primary' })}>
        <Icon size={22} stroke={1.7} />
      </Box>
    );
  }
  return (
    <Box sx={(theme) => ({ ...box, bgcolor: theme.custom.surface.hover })}>
      {cover ? <Box component="img" src={cover} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
    </Box>
  );
};

/** The entry's own page as a full link, for sharing. */
function absoluteUrl(path: string): string {
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
}

/**
 * Shares an entry: the system sheet where there is one (phones, some desktops),
 * otherwise the link goes to the clipboard and says so.
 */
async function shareEntry(entry: JournalEntry) {
  const url = absoluteUrl(journalHref(entry));
  const title = journalTitle(entry);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    window.dispatchEvent(new CustomEvent('app:success', { detail: { message: 'Link copied' } }));
  } catch {
    /* the reader closed the sheet, or the clipboard was refused: nothing to undo */
  }
}

const Count: React.FC<{ Icon: React.ElementType; value: number; label: string }> = ({ Icon, value, label }) => (
  <Box component="span" aria-label={`${value} ${label}`} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
    <Icon size={15} stroke={1.8} />
    <Typography component="span" variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
  </Box>
);

/**
 * One journal entry as a quiet row: a small picture or icon, the thing's own
 * name in bold, what the traveller did and when ("Published a travel plan · 2
 * days ago"), then its likes, comments and a share button, and a chevron. The
 * whole row is the link; Share is its own control and never opens the entry.
 */
const JournalRow: React.FC<{ entry: JournalEntry }> = ({ entry }) => {
  const title = journalTitle(entry);
  const meta = journalMeta(entry);
  const { likes, comments } = journalCounts(entry);
  const onlyYou = entry.kind === 'plan' && entry.onlyYou;

  return (
    <Box
      role="listitem"
      sx={(theme) => ({
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, md: 2 },
        px: { xs: 1, md: 1.5 },
        py: { xs: 1.5, md: 1.75 },
        mx: { xs: -1, md: -1.5 },
        borderRadius: '14px',
        transition: `background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:hover': { bgcolor: theme.custom.surface.hover },
        '&:hover .journal-chevron': { transform: 'translateX(2px)', color: 'text.primary' },
        // The hairline sits between rows, inset to the content, and gives way to a hovered row.
        '& + &::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: { xs: 8, md: 12 },
          right: { xs: 8, md: 12 },
          height: '1px',
          bgcolor: theme.custom.surface.border,
        },
        '&:hover::before, &:hover + &::before': { opacity: 0 },
      })}
    >
      <EntryThumb entry={entry} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* The title is the link, stretched over the whole row, so the row opens
            the entry while Share, raised above it, stays its own control. */}
        <Typography
          component={RouterLink}
          to={journalHref(entry)}
          noWrap
          aria-label={`${title}. ${meta}. ${likes} ${likes === 1 ? 'like' : 'likes'}, ${comments} ${comments === 1 ? 'comment' : 'comments'}${onlyYou ? '. Only you can see this' : ''}`}
          sx={(theme) => ({
            display: 'block',
            fontWeight: 600,
            fontSize: { xs: '0.9375rem', md: '1rem' },
            letterSpacing: '-0.005em',
            lineHeight: 1.35,
            color: 'inherit',
            textDecoration: 'none',
            outline: 'none',
            '&::after': { content: '""', position: 'absolute', inset: 0, borderRadius: '14px' },
            '&:focus-visible::after': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 0 },
          })}
        >
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', minWidth: 0, mt: 0.15 }}>
          {onlyYou ? <IconLock size={12} stroke={2} style={{ flexShrink: 0 }} /> : null}
          <Typography variant="caption" noWrap sx={{ color: 'inherit' }}>{meta}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, mt: 0.6 }}>
          <Count Icon={IconHeart} value={likes} label={likes === 1 ? 'like' : 'likes'} />
          <Count Icon={IconMessageCircle} value={comments} label={comments === 1 ? 'comment' : 'comments'} />
          <ButtonBase
            onClick={() => void shareEntry(entry)}
            aria-label={`Share ${title}`}
            sx={(theme) => ({
              position: 'relative',
              zIndex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0.75,
              py: 0.25,
              ml: -0.75,
              borderRadius: '6px',
              color: 'text.secondary',
              fontFamily: 'inherit',
              fontSize: '0.75rem',
              fontWeight: 600,
              '&:hover': { color: 'text.primary', bgcolor: theme.custom.surface.active },
              '&:focus-visible': { outline: `2px solid ${theme.custom.ring}` },
            })}
          >
            <IconSend size={14} stroke={1.8} />
            Share
          </ButtonBase>
        </Box>
      </Box>
      <Box
        className="journal-chevron"
        aria-hidden
        sx={(theme) => ({ color: 'text.disabled', display: 'flex', transition: `transform ${theme.custom.motion.duration.fast} ease, color ${theme.custom.motion.duration.fast} ease` })}
      >
        <IconChevronRight size={18} />
      </Box>
    </Box>
  );
};

/** Skeleton rows in the journal's own shape. */
const JournalSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <Box aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.75 }}>
        <Skeleton variant="rounded" sx={{ width: THUMB, height: THUMB, borderRadius: '10px', flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="55%" />
          <Skeleton variant="text" width="35%" />
        </Box>
      </Box>
    ))}
  </Box>
);

export const TravelJournal: React.FC<{
  state: JournalState;
  isOwner: boolean;
  name: string | null;
  /** Owner only, on an empty journal: start a plan, or write a story. */
  onCreatePlan?: () => void;
  onWriteStory?: () => void;
}> = ({ state, isOwner, name, onCreatePlan, onWriteStory }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [filter, setFilter] = React.useState<JournalFilter>('all');
  const [visible, setVisible] = React.useState(JOURNAL_PAGE);
  const listTop = React.useRef<HTMLDivElement | null>(null);

  const activeFilter = expanded ? filter : 'all';
  const all = state.entries(activeFilter);
  const limit = expanded ? visible : JOURNAL_PREVIEW;
  const shown = all.slice(0, limit);
  const moreLoaded = all.length > shown.length;
  const canShowMore = moreLoaded || state.postsHasMore;

  const { ensure } = state;
  React.useEffect(() => {
    ensure(activeFilter, limit);
  }, [ensure, activeFilter, limit]);

  const showMore = () => {
    setVisible((v) => v + JOURNAL_PAGE);
    if (!moreLoaded) void state.loadMorePosts();
  };

  const collapse = () => {
    setExpanded(false);
    setFilter('all');
    setVisible(JOURNAL_PAGE);
    listTop.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  let body: React.ReactNode;
  if (state.loading && shown.length === 0) {
    body = <JournalSkeleton />;
  } else if (shown.length === 0) {
    const offerPlan = isOwner && onCreatePlan && activeFilter !== 'posts' && activeFilter !== 'stories';
    const offerStory = isOwner && onWriteStory && activeFilter !== 'posts' && activeFilter !== 'plans';
    body = (
      <SectionQuote
        quote={SECTION_QUOTES.journal}
        action={
          offerPlan || offerStory ? (
            <>
              {offerPlan ? <Button variant="contained" size="small" onClick={onCreatePlan}>Create a plan</Button> : null}
              {offerStory ? <Button variant="outlined" size="small" onClick={onWriteStory}>Write a story</Button> : null}
            </>
          ) : null
        }
      />
    );
  } else {
    body = (
      <Box role="list" aria-label="Travel Journal">
        {shown.map((entry) => <JournalRow key={entry.key} entry={entry} />)}
      </Box>
    );
  }

  return (
    <Box component="section" aria-labelledby="profile-journal" ref={listTop}>
      <SectionHeader
        id="profile-journal"
        title="Travel Journal"
        description={journalDescription(name, isOwner)}
        accessory={<SectionNote>Latest first</SectionNote>}
      />
      {expanded ? (
        <Box role="tablist" aria-label="Show" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          {JOURNAL_FILTERS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={filter === option.value}
              onClick={() => {
                setFilter(option.value);
                setVisible(JOURNAL_PAGE);
              }}
            />
          ))}
        </Box>
      ) : null}
      {body}

      {!expanded && all.length > 0 && (all.length > JOURNAL_PREVIEW || state.postsHasMore) ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <ButtonBase
            onClick={() => setExpanded(true)}
            sx={(theme) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
              px: 3,
              py: 1.25,
              borderRadius: '14px',
              fontFamily: 'inherit',
              '&:hover .va-icon': { bgcolor: theme.custom.surface.hover, transform: 'translateY(2px)' },
              '&:focus-visible': { outline: `2px solid ${theme.custom.ring}` },
            })}
          >
            <Box
              className="va-icon"
              sx={(theme) => ({
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: `1.5px solid ${theme.palette.text.primary}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: `transform ${theme.custom.motion.duration.fast} ease, background-color ${theme.custom.motion.duration.fast} ease`,
              })}
            >
              <IconArrowDown size={16} />
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>View all activity</Typography>
          </ButtonBase>
        </Box>
      ) : null}

      {expanded ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
          {canShowMore ? (
            <Button variant="outlined" onClick={showMore} disabled={state.loadingPosts}>
              {state.loadingPosts ? 'Loading…' : 'Show more'}
            </Button>
          ) : null}
          <Button color="inherit" onClick={collapse}>Show less</Button>
        </Box>
      ) : null}
    </Box>
  );
};
