import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { IconMessageCircleQuestion } from '@tabler/icons-react';
import Seo, { SITE_URL } from '../components/Seo';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { ListSkeleton } from '../components/ui/Skeletons';
import PostComposer from './PostComposer';
import PostList, { type PostListHandle } from './PostList';
import PostToolbar, { type FeedKind } from './PostToolbar';
import QuestionCard from './QuestionCard';
import { postsService } from './postsService';
import type { PostTagCount, QuestionSort, TravelerPost } from './types';

const CONTENT_MAX = 720;
const PAGE_SIZE = 20;

/**
 * /posts , where travellers ask each other and say what is happening.
 *
 * A narrow measure on purpose. This is a column of text and people talking, and
 * a three-up grid of one-line questions reads as a dashboard.
 *
 * The two kinds are paged differently because they are different reads. Notes
 * are a live feed and page on a cursor, so a post arriving while you read cannot
 * shift the row under your finger. Questions are a ranked list and page on an
 * offset, which is what lets the page say how many there are.
 */
const PostsPage: React.FC = () => {
  const listRef = React.useRef<PostListHandle>(null);
  const [params, setParams] = useSearchParams();

  const kindParam = params.get('kind');
  const kind: FeedKind = kindParam === 'questions' || kindParam === 'notes' ? kindParam : 'all';
  const sortParam = params.get('sort');
  const sort: QuestionSort =
    sortParam === 'unanswered' || sortParam === 'top' ? sortParam : 'latest';
  const selectedTags = React.useMemo(
    () => (params.get('tags') ?? '').split(',').filter(Boolean),
    [params],
  );

  const [search, setSearch] = React.useState(params.get('q') ?? '');
  const [searchApplied, setSearchApplied] = React.useState(search);
  const [tags, setTags] = React.useState<PostTagCount[]>([]);
  const [questions, setQuestions] = React.useState<TravelerPost[]>([]);
  const [total, setTotal] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  // Typing fires a request per keystroke without this, and the search reaches
  // every question body server-side.
  React.useEffect(() => {
    const t = setTimeout(() => setSearchApplied(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    let active = true;
    void postsService.tags().then((rows) => { if (active) setTags(rows); });
    return () => { active = false; };
  }, []);

  const showQuestions = kind !== 'notes';
  const showNotes = kind !== 'questions';

  React.useEffect(() => {
    if (!showQuestions) return;
    let active = true;
    setLoading(true);
    void postsService
      .questions({ q: searchApplied, tags: selectedTags, sort, page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (!active) return;
        setQuestions((prev) => (page === 1 ? result.items : [...prev, ...result.items]));
        setTotal(result.total);
        setHasMore(result.hasMore);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [showQuestions, searchApplied, selectedTags, sort, page]);

  // Any change of filter starts the list again rather than appending to a page
  // built under different rules.
  React.useEffect(() => { setPage(1); }, [searchApplied, selectedTags, sort, kind]);

  const patch = (next: Record<string, string | null>) => setParams((prev) => {
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '') prev.delete(key); else prev.set(key, value);
    }
    return prev;
  }, { replace: true });

  const toggleTag = (tagId: string) => {
    const next = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    patch({ tags: next.join(',') });
  };

  const countLine = total > 0
    ? `${total} ${total === 1 ? 'question' : 'questions'}`
    : undefined;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title="From The Road, Travellers Asking And Answering Right Now"
        description="Ask travellers who are there now: visas, flights, safety, what to skip. Real answers from people who went, plus short notes from the road."
        path="/posts"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'From the road',
          description: 'Traveller questions, answers and short notes on Tripician.',
          url: `${SITE_URL}/posts`,
        }}
      />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 3, md: 5 }, pb: 10 }}>
        <PageHeader
          title="From the road"
          subtitle="Ask travellers who are there right now, or say what just happened."
        />

        <Box sx={{ mt: 3 }}>
          <PostComposer
            onPosted={(p) => {
              if (p.kind === 'question') setQuestions((prev) => [p, ...prev]);
              else listRef.current?.prepend(p);
            }}
          />
        </Box>

        <Box sx={{ mt: 3.5 }}>
          <PostToolbar
            kind={kind}
            onKindChange={(next) => patch({ kind: next === 'all' ? null : next })}
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={(next) => patch({ sort: next === 'latest' ? null : next })}
            tags={tags}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            countLine={countLine}
          />
        </Box>

        {showQuestions && (
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {loading && page === 1 ? (
              <ListSkeleton rows={4} />
            ) : questions.length === 0 ? (
              <EmptyState
                icon={IconMessageCircleQuestion}
                title={searchApplied || selectedTags.length > 0 ? 'Nothing matches that' : 'No questions yet'}
                description={searchApplied || selectedTags.length > 0
                  ? 'Try a different tag, or clear the search.'
                  : 'Ask the first one. Travellers who have been there will answer.'}
                {...(searchApplied || selectedTags.length > 0
                  ? { actionLabel: 'Show everything', onAction: () => { setSearch(''); patch({ q: null, tags: null }); } }
                  : {})}
                dense
              />
            ) : (
              <>
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    onTagClick={toggleTag}
                  />
                ))}
                {hasMore && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                    <Button
                      onClick={() => setPage((n) => n + 1)}
                      disabled={loading}
                      sx={(t) => ({
                        border: `1px solid ${t.custom.surface.border}`,
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        borderRadius: '50px',
                        px: 3, py: 1,
                        fontSize: 14, fontWeight: 700,
                        textTransform: 'none',
                        '&:hover': { borderColor: 'text.primary', bgcolor: 'background.paper' },
                      })}
                    >
                      {loading ? 'Loading...' : 'Show more'}
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {showNotes && (
          <Box sx={{ mt: showQuestions ? 5 : 3 }}>
            {showQuestions && (
              <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                Notes from the road
              </Typography>
            )}
            <PostList ref={listRef} kind="note" emptyMessage="Nobody has posted a note yet. Yours would be the first." />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PostsPage;
