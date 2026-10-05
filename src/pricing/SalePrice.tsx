import React from 'react';
import { Box } from '@mui/material';
import { formatMoney } from './types';

/**
 * The old price struck through, the new one beside it.
 *
 * Both numbers come from the server. This used to take a percentage and work the
 * discounted price out here, which stopped being right once a discount became a
 * prepared pair of Razorpay plans: the payable amount is whatever that plan
 * charges, not arithmetic on the MRP. Rendering what was decided is also the
 * only way the page and the card can be guaranteed to agree.
 */
const SalePrice: React.FC<{ mrp: number; payable: number; currency?: string }> = ({ mrp, payable, currency }) => (
  <Box component="span" sx={{ display: 'inline-flex', gap: 0.75, alignItems: 'baseline', flexWrap: 'wrap' }}>
    <Box component="span" sx={{ textDecoration: 'line-through', color: 'text.disabled', fontWeight: 400 }}>
      {formatMoney(mrp, currency)}
    </Box>
    <Box component="span">{formatMoney(payable, currency)}</Box>
  </Box>
);

export default SalePrice;
