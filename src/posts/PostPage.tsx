import React from 'react';
import { Avatar, Box, Button, CircularProgress, Tooltip, Typography, useTheme } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconArrowLeft, IconMessageCircle2, IconRosetteDiscountCheckFilled, IconTrash,
} from '@tabler/icons-react';
import Seo, { SITE_URL } from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import CardTypeTag from '../components/ui/CardTypeTag';
import PhotoMosaic from '../components/ui/PhotoMosaic';
import { formatRelativeTime, formatAbsoluteDateTime } from '../utils/relativeTime';
import PostCard from './PostCard';
import PostComposer from './PostComposer';
import AnswerCard from './AnswerCard';
import { postsService } from './postsService';
import type { TravelerPost } from './types';

const CONTENT_MAX = 720;

/**
 * One post and what came back.
 *
 * Two shapes, because the two kinds are read differently. A note and its replies
 * are a short conversation in the order it happened. A question is a page: the
 * question at the top, then answers ranked accepted-first, then by what other
 * travellers found useful. The ranking is the server's, so the order here is not
 * a second opinion about it.
 */
const PostPage: React.FC = () => {
  const { postId = '' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  const [post, setPost] = React.useState<TravelerPost | null>(null);
  const [replies, setReplies] = React.useState<TravelerPost[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([postsService.get(postId), postsService.replies(postId)])
      .then(([p, r]) => {
        if (!active) return;
        setPost(p);
        setReplies(r);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId]);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  if (!post) {
    return (
      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, md: 3 }, py: 8 }}>
        <EmptyState
          icon={IconMessageCircle2}
          title="This post is not here"
          description="It may have been deleted by the person who wrote it."
          actionLabel="Back to the road"
          onAction={() => navigate('/posts')}
        />
      </Box>
    );
  }

  const isQuestion = post.kind === 'question';
  const summary = (post.title ? `${post.title}. ` : '') + post.body.slice(0, 150);

  const addReply = (reply: TravelerPost) => {
    setReplies((prev) => [...prev, reply]);
    // The card's own count comes from the server and would otherwise disagree
    // with the heading until a reload.
    setPost((prev) => (prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev));
  };

  const dropReply = (id: string) => {
    setReplies((prev) => prev.filter((x) => x.id !== id));
    setPost((prev) => (prev ? { ...prev, replyCount: Math.max(0, prev.replyCount - 1) } : prev));
  };

  const markAccepted = (answerId: string) => {
    const next = post.acceptedAnswerId === answerId ? null : answerId;
    setPost((prev) => (prev ? { ...prev, acceptedAnswerId: next } : prev));
    setReplies((prev) => prev.map((r) => ({ ...r, isAccepted: r.id === next })));
  };

  const removeQuestion = async () => {
    if (!window.confirm('Delete this? This cannot be undone.')) return;
    try {
      await postsService.remove(post.id);
      navigate('/posts');
    } catch { /* stays on screen; a reload will settle it */ }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title={isQuestion && post.title ? post.title : `${post.authorName} on Tripician`}
        description={summary || 'A traveller post on Tripician.'}
        path={`/post/${post.id}`}
        type={isQuestion ? 'article' : 'website'}
        jsonLd={isQuestion ? {
          '@context': 'https://schema.org',
          '@type': 'QAPage',
          mainEntity: {
            '@type': 'Question',
            name: post.title ?? post.body.slice(0, 120),
            text: post.body,
            answerCount: post.replyCount,
            dateCreated: post.createdAt,
            author: { '@type': 'Person', name: post.authorName },
            url: `${SITE_URL}/post/${post.id}`,
            ...(replies.length > 0 ? {
              suggestedAnswer: replies.map((r) => ({
                '@type': 'Answer',
                text: r.body,
                dateCreated: r.createdAt,
                url: `${SITE_URL}/post/${post.id}`,
                author: { '@type': 'Person', name: r.authorName },
              })),
            } : {}),
            ...(post.acceptedAnswerId && replies.some((r) => r.id === post.acceptedAnswerId) ? {
              acceptedAnswer: (() => {
                const a = replies.find((r) => r.id === post.acceptedAnswerId)!;
                return {
                  '@type': 'Answer',
                  text: a.body,
                  dateCreated: a.createdAt,
                  url: `${SITE_URL}/post/${post.id}`,
                  author: { '@type': 'Person', name: a.authorName },
                };
              })(),
            } : {}),
          },
        } : undefined}
      />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 2.5, md: 4 }, pb: 10 }}>
        <Button
          onClick={() => navigate(-1)}
          startIcon={<IconArrowLeft size={16} />}
          sx={{ textTransform: 'none', color: 'text.secondary', mb: 1.5, px: 0 }}
        >
          Back
        </Button>

        {isQuestion ? (
          <Box
            sx={{
              position: 'relative',
              borderRadius: '16px',
              border: `1px solid ${theme.custom.surface.border}`,
              bgcolor: 'background.paper',
              p: { xs: 2, sm: 2.5 },
            }}
          >
            <CardTypeTag kind="question" />

            <Typography variant="h4" component="h1" sx={{ pr: 4, color: 'text.primary', lineHeight: 1.25 }}>
              {post.title ?? post.body}
            </Typography>

            {post.title && post.body && (
              <Typography variant="body1" sx={{ mt: 1.5, color: 'text.primary', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                {post.body}
              </Typography>
            )}

            {post.media.length > 0 && (
              <PhotoMosaic photos={post.media} sx={{ mt: 1.75 }} />
            )}

            {post.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.625, mt: 1.75 }}>
                {post.tags.map((tag) => (
                  <Box
                    key={tag.id}
                    component="button"
                    type="button"
                    onClick={() => navigate(`/posts?kind=questions&tags=${encodeURIComponent(tag.id)}`)}
                    sx={{
                      border: `1px solid ${theme.custom.surface.border}`,
                      bgcolor: 'transparent',
                      borderRadius: '50px',
                      px: 1.1,
                      py: 0.3,
                      fontFamily: 'inherit',
                      typography: 'caption',
                      fontWeight: 600,
                      color: 'text.secondary',
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'text.disabled', color: 'text.primary' },
                      '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
                    }}
                  >
                    {tag.label}
                  </Box>
                ))}
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <Avatar
                src={post.authorAvatarUrl ?? undefined}
                onClick={() => navigate(`/traveler/${post.authorUserId}`)}
                sx={{ width: 26, height: 26, fontSize: 11, bgcolor: 'primary.main', cursor: 'pointer' }}
              >
                {post.authorName.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
                Asked by {post.authorName}
                {post.authorIdentityVerified && (
                  <Tooltip title="Identity verified" arrow>
                    <Box component="span" sx={{ display: 'inline-flex', color: '#0EA5E9' }}>
                      <IconRosetteDiscountCheckFilled size={13} />
                    </Box>
                  </Tooltip>
                )}
              </Typography>
              <Tooltip title={formatAbsoluteDateTime(post.createdAt)} arrow>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {formatRelativeTime(post.createdAt)}
                </Typography>
              </Tooltip>

              <Box sx={{ flex: 1 }} />

              {post.viewerCanDelete && (
                <Button
                  onClick={removeQuestion}
                  size="small"
                  startIcon={<IconTrash size={14} />}
                  sx={{ textTransform: 'none', color: 'text.disabled', minWidth: 0 }}
                >
                  Delete
                </Button>
              )}
            </Box>
          </Box>
        ) : (
          <PostCard post={post} linkToPost={false} onRemoved={() => navigate('/posts')} />
        )}

        <Box sx={{ mt: 2.5 }}>
          <PostComposer
            parentPostId={post.id}
            compact
            submitLabel={isQuestion ? 'Answer' : 'Reply'}
            placeholder={isQuestion
              ? 'Answer from what you actually saw. What did you do, and when?'
              : `Reply to ${post.authorName.split(' ')[0]}`}
            onPosted={addReply}
          />
        </Box>

        {replies.length > 0 && (
          <Box sx={{ display: 'grid', gap: 1.5, mt: 3 }}>
            <Typography variant="overline" sx={{ color: 'text.disabled' }}>
              {replies.length}{' '}
              {isQuestion
                ? (replies.length === 1 ? 'answer' : 'answers')
                : (replies.length === 1 ? 'reply' : 'replies')}
            </Typography>

            {replies.map((r) => (isQuestion ? (
              <AnswerCard
                key={r.id}
                answer={r}
                onRemoved={dropReply}
                onAccepted={markAccepted}
              />
            ) : (
              <PostCard key={r.id} post={r} linkToPost={false} onRemoved={dropReply} />
            )))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PostPage;
