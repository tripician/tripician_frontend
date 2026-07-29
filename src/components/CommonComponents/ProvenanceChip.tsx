import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { IconCircleCheck, IconHelpCircle } from '@tabler/icons-react';
import type { SpotProvenance } from '../../store/plannerSlice';

/**
 * Shows where a place in a plan came from.
 *
 * The rule this enforces: nothing renders as fact without a source. A place that
 * resolved to a real, currently-operating listing says so; one we could not find
 * says that too, rather than sitting in the list looking identical. Permanently
 * closed places never reach this component - they are dropped at generation.
 *
 * Spots created before verification existed have no provenance and render nothing,
 * which is honest: we genuinely do not know whether they were checked.
 */
interface ProvenanceChipProps {
  provenance?: SpotProvenance;
  verifiedAt?: string;
  /** 'chip' shows a labelled pill; 'icon' is a bare icon for dense rows. */
  variant?: 'chip' | 'icon';
}

function formatCheckedOn(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const ProvenanceChip: React.FC<ProvenanceChipProps> = ({ provenance, verifiedAt, variant = 'chip' }) => {
  if (!provenance) return null;

  const verified = provenance === 'verified';
  const checkedOn = formatCheckedOn(verifiedAt);

  const tooltip = verified
    ? `Matched to a real place that is currently open${checkedOn ? `. Checked ${checkedOn}` : ''}.`
    : `We couldn't find a listing for this one. Small local spots often have none - it doesn't mean it isn't real, just that we can't confirm the details.`;

  const Icon = verified ? IconCircleCheck : IconHelpCircle;
  const color = verified ? '#16a34a' : '#94a3b8';

  if (variant === 'icon') {
    return (
      <Tooltip title={tooltip} arrow placement='top'>
        <Box component='span' sx={{ display: 'inline-flex', flexShrink: 0, lineHeight: 0 }}>
          <Icon size={14} color={color} aria-label={verified ? 'Verified place' : 'Unchecked place'} />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltip} arrow placement='top'>
      <Box
        component='span'
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.4, flexShrink: 0,
          height: 18, px: 0.65, borderRadius: '6px',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
          fontFamily: "'Inter',sans-serif",
          color,
          bgcolor: verified ? 'rgba(22,163,74,0.10)' : 'rgba(148,163,184,0.14)',
        }}
      >
        <Icon size={11} />
        {verified ? 'Verified' : 'Unchecked'}
      </Box>
    </Tooltip>
  );
};

export default ProvenanceChip;
