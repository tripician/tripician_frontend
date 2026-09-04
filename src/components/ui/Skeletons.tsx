import React from 'react';
import { Box, Card, Skeleton } from '@mui/material';

/**
 * Skeleton matching TripListingCard: 4:3 cover with the host avatar overlapping
 * its bottom-left and the crew over its top-right, then the listing rows down to
 * the age line.
 *
 * The cover is an aspect ratio rather than a flat pixel height, which matched
 * neither the card it stood in for nor the column width it rendered at, so the
 * grid resettled every time a fetch landed. Keep this in step with the card:
 * a skeleton that lies about height is worse than none.
 */
export const TripCardSkeleton: React.FC = () => (
  <Card sx={{ overflow: 'hidden' }}>
    <Box sx={{ position: 'relative' }}>
      <Skeleton variant="rectangular" sx={{ borderRadius: 0, aspectRatio: '4 / 3', height: 'auto' }} />
      <Skeleton
        variant="circular"
        width={46}
        height={46}
        sx={{ position: 'absolute', left: 12, bottom: 12 }}
      />
      <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex' }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="circular" width={28} height={28} sx={{ ml: i === 0 ? 0 : '-9px' }} />
        ))}
      </Box>
    </Box>
    <Box sx={{ px: 2, pt: 1.5, pb: 1.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Skeleton variant="text" width={92} height={18} />
        <Box sx={{ flex: 1 }} />
        <Skeleton variant="text" width={38} height={18} />
      </Box>
      <Skeleton variant="text" width="88%" height={22} />
      <Skeleton variant="text" width="94%" height={18} />
      <Skeleton variant="text" width="70%" height={18} />
      <Skeleton variant="text" width="45%" height={16} />
    </Box>
  </Card>
);

interface CardGridSkeletonProps {
  count?: number;
  minWidth?: number;
}

/** Responsive grid of card skeletons for list-page loading states. */
export const CardGridSkeleton: React.FC<CardGridSkeletonProps> = ({ count = 6, minWidth = 300 }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      gap: 2.5,
    }}
  >
    {Array.from({ length: count }, (_, i) => (
      <TripCardSkeleton key={i} />
    ))}
  </Box>
);

interface ListSkeletonProps {
  rows?: number;
  withAvatar?: boolean;
}

/** Row skeletons for feeds, notifications, comment threads. */
export const ListSkeleton: React.FC<ListSkeletonProps> = ({ rows = 5, withAvatar = true }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
    {Array.from({ length: rows }, (_, i) => (
      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, px: 0.5 }}>
        {withAvatar && <Skeleton variant="circular" width={38} height={38} />}
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width={`${55 + ((i * 17) % 30)}%`} height={20} />
          <Skeleton variant="text" width={`${30 + ((i * 23) % 25)}%`} height={16} />
        </Box>
      </Box>
    ))}
  </Box>
);

const Skeletons = { TripCardSkeleton, CardGridSkeleton, ListSkeleton };
export default Skeletons;
