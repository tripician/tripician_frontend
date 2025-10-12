import React from 'react';
import { Box, Tooltip } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SettingsIcon from '@mui/icons-material/Settings';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import NewspaperIcon from '@mui/icons-material/Newspaper';

// Custom lightweight T-shirt icon (since Material baseline set lacks a direct Tshirt glyph)
const TshirtIcon: React.FC<{ fontSize?: 'small' | 'medium' | 'large' }> = ({ fontSize = 'small' }) => {
  const size = fontSize === 'small' ? 20 : fontSize === 'large' ? 32 : 24;
  return (
    <Box
      component='svg'
      viewBox='0 0 24 24'
      sx={{ width: size, height: size, display: 'block' }}
      focusable={false}
      aria-hidden='true'
    >
      <path
        fill='currentColor'
        d='M16 3l-2 2h-4L8 3 3 5.5l1.5 3.5L7 8v11c0 .55.45 1 1 1h8c.55 0 1-.45 1-1V8l2.5 1 1.5-3.5L16 3z'
      />
    </Box>
  );
};

interface NavItem { id: string; label: string; icon: React.ReactNode; }

// Updated navigation: Plan, News, Packing, Docs
const navItems: NavItem[] = [
  { id: 'plan', label: 'Plan', icon: <CalendarMonthIcon fontSize='small' /> },
  { id: 'news', label: 'News', icon: <NewspaperIcon fontSize='small' /> },
  { id: 'packing', label: 'Packing', icon: <TshirtIcon fontSize='small' /> },
  { id: 'docs', label: 'Docs', icon: <InsertDriveFileIcon fontSize='small' /> }
];

interface TripPlannerNavProps { active?: string; onChange?: (id: string) => void; onSettingsClick?:()=>void; hideSections?: string[]; }

const TripPlannerNav: React.FC<TripPlannerNavProps> = ({ active = 'plan', onChange, onSettingsClick, hideSections=[] }) => {
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
  {navItems.filter(i=> !hideSections.includes(i.id)).map(item => {
        const selected = item.id === active;
        return (
          <Tooltip key={item.id} title={item.label} placement='right' arrow>
            <Box
              role='button'
              tabIndex={0}
              aria-pressed={selected}
              data-nav-id={item.id}
              onClick={() => onChange?.(item.id)}
              onKeyDown={(e)=> { if(e.key==='Enter' || e.key===' ') { e.preventDefault(); onChange?.(item.id); } }}
              sx={{
                cursor: 'pointer',
                width: 48,
                mx: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 48,
                borderRadius: 2,
                background: selected ? 'rgba(255,255,255,0.22)' : 'transparent',
                border: selected ? '1px solid rgba(255,255,255,0.40)' : 'none',
                color: '#fff',
                transition: 'all .25s ease',
                userSelect: 'none',
                outline: 'none',
                '&:focus-visible': {
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.9)'
                },
                '&:hover': {
                  transform: 'translateY(-2px)',
                  filter: 'brightness(1.05)'
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
      {/* Import/Export and Settings at bottom */}
      <Tooltip title='Import / Export (Coming Soon)' placement='right' arrow>
        <Box
          aria-disabled
          sx={{
            position: 'relative',
            cursor: 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 2,
            mb: 1,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.05)',
            opacity: .55,
            userSelect: 'none'
          }}
        >
          <ImportExportIcon fontSize='small' />
          <Box sx={{ position: 'absolute', bottom: 4, right: 4, bgcolor: 'rgba(255,255,255,0.85)', color:'#0b2942', fontSize:8, fontWeight:700, px:.5, py:.15, borderRadius:.5, letterSpacing:.5 }}>Soon</Box>
        </Box>
      </Tooltip>
      <Tooltip title='Settings' placement='right' arrow>
        <Box
          onClick={onSettingsClick}
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
          <SettingsIcon fontSize='small' />
        </Box>
      </Tooltip>
    </Box>
  );
};

export default TripPlannerNav;
