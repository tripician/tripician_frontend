import React from 'react';
import { Box, Tooltip } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import MapIcon from '@mui/icons-material/Map';
import BookmarkIcon from '@mui/icons-material/Bookmark';

interface NavItem { id: string; label: string; icon: React.ReactNode; }

const navItems: NavItem[] = [
  { id: 'plan', label: 'Plan', icon: <CalendarMonthIcon fontSize='small' /> },
  { id: 'budget', label: 'Budget', icon: <InsertDriveFileIcon fontSize='small' /> },
  { id: 'packing', label: 'Packing', icon: <Inventory2Icon fontSize='small' /> },
  { id: 'collection', label: 'Collection', icon: <BookmarkIcon fontSize='small' /> },
  { id: 'docs', label: 'Docs', icon: <InsertDriveFileIcon fontSize='small' /> },
  { id: 'discover', label: 'Discover', icon: <ExploreIcon fontSize='small' /> },
];

interface CreateTripNavProps { active?: string; onChange?: (id: string) => void; }

const CreateTripNav: React.FC<CreateTripNavProps> = ({ active = 'plan', onChange }) => {
  return (
    <Box
      sx={(theme) => ({
        width: 72,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: 'center',
        py: 1.5,
        gap: 1.25,
        background: theme.palette.mode === 'light'
          ? 'linear-gradient(180deg, #132735 0%, #006097 100%)'
          : 'linear-gradient(180deg, #1a202c 0%, #2d3748 100%)',
        color: '#fff',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        borderRight: '1px solid rgba(255,255,255,0.15)',
        overflow: 'hidden',
        zIndex: 5
      })}
    >
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1, minHeight: 50 }}>
        <img
          src={import.meta.env.VITE_TRIPICIAN_LOGO_ICON_URL}
          alt='Logo'
          style={{ height: 38, width: 38, borderRadius: 12, objectFit: 'contain', filter: 'brightness(1.05)' }}
        />
      </Box>
      {navItems.map(item => {
        const selected = item.id === active;
        return (
          <Tooltip key={item.id} title={item.label} placement='right' arrow>
            <Box
              onClick={() => onChange?.(item.id)}
              sx={{
                cursor: 'pointer',
                width: 48,
                mx: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 48,
                borderRadius: 2,
                background: selected ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)',
                border: selected ? '1px solid rgba(255,255,255,0.40)' : '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
                transition: 'all .25s ease',
                '&:hover': {
                  background: selected ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.18)',
                  transform: 'translateY(-2px)'
                },
                position: 'relative'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', opacity: selected ? 1 : .9 }}>
                {item.icon}
              </Box>
              {selected && (
                <Box sx={{ position: 'absolute', left: -2, top: '50%', transform: 'translateY(-50%)', width: 4, height: '55%', bgcolor: 'rgba(255,255,255,0.85)', borderRadius: '0 2px 2px 0' }} />
              )}
            </Box>
          </Tooltip>
        );
      })}
      <Box sx={{ flexGrow: 1 }} />
      <Tooltip title='Map View' placement='right' arrow>
        <Box
          sx={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.08)',
            '&:hover': { background: 'rgba(255,255,255,0.18)' }
          }}
        >
          <MapIcon fontSize='small' />
        </Box>
      </Tooltip>
    </Box>
  );
};

export default CreateTripNav;
