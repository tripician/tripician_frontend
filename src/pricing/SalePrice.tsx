import React from 'react';
import { Box } from '@mui/material';
import { formatMoney } from './types';

/** The old price struck through with the new one beside it, both exactly as the server decided them. */
const SalePrice: React.FC<{ mrp: number; payable: number; currency?: string }> = ({ mrp, payable, currency }) => (
  <Box component="span" sx={{ display: 'inline-flex', gap: 0.75, alignItems: 'baseline', flexWrap: 'wrap' }}>
    <Box component="span" sx={{ textDecoration: 'line-through', color: 'text.disabled', fontWeight: 400 }}>
      {formatMoney(mrp, currency)}
    </Box>
    <Box component="span">{formatMoney(payable, currency)}</Box>
  </Box>
);

export default SalePrice;
