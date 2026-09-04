import React from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconArrowRight } from '@tabler/icons-react';

interface SeeAllLinkProps {
  to: string;
  label?: string;
}

/** The way out of an editorial module and into the full index behind it. */
const SeeAllLink: React.FC<SeeAllLinkProps> = ({ to, label = 'See all' }) => {
  const navigate = useNavigate();
  return (
    <Box
      component="button"
      type="button"
      onClick={() => navigate(to)}
      sx={(t) => ({
        display: 'inline-flex', alignItems: 'center', gap: 0.5,
        border: 'none', bgcolor: 'transparent', p: 0.5, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, lineHeight: 1,
        color: 'text.secondary', whiteSpace: 'nowrap',
        transition: `color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
        '&:hover': { color: 'primary.main' },
        '&:focus-visible': { outline: `2px solid ${t.custom.ring}`, outlineOffset: 2, borderRadius: 4 },
      })}
    >
      {label}
      <IconArrowRight size={15} stroke={2} />
    </Box>
  );
};

export default SeeAllLink;
