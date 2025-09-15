import React from 'react';
import { Box, Typography } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import MapIcon from '@mui/icons-material/Map';
import BookmarkIcon from '@mui/icons-material/Bookmark';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'plan', label: 'Plan', icon: <CalendarMonthIcon fontSize='small' /> },
  { id: 'budget', label: 'Budget', icon: <InsertDriveFileIcon fontSize='small' /> },
  { id: 'packing', label: 'Packing', icon: <Inventory2Icon fontSize='small' /> },
  { id: 'collection', label: 'Collection', icon: <BookmarkIcon fontSize='small' /> },
  { id: 'docs', label: 'Docs', icon: <InsertDriveFileIcon fontSize='small' /> },
  { id: 'discover', label: 'Discover', icon: <ExploreIcon fontSize='small' /> },
];

interface CreateTripNavProps {
  active?: string;
  onChange?: (id: string) => void;
}

const CreateTripNav: React.FC<CreateTripNavProps> = ({ active = 'plan', onChange }) => {
  const [hovered, setHovered] = React.useState(false);
  const expanded = hovered; // collapsed by default, expands on hover only
  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={(theme) => ({
  width: expanded ? 210 : 72,
        transition: 'width .28s cubic-bezier(.4,0,.2,1)',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: expanded ? 'flex-start' : 'center',
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
      {/* Logo / spacer */}
      <Box sx={{
        width: '100%',
        display: 'flex',
        justifyContent: expanded ? 'space-between' : 'center',
        alignItems: 'center',
        px: expanded ? 2 : 0,
        mb: 1,
        minHeight: 50
      }}>
        {expanded && (
          <img
            src={import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_URL}
            alt='Logo'
            style={{ height: 34, width: 'auto', filter: 'brightness(1.05)' }}
          />
        )}
      </Box>
      {navItems.map(item => {
        const selected = item.id === active;
        return (
          <Box
            key={item.id}
            onClick={() => onChange?.(item.id)}
            sx={{
              cursor: 'pointer',
              width: expanded ? '92%' : 48,
              mx: expanded ? 2 : 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: expanded ? 'flex-start' : 'center',
              gap: expanded ? 12 : 0,
              height: 48,
              borderRadius: 8,
              padding: expanded ? '0 12px' : 0,
              background: selected ? 'rgba(255,255,255,0.18)' : 'transparent',
              border: selected ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.18)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all .25s ease',
              '&:hover': {
                background: selected ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.14)',
                transform: expanded ? 'translateX(4px)' : 'none'
              },
              position: 'relative'
            }}
          >
            <Box sx={{ display:'flex', alignItems:'center', opacity: selected ? 1 : .9 }}>
              {item.icon}
            </Box>
            {expanded && (
              <Typography variant='caption' fontSize={13} fontWeight={600} sx={{ lineHeight: 1 }}>
                {item.label}
              </Typography>
            )}
            {selected && (
              <Box sx={{ position:'absolute', left: -2, top:'50%', transform:'translateY(-50%)', width:4, height:'55%', bgcolor:'rgba(255,255,255,0.85)', borderRadius:'0 2px 2px 0' }} />
            )}
          </Box>
        );
      })}
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ width:'100%', display:'flex', justifyContent: expanded ? 'flex-start':'center', pb:1, px: expanded ? 2 : 0 }}>
        <Box
          sx={{
            cursor:'pointer',
            display:'flex',
            alignItems:'center',
            justifyContent: expanded ? 'flex-start':'center',
            gap: expanded ? 10 : 0,
            width: expanded ? '92%' : 48,
            height:48,
            borderRadius:8,
            padding: expanded ? '0 12px' : 0,
            border:'1px solid rgba(255,255,255,0.18)',
            background:'rgba(255,255,255,0.08)',
            '&:hover':{ background:'rgba(255,255,255,0.18)' }
          }}
        >
          <MapIcon fontSize='small' />
          {expanded && <Typography variant='caption' fontSize={13} fontWeight={600}>Map View</Typography>}
        </Box>
      </Box>
    </Box>
  );
};

export default CreateTripNav;
