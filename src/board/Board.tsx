/**
 * The board: what travellers are doing, in one column, with suggestions beside it on wide screens.
 *
 * This is the signed-in front door, at `/`. It replaces a page called Community
 * that carried nine stacked sections and presented the same three content types
 * two or three ways each. There is one content type here now: a post. A note, a
 * question, and a published plan or story all arrive as posts, and the ones
 * carrying a plan or a story wear a ribbon and a strip naming what they hold.
 *
 * The word "Community" is deliberately absent, including from the masthead,
 * which is absent too. A feed does not need a title telling you it is a feed,
 * and the one thing on this page should be the first thing on it.
 *
 * 720px because this is a column of people talking, which is the same measure
 * and the same reason as /posts. The wall that used to sit under it has moved to
 * Browse, where a catalogue belongs.
 */

import React from 'react';
import { Box, Link, useMediaQuery } from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo';
import SegmentedControl from '../components/ui/SegmentedControl';
import PostComposer from '../posts/PostComposer';
import PostList, { type PostListHandle } from '../posts/PostList';
import CreateRow from './CreateRow';
import WallSuggestions from './WallSuggestions';
import RailFooter from './RailFooter';
import { useWallSuggestions } from './useWallSuggestions';

/** The measure for a column of people talking. Same as PostsPage, for the same reason. */
const CONTENT_MAX = 720;

// A 320px rail plus its gap fits either side of the centred feed from here, so the feed never moves off the TripicianAI bar.
const RAIL_MIN_WIDTH = 1440;

type FeedScope = 'everyone' | 'following';

const FEED_OPTIONS: { value: FeedScope; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'following', label: 'Following' },
];

const Board: React.FC = () => {
  const listRef = React.useRef<PostListHandle>(null);
  const wide = useMediaQuery(`(min-width:${RAIL_MIN_WIDTH}px)`);
  const suggestions = useWallSuggestions();
  const hasSuggestions = suggestions.loaded && (suggestions.people.length > 0 || suggestions.groups.length > 0);
  // In the address so a refresh, a back button or a shared link keeps the same feed.
  const [searchParams, setSearchParams] = useSearchParams();
  const scope: FeedScope = searchParams.get('feed') === 'following' ? 'following' : 'everyone';
  const setScope = (next: FeedScope) => setSearchParams((prev) => {
    if (next === 'following') prev.set('feed', 'following'); else prev.delete('feed');
    return prev;
  }, { replace: true });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/*
        noindex, and that is not a loss. A crawler is always signed out, so it
        gets the landing page at this URL and never reaches the board. What the
        board holds keeps its own indexable homes at /post/:id, /trip/:id,
        /story/:slug, /posts and /stories.
      */}
      <Seo
        title="Tripician"
        description="What travellers are doing right now."
        path="/"
        noindex
      />

      <Box sx={wide ? { display: 'grid', gridTemplateColumns: `1fr minmax(0, ${CONTENT_MAX}px) 1fr`, alignItems: 'start' } : undefined}>
      {wide && <Box aria-hidden />}
      <Box sx={{ maxWidth: CONTENT_MAX, width: '100%', mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 2.5, md: 4 }, pb: { xs: 16, lg: 14 } }}>
        {/* A heading for anything reading the document outline, and nothing for
            anything reading the screen. The page announces itself by its content. */}
        <Box
          component="h1"
          sx={{
            position: 'absolute',
            // Strings, not numbers: MUI reads width: 1 as 100%, which pushed this hidden heading past the viewport.
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            clipPath: 'inset(50%)',
            whiteSpace: 'nowrap',
            m: '-1px',
            p: 0,
          }}
        >
          Your travel feed
        </Box>

        <PostComposer onPosted={(post) => listRef.current?.prepend(post)} />
        <CreateRow />

        <Box sx={{ mt: { xs: 2.5, md: 3 }, mb: 1.5 }}>
          <SegmentedControl
            aria-label="Whose posts to show"
            size="small"
            value={scope}
            options={FEED_OPTIONS}
            onChange={setScope}
          />
        </Box>

        <Box>
          <PostList
            ref={listRef}
            following={scope === 'following'}
            emptyMessage={scope === 'following'
              ? (
                <>
                  Nobody you follow has posted yet.{' '}
                  <Link component={RouterLink} to="/crew" sx={{ fontWeight: 700 }}>Find people to follow</Link>
                </>
              )
              : 'Nothing here yet. Say where you are, or ask the people who have been.'}
            insertAfter={!wide && hasSuggestions ? { index: 3, node: <WallSuggestions variant="inline" data={suggestions} /> } : undefined}
          />
        </Box>
      </Box>

      {wide && (
        // Sticky inside the scroll container, and capped so it never runs under the TripicianAI bar or the help button.
        <Box
          component="aside"
          aria-label="Suggestions"
          sx={{
            position: 'sticky',
            top: 32,
            mt: 4,
            ml: 4,
            // Sized to its column, capped at 320, so a real scrollbar never tips it into a sideways scroll.
            width: 'calc(100% - 48px)',
            maxWidth: 320,
            maxHeight: 'calc(100vh - 60px - 32px - 120px)',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
          }}
        >
          <WallSuggestions variant="rail" data={suggestions} />
          <RailFooter />
        </Box>
      )}
      </Box>
    </Box>
  );
};

export default Board;
