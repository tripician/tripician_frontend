import React from 'react';
import { Box, Typography, Tooltip, Button, Menu, MenuItem, ListItemIcon, ListItemText, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, LinearProgress, Tabs, Tab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import DirectionsRailwayIcon from '@mui/icons-material/DirectionsRailway';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import BlockIcon from '@mui/icons-material/Block';
import ExploreIcon from '@mui/icons-material/Explore';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useDispatch, useSelector } from 'react-redux';
import { addSpot, toggleSpot, removeSpot, addFoodItem, toggleFoodItem, removeFoodItem, reorderSpots, reorderFoods } from '../../store/plannerSlice';
import SearchIcon from '@mui/icons-material/Search';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MapIcon from '@mui/icons-material/Map';
import HotelIcon from '@mui/icons-material/Hotel';
import EditNoteIcon from '@mui/icons-material/EditNote';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
  onAddDestination?: (name: string, coords?: { lat: number; lng: number }) => void;
  onRemoveDestination?: (id: string) => void;
  maxed?: boolean; // whether total nights reached target
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

// Helper for numeric adjust buttons (used via sx callback, not invoked manually)
const numberButtonBase = (theme: Theme) => ({
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background .15s',
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
  { id: 'Ferry', label: 'Ferry', icon: <DirectionsBoatIcon fontSize='small' /> },
  { id: 'Walk', label: 'Walk', icon: <DirectionsWalkIcon fontSize='small' /> },
  { id: 'Bike', label: 'Bike', icon: <DirectionsBikeIcon fontSize='small' /> }
];

const getTransportIcon = (mode?: string) => {
  const found = transportOptions.find(o => o.id === mode);
  return found ? found.icon : <DirectionsBusIcon fontSize='small' color='disabled' />;
};

const DestinationsPanel: React.FC<DestinationsPanelProps> = ({ destinations, onChangeNights, onChangeTransport, onAddDestination, onRemoveDestination, maxed }) => {
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  // Refs for positioning transport pill under "Nights" column
  const nightsRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [pillCenters, setPillCenters] = React.useState<Record<string, number>>({}); // px from left edge of panel

  React.useLayoutEffect(() => {
    if (!panelRef.current) return;
    const panelLeft = panelRef.current.getBoundingClientRect().left;
    const nextCenters: Record<string, number> = {};
    destinations.forEach(d => {
      const el = nightsRefs.current[d.id];
      if (el) {
        const rect = el.getBoundingClientRect();
        nextCenters[d.id] = rect.left + rect.width / 2 - panelLeft; // center relative to panel
      }
    });
    setPillCenters(nextCenters);
  }, [destinations]);

  React.useEffect(() => {
    const handler = () => {
      if (!panelRef.current) return;
      const panelLeft = panelRef.current.getBoundingClientRect().left;
      setPillCenters(prev => {
        const updated: Record<string, number> = { ...prev };
        destinations.forEach(d => {
          const el = nightsRefs.current[d.id];
          if (el) {
            const rect = el.getBoundingClientRect();
            updated[d.id] = rect.left + rect.width / 2 - panelLeft;
          }
        });
        return updated;
      });
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [destinations]);
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [predictions, setPredictions] = React.useState<any[]>([]);
  const [loadingPred, setLoadingPred] = React.useState(false);
  const sessionTokenRef = React.useRef<any | null>(null);

  // Notes state
  const [notes, setNotes] = React.useState<Record<string,string>>({});
  const [openNoteId, setOpenNoteId] = React.useState<string | null>(null);
  const [noteDraft, setNoteDraft] = React.useState('');

  const openNotes = (id: string) => { setOpenNoteId(id); setNoteDraft(notes[id] || ''); };
  const saveNotes = () => { if (openNoteId) setNotes(n => ({ ...n, [openNoteId!]: noteDraft })); setOpenNoteId(null); };
  const cancelNotes = () => { setOpenNoteId(null); };

  // Docs upload state
  interface DocItem { id:string; name:string; url:string; originalName:string; }
  const [docs, setDocs] = React.useState<Record<string, DocItem[]>>({});
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const [openDocsId, setOpenDocsId] = React.useState<string | null>(null);

  // Discover dialog state (persisted via Redux for data; local only for UI state)
  const [discoverOpenId, setDiscoverOpenId] = React.useState<string | null>(null);
  const [discoverTab, setDiscoverTab] = React.useState<'spots'|'foods'>('spots');
  const [spotSearch, setSpotSearch] = React.useState('');
  const [spotSearchLoading, setSpotSearchLoading] = React.useState(false);
  const [spotPredictions, setSpotPredictions] = React.useState<any[]>([]);
  const [foodInput, setFoodInput] = React.useState('');
  const placesServiceRef = React.useRef<any>(null);
  const scriptLoadingRef = React.useRef(false);

  // Simple canned recommendations (would come from API later)
  const recommendedSpots = ['Central Park','Old Town','Museum of Art','River Walk','Sunset Point'];
  const recommendedFoods = ['Local BBQ','Seafood Platter','Street Tacos','Traditional Dessert','Coffee Roastery'];

  const openDiscover = (id:string) => { setDiscoverOpenId(id); setDiscoverTab('spots'); };
  const closeDiscover = () => { setDiscoverOpenId(null); setSpotPredictions([]); setSpotSearch(''); };

  // Redux selectors / dispatch (ES module imports)
  const dispatch = useDispatch();
  const plannerDestinations = useSelector((state:any)=> state.planner.destinations);

  // Load Google Places script if needed
  const ensurePlacesScript = React.useCallback(() => {
    if (placesServiceRef.current) return true;
    const w: any = window;
    if (w.google?.maps?.places) {
      placesServiceRef.current = new w.google.maps.places.AutocompleteService();
      return true;
    }
    if (scriptLoadingRef.current) return false;
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return false;
    scriptLoadingRef.current = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`; // load places library
    script.async = true; script.defer = true; script.dataset.tripicianPlaces = '1';
    script.onload = () => {
      scriptLoadingRef.current = false;
      if (w.google?.maps?.places) {
        placesServiceRef.current = new w.google.maps.places.AutocompleteService();
        if (spotSearch) triggerSpotSearch(spotSearch);
      }
    };
    document.head.appendChild(script);
    return false;
  }, [spotSearch]);

  const triggerSpotSearch = React.useCallback((query: string) => {
    if (!query.trim()) { setSpotPredictions([]); return; }
    const ready = ensurePlacesScript();
    if (!ready || !placesServiceRef.current) {
      setSpotSearchLoading(true);
      // fallback placeholder while script loads
      const fake = Array.from({length:2}).map((_,i)=> ({ description: query + ' (loading '+(i+1)+')', place_id: query + '_fake_'+i }));
      setTimeout(()=> { setSpotPredictions(fake); setSpotSearchLoading(false); }, 300);
      return;
    }
    setSpotSearchLoading(true);
    placesServiceRef.current.getPlacePredictions({ input: query }, (preds: any[]) => {
      const allow = new Set(['tourist_attraction','point_of_interest','establishment']);
      const filtered = (preds || []).filter(p => !p.types || p.types.some((t:string)=> allow.has(t)));
      setSpotPredictions(filtered);
      setSpotSearchLoading(false);
    });
  }, [ensurePlacesScript]);

  React.useEffect(() => { const d = setTimeout(()=> triggerSpotSearch(spotSearch), 450); return ()=> clearTimeout(d); }, [spotSearch, triggerSpotSearch]);

  const handleUploadClick = (id: string) => {
    if (!fileInputRefs.current[id]) return;
    fileInputRefs.current[id]!.click();
  };
  const onFilesSelected = (id: string, files: FileList | null) => {
    if (!files || files.length===0) return;
    const list: DocItem[] = docs[id]? [...docs[id]]: [];
    Array.from(files).forEach((f, idx) => {
      const parts = f.name.split('.');
      const ext = parts.length>1? '.'+parts.pop():'';
      const base = parts.join('.') || 'file';
      const unique = `${base}_${Date.now().toString(36)}_${idx}` + ext;
      const url = URL.createObjectURL(f);
      list.push({ id: unique, name: unique, url, originalName: f.name });
    });
    setDocs(prev => ({ ...prev, [id]: list }));
  };
  React.useEffect(()=>()=>{ // cleanup object URLs on unmount
    Object.values(docs).flat().forEach(d=> URL.revokeObjectURL(d.url));
  },[]);

  // Helper to get Places Autocomplete service (after maps script loaded)
  const getAutocompleteService = () => {
    const g = (window as any).google;
    if (!g?.maps?.places) return null;
    if (!sessionTokenRef.current) sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
    if (!(window as any)._tripicianPlaceService) {
      (window as any)._tripicianPlaceService = new g.maps.places.AutocompleteService();
    }
    return (window as any)._tripicianPlaceService as any;
  };

  // Fetch predictions when typing
  React.useEffect(() => {
    if (!adding) { setPredictions([]); return; }
    if (!newName.trim()) { setPredictions([]); return; }
    const svc = getAutocompleteService();
    if (!svc) return; // maps not loaded yet
    let active = true;
    setLoadingPred(true);
    svc.getPlacePredictions({ input: newName, sessionToken: sessionTokenRef.current, types: ['geocode','establishment'] }, (res: any[], status: string) => {
      if (!active) return;
      setLoadingPred(false);
      if (status !== 'OK' || !res) { setPredictions([]); return; }
      setPredictions(res.slice(0,7));
    });
    return () => { active = false; };
  }, [newName, adding]);

  const selectPrediction = (p: any) => {
    const g = (window as any).google;
    if (!g?.maps?.places) return;
    const placesSvc = new g.maps.places.PlacesService(document.createElement('div'));
    placesSvc.getDetails({ placeId: p.place_id, fields: ['name','geometry','formatted_address'] }, (place: any, status: string) => {
      if (status === 'OK' && place) {
        const name = place.name || p.description;
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();
        if (name && lat != null && lng != null) onAddDestination?.(name, { lat, lng });
        setAdding(false); setNewName(''); setPredictions([]);
      }
    });
  };

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
  <Box ref={panelRef}>
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
  <Box sx={{ width: 110, textAlign:'center' }}>{headerCell('Stay')}</Box>
  <Box sx={{ width: 110, textAlign:'center' }}>{headerCell('Discover')}</Box>
  <Box sx={{ width: 110, textAlign:'center' }}>{headerCell('Docs')}</Box>
      </Box>

      {/* Rows + transport connector rows */}
      {destinations.map((d, idx) => (
        <React.Fragment key={d.id}>
          <Box sx={(theme) => ({ display: 'flex', alignItems: 'stretch', px: 3, py: 2, gap: 2, borderBottom: `1px solid ${theme.palette.divider}`, ...rowHover(theme), position:'relative' })}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36 }}>
              <Box sx={badgeSx}>{idx + 1}</Box>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={600} fontSize={15} noWrap>{d.name}</Typography>
              <Typography variant='caption' color='text.secondary'>{d.start} - {d.end}</Typography>
            </Box>
            <Box sx={{ width:120, display:'flex', alignItems:'center', justifyContent:'center', gap:1 }} ref={(el: HTMLDivElement | null) => { nightsRefs.current[d.id] = el; }}>
              <Box sx={(theme)=> ({ ...numberButtonBase(theme), opacity: d.nights<=1? .4:1, pointerEvents: d.nights<=1? 'none':'auto' })} onClick={() => onChangeNights?.(d.id, -1)}><RemoveIcon fontSize='small' /></Box>
              <Typography fontSize={14} fontWeight={600}>{d.nights}</Typography>
              <Tooltip title={maxed ? 'Total nights limit reached' : 'Add night'}>
                <span>
                  <Box sx={(theme)=> ({ ...numberButtonBase(theme), opacity: maxed? .4:1, pointerEvents: maxed? 'none':'auto' })} onClick={() => onChangeNights?.(d.id, 1)}><AddIcon fontSize='small' /></Box>
                </span>
              </Tooltip>
            </Box>
            <Box sx={{ width:110, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Tooltip title='Add stay info'>
                <IconButton size='small' sx={{ opacity:.6 }}><HotelIcon fontSize='small' /></IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ width:110, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {(() => {
                const pd = plannerDestinations.find((pd:any)=> pd.id===d.id);
                const spotsArr = pd?.spots || [];
                const foodsArr = pd?.foods || [];
                const coveredSpots = spotsArr.filter((s:any)=> s.checked).length;
                const coveredFoods = foodsArr.filter((f:any)=> f.checked).length;
                const title = spotsArr.length || foodsArr.length ? `${coveredSpots}/${spotsArr.length} spots | ${coveredFoods}/${foodsArr.length} foods` : 'Discover spots & foods';
                const total = spotsArr.length + foodsArr.length;
                return (
                  <Tooltip title={title}>
                    <IconButton size='small' onClick={()=> openDiscover(d.id)} sx={{ position:'relative' }}>
                      <ExploreIcon fontSize='small' color={total>0? 'primary':'disabled'} />
                      {total>0 && (
                        <Box sx={(theme)=>({ position:'absolute', top:-4, right:-4, minWidth:18, height:18, px:0.5, borderRadius:9, background: theme.palette.mode==='dark'? theme.palette.primary.light : theme.palette.primary.main, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, boxShadow:'0 0 0 2px '+theme.palette.background.paper })}>
                          {total}
                        </Box>
                      )}
                    </IconButton>
                  </Tooltip>
                );
              })()}
            </Box>
            <Box sx={{ width:110, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <input ref={el=>{ fileInputRefs.current[d.id]=el; }} type='file' multiple hidden onChange={(e)=> onFilesSelected(d.id, e.target.files)} />
              <Tooltip title={docs[d.id]?.length ? `View ${docs[d.id].length} document(s)` : 'Upload documents'}>
                <IconButton size='small' onClick={()=> { docs[d.id]?.length ? setOpenDocsId(d.id) : handleUploadClick(d.id); }} sx={{ position:'relative' }}>
                  <UploadFileIcon fontSize='small' color={docs[d.id]?.length ? 'primary' : 'disabled'} />
                  {docs[d.id]?.length > 0 && (
                    <Box sx={(theme)=>({ position:'absolute', top:-4, right:-4, minWidth:18, height:18, px:0.5, borderRadius:9, background: theme.palette.mode==='dark'? theme.palette.secondary.light : theme.palette.secondary.main, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, boxShadow:'0 0 0 2px '+theme.palette.background.paper })}>
                      {docs[d.id].length}
                    </Box>
                  )}
                </IconButton>
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
            <Box sx={(theme)=>({ position:'absolute', right:8, top:42, width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', background: theme.palette.background.paper, border:`1px solid ${theme.palette.divider}`, opacity:0, transition:'opacity .2s', '.MuiBox-root:hover &':{opacity:1}, '&:hover':{ background: theme.palette.action.hover } })} onClick={()=> openNotes(d.id)}>
              <EditNoteIcon fontSize='small' />
            </Box>
          </Box>
          {idx < destinations.length - 1 && (
            <Box sx={{ position:'relative', px:3, height:0, background:'transparent' }}>
              <Box sx={(theme)=>({ position:'absolute', left:0, right:0, top:0, height:1, background: theme.palette.divider, opacity:.3 })} />
              <Tooltip title='Transport to next destination'>
                <Box
                  role='button'
                  aria-label={`Transport ${d.transport ? d.transport : 'select'} from ${d.name} to next destination`}
                  onClick={(e) => openMenu(e, d.id)}
                  sx={(theme) => ({
                    position:'absolute',
                    top:0,
                    left: (pillCenters[d.id] ?? 0),
                    transform:'translate(-50%, -50%)',
                    zIndex:1,
                    display:'flex',
                    alignItems:'center',
                    gap:.4,
                    padding:'2px 8px',
                    borderRadius:999,
                    cursor:'pointer',
                    border:`1px solid ${theme.palette.divider}`,
                    background: theme.palette.mode==='dark'? theme.palette.background.paper : theme.palette.common.white,
                    boxShadow: theme.palette.mode==='dark'? '0 0 0 1px rgba(255,255,255,0.05)' : '0 1px 2px rgba(0,0,0,0.08)',
                    transition:'background .2s,border-color .2s',
                    '&:hover': { backgroundColor: theme.palette.action.hover }
                  })}
                >
                  {getTransportIcon(d.transport)}
                  <Typography variant='caption' sx={{ fontWeight:600, fontSize:11, opacity:d.transport?1:.65 }}>
                    {d.transport || 'None'}
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          )}
        </React.Fragment>
      ))}

      {/* Add destination row */}
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
  {adding ? (
          <>
            <CalendarMonthIcon fontSize='small' color='action' />
            <Box component='form' onSubmit={(e)=>{ e.preventDefault(); if(newName.trim() && !maxed){ onAddDestination?.(newName.trim()); setNewName(''); setAdding(false); setPredictions([]);} }} sx={{ flex:1, display:'flex', alignItems:'center', gap:1, position:'relative' }}>
              <input
                autoFocus
                value={newName}
                onChange={(e)=>setNewName(e.target.value)}
                placeholder='Enter destination name'
                style={{ flex:1, padding:'6px 10px', borderRadius:8, border:'1px solid var(--mui-palette-divider)', background:'transparent', color:'inherit', outline:'none', fontSize:14 }}
              />
              <Button size='small' type='submit' variant='contained' disabled={maxed} sx={{ textTransform:'none', borderRadius:2 }}>{maxed? 'Full' : 'Add'}</Button>
              <Button size='small' variant='text' onClick={()=>{ setAdding(false); setNewName(''); }}>Cancel</Button>
              {adding && predictions.length>0 && (
                <Paper elevation={6} sx={{ position:'absolute', top:'100%', left:0, right:0, mt:1, maxHeight:280, overflowY:'auto', borderRadius:2, zIndex:5 }}>
                  {predictions.map(p => (
                    <Box key={p.place_id} onClick={()=>selectPrediction(p)} sx={(theme)=>({ px:1.5, py:1, cursor:'pointer', borderBottom:`1px solid ${theme.palette.divider}`, '&:hover':{ background: theme.palette.action.hover }, fontSize:13, display:'flex', flexDirection:'column', gap:.25 })}>
                      <span style={{ fontWeight:600 }}>{p.structured_formatting?.main_text || p.description}</span>
                      <span style={{ opacity:.7 }}>{p.structured_formatting?.secondary_text}</span>
                    </Box>
                  ))}
                  {loadingPred && <Box sx={{ px:1.5, py:1, fontSize:12, opacity:.7 }}>Searching...</Box>}
                </Paper>
              )}
            </Box>
          </>
        ) : (
          <>
            <CalendarMonthIcon fontSize='small' color='action' />
            <Typography variant='body2' color='text.secondary' onClick={()=>{ if(!maxed) setAdding(true); }} sx={{ cursor: maxed? 'not-allowed':'text', flex:1, opacity: maxed? .6:1 }}>{maxed? 'Night limit reached' : 'Add new destination...'}</Typography>
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
      {/* Notes Dialog */}
      <Dialog open={Boolean(openNoteId)} onClose={cancelNotes} fullWidth maxWidth='sm'>
        <DialogTitle>Notes for Destination</DialogTitle>
        <DialogContent>
          <TextField value={noteDraft} onChange={e=> setNoteDraft(e.target.value)} autoFocus multiline minRows={6} fullWidth placeholder='Write notes...' />
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelNotes}>Cancel</Button>
          <Button variant='contained' onClick={saveNotes}>Save</Button>
        </DialogActions>
      </Dialog>
      {/* Docs Dialog */}
      <Dialog open={Boolean(openDocsId)} onClose={()=> setOpenDocsId(null)} fullWidth maxWidth='sm'>
        <DialogTitle>Documents</DialogTitle>
        <DialogContent>
          {openDocsId && docs[openDocsId] && docs[openDocsId].length>0 ? (
            <Box sx={{ display:'flex', flexWrap:'wrap', gap:2 }}>
              {docs[openDocsId].map(doc => {
                const isImage = /(png|jpe?g|gif|webp|bmp|svg)$/i.test(doc.name);
                return (
                  <Box key={doc.id} sx={{ width:'30%', minWidth:120 }}>
                    <Box onClick={()=>{ const a=document.createElement('a'); a.href=doc.url; a.download=doc.originalName; a.target='_blank'; a.rel='noopener'; a.click(); }} sx={{ cursor:'pointer', border:'1px solid', borderColor:'divider', borderRadius:1, overflow:'hidden', p:0.5, display:'flex', flexDirection:'column', alignItems:'center', gap:0.5 }}>
                      {isImage ? (
                        <Box component='img' src={doc.url} alt={doc.name} sx={{ width:'100%', height:70, objectFit:'cover', borderRadius:0.5 }} />
                      ) : (
                        <Box sx={{ width:'100%', height:70, display:'flex', alignItems:'center', justifyContent:'center', bgcolor:'action.hover', fontSize:12 }}>
                          {doc.originalName.split('.').pop()?.toUpperCase() || 'FILE'}
                        </Box>
                      )}
                      <Typography variant='caption' sx={{ textAlign:'center', wordBreak:'break-all' }}>{doc.originalName}</Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Typography variant='body2' sx={{ opacity:.7 }}>No documents uploaded yet.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          {openDocsId && (
            <Button onClick={()=> handleUploadClick(openDocsId)} startIcon={<UploadFileIcon fontSize='small' />}>Add More</Button>
          )}
          <Button onClick={()=> setOpenDocsId(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Discover Dialog (Redesigned) */}
      <Dialog
        open={Boolean(discoverOpenId)}
        onClose={closeDiscover}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 'min(1200px, 92vw)',
            height: 'min(760px, 82vh)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 4,
          }
        }}
      >
        {(() => {
          if (!discoverOpenId) return null;
          const pd = plannerDestinations.find((p:any)=> p.id===discoverOpenId);
          return (
            <>
              <DialogTitle sx={{ pb:0 }}>
                <Box sx={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
                  <Box>
                    <Typography variant='h6' sx={{ fontWeight:700 }}>{pd?.name || 'Destination'}</Typography>
                    <Typography variant='caption' sx={{ opacity:.7 }}>Curate your {discoverTab==='spots' ? 'must-see spots' : 'must-try foods'} like a pro.</Typography>
                  </Box>
                  {(() => {
                    const spotsCount = pd?.spots?.length || 0;
                    const foodsCount = pd?.foods?.length || 0;
                    const mkLabel = (text:string, count:number, colorVariant:'primary'|'secondary') => (
                      <Box sx={{ display:'flex', alignItems:'center', gap:.75 }}>
                        <span>{text.toUpperCase()}</span>
                        {count>0 && (
                          <Box sx={(theme)=>({ minWidth:18, height:18, px:0.75, borderRadius:9, background: theme.palette[colorVariant].main, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, lineHeight:1, boxShadow:'0 0 0 2px '+theme.palette.background.paper })}>{count}</Box>
                        )}
                      </Box>
                    );
                    return (
                      <Tabs value={discoverTab} onChange={(_,v)=> setDiscoverTab(v)} sx={{ ml:'auto' }} textColor='primary' indicatorColor='primary'>
                        <Tab value='spots' label={mkLabel('Spots', spotsCount, 'primary')} sx={{ fontWeight:600, py:1 }} />
                        <Tab value='foods' label={mkLabel('Foods', foodsCount, 'secondary')} sx={{ fontWeight:600, py:1 }} />
                      </Tabs>
                    );
                  })()}
                </Box>
              </DialogTitle>
              <DialogContent dividers sx={{ pt:3, bgcolor:(theme)=> theme.palette.mode==='dark'? '#121212' : '#fafafa', flex:1, overflow:'auto' }}>
                <Box sx={{ display:'flex', gap:3, alignItems:'flex-start' }}>
                  {/* Left: List / Checklist */}
                  <Box sx={{ flex:2, display:'flex', flexDirection:'column', gap:1 }} onDragOver={(e)=> e.preventDefault()}>
                    <Typography variant='subtitle2' sx={{ fontWeight:700, letterSpacing:.5, textTransform:'uppercase', fontSize:12 }}>
                      {discoverTab==='spots' ? 'Spot List' : 'Food List'}
                    </Typography>
                    <Box sx={{ display:'flex', flexDirection:'column', gap:1, maxHeight:420, overflowY:'auto', pr:1 }}>
                      {discoverTab==='spots' && plannerDestinations.find((pd:any)=> pd.id===discoverOpenId)?.spots?.map((s:any) => (
                        <Box key={s.id} draggable onDragStart={(e)=> { e.dataTransfer.setData('text/plain', s.id); }} onDrop={(e)=> { e.preventDefault(); const fromId = e.dataTransfer.getData('text/plain'); const arr = plannerDestinations.find((pd:any)=> pd.id===discoverOpenId)?.spots || []; const fromIndex = arr.findIndex((x:any)=> x.id===fromId); const toIndex = arr.findIndex((x:any)=> x.id===s.id); if (fromIndex>-1 && toIndex>-1 && fromIndex!==toIndex) dispatch(reorderSpots({ destinationId: discoverOpenId, fromIndex, toIndex })); }} sx={(theme)=>({ position:'relative', display:'flex', alignItems:'center', gap:1, fontSize:13, p:1, pl:1.25, border:'1px solid', borderColor:'divider', borderRadius:1.5, background: theme.palette.background.paper, boxShadow: theme.palette.mode==='dark'? '0 0 0 1px rgba(255,255,255,0.04)' : '0 1px 2px rgba(0,0,0,0.06)', transition:'background .2s, border-color .2s', '&:hover':{ background: theme.palette.action.hover } })}>
                          <DragIndicatorIcon fontSize='small' sx={{ cursor:'grab', opacity:.5 }} />
                          <input type='checkbox' checked={s.checked} onChange={()=> dispatch(toggleSpot({ destinationId: discoverOpenId, spotId: s.id }))} />
                          <Typography variant='body2' sx={{ flex:1, fontWeight:500 }}>{s.name}</Typography>
                          {s.mapUrl && (<IconButton size='small' component='a' href={s.mapUrl} target='_blank' rel='noopener' sx={{ mr:0.5 }}><MapIcon fontSize='inherit' /></IconButton>)}
                          <IconButton size='small' onClick={()=> dispatch(removeSpot({ destinationId: discoverOpenId, spotId: s.id }))}>
                            <DeleteOutlineIcon fontSize='inherit' />
                          </IconButton>
                        </Box>
                      ))}
                      {discoverTab==='spots' && (plannerDestinations.find((pd:any)=> pd.id===discoverOpenId)?.spots?.length===0) && (
                        <Typography variant='caption' sx={{ opacity:.6, fontStyle:'italic', mt:1 }}>No spots yet. Use recommendations or search to add.</Typography>
                      )}
                      {discoverTab==='foods' && plannerDestinations.find((pd:any)=> pd.id===discoverOpenId)?.foods?.map((f:any) => (
                        <Box key={f.id} draggable onDragStart={(e)=> { e.dataTransfer.setData('text/plain', f.id); }} onDrop={(e)=> { e.preventDefault(); const fromId = e.dataTransfer.getData('text/plain'); const arr = plannerDestinations.find((pd:any)=> pd.id===discoverOpenId)?.foods || []; const fromIndex = arr.findIndex((x:any)=> x.id===fromId); const toIndex = arr.findIndex((x:any)=> x.id===f.id); if (fromIndex>-1 && toIndex>-1 && fromIndex!==toIndex) dispatch(reorderFoods({ destinationId: discoverOpenId, fromIndex, toIndex })); }} sx={(theme)=>({ position:'relative', display:'flex', alignItems:'center', gap:1, fontSize:13, p:1, pl:1.25, border:'1px solid', borderColor:'divider', borderRadius:1.5, background: theme.palette.background.paper, boxShadow: theme.palette.mode==='dark'? '0 0 0 1px rgba(255,255,255,0.04)' : '0 1px 2px rgba(0,0,0,0.06)', transition:'background .2s, border-color .2s', '&:hover':{ background: theme.palette.action.hover } })}>
                          <DragIndicatorIcon fontSize='small' sx={{ cursor:'grab', opacity:.5 }} />
                          <input type='checkbox' checked={f.checked} onChange={()=> dispatch(toggleFoodItem({ destinationId: discoverOpenId, foodId: f.id }))} />
                          <Typography variant='body2' sx={{ flex:1, fontWeight:500 }}>{f.name}</Typography>
                          <IconButton size='small' onClick={()=> dispatch(removeFoodItem({ destinationId: discoverOpenId, foodId: f.id }))}>
                            <DeleteOutlineIcon fontSize='inherit' />
                          </IconButton>
                        </Box>
                      ))}
                      {discoverTab==='foods' && (plannerDestinations.find((pd:any)=> pd.id===discoverOpenId)?.foods?.length===0) && (
                        <Typography variant='caption' sx={{ opacity:.6, fontStyle:'italic', mt:1 }}>No foods yet. Use recommendations to add.</Typography>
                      )}
                    </Box>
                  </Box>
                  {/* Right: Recommendation & Search Module */}
                  <Paper variant='outlined' sx={{ flex:1.2, p:2.25, borderRadius:3, background:(theme)=> theme.palette.mode==='dark'? 'linear-gradient(145deg,#1e1e1e,#161616)' : 'linear-gradient(145deg,#ffffff,#f2f5f9)' }}>
                    <Typography variant='subtitle2' sx={{ fontWeight:700, mb:1 }}>{discoverTab==='spots' ? `Recommendations in ${pd?.name}` : `Local Foods in ${pd?.name}`}</Typography>
                    <Box sx={{ display:'flex', flexWrap:'wrap', gap:1, mb: discoverTab==='spots'? 2:2 }}>
                      {(discoverTab==='spots'? recommendedSpots: recommendedFoods).map(r => (
                        <Chip key={r} label={r} size='small' color={discoverTab==='spots'?'primary':'secondary'} variant='outlined' onClick={()=> discoverTab==='spots' ? dispatch(addSpot({ destinationId: discoverOpenId, name: r, known:true, mapUrl:`https://maps.google.com/?q=${encodeURIComponent(r+' '+(pd?.name||''))}` })) : dispatch(addFoodItem({ destinationId: discoverOpenId, name: r }))} sx={{ cursor:'pointer' }} />
                      ))}
                    </Box>
                    {discoverTab==='spots' && (
                      <Box sx={{ mb:2 }}>
                        <Typography variant='caption' sx={{ fontWeight:600, letterSpacing:.5, textTransform:'uppercase', display:'block', mb:.75 }}>Google Search</Typography>
                        <Box sx={{ position:'relative' }}>
                          <TextField value={spotSearch} onChange={e=> setSpotSearch(e.target.value)} placeholder='Search attractions, landmarks...' size='small' fullWidth InputProps={{ startAdornment: <SearchIcon fontSize='small' sx={{ mr:1, opacity:.6 }} /> }} />
                          {spotSearchLoading && <LinearProgress sx={{ position:'absolute', left:0, right:0, bottom:-2, height:2 }} />}
                        </Box>
                        <Box sx={{ mt:1, maxHeight:170, overflowY:'auto', pr:0.5 }}>
                          {!spotSearchLoading && spotPredictions.map(p => (
                            <Box key={p.place_id} onClick={()=> { dispatch(addSpot({ destinationId: discoverOpenId, name: p.description, known:true, mapUrl:`https://maps.google.com/?q=${encodeURIComponent(p.description)}` })); setSpotSearch(''); setSpotPredictions([]); }} sx={(theme)=>({ p:0.6, px:1, border:'1px solid', borderColor:'divider', borderRadius:1, mb:0.5, cursor:'pointer', fontSize:12.5, display:'flex', alignItems:'center', gap:.5, background: theme.palette.background.paper, '&:hover':{ background: theme.palette.action.hover } })}>
                              <SearchIcon sx={{ fontSize:14, opacity:.5 }} /> {p.description}
                            </Box>
                          ))}
                          {(!spotSearchLoading && spotSearch && spotPredictions.length===0) && (
                            <Typography variant='caption' sx={{ opacity:.6 }}>No results.</Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                    {discoverTab==='foods' && (
                      <Box sx={{ mb:2 }}>
                        <Typography variant='caption' sx={{ fontWeight:600, letterSpacing:.5, textTransform:'uppercase', display:'block', mb:.75 }}>Add Custom Food</Typography>
                        <Box component='form' onSubmit={(e)=> { e.preventDefault(); const name = foodInput.trim(); if(!name) return; const pd = plannerDestinations.find((p:any)=> p.id===discoverOpenId); const exists = pd?.foods?.some((f:any)=> f.name.toLowerCase() === name.toLowerCase()); if(exists) { return; } dispatch(addFoodItem({ destinationId: discoverOpenId!, name })); setFoodInput(''); }} sx={{ display:'flex', gap:1 }}>
                          <TextField value={foodInput} onChange={e=> setFoodInput(e.target.value)} placeholder='e.g. Ramen, Gelato, Tapas...' size='small' fullWidth />
                          <Button variant='contained' size='small' disabled={!foodInput.trim()} type='submit' sx={{ textTransform:'none' }}>Add</Button>
                        </Box>
                        <Typography variant='caption' sx={{ display:'block', mt:.75, opacity:.6 }}>Press Enter or Add. Duplicates (case-insensitive) are ignored.</Typography>
                      </Box>
                    )}
                    {discoverTab==='spots' && (
                      <Typography variant='caption' sx={{ display:'flex', alignItems:'center', gap:0.5, mt:1.5, opacity:.75 }}>
                        Powered by <Box component='img' alt='Google' src={import.meta.env.VITE_GOOGLE_LOGO || 'https://developers.google.com/static/maps/documentation/images/google_on_white.png'} sx={{ height:14 }} loading='lazy' />
                      </Typography>
                    )}
                  </Paper>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={closeDiscover}>Close</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
};

export default DestinationsPanel;
