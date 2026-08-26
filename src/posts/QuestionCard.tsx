import React from 'react';
import { Avatar, Box, Tooltip, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconCircleCheckFilled, IconMessageCircle2, IconRosetteDiscountCheckFilled } from '@tabler/icons-react';
import { formatRelativeTime, formatAbsoluteDateTime } from '../utils/relativeTime';
import CardTypeTag from '../components/ui/CardTypeTag';
import type { TravelerPost } from './types';

interface QuestionCardProps {
  question: TravelerPost;
  onTagClick?: (tagId: string) => void;
}

/**
 * One question in the list.
 *
 * Title-led, unlike PostCard, which leads with the body. A question is scanned
 * rather than read: somebody skimming for one they can answer is reading titles,
 * and the body is what they open. The silhouette difference is deliberate and
 * the mixed feed relies on it, the same way the trip and story cards do.
 */
const QuestionCard: React.FC<QuestionCardProps> = ({ question, onTagClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const border = theme.custom.surface.border;

  const answered = question.replyCount > 0;
  const solved = Boolean(question.acceptedAnswerId);

  return (
    <Box
      onClick={() => navigate(`/post/${question.id}`)}
      sx={{
        position: 'relative',
        borderRadius: '16px',
        border: `1px solid ${border}`,
        bgcolor: 'background.paper',
        p: 2,
        cursor: 'pointer',
        transition: `border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:hover': { borderColor: 'text.disabled' },
      }}
    >
      <CardTypeTag kind="question" />

      {/* Padded right so the title clears the ribbon. */}
      <Typography
        variant="h6"
        component="h3"
        sx={{
          pr: 4,
          color: 'text.primary',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {question.title || question.body}
      </Typography>

      {question.title && question.body && (
        <Typography
          variant="body2"
          sx={{
            mt: 0.75,
            color: 'text.secondary',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {question.body}
        </Typography>
      )}

      {question.tags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.625, mt: 1.25 }}>
          {question.tags.map((tag) => (
            <Box
              key={tag.id}
              component="button"
              type="button"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onTagClick?.(tag.id); }}
              sx={{
                border: `1px solid ${border}`,
                bgcolor: 'transparent',
                borderRadius: '50px',
                px: 1,
                py: 0.25,
                fontFamily: 'inherit',
                typography: 'caption',
                fontWeight: 600,
                color: 'text.secondary',
                cursor: onTagClick ? 'pointer' : 'default',
                '&:hover': onTagClick ? { borderColor: 'text.disabled', color: 'text.primary' } : {},
                '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
              }}
            >
              {tag.label}
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
        <Avatar
          src={question.authorAvatarUrl ?? undefined}
          onClick={(e) => { e.stopPropagation(); navigate(`/traveler/${question.authorUserId}`); }}
          sx={{ width: 22, height: 22, fontSize: 10, bgcolor: 'primary.main' }}
        >
          {question.authorName.charAt(0).toUpperCase()}
        </Avatar>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'inline-flex', alignItems: 'center', gap: 0.35 }}>
          {question.authorName}
          {question.authorIdentityVerified && (
            <Tooltip title="Identity verified" arrow>
              <Box component="span" sx={{ display: 'inline-flex', color: '#0EA5E9' }}>
                <IconRosetteDiscountCheckFilled size={13} />
              </Box>
            </Tooltip>
          )}
        </Typography>

        {/* Relative on the face, exact in the tooltip. The pairing the trip cards
            already use, and what makes "latest" mean something you can check. */}
        <Tooltip title={formatAbsoluteDateTime(question.lastActivityAt ?? question.createdAt)} arrow>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {formatRelativeTime(question.lastActivityAt ?? question.createdAt)}
          </Typography>
        </Tooltip>

        <Box sx={{ flex: 1 }} />

        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.4,
            typography: 'caption',
            fontWeight: 700,
            // Green is a state, not the brand. The colour guard only polices coral.
            color: solved ? '#16a34a' : answered ? 'text.primary' : 'text.disabled',
          }}
        >
          {solved ? <IconCircleCheckFilled size={15} /> : <IconMessageCircle2 size={15} stroke={1.9} />}
          {question.replyCount === 0
            ? 'No answers yet'
            : `${question.replyCount} ${question.replyCount === 1 ? 'answer' : 'answers'}`}
        </Box>
      </Box>
    </Box>
  );
};

export default QuestionCard;
