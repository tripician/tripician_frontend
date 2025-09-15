import React from 'react';
import { Box, Typography, Tooltip, Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HotelIcon from '@mui/icons-material/Hotel';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import DirectionsRailwayIcon from '@mui/icons-material/DirectionsRailway';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import BlockIcon from '@mui/icons-material/Block';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ExploreIcon from '@mui/icons-material/Explore';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DescriptionIcon from '@mui/icons-material/Description';
import MapIcon from '@mui/icons-material/Map';
import type { SxProps, Theme } from '@mui/material/styles';

export interface DestinationRow {
  id: string;
  name: string;
  start: string; // formatted date
  end: string;
  nights: number;
  transport?: string;
  todo?: string;
}

interface DestinationsPanelProps {
  destinations: DestinationRow[];
  onChangeNights?: (id: string, delta: number) => void;
  onChangeTransport?: (id: string, mode: string) => void;
  onAddDestination?: (name: string) => void;
  onRemoveDestination?: (id: string) => void;
}

const rowHover: SxProps<Theme> = (theme) => ({
  '&:hover': { backgroundColor: theme.palette.action.hover }
});

const badgeSx: SxProps<Theme> = (theme) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
  borderRadius: '50%',
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  fontWeight: 600,
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
});

const numberButtonSx: SxProps<Theme> = (theme) => ({
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  '&:hover': { backgroundColor: theme.palette.action.hover }
});

const headerCell = (label: string) => (
  <Typography variant='caption' sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: .5 }} color='text.secondary'>
    {label}
  </Typography>
);

const transportOptions: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: '', label: 'None', icon: <BlockIcon fontSize='small' /> },
  { id: 'Flight', label: 'Flight', icon: <FlightTakeoffIcon fontSize='small' /> },
  { id: 'Train', label: 'Train', icon: <DirectionsRailwayIcon fontSize='small' /> },
  { id: 'Bus', label: 'Bus', icon: <DirectionsBusIcon fontSize='small' /> },
  { id: 'Car', label: 'Car', icon: <DirectionsCarIcon fontSize='small' /> },
  { id: 'Ferry', label: 'Ferry', icon: <DirectionsBoatIcon fontSize='small' /> }
];

const getTransportIcon = (mode?: string) => {
  const found = transportOptions.find(o => o.id === mode);
  return found ? found.icon : <DirectionsBusIcon fontSize='small' color='disabled' />;
};

