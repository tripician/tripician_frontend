import React from 'react';
import {
  Avatar, Box, CircularProgress, Collapse, IconButton, Menu, MenuItem, Tooltip, Typography, useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  IconHeart, IconHeartFilled, IconMessageCircle2, IconTrash, IconDots, IconLink, IconFlag, IconBan,
  IconRosetteDiscountCheckFilled,
} from '@tabler/icons-react';
import { useRequireAuth } from '../auth/AuthGate';
import { formatRelativeTime } from '../utils/relativeTime';
import CardTypeTag from '../components/ui/CardTypeTag';
import PhotoMosaic from '../components/ui/PhotoMosaic';
import CommentRow from './CommentRow';
import PostAttachmentStrip from './PostAttachment';
import PlanPostcard from './PlanPostcard';
import StoryPostcard from '../afterstory/cards/StoryPostcard';
import LikersDialog from './LikersDialog';
import { likedByLine } from './postcardPreview';
import PostComposer from './PostComposer';
import { POST_LIMITS } from './types';
import { postsService } from './postsService';
import ReportDialog from '../components/ui/ReportDialog';
import { confirmAndBlock } from '../utils/blocking';
import type { TravelerPost } from './types';

interface PostCardProps {
  post: TravelerPost;
  /** The permalink already shows this post, so it does not link to itself. */
  linkToPost?: boolean;
  /**
   * The corner ribbon that says what kind of thing a card is. Off by default: in
   * a list where every card is a post it labels nothing, and it is only worth a
   * corner in a feed that mixes trips, stories and posts.
   */
  showTypeTag?: boolean;
  onRemoved?: (id: string) => void;
}

/**
 * One traveller post.
 *
 * Text first, pictures second, actions last. Deliberately plain next to a trip
 * card and a story card: those are objects somebody made, this is somebody
 * talking. Photographs are cropped to a strip rather than given a hero, because
 * a post with one picture and a post with four should occupy similar space in a
 * column that is meant to be scrolled.
 */
