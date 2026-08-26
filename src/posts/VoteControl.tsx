import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react';

interface VoteControlProps {
  score: number;
  /** The reader's own vote: 1, -1 or 0. */
  viewerVote: number;
  /** True on your own answer, where voting is not a signal about anything. */
  disabled?: boolean;
  onVote: (value: number) => void;
}

/**
 * Up and down, and only one number.
 *
 * Both votes are recorded and both move an answer in the order. Only the
 * up-count is ever shown, and it never goes below zero on screen. A visible
 * "-3" beside somebody's name is not feedback, it is a public mark against a
 * person who tried to help, and on a community this size the reliable result is
 * that the next person does not answer at all. The downvote still does its real
 * job, which is to put a bad answer underneath a good one.
 *
 * The voted state is a tint and a colour, never a glow. A blurred coral shadow
 * is the loudest generated-UI tell there is, and the shadow guard forbids it.
 */
const VoteControl: React.FC<VoteControlProps> = ({ score, viewerVote, disabled = false, onVote }) => {
  const arrowSx = (active: boolean) => (t: any) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 22,
    border: 'none',
    borderRadius: '6px',
    bgcolor: active ? t.custom.surface.brandTint : 'transparent',
    color: active ? 'primary.main' : 'text.disabled',
    cursor: disabled ? 'default' : 'pointer',
    p: 0,
    transition: `color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
    '&:hover': disabled ? {} : { color: 'primary.main', bgcolor: t.custom.surface.hover },
    '&:focus-visible': { outline: `2px solid ${t.custom.ring}`, outlineOffset: 2 },
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <Tooltip title={disabled ? 'You wrote this' : 'This helped'} arrow placement="left">
        <Box
          component="button"
          type="button"
          aria-label="This helped"
          aria-pressed={viewerVote === 1}
          disabled={disabled}
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onVote(viewerVote === 1 ? 0 : 1); }}
          sx={arrowSx(viewerVote === 1)}
        >
          <IconChevronUp size={17} stroke={2.2} />
        </Box>
      </Tooltip>

      {/* Clamped at zero on purpose. See the note above. */}
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, color: viewerVote === 1 ? 'primary.main' : 'text.secondary', py: 0.15 }}
      >
        {Math.max(0, score)}
      </Typography>

      <Tooltip title={disabled ? 'You wrote this' : 'Not useful'} arrow placement="left">
        <Box
          component="button"
          type="button"
          aria-label="Not useful"
          aria-pressed={viewerVote === -1}
          disabled={disabled}
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onVote(viewerVote === -1 ? 0 : -1); }}
          sx={arrowSx(viewerVote === -1)}
        >
          <IconChevronDown size={17} stroke={2.2} />
        </Box>
      </Tooltip>
    </Box>
  );
};

export default VoteControl;