const DestinationsPanel: React.FC<DestinationsPanelProps> = ({ destinations, onChangeNights, onChangeTransport, onAddDestination, onRemoveDestination }) => {
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  const openMenu = (e: React.MouseEvent<HTMLElement>, id: string) => {
    setMenuAnchor(e.currentTarget);
    setActiveId(id);
  };
  const closeMenu = () => {
    setMenuAnchor(null); setActiveId(null);
  };
  const handleSelectTransport = (mode: string) => {
    if (activeId && onChangeTransport) onChangeTransport(activeId, mode);
    closeMenu();
  };
  return (
    <Box>
      {/* Heading Row */}
      <Box sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 1.5,
        position: 'sticky',
        top: 0,
        zIndex: 2,
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
        boxShadow: `0 2px 4px -2px ${theme.palette.mode==='dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.12)'}`
      })}>
        <Box sx={{ width: 36 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>{headerCell('Destination')}</Box>
        <Box sx={{ width: 120, display:'flex', justifyContent:'center' }}>{headerCell('Nights')}</Box>
        <Box sx={{ width: 110, textAlign:'center' }}>{headerCell('Sleeping')}</Box>
  <Box sx={{ width: 110, textAlign:'center' }}>{headerCell('Discover')}</Box>
  <Box sx={{ width: 90, textAlign:'center' }}>{headerCell('Foods')}</Box>
  <Box sx={{ width: 90, textAlign:'center' }}>{headerCell('Docs')}</Box>
  <Box sx={{ width: 110, textAlign:'center' }}>{headerCell('Transport')}</Box>
      </Box>

      {/* Rows */}
      {destinations.map((d, idx) => (
        <Box key={d.id} sx={(theme) => ({ display: 'flex', alignItems: 'stretch', px: 3, py: 2, gap: 2, borderBottom: `1px solid ${theme.palette.divider}`, ...rowHover(theme), position:'relative' })}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36 }}>
            <Box sx={badgeSx}>{idx + 1}</Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={600} fontSize={15} noWrap>{d.name}</Typography>
            <Typography variant='caption' color='text.secondary'>{d.start} - {d.end}</Typography>
          </Box>
          <Box sx={{ width:120, display:'flex', alignItems:'center', justifyContent:'center', gap:1 }}>
            <Box sx={numberButtonSx} onClick={() => onChangeNights?.(d.id, -1)}><RemoveIcon fontSize='small' /></Box>
            <Typography fontSize={14} fontWeight={600}>{d.nights}</Typography>
            <Box sx={numberButtonSx} onClick={() => onChangeNights?.(d.id, 1)}><AddIcon fontSize='small' /></Box>
          </Box>
          <Box sx={{ width:110, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Tooltip title='Sleeping'><HotelIcon fontSize='small' color='disabled' /></Tooltip>
          </Box>
          <Box sx={{ width:110, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Tooltip title='Discover'><ExploreIcon fontSize='small' color='disabled' /></Tooltip>
          </Box>
          <Box sx={{ width:90, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Tooltip title='Foods'><RestaurantIcon fontSize='small' color='disabled' /></Tooltip>
          </Box>
          <Box sx={{ width:90, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Tooltip title='Docs'><DescriptionIcon fontSize='small' color='disabled' /></Tooltip>
          </Box>
          <Box sx={{ width:110, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Tooltip title='Transport mode'>
              <Box
                onClick={(e) => openMenu(e, d.id)}
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  px: 1,
                  py: .5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: `1px solid ${theme.palette.divider}`,
                  minWidth: 48,
                  justifyContent:'center',
                  background: theme.palette.mode==='dark'? theme.palette.grey[900] : theme.palette.grey[50],
                  transition:'background .2s,border-color .2s',
                  '&:hover': { backgroundColor: theme.palette.action.hover }
                })}
              >
                {getTransportIcon(d.transport)}
                <KeyboardArrowDownIcon fontSize='small' sx={{ opacity: .5 }} />
              </Box>
            </Tooltip>
          </Box>
          {onRemoveDestination && destinations.length > 1 && (
            <Box
              onClick={() => onRemoveDestination(d.id)}
              sx={(theme)=>({ position:'absolute', right:8, top:8, width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', background: theme.palette.background.paper, border:`1px solid ${theme.palette.divider}`, opacity:0, transition:'opacity .2s', '.MuiBox-root:hover &':{opacity:1}, '&:hover':{ background: theme.palette.action.hover } })}
            >
              <DeleteOutlineIcon fontSize='small' />
            </Box>
          )}
        </Box>
      ))}

      {/* Add destination row */}
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
        {adding ? (
          <>
            <CalendarMonthIcon fontSize='small' color='action' />
            <Box component='form' onSubmit={(e)=>{ e.preventDefault(); if(newName.trim()){ onAddDestination?.(newName.trim()); setNewName(''); setAdding(false);} }} sx={{ flex:1, display:'flex', alignItems:'center', gap:1 }}>
              <input
                autoFocus
                value={newName}
                onChange={(e)=>setNewName(e.target.value)}
                placeholder='Enter destination name'
                style={{ flex:1, padding:'6px 10px', borderRadius:8, border:'1px solid var(--mui-palette-divider)', background:'transparent', color:'inherit', outline:'none', fontSize:14 }}
              />
              <Button size='small' type='submit' variant='contained' sx={{ textTransform:'none', borderRadius:2 }}>Add</Button>
              <Button size='small' variant='text' onClick={()=>{ setAdding(false); setNewName(''); }}>Cancel</Button>
            </Box>
          </>
        ) : (
          <>
            <CalendarMonthIcon fontSize='small' color='action' />
            <Typography variant='body2' color='text.secondary' onClick={()=>setAdding(true)} sx={{ cursor:'text', flex:1 }}>Add new destination...</Typography>
            <Button size='small' variant='outlined' startIcon={<ExploreIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>Discover</Button>
            <Button size='small' variant='outlined' startIcon={<MapIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>Collection</Button>
          </>
        )}
        {/* Lean shadow below input area */}
        <Box sx={(theme) => ({ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, pointerEvents: 'none', background: `linear-gradient(to bottom, ${theme.palette.action.hover}00, ${theme.palette.action.hover}60)` })} />
      </Box>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} elevation={3} keepMounted>
        {transportOptions.map(opt => (
          <MenuItem key={opt.id || 'none'} onClick={() => handleSelectTransport(opt.id)} selected={activeId ? destinations.find(d=>d.id===activeId)?.transport===opt.id : false}>
            <ListItemIcon>{opt.icon}</ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: 14 }}>
              {opt.label}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default DestinationsPanel;
