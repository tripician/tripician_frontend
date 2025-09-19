// Clean rebuilt CreateTrip component after corruption removal.
import React from 'react';
import { Box, Tabs, Tab, Typography, Divider, Button, Chip, Menu, MenuItem, Avatar, Tooltip, IconButton, CircularProgress, InputBase } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setCurrency as setCurrencyAction, updateDestinationNights, setTransport, addDestination, removeDestination, reorderChain } from '../../store/plannerSlice';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CreateTripNav from './CreateTripNav';
import TripSettingsDialog from './TripSettingsDialog';
import DestinationsPanel, { type DestinationRow } from './DestinationsPanel';
import ExpensesPanel from './ExpensesPanel';
import ImportantNotesEditor from './ImportantNotesEditor';
import TripComments from './TripComments';
import ChatAssistant from '../../components/CommonComponents/ChatAssistant';
import MapPanel from './MapPanel';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';

const CreateTrip: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const planner = useSelector((s: RootState) => s.planner);
  const currency = planner.currency;
  const targetNights = planner.targetNights;
  const totalNights = planner.destinations.reduce((a,c)=>a+c.nights,0);

  const [tab, setTab] = React.useState(0);
  const [isDraft, setIsDraft] = React.useState(true);
  const [title, setTitle] = React.useState('Untitled Trip');
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [currencyAnchor, setCurrencyAnchor] = React.useState<null | HTMLElement>(null);
  const [privacyAnchor, setPrivacyAnchor] = React.useState<null | HTMLElement>(null);
  const [privacy, setPrivacy] = React.useState<'Private'|'Trip Members'|'My Followers'|'Everyone'>('Private');
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [optimizingRoute, setOptimizingRoute] = React.useState(false);
  const [mapCollapsed, setMapCollapsed] = React.useState(false);
  const [mapWidth, setMapWidth] = React.useState(0.40);
  const containerRef = React.useRef<HTMLDivElement|null>(null);
  const resizingRef = React.useRef(false);

  const geocodedCount = React.useMemo(()=> planner.destinations.filter(d=> d.lat!=null && d.lng!=null).length, [planner.destinations]);

  const dateFormatter = React.useCallback((iso: string) => {
    try { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString(undefined, { weekday:'short', day:'2-digit', month:'short' }); } catch { return iso; }
  }, []);

  const panelDestinations: DestinationRow[] = React.useMemo(()=> planner.destinations.map(d=> ({
    id:d.id, name:d.name, start:dateFormatter(d.startDate), end:dateFormatter(d.endDate), nights:d.nights, transport:d.transport||'', todo:''
  })), [planner.destinations, dateFormatter]);

  const openCurrency = (e: React.MouseEvent<HTMLButtonElement>) => setCurrencyAnchor(e.currentTarget);
  const closeCurrency = () => setCurrencyAnchor(null);
  const selectCurrency = (c: 'EUR'|'USD'|'GBP') => { dispatch(setCurrencyAction(c)); closeCurrency(); };
  const openPrivacy = (e: React.MouseEvent<HTMLButtonElement>) => setPrivacyAnchor(e.currentTarget);
  const closePrivacy = () => setPrivacyAnchor(null);
  const selectPrivacy = (p:'Private'|'Trip Members'|'My Followers'|'Everyone') => { setPrivacy(p); closePrivacy(); };
  const handleTabChange = (_:any,v:number)=> setTab(v);
  const handleChangeNights = (id:string, delta:number)=> dispatch(updateDestinationNights({ id, delta }));
  const handleChangeTransport = (id:string, mode:string)=> dispatch(setTransport({ id, transport: mode }));
  const handleAddDestination = (name:string, coords?:{lat:number; lng:number})=> dispatch(addDestination({ name, lat:coords?.lat, lng:coords?.lng }));
  const handleRemoveDestination = (id:string)=> dispatch(removeDestination(id));

  const startResize = (e:React.MouseEvent)=> { if(mapCollapsed) return; resizingRef.current=true; document.body.style.cursor='col-resize'; e.preventDefault(); };
  React.useEffect(()=>{ const move=(e:MouseEvent)=>{ if(!resizingRef.current||!containerRef.current) return; const rect=containerRef.current.getBoundingClientRect(); const left=e.clientX-rect.left; const ratioLeft=Math.min(0.80,Math.max(0.20,left/rect.width)); setMapWidth(1-ratioLeft); }; const up=()=>{ if(resizingRef.current){ resizingRef.current=false; document.body.style.cursor=''; } }; window.addEventListener('mousemove',move); window.addEventListener('mouseup',up); return ()=>{ window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); }; }, [mapCollapsed]);

  const computeShortestRoute = () => {
    const list = planner.destinations.filter(d=> d.lat!=null && d.lng!=null);
    if(list.length<3) return;
    const start = list[0]; const others=list.slice(1); const dist=(a:any,b:any)=>{ const dx=a.lat-b.lat; const dy=a.lng-b.lng; return Math.sqrt(dx*dx+dy*dy); }; const remaining=[...others]; const path:any[]=[start]; let curr=start; while(remaining.length){ let bi=0,bd=Infinity; for(let i=0;i<remaining.length;i++){ const dd=dist(curr,remaining[i]); if(dd<bd){bd=dd;bi=i;} } curr=remaining.splice(bi,1)[0]; path.push(curr);} const twoOptSwap=(arr:any[],i:number,k:number)=>arr.slice(0,i).concat(arr.slice(i,k+1).reverse()).concat(arr.slice(k+1)); const routeDistance=(arr:any[])=>arr.reduce((acc:number,_,i)=> i===0?0:acc+dist(arr[i-1],arr[i]),0); let improved=true,best=path,bestLen=routeDistance(best),iter=0; while(improved&&iter<30){ improved=false; iter++; for(let i=1;i<best.length-2;i++){ for(let k=i+1;k<best.length-1;k++){ const swapped=twoOptSwap(best,i,k); const len=routeDistance(swapped); if(len<bestLen-1e-6){ best=swapped; bestLen=len; improved=true; } } } } const ids=best.map(d=>d.id); dispatch(reorderChain({ ids })); window.dispatchEvent(new CustomEvent('tripician:route-updated',{ detail:{ ids }})); };
  const handleOptimizeRouteClick=()=>{ if(optimizingRoute||geocodedCount<3) return; setOptimizingRoute(true); requestAnimationFrame(()=>{ try{ computeShortestRoute(); } finally { setTimeout(()=> setOptimizingRoute(false),60); } }); };

  // Publish: gather full trip data snapshot & log JSON
  const handlePublish = () => {
    type OutputSpot = { id:string; name:string; placeId?:string; photoUrl?:string; description?:string; checked:boolean };
    type OutputFood = { id:string; name:string; checked:boolean };
    const tripData = {
      meta: {
        title,
        status: isDraft ? 'Draft' : 'Published',
        privacy,
        currency,
        generatedAt: new Date().toISOString(),
        totalNights,
        targetNights,
        geocodedDestinations: geocodedCount
      },
      destinations: planner.destinations.map(d => ({
        id: d.id,
        name: d.name,
        startDate: d.startDate,
        endDate: d.endDate,
        nights: d.nights,
        lat: d.lat,
        lng: d.lng,
        transport: d.transport,
        spots: (d.spots||[]).map<OutputSpot>(s => ({ id:s.id, name:s.name, placeId:s.placeId, photoUrl:s.photoUrl, description:s.description, checked:s.checked })),
        foods: (d.foods||[]).map<OutputFood>(f => ({ id:f.id, name:f.name, checked:f.checked }))
      })),
      extras: {
        routeOrder: planner.destinations.map(d=> d.id)
      }
    };
    if(isDraft) setIsDraft(false);
    // eslint-disable-next-line no-console
    console.log('TRIPICIAN_PUBLISH_JSON =>', tripData, '\nJSON STRING =>', JSON.stringify(tripData, null, 2));
  };

  return (
    <Box sx={{ display:'flex', flexDirection:'row', height:'100vh', overflow:'hidden' }}>
      <CreateTripNav onSettingsClick={()=> setSettingsOpen(true)} />
      <Box sx={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:0 }}>
        <TopBar showSearch={false} centerNode={
          <Box sx={{ display:'flex', alignItems:'center' }}>
            {editingTitle ? (
              <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                <InputBase value={title} onChange={e=> setTitle(e.target.value)} autoFocus onBlur={()=> setEditingTitle(false)} sx={{ px:1.2, py:.5, borderRadius:1.5, fontWeight:600, fontSize:18, border:(t)=>`1px solid ${t.palette.divider}`, background:(t)=> t.palette.mode==='dark'? '#1e2936':'#f5f7f9', minWidth:180 }} />
                <IconButton size='small' onClick={()=> setEditingTitle(false)}><CheckIcon fontSize='small' /></IconButton>
              </Box>
            ) : (
              <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                <Typography variant='h6' fontWeight={600} noWrap sx={{ cursor:isDraft?'text':'default' }} onClick={()=> { if(isDraft) setEditingTitle(true); }}>{title}</Typography>
                {isDraft && <IconButton size='small' onClick={()=> setEditingTitle(true)} sx={{ ml:-.5 }}><EditIcon fontSize='small' /></IconButton>}
              </Box>
            )}
            <Chip size='small' label={isDraft? 'Draft':'Published'} color={isDraft? 'default':'success'} sx={{ fontSize:11, fontWeight:500, ml:1 }} />
          </Box>
        } />
        <Box ref={containerRef} sx={{ flex:1, display:'flex', position:'relative', minHeight:0 }}>
          <Box sx={(theme)=>({ flexBasis: mapCollapsed?'100%':`calc(${(1-mapWidth)*100}% - 2px)`, maxWidth: mapCollapsed?'100%':`calc(${(1-mapWidth)*100}% - 2px)`, minWidth:0, flexShrink:0, display:'flex', flexDirection:'column', backgroundColor: theme.palette.background.paper, borderRight: mapCollapsed? 'none': { lg:`1px solid ${theme.palette.divider}`}, transition: resizingRef.current?'none':'flex-basis .18s ease' })}>
            <Box sx={{ px:2, py:1.25, display:'flex', alignItems:'stretch', gap:2, borderBottom:(t)=>`1px solid ${t.palette.divider}` }}>
              <Box sx={{ flex:1, minWidth:0, display:'flex', alignItems:'center' }}>
                <ImportantNotesEditor compact />
              </Box>
              <Box sx={{ ml:'auto', display:'flex', alignItems:'center', gap:3 }}>
                <Box sx={{ display:'flex', flexDirection:'column' }}>
                  <Typography variant='caption' color='text.secondary'>Budget ({currency})</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', gap:.5 }}>
                    <Typography variant='body2' fontWeight={600}>0.00</Typography>
                    <Button size='small' variant='text' onClick={openCurrency} endIcon={<ExpandMoreIcon fontSize='small' />} sx={{ textTransform:'none', px:1, minWidth:0 }}>{currency}</Button>
                  </Box>
                </Box>
                <Box sx={{ display:'flex', flexDirection:'column' }}>
                  <Typography variant='caption' color='text.secondary'>Privacy</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', gap:.5 }}>
                    <Typography variant='body2' fontWeight={600}>{privacy}</Typography>
                    <Button size='small' variant='text' onClick={openPrivacy} endIcon={<ExpandMoreIcon fontSize='small' />} sx={{ textTransform:'none', px:1, minWidth:0 }} />
                  </Box>
                </Box>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ display:'flex', alignItems:'center', px:2, gap:1, py:1 }}>
              <Tabs value={tab} onChange={handleTabChange} variant='scrollable' allowScrollButtonsMobile sx={{ flex:1, minHeight:44, '& .MuiTab-root':{ minHeight:44 } }}>
                <Tab label='Planning' />
                <Tab label='Expenses' />
                <Tab label='Comments' />
              </Tabs>
              <Box sx={{ display:'flex', alignItems:'center', gap:.75, mr:1 }}>
                <Box sx={{ position:'relative', width:42, height:42 }}>
                  <CircularProgress variant='determinate' value={targetNights? Math.min(100,(totalNights/targetNights)*100):0} size={42} thickness={4} />
                  <Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Typography variant='caption' fontWeight={600}>{totalNights}/{targetNights}</Typography>
                  </Box>
                </Box>
                <Typography variant='caption' fontWeight={600}>Nights</Typography>
              </Box>
              <Tooltip title={mapCollapsed? 'Show map':'Hide map'}>
                <IconButton size='small' onClick={()=> setMapCollapsed(c=> !c)} sx={{ bgcolor:'background.paper', border:(t)=>`1px solid ${t.palette.divider}`, '&:hover':{ bgcolor:'action.hover' }, mr:.25 }}>
                  {mapCollapsed ? <OpenInFullIcon fontSize='small' /> : <CloseFullscreenIcon fontSize='small' />}
                </IconButton>
              </Tooltip>
              <Tooltip arrow placement='top' title={geocodedCount < 3 ? 'Add at least 3 destinations with coordinates to optimize' : optimizingRoute ? 'Optimizing route...' : 'Optimize route'}>
                <span>
                  <IconButton aria-label='Optimize route' onClick={handleOptimizeRouteClick} disabled={geocodedCount < 3 || optimizingRoute} sx={{ ml:.5, bgcolor:'primary.main', color:'primary.contrastText', borderRadius:2, '&:hover':{ bgcolor:'primary.dark' }, '&.Mui-disabled':{ bgcolor:'action.disabledBackground', color:'text.disabled' } }}>
                    {optimizingRoute ? <CircularProgress size={18} color='inherit' thickness={5} /> : <AltRouteIcon fontSize='small' />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
            <Divider />
            <Box sx={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
              {tab===0 && <Box sx={{ px:0 }}><DestinationsPanel destinations={panelDestinations} maxed={totalNights >= targetNights} onChangeNights={handleChangeNights} onChangeTransport={handleChangeTransport} onAddDestination={handleAddDestination} onRemoveDestination={handleRemoveDestination} /></Box>}
              {tab===1 && <ExpensesPanel />}
              {tab===2 && <TripComments />}
            </Box>
            <Box sx={(t)=>({ borderTop:`1px solid ${t.palette.divider}`, px:2.5, py:1.5, background:t.palette.background.paper, display:'flex', alignItems:'center', justifyContent:'space-between' })}>
              <Typography variant='caption' color='text.secondary'>Last saved: just now</Typography>
              <Box sx={{ display:'flex', gap:1.2 }}>
                <Button size='small' variant='outlined' onClick={()=> setIsDraft(true)} disabled={isDraft} sx={{ textTransform:'none', borderRadius:2 }}>Save as Draft</Button>
                <Button size='small' variant='contained' color={isDraft? 'primary':'success'} onClick={handlePublish} sx={{ textTransform:'none', borderRadius:2 }}>{isDraft? 'Publish':'Published'}</Button>
              </Box>
            </Box>
          </Box>
          {!mapCollapsed && (<><Box onMouseDown={startResize} sx={{ width:4, cursor:'col-resize', background:(t)=> t.palette.mode==='dark'? t.palette.grey[800]: t.palette.grey[200], '&:hover':{ background:(t)=> t.palette.primary.main } }} /><MapPanel widthFraction={mapWidth} /></>)}
          <ChatAssistant />
        </Box>
        <Menu anchorEl={currencyAnchor} open={Boolean(currencyAnchor)} onClose={closeCurrency} elevation={3}>
          {(['EUR','USD','GBP'] as const).map(c=> (<MenuItem key={c} selected={c===currency} onClick={()=> selectCurrency(c)}><Avatar sx={{ width:20, height:20, mr:1, fontSize:11 }}>{c==='EUR'?'€': c==='USD'? '$':'£'}</Avatar>{c}</MenuItem>))}
        </Menu>
        <Menu anchorEl={privacyAnchor} open={Boolean(privacyAnchor)} onClose={closePrivacy} elevation={3}>
          {(['Private','Trip Members','My Followers','Everyone'] as const).map(p=> (<MenuItem key={p} selected={p===privacy} onClick={()=> selectPrivacy(p)}>{p}</MenuItem>))}
        </Menu>
      </Box>
      <TripSettingsDialog
        open={settingsOpen}
        onClose={()=> setSettingsOpen(false)}
        title={title}
        startDate={planner.destinations[0]?.startDate || new Date().toISOString().slice(0,10)}
        endDate={planner.destinations[planner.destinations.length-1]?.endDate || new Date().toISOString().slice(0,10)}
        privacy={privacy}
        members={[{ id:'me', name: "Rover's Compass", handle:'@username', avatar: undefined, role:'Owner' }]}
        onChangeTitle={(t)=> setTitle(t)}
  onChangeStartDate={()=> {/* future: update chain */}}
  onChangeEndDate={()=> {/* future: update chain */}}
        onChangePrivacy={(p)=> setPrivacy(p as any)}
        onDeleteTrip={()=> { /* placeholder delete */ setSettingsOpen(false); }}
        onInviteEmail={async(email)=> { console.log('Invite email placeholder', email); }}
      />
    </Box>
  );
};

export default CreateTrip;
