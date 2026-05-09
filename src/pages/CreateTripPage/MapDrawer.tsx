/**
 * MapDrawer — slide-over map panel
 * Triggered by "View Map" button in TripPlanner.
 */
import React from 'react';
import {
  Drawer, Box, Typography, IconButton, useTheme, useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import RouteIcon from '@mui/icons-material/Route';
const MapPanel = React.lazy(() => import('./MapPanel'));
import type { PlannerDestination } from '../../store/plannerSlice';

interface MapDrawerProps {
  open: boolean;
  onClose: () => void;
  destinations: PlannerDestination[];
  travelMode: string;
  tripId?: string;
}

const MapDrawer: React.FC<MapDrawerProps> = ({ open, onClose, destinations }) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="temporary"
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: isMobile ? '100vw' : '52vw',
          maxWidth: 780,
          background: isLight ? '#ffffff' : '#111114',
          overflow: 'hidden',
          boxShadow: '-8px 0 60px rgba(0,0,0,0.22)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2.5, py: 1.75,
        background: isLight
          ? 'linear-gradient(135deg, #fff 0%, rgba(255,56,92,0.04) 100%)'
          : 'linear-gradient(135deg, #18181b 0%, rgba(255,56,92,0.06) 100%)',
        borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'}`,
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '10px',
            background: 'linear-gradient(135deg,#FF385C,#D91A50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(255,56,92,0.32)',
          }}>
            <MapOutlinedIcon sx={{ color: '#fff', fontSize: 17 }} />
          </Box>
          <Box>
            <Typography sx={{
              fontSize: 14.5, fontWeight: 700,
              color: isLight ? '#111' : '#f5f5f5',
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.2,
            }}>
              Trip Map
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
              <RouteIcon sx={{ fontSize: 11, color: '#FF385C' }} />
              <Typography sx={{ fontSize: 11, color: '#FF385C', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                {destinations.length} stop{destinations.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            bgcolor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
            color: isLight ? '#444' : '#aaa',
            '&:hover': { bgcolor: isLight ? 'rgba(255,56,92,0.09)' : 'rgba(255,56,92,0.14)', color: '#FF385C' },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Legend bar */}
      {destinations.length > 0 && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto',
          px: 2, py: 1,
          borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
          flexShrink: 0,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}>
          {destinations.map((dest, i) => (
            <Box key={dest.id || i} sx={{
              display: 'flex', alignItems: 'center', gap: 0.6, flexShrink: 0,
              bgcolor: isLight ? 'rgba(255,56,92,0.07)' : 'rgba(255,56,92,0.12)',
              border: '1px solid rgba(255,56,92,0.20)',
              borderRadius: '14px', px: 1.1, py: 0.35,
            }}>
              <Box sx={{
                width: 16, height: 16, borderRadius: '50%',
                background: 'linear-gradient(135deg,#FF6B89,#D91A50)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
                fontFamily: "'Inter', sans-serif",
              }}>
                {i + 1}
              </Box>
              <Typography sx={{
                fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                color: isLight ? '#222' : '#ddd',
                fontFamily: "'Inter', sans-serif",
              }}>
                {dest.name}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Map — fills remaining space */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <React.Suspense fallback={<Box sx={{ p: 2, color: 'text.secondary', fontSize: 13 }}>Loading map...</Box>}>
          <MapPanel widthFraction={1} />
        </React.Suspense>
      </Box>
    </Drawer>
  );
};

export default MapDrawer;