import React from 'react';
import { Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const LINKS: Array<[string, string]> = [
  ['About', '/about-us'],
  ['Help', '/get-help'],
  ['Pricing', '/pricing'],
  ['For operators', '/for-operators'],
  ['Privacy', '/privacy-policy'],
  ['Terms', '/terms-and-conditions'],
  ['Contact', '/contact-us'],
];

// The site's small print where Instagram keeps it: under the side column, not a footer across the bottom of the feed.
const RailFooter: React.FC = () => (
  <Box component="nav" aria-label="About Tripician" sx={{ mt: 2.5, px: 1 }}>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1.25, rowGap: 0.5 }}>
      {LINKS.map(([label, to]) => (
        <Link
          key={to}
          component={RouterLink}
          to={to}
          variant="caption"
          underline="hover"
          sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
        >
          {label}
        </Link>
      ))}
    </Box>
    <Typography variant="caption" component="p" sx={{ color: 'text.disabled', mt: 1 }}>
      © {new Date().getFullYear()} Tripician
    </Typography>
  </Box>
);

export default RailFooter;
