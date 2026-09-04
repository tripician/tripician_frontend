import React from 'react';
import { Avatar, Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  IconCircleCheck, IconCircleCheckFilled, IconRosetteDiscountCheckFilled, IconTrash,
} from '@tabler/icons-react';
import { formatRelativeTime, formatAbsoluteDateTime } from '../utils/relativeTime';
import { useRequireAuth } from '../auth/AuthGate';
import VoteControl from './VoteControl';
import PhotoMosaic from '../components/ui/PhotoMosaic';
import { postsService } from './postsService';
import type { TravelerPost } from './types';

interface AnswerCardProps {
  answer: TravelerPost;
  onRemoved?: (id: string) => void;
  onAccepted?: (answerId: string) => void;
}

/**
 * One answer, with the vote rail down its left edge.
 *
 * The accepted mark is the asker's judgement and shows to everybody; the accept
 * control shows only to them. `viewerCanAccept` is computed server-side rather
 * than inferred here, so a client cannot decide it owns a question it did not
 * ask.
 */
const AnswerCard: React.FC<AnswerCardProps> = ({ answer, onRemoved, onAccepted }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const border = theme.custom.surface.border;

  const [score, setScore] = React.useState(answer.score);
  const [vote, setVote] = React.useState(answer.viewerVote);
  const [busy, setBusy] = React.useState(false);

  const onVote = async (value: number) => {
    if (busy) return;
    if (!requireAuth({ reason: 'Voting tells the next traveller which answer worked.' })) return;

    // Optimistic, because an arrow that waits for a round trip feels broken. The
    // server's number replaces this either way, so a failure self-corrects.
    const previousScore = score;
    const previousVote = vote;
    setScore(score - vote + value);
    setVote(value);
    setBusy(true);
    try {
      const result = await postsService.vote(answer.id, value);
      setScore(result.score);
      setVote(result.viewerVote);
    } catch {
      setScore(previousScore);
      setVote(previousVote);
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!requireAuth({ reason: 'Only the person who asked can mark an answer.' })) return;
    try {
      await postsService.accept(answer.parentPostId!, answer.id);
      onAccepted?.(answer.id);
    } catch { /* the mark simply does not move */ }
  };

  const remove = async () => {
    if (!window.confirm('Delete this answer? This cannot be undone.')) return;
    try {
      await postsService.remove(answer.id);
      onRemoved?.(answer.id);
    } catch { /* stays on screen; a reload will settle it */ }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        p: 2,
        borderRadius: '14px',
        border: `1px solid ${answer.isAccepted ? '#16a34a' : border}`,
        bgcolor: 'background.paper',
      }}
    >
      <VoteControl
        score={score}
        viewerVote={vote}
        disabled={answer.viewerCanDelete}
        onVote={onVote}
      />

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
          <Avatar
            src={answer.authorAvatarUrl ?? undefined}
            onClick={() => navigate(`/traveler/${answer.authorUserId}`)}
            sx={{ width: 24, height: 24, fontSize: 11, bgcolor: 'primary.main', cursor: 'pointer' }}
          >
            {answer.authorName.charAt(0).toUpperCase()}
          </Avatar>

          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
            {answer.authorName}
            {answer.authorIdentityVerified && (
              <Tooltip title="Identity verified" arrow>
                <Box component="span" sx={{ display: 'inline-flex', color: '#0EA5E9' }}>
                  <IconRosetteDiscountCheckFilled size={13} />
                </Box>
              </Tooltip>
            )}
          </Typography>

          <Tooltip title={formatAbsoluteDateTime(answer.createdAt)} arrow>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {formatRelativeTime(answer.createdAt)}
            </Typography>
          </Tooltip>

          <Box sx={{ flex: 1 }} />

          {answer.isAccepted && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: '#16a34a', typography: 'caption', fontWeight: 700 }}>
              <IconCircleCheckFilled size={15} />
              This answered it
            </Box>
          )}

          {answer.viewerCanAccept && (
            <Tooltip title={answer.isAccepted ? 'Unmark this answer' : 'This answered my question'} arrow>
              <IconButton
                size="small"
                onClick={accept}
                aria-label={answer.isAccepted ? 'Unmark this answer' : 'Mark this as the answer'}
                sx={{ color: answer.isAccepted ? '#16a34a' : 'text.disabled' }}
              >
                <IconCircleCheck size={17} />
              </IconButton>
            </Tooltip>
          )}

          {answer.viewerCanDelete && (
            <IconButton size="small" onClick={remove} aria-label="Delete answer" sx={{ color: 'text.disabled' }}>
              <IconTrash size={14} />
            </IconButton>
          )}
        </Box>

        {/* Plain text from the server, rendered as a child so React escapes it. */}
        <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {answer.body}
        </Typography>

        {answer.media.length > 0 && (
          <PhotoMosaic photos={answer.media} rounded={10} sx={{ mt: 1.25 }} />
        )}
      </Box>
    </Box>
  );
};

export default AnswerCard;
