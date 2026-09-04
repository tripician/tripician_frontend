import React from 'react';
import { Box, Typography, Popover, Button, LinearProgress } from '@mui/material';
import { IconCoins, IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { NaviaCreditBalance } from './naviaService';

interface CreditUsagePopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  wallet: NaviaCreditBalance | null;
  /** e.g. "Personal credits" / "Trip credits" */
  title: string;
  /** One-liner explaining which wallet this is. */
  subtitle: string;
}

/**
 * The quick-glance "balloon" that opens when a credit chip is clicked.
 * Shows the essentials; the Settings → Credits section holds the full story.
 */
const CreditUsagePopover: React.FC<CreditUsagePopoverProps> = ({
  open, anchorEl, onClose, wallet, title, subtitle,
}) => {
  const navigate = useNavigate();
  if (!wallet) return null;

  const pctLeft = wallet.totalGranted > 0
    ? Math.max(0, Math.min(100, (wallet.balance / wallet.totalGranted) * 100))
    : 0;
  const low = wallet.balance <= 10;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            mt: 1,
            width: 280,
            borderRadius: '14px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
            p: 2,
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
        <IconCoins size={15} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
          {title}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 1.5 }}>
        {subtitle}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mb: 0.75 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, color: low ? 'error.main' : 'text.primary' }}>
          {wallet.balance}
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled',}}>
          of {wallet.totalGranted} remaining
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={pctLeft}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'action.hover',
          mb: 1.5,
          '& .MuiLinearProgress-bar': {
            borderRadius: 3,
            bgcolor: low ? 'error.main' : 'primary.main',
          },
        }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.75 }}>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary',}}>
          Used so far
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700,}}>
          {wallet.totalSpent}
        </Typography>
      </Box>

      <Button
        fullWidth
        size="small"
        variant="outlined"
        endIcon={<IconArrowRight size={14} />}
        onClick={() => { onClose(); navigate('/settings?tab=credits'); }}
        sx={{
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.78rem',
          borderRadius: '50px',
        }}
      >
        View full usage
      </Button>
    </Popover>
  );
};

export default CreditUsagePopover;
