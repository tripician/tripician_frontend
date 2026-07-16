import React from 'react';
import { Box, Card, Skeleton } from '@mui/material';

/** Skeleton matching the trip/community card layout: image, title, meta rows. */
export const TripCardSkeleton: React.FC = () => (
  <Card sx={{ overflow: 'hidden' }}>
    <Skeleton variant="rectangular" height={172} sx={{ borderRadius: 0 }} />
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Skeleton variant="text" width="70%" height={26} />
      <Skeleton variant="text" width="45%" height={18} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
        <Skeleton variant="circular" width={26} height={26} />
        <Skeleton variant="circular" width={26} height={26} />
        <Box sx={{ flex: 1 }} />
        <Skeleton variant="text" width={64} height={18} />
      </Box>
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