const PostCard: React.FC<PostCardProps> = ({
  post, linkToPost = true, showTypeTag = false, onRemoved,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const border = theme.custom.surface.border;

  const [liked, setLiked] = React.useState(post.viewerLiked);
  const [likeCount, setLikeCount] = React.useState(post.likeCount);
  const [busy, setBusy] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [reporting, setReporting] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [replies, setReplies] = React.useState<TravelerPost[] | null>(null);
  const [loadingReplies, setLoadingReplies] = React.useState(false);
  const [replyCount, setReplyCount] = React.useState(post.replyCount);
  const [likersOpen, setLikersOpen] = React.useState(false);

  // The permalink already renders the thread under the post, so only a card that
  // links somewhere else opens one of its own.
  const inlineThread = linkToPost;

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    if (!requireAuth({ reason: 'A like tells the traveller it was worth posting.' })) return;
    setBusy(true);
    // Optimistic: a heart should move under the finger, not after a round trip.
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      setLikeCount(await postsService.toggleLike(post.id));
    } catch {
      setLiked(wasLiked);
      setLikeCount(post.likeCount);
    } finally {
      setBusy(false);
    }
  };

  const toggleThread = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inlineThread) return;

    const opening = !expanded;
    setExpanded(opening);
    // Fetched once. Collapsing and reopening reads what is already here.
    if (!opening || replies !== null || loadingReplies) return;

    setLoadingReplies(true);
    try {
      setReplies(await postsService.replies(post.id));
    } catch {
      setReplies([]);
    } finally {
      setLoadingReplies(false);
    }
  };

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuAnchor(null);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    } catch { /* clipboard is optional; the permalink is one tap away regardless */ }
  };

  const remove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuAnchor(null);
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await postsService.remove(post.id);
      onRemoved?.(post.id);
    } catch { /* stays on screen; a reload will settle it */ }
  };

  const open = () => { if (linkToPost) navigate(`/post/${post.id}`); };

  const photos = post.media.slice(0, POST_LIMITS.maxPhotos);
  const faces = post.likedBy ?? [];
  const likedBy = likedByLine(faces, likeCount, liked);

  // Padded hit areas rather than bare glyphs, which is most of what separates a
  // finished action row from a row of icons.
  const actionSx = {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 0.6,
    border: 'none', bgcolor: 'transparent', cursor: 'pointer',
    px: 0.75, py: 0.6, borderRadius: '8px',
    fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
    transition: `background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
    '&:hover': { color: 'primary.main', bgcolor: theme.custom.surface.hover },
  } as const;

  // A caption-less postcard whose plan or story was unpublished has nothing left to show, so it would be a blank card.
  // Hidden here, not filtered on the server: PostList stops paging when a page comes back short, so dropping rows there ends the wall early.
  const orphanedPostcard = Boolean(post.tripId || post.storyId) && !post.attachment
    && !post.title && !post.body?.trim() && photos.length === 0;
  if (orphanedPostcard) return null;

  return (
    <Box
      onClick={open}
      sx={{
        position: 'relative',
        borderRadius: '16px',
        border: `1px solid ${border}`,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        px: 1.75,
        py: 1.5,
        cursor: linkToPost ? 'pointer' : 'default',
        transition: `box-shadow ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        // Lifts rather than darkening its own outline. The old hover drove the
        // border to near-black, which reads as an error state on a white card.
        '&:hover': linkToPost ? { boxShadow: theme.custom.shadows.card } : {},
        width: '100%',
      }}
    >
      {/*
        The ribbon.

        A post carrying a plan or a story always wears one, whatever the caller
        asked for: that is the whole point of a postcard, and it is what makes one
        legible in a scroll of notes. `showTypeTag` still governs the note and
        question ribbons, which are a mixed-feed nicety rather than a marking.
      */}
      {post.attachment ? (
        <CardTypeTag kind={post.attachment.kind} right={44} />
      ) : showTypeTag ? (
        <CardTypeTag kind={post.kind === 'question' ? 'question' : 'post'} right={44} />
      ) : null}

      {/* One line: who, where, when. The timestamp never shrinks, so a long name
          or a long place truncates before the thing that dates the post does. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <Avatar
          src={post.authorAvatarUrl ?? undefined}
          onClick={(e) => { e.stopPropagation(); navigate(`/traveler/${post.authorUserId}`); }}
          sx={{ width: 34, height: 34, fontSize: 13, bgcolor: 'primary.main', cursor: 'pointer', flexShrink: 0 }}
        >
          {post.authorName.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', minWidth: 0 }} noWrap>
            {post.authorName}
          </Typography>

          {post.authorIdentityVerified && (
            <Tooltip title="Identity verified" arrow>
              <Box component="span" sx={{ display: 'inline-flex', color: '#0EA5E9', flexShrink: 0 }}>
                <IconRosetteDiscountCheckFilled size={14} />
              </Box>
            </Tooltip>
          )}

          {post.placeName && (
            <Typography variant="caption" noWrap sx={{ color: 'text.disabled', minWidth: 0, maxWidth: 180 }}>
              {`· ${post.placeName}`}
            </Typography>
          )}

          <Typography variant="caption" noWrap sx={{ color: 'text.disabled', flexShrink: 0 }}>
            {`· ${formatRelativeTime(post.createdAt)}`}
          </Typography>
        </Box>

        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
          aria-label="Post options"
          sx={{ flexShrink: 0, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
        >
          <IconDots size={16} />
        </IconButton>
      </Box>

      {post.title && (
        <Typography
          variant="subtitle1"
          component="h3"
          sx={{ fontWeight: 700, color: 'text.primary', fontSize: 15.5, lineHeight: 1.35, mb: 0.5 }}
        >
          {post.title}
        </Typography>
      )}

      {/* Plain text from the server, rendered as a child so React escapes it. */}
      {post.body && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            lineHeight: 1.55,
            whiteSpace: 'pre-line',
            mb: photos.length > 0 ? 1.25 : 0.75,
            // A card that links elsewhere is a preview, so it caps. The permalink
            // renders this same component with linkToPost off and shows it whole.
            ...(linkToPost && {
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 4,
              overflow: 'hidden',
            }),
          }}
        >
          {post.body}
        </Typography>
      )}

      {photos.length > 0 && (
        <PhotoMosaic photos={photos} sx={{ mb: 1 }} />
      )}

      {/* A text-only pill naming the trip used to sit here. It said which trip
          and nothing else, and it was unreachable anyway: no UI ever set tripId.
          The strip says what kind of thing it is, shows it, and links to it. */}
      {/* The previews need the server's preview fields; an older server or a failed preview read falls back to the strip. */}
      {post.attachment?.story ? (
        <StoryPostcard attachment={post.attachment} story={post.attachment.story} />
      ) : post.attachment?.plan ? (
        <PlanPostcard attachment={post.attachment} plan={post.attachment.plan} isOwn={post.viewerCanDelete} />
      ) : post.attachment ? (
        <PostAttachmentStrip attachment={post.attachment} />
      ) : null}

      {/* Who liked it and how many replied, above the buttons, the way Facebook sets it. Nothing when both are zero. */}
      {(likedBy || replyCount > 0) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, minHeight: 22 }}>
          {likedBy && (
            <Box
              component="button"
              type="button"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setLikersOpen(true); }}
              aria-label={`${likedBy}. See everyone who liked this`}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0,
                p: 0, border: 0, bgcolor: 'transparent', cursor: 'pointer', font: 'inherit',
                '&:hover .liked-by-text': { textDecoration: 'underline' },
                '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2, borderRadius: '6px' },
              }}
            >
              {faces.length > 0 ? (
                <Box sx={{ display: 'flex', flexShrink: 0 }}>
                  {faces.slice(0, 3).map((f, i) => (
                    <Avatar
                      key={f.userId}
                      src={f.avatarUrl ?? undefined}
                      alt=""
                      sx={{
                        width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main',
                        ml: i === 0 ? 0 : '-6px',
                        border: `2px solid ${theme.palette.background.paper}`,
                        boxSizing: 'content-box',
                      }}
                    >
                      {f.name.charAt(0).toUpperCase()}
                    </Avatar>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', flexShrink: 0 }}>
                  <IconHeartFilled size={10} />
                </Box>
              )}
              <Typography className="liked-by-text" variant="caption" noWrap sx={{ color: 'text.secondary', fontSize: 12.5 }}>
                {likedBy}
              </Typography>
            </Box>
          )}
          {replyCount > 0 && (
            <Box
              component="button"
              type="button"
              onClick={inlineThread ? toggleThread : (e: React.MouseEvent) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
              sx={{
                ml: 'auto', flexShrink: 0, p: 0, border: 0, bgcolor: 'transparent', cursor: 'pointer', font: 'inherit',
                fontSize: 12.5, color: 'text.secondary', '&:hover': { textDecoration: 'underline' },
              }}
            >
              {replyCount === 1 ? '1 comment' : `${replyCount} comments`}
            </Box>
          )}
        </Box>
      )}

      {/* Labelled rather than bare glyphs, and split evenly, because two lonely
          outlines under a one line post read as unfinished. */}
      <Box sx={{ display: 'flex', gap: 0.5, mt: likedBy || replyCount > 0 ? 0.75 : 1, pt: 0.5, borderTop: `1px solid ${border}` }}>
        <Box
          component="button"
          type="button"
          onClick={toggleLike}
          aria-label={liked ? 'Unlike' : 'Like'}
          sx={{ ...actionSx, color: liked ? 'primary.main' : 'text.secondary' }}
        >
          {liked ? <IconHeartFilled size={15} /> : <IconHeart size={15} stroke={1.9} />}
          {liked ? 'Liked' : 'Like'}
        </Box>

        <Box
          component="button"
          type="button"
          onClick={inlineThread ? toggleThread : (e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
          aria-expanded={inlineThread ? expanded : undefined}
          sx={{ ...actionSx, color: expanded ? 'primary.main' : 'text.secondary' }}
        >
          <IconMessageCircle2 size={15} stroke={1.9} />
          Comment
        </Box>
      </Box>

      {inlineThread && (
        <Collapse in={expanded} timeout="auto" mountOnEnter>
          {/* Every click in here has to stop, or replying navigates away to the
              permalink mid-sentence. */}
          <Box onClick={(e) => e.stopPropagation()} sx={{ cursor: 'default', pt: 1.5 }}>
            {loadingReplies && (
              <Box sx={{ display: 'grid', placeItems: 'center', py: 1.5 }}>
                <CircularProgress size={18} />
              </Box>
            )}

            {replies && replies.length > 0 && (
              <Box sx={{ display: 'grid', gap: 1.25, mb: 1.5 }}>
                {replies.map((r) => (
                  <CommentRow
                    key={r.id}
                    comment={r}
                    onRemoved={(id) => {
                      setReplies((prev) => (prev ?? []).filter((x) => x.id !== id));
                      setReplyCount((c) => Math.max(0, c - 1));
                    }}
                  />
                ))}
              </Box>
            )}

            <PostComposer
              parentPostId={post.id}
              compact
              submitLabel="Reply"
              placeholder={`Reply to ${post.authorName.split(' ')[0]}`}
              onPosted={(r) => {
                setReplies((prev) => [...(prev ?? []), r]);
                setReplyCount((c) => c + 1);
              }}
            />
          </Box>
        </Collapse>
      )}

      {/* Portalled, but React still bubbles clicks through the tree, so the menu
          has to stop them or every item opens the post as well. */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={copyLink}>
          <IconLink size={15} style={{ marginRight: 10 }} />
          Copy link
        </MenuItem>
        {post.viewerCanDelete ? (
          <MenuItem onClick={remove} sx={{ color: 'error.main' }}>
            <IconTrash size={15} style={{ marginRight: 10 }} />
            Delete post
          </MenuItem>
        ) : (
          <MenuItem onClick={() => { setMenuAnchor(null); setReporting(true); }}>
            <IconFlag size={15} style={{ marginRight: 10 }} />
            Report
          </MenuItem>
        )}
        {!post.viewerCanDelete && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              if (!requireAuth({ reason: 'Sign in to block people you do not want to hear from.' })) return;
              void confirmAndBlock(post.authorUserId, post.authorName).catch(() => {
                window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'That person could not be blocked. Try again.' } }));
              });
            }}
          >
            <IconBan size={15} style={{ marginRight: 10 }} />
            Block {post.authorName?.split(' ')[0] || 'this person'}
          </MenuItem>
        )}
      </Menu>

      <LikersDialog
        postId={post.id}
        open={likersOpen}
        likeCount={likeCount}
        viewerLiked={liked}
        onClose={() => setLikersOpen(false)}
      />

      <ReportDialog
        open={reporting}
        noun={post.kind === 'question' ? 'question' : 'post'}
        onClose={() => setReporting(false)}
        onSubmit={(reason, detail) => postsService.report(post.id, reason, detail)}
      />
    </Box>
  );
};

export default PostCard;
