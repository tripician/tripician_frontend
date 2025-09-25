// Clean rebuilt CreateTrip component after corruption removal.
import React from 'react';
import { Box, Tabs, Tab, Typography, Divider, Button, Chip, Menu, MenuItem, Avatar, Tooltip, IconButton, InputBase, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Paper } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setCurrency as setCurrencyAction, updateDestinationNights, setTransport, addDestination, removeDestination, reorderChain, addVisaDoc, removeVisaDoc, removeGlobalDoc, pinDoc, unpinDoc } from '../../store/plannerSlice';
import { togglePin as togglePinDocSlice, removeDocument as removeDocsSliceDocument } from '../../store/docsSlice';
import { validateFiles, DEFAULT_DOC_RULE } from '../../utils/fileValidation';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CreateTripNav from './CreateTripNav';
import NewsPanel from './NewsPanel';
import TripSettingsDialog from './TripSettingsDialog';
import DestinationsPanel, { type DestinationRow } from './DestinationsPanel';
import DestinationCardsPanel from './DestinationCardsPanel';
import ExpensesPanel from './ExpensesPanel';
import ImportantNotesEditor from './ImportantNotesEditor';
import TripComments from './TripComments';
import PackingPanel from './PackingPanel';
import ChatAssistant from '../../components/CommonComponents/ChatAssistant';
import MapPanel from './MapPanel';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
// Docs explorer (previously standalone) now embedded when section === 'docs'
import Docs from '../DocsPage/Docs';

const CreateTrip: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const planner = useSelector((s: RootState) => s.planner);
  const docsState = useSelector((s: RootState) => s.docs);
  const currency = planner.currency;
  const targetNights = planner.targetNights;
  const totalNights = planner.destinations.reduce((a,c)=>a+c.nights,0);

  const [tab, setTab] = React.useState(0); // Only used for Planning / Expenses / Comments within Plan section
  const [section, setSection] = React.useState<'plan'|'news'|'packing'|'docs'>('plan');
  const setSectionDebug = (next: 'plan'|'news'|'packing'|'docs') => {
    // eslint-disable-next-line no-console
    console.log('[CreateTrip] section change:', section, '=>', next);
    setSection(next);
  };
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
  const visaInputRef = React.useRef<HTMLInputElement|null>(null);
  const [visaErrors, setVisaErrors] = React.useState<string[]>([]);

  const [visaOpen, setVisaOpen] = React.useState(false);
  const [pinnedOpen, setPinnedOpen] = React.useState(false);

  // Environment-specific icons (dev vs prod) with graceful fallback
  const passportIconUrl = React.useMemo(() => {
    return import.meta.env.MODE === 'production'
      ? (import.meta.env.VITE_PASSPORT_ICON_URL_PROD || import.meta.env.VITE_PASSPORT_ICON_URL)
      : (import.meta.env.VITE_PASSPORT_ICON_URL_DEV || import.meta.env.VITE_PASSPORT_ICON_URL);
  }, []);
  const pinnedIconUrl = React.useMemo(() => {
    return import.meta.env.MODE === 'production'
      ? (import.meta.env.VITE_PINNEDDOCS_ICON_URL_PROD || import.meta.env.VITE_PINNEDDOCS_ICON_URL)
      : (import.meta.env.VITE_PINNEDDOCS_ICON_URL_DEV || import.meta.env.VITE_PINNEDDOCS_ICON_URL);
  }, []);
  // Build unified pinned docs list (planner + external docs slice)
  const combinedPinnedDocs = React.useMemo(() => {
    const plannerPinned = ['visaDocs','globalDocs','destinations'].flatMap(src => {
      if(src==='destinations') return planner.destinations.flatMap(d=> (d.docs||[]));
      return (planner as any)[src] || [];
    }).filter((doc:any)=> planner.pinnedDocIds?.includes(doc.id)).map((doc:any)=> ({
      unifiedId: 'planner:'+doc.id,
      source: 'planner' as const,
      id: doc.id,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      url: doc.url
    }));
    const externalPinned = docsState.docs.filter(d=> d.pinned).map(d=> ({
      unifiedId: 'external:'+d.id,
      source: 'external' as const,
      id: d.id,
      originalName: d.name,
      mimeType: d.type,
      url: d.content
    }));
    const combined = [...plannerPinned, ...externalPinned];
    // Dedupe by original id preference: if planner + external share id, keep planner version once
    const seen = new Set<string>();
    const deduped: typeof combined = [];
    for(const doc of combined){
      if(seen.has(doc.id)) continue;
      seen.add(doc.id);
      deduped.push(doc);
    }
    const finalList = deduped;
    // Debug log for visibility issue
    // eslint-disable-next-line no-console
    console.log('[CreateTrip] combinedPinnedDocs recalculated', { plannerPinnedCount: plannerPinned.length, externalPinnedCount: externalPinned.length, combinedCount: combined.length, dedupedCount: finalList.length, plannerPinnedIds: plannerPinned.map(p=>p.id), externalPinnedIds: externalPinned.map(p=>p.id) });
    return finalList;
  }, [planner.destinations, planner.globalDocs, planner.visaDocs, planner.pinnedDocIds, docsState.docs]);

  const geocodedCount = React.useMemo(()=> planner.destinations.filter(d=> d.lat!=null && d.lng!=null).length, [planner.destinations]);

  const dateFormatter = React.useCallback((iso: string) => {
    try { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString(undefined, { weekday:'short', day:'2-digit', month:'short' }); } catch { return iso; }
  }, []);

  const panelDestinations: DestinationRow[] = React.useMemo(()=> planner.destinations.map(d=> ({
    id:d.id, name:d.name, start:dateFormatter(d.startDate), end:dateFormatter(d.endDate), nights:d.nights, transport:d.transport||'', todo:''
  })), [planner.destinations, dateFormatter]);

  // Temporary flag to compare new card layout vs legacy table
  const ENABLE_CARD_LAYOUT = true; // card layout re-enabled

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
        category: d.category || 'general',
        completed: !!d.completed,
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

  // Removed previous sync effect to prevent double addition; now planner pins are created explicitly in Docs component.

  return (
    <Box sx={{ display:'flex', flexDirection:'row', height:'100vh', overflow:'hidden' }}>
  <CreateTripNav active={section} onChange={(id)=> setSectionDebug(id as any)} onSettingsClick={()=> setSettingsOpen(true)} />
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
          {section==='news' ? (
            <Box sx={{ flex:1, overflowY:'auto', overflowX:'hidden', display:'flex', flexDirection:'column' }}>
              <NewsPanel />
            </Box>
          ) : section==='docs' ? (
            <Box sx={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
              {/* Embedded Docs explorer */}
              <Docs />
            </Box>
          ) : section==='packing' ? (
            <Box sx={{ flex:1, overflowY:'auto', overflowX:'hidden', display:'flex', flexDirection:'column', p:3 }}>
              <PackingPanel />
            </Box>
          ) : (
          <Box sx={(theme)=>({ flexBasis: mapCollapsed?'100%':`calc(${(1-mapWidth)*100}% - 2px)`, maxWidth: mapCollapsed?'100%':`calc(${(1-mapWidth)*100}% - 2px)`, minWidth:0, flexShrink:0, display:'flex', flexDirection:'column', backgroundColor: theme.palette.background.paper, borderRight: mapCollapsed? 'none': { lg:`1px solid ${theme.palette.divider}`}, transition: resizingRef.current?'none':'flex-basis .18s ease' })}>
            <Box sx={{ px:2, py:1.25, display:'flex', alignItems:'stretch', gap:2, borderBottom:(t)=>`1px solid ${t.palette.divider}` }}>
              <Box sx={{ flex:1.4, minWidth:360, display:'flex', alignItems:'stretch' }}>
                <ImportantNotesEditor compact />
              </Box>
              <Box sx={{ ml:'auto', display:'flex', alignItems:'flex-start', gap:3, minWidth:300 }}>
                {/* Budget + Visa column */}
                <Box sx={{ display:'flex', flexDirection:'column', maxWidth:140 }}>
                  <Typography variant='caption' color='text.secondary'>Budget ({currency})</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', gap:.5 }}>
                    <Typography variant='body2' fontWeight={600}>
                      {(planner.tripBudget!=null ? planner.tripBudget : 0).toFixed(2)}
                    </Typography>
                    <Button size='small' variant='text' onClick={openCurrency} endIcon={<ExpandMoreIcon fontSize='small' />} sx={{ textTransform:'none', px:1, minWidth:0 }}>{currency}</Button>
                  </Box>
                  {/* Visa block directly under Budget */}
                  <Paper role='button' onClick={()=> setVisaOpen(true)} sx={(t)=>({ mt:1.25, cursor:'pointer', width:140, px:1.2, py:1, borderRadius:1, display:'flex', flexDirection:'row', gap:.75, alignItems:'center', border:`1px dashed ${t.palette.divider}`, background: t.palette.mode==='dark'? '#13202b':'#f5fbff', '&:hover':{ borderColor:t.palette.primary.main } })}>
                    <Box component='img' src={passportIconUrl} alt='Visa docs' loading='lazy' style={{ width:30, height:30, objectFit:'contain', filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
                    <Box sx={{ display:'flex', flexDirection:'column', minWidth:0 }}>
                      <Typography variant='caption' sx={{ fontWeight:700, letterSpacing:.4 }}>Visa(s)</Typography>
                      <Typography variant='caption' sx={{ opacity:.6, lineHeight:1 }}>{planner.visaDocs?.length||0} file(s)</Typography>
                    </Box>
                  </Paper>
                </Box>
                {/* Privacy + Pinned Docs column */}
                <Box sx={{ display:'flex', flexDirection:'column', maxWidth:140 }}>
                  <Typography variant='caption' color='text.secondary'>Privacy</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', gap:.5 }}>
                    <Typography variant='body2' fontWeight={600}>{privacy}</Typography>
                    <Button size='small' variant='text' onClick={openPrivacy} endIcon={<ExpandMoreIcon fontSize='small' />} sx={{ textTransform:'none', px:1, minWidth:0 }} />
                  </Box>
                  {/* Pinned Docs block directly under Privacy */}
                  <Paper role='button' onClick={()=> setPinnedOpen(true)} sx={(t)=>({ mt:1.8, cursor:'pointer', width:140, px:1.2, py:1, borderRadius:1, display:'flex', flexDirection:'row', gap:.75, alignItems:'center', border:`1px dashed ${t.palette.divider}`, background: t.palette.mode==='dark'? '#181c24':'#f7f7fa', '&:hover':{ borderColor:t.palette.primary.main } })}>
                    <Box component='img' src={pinnedIconUrl} alt='Pinned docs' loading='lazy' style={{ width:30, height:30, objectFit:'contain', filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
                    <Box sx={{ display:'flex', flexDirection:'column', minWidth:0 }}>
                      <Typography variant='caption' sx={{ fontWeight:700, letterSpacing:.4 }}>Pinned Doc(s)</Typography>
                      <Typography variant='caption' sx={{ opacity:.6, lineHeight:1 }}>{combinedPinnedDocs.length} pinned</Typography>
                    </Box>
                  </Paper>
                </Box>
              </Box>
            </Box>
            <Divider />
            {section==='plan' && (
            <Box sx={{ display:'flex', alignItems:'center', px:2, gap:1, py:1 }}>
              <Tabs value={tab} onChange={handleTabChange} variant='scrollable' allowScrollButtonsMobile sx={{ flex:1, minHeight:44, '& .MuiTab-root':{ minHeight:44 } }}>
                <Tab label='Planning' />
                <Tab label='Expenses' />
                <Tab label='Comments' />
              </Tabs>
              <Box sx={{ display:'flex', alignItems:'center', gap:.75, mr:1 }}>
                <Box sx={{ position:'relative', width:46, height:46 }}>
                  {/* Base gray track */}
                  <CircularProgress
                    variant='determinate'
                    value={100}
                    size={46}
                    thickness={4.2}
                    sx={(t)=>({ color: t.palette.mode==='dark'? t.palette.grey[800] : t.palette.grey[300] })}
                  />
                  {/* Progress arc */}
                  <CircularProgress
                    variant='determinate'
                    value={targetNights? Math.min(100,(totalNights/targetNights)*100):0}
                    size={46}
                    thickness={4.2}
                    sx={(t)=>({
                      position:'absolute',
                      left:0,
                      top:0,
                      color: t.palette.primary.main,
                      transition:'color .3s'
                    })}
                  />
                  {/* Center label */}
                  <Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Typography variant='caption' fontWeight={700} sx={{ fontSize:11 }}>{totalNights}/{targetNights}</Typography>
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
                  <IconButton aria-label='Optimize route' onClick={handleOptimizeRouteClick} disabled={geocodedCount < 3 || optimizingRoute} sx={{ ml:.5, bgcolor:'primary.main', color:'primary.contrastText', borderRadius:2, position:'relative', '&:hover':{ bgcolor:'primary.dark' }, '&.Mui-disabled':{ bgcolor:'action.disabledBackground', color:'text.disabled' } }}>
                    {optimizingRoute ? (
                      <Box sx={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', '@keyframes spin':{ to:{ transform:'rotate(360deg)' } } }} />
                    ) : (
                      <AltRouteIcon fontSize='small' />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
            )}
            <Divider />
            <Box sx={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
              {section==='plan' && tab===0 && (
                <Box sx={{ px:0 }}>
                  {ENABLE_CARD_LAYOUT ? (
                    <DestinationCardsPanel maxed={totalNights >= targetNights} />
                  ) : (
                    <DestinationsPanel
                      destinations={panelDestinations}
                      maxed={totalNights >= targetNights}
                      onChangeNights={handleChangeNights}
                      onChangeTransport={handleChangeTransport}
                      onAddDestination={handleAddDestination}
                      onRemoveDestination={handleRemoveDestination}
                    />
                  )}
                </Box>
              )}
              {section==='plan' && tab===1 && <ExpensesPanel />}
              {section==='plan' && tab===2 && <TripComments />}
            </Box>
            <Box sx={(t)=>({ borderTop:`1px solid ${t.palette.divider}`, px:2.5, py:1.5, background:t.palette.background.paper, display:'flex', alignItems:'center', justifyContent:'space-between' })}>
              <Typography variant='caption' color='text.secondary'>Last saved: just now</Typography>
              <Box sx={{ display:'flex', gap:1.2 }}>
                <Button size='small' variant='outlined' onClick={()=> setIsDraft(true)} disabled={isDraft} sx={{ textTransform:'none', borderRadius:2 }}>Save as Draft</Button>
                <Button size='small' variant='contained' color={isDraft? 'primary':'success'} onClick={handlePublish} sx={{ textTransform:'none', borderRadius:2 }}>{isDraft? 'Publish':'Published'}</Button>
              </Box>
            </Box>
          </Box>
          )}
          {section==='plan' && !mapCollapsed && (<><Box onMouseDown={startResize} sx={{ width:4, cursor:'col-resize', background:(t)=> t.palette.mode==='dark'? t.palette.grey[800]: t.palette.grey[200], '&:hover':{ background:(t)=> t.palette.primary.main } }} /><MapPanel widthFraction={mapWidth} /></>)}
          <ChatAssistant />
        </Box>
        <Menu anchorEl={currencyAnchor} open={Boolean(currencyAnchor)} onClose={closeCurrency} elevation={3}>
          {(['EUR','USD','GBP'] as const).map(c=> (<MenuItem key={c} selected={c===currency} onClick={()=> selectCurrency(c)}><Avatar sx={{ width:20, height:20, mr:1, fontSize:11 }}>{c==='EUR'?'€': c==='USD'? '$':'£'}</Avatar>{c}</MenuItem>))}
        </Menu>
        <Menu anchorEl={privacyAnchor} open={Boolean(privacyAnchor)} onClose={closePrivacy} elevation={3}>
          {(['Private','Trip Members','My Followers','Everyone'] as const).map(p=> (<MenuItem key={p} selected={p===privacy} onClick={()=> selectPrivacy(p)}>{p}</MenuItem>))}
        </Menu>
        {/* Visa Dialog */}
        <Dialog open={visaOpen} onClose={()=> setVisaOpen(false)} fullWidth maxWidth='sm'>
          <DialogTitle>Visa Documents</DialogTitle>
          <DialogContent dividers>
            <input ref={visaInputRef} type='file' multiple hidden onChange={(e)=> { const files = e.target.files; setVisaErrors([]); try { if(files){ const { accepted, rejected } = validateFiles(files, DEFAULT_DOC_RULE); if(rejected.length) setVisaErrors(rejected.flatMap(r=> r.errors)); accepted.forEach(f=> { try { const url = URL.createObjectURL(f); dispatch(addVisaDoc({ doc:{ id: 'visa_'+Date.now()+'_'+Math.random().toString(36).slice(2), originalName:f.name, mimeType:f.type, url } })); } catch(err){ console.error('[VisaUpload] object URL failed', err); } }); } } catch(err){ console.error('[VisaUpload] upload failed', err); setVisaErrors(prev=> [...prev, 'Unexpected error while processing files.']); } finally { if(e.target) e.target.value=''; } }} />
            <Button variant='outlined' size='small' onClick={()=> visaInputRef.current?.click()} sx={{ textTransform:'none', mb:2 }}>Upload File(s)</Button>
            {visaErrors.length>0 && (
              <Box sx={{ mb:2, border:'1px solid', borderColor:'error.light', background:(t)=> t.palette.mode==='dark'? '#2a1818':'#fff5f5', p:1, borderRadius:1.5 }}>
                <Typography variant='caption' sx={{ fontWeight:700, color:'error.main', display:'flex', gap:.5 }}>Upload issues:</Typography>
                {visaErrors.map((er,i)=>(<Typography key={i} variant='caption' sx={{ display:'block', color:'error.main' }}>• {er}</Typography>))}
              </Box>
            )}
            {planner.visaDocs && planner.visaDocs.length>0 ? (
              <Box sx={{ display:'flex', flexWrap:'wrap', gap:1.5 }}>
                {planner.visaDocs.map(doc => {
                  const isImage = /(png|jpe?g|gif|webp|bmp|svg)$/i.test(doc.originalName);
                  const pinned = planner.pinnedDocIds?.includes(doc.id);
                  return (
                    <Paper key={doc.id} sx={{ width:160, position:'relative', p:0.5, border:'1px solid', borderColor:'divider', borderRadius:1.5, display:'flex', flexDirection:'column', gap:.5 }}>
                      <Box sx={{ width:'100%', height:80, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'linear-gradient(135deg,#eef2f6,#e2e8f0)' }}>
                        {isImage ? <Box component='img' src={doc.url} alt={doc.originalName} sx={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <Typography variant='caption' sx={{ fontWeight:600 }}>{doc.originalName.split('.').pop()?.toUpperCase()}</Typography>}
                      </Box>
                      <Typography variant='caption' sx={{ lineHeight:1.2, wordBreak:'break-all' }}>{doc.originalName}</Typography>
                      <Box sx={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:.5 }}>
                        <Tooltip title={pinned? 'Unpin':'Pin'}>
                          <IconButton size='small' onClick={()=> { if(pinned){ dispatch(unpinDoc({ docId: doc.id })); } else { dispatch(pinDoc({ docId: doc.id })); } }} sx={{ color: pinned? 'primary.main':'text.secondary', transition:'color .2s', '&:hover':{ color: pinned? 'warning.main':'primary.main' } }}>
                            {pinned? <PushPinIcon fontSize='small' /> : <PushPinOutlinedIcon fontSize='small' />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Delete'>
                          <IconButton size='small' onClick={()=> dispatch(removeVisaDoc({ docId: doc.id }))} sx={{ color:'text.secondary', transition:'color .2s', '&:hover':{ color:'error.main' } }}>
                            <DeleteForeverIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            ) : (
              <Typography variant='body2' sx={{ opacity:.6 }}>No visa documents uploaded.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={()=> setVisaOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
        {/* Pinned Docs Dialog (upload removed per request) */}
        <Dialog open={pinnedOpen} onClose={()=> setPinnedOpen(false)} fullWidth maxWidth='md'>
          <DialogTitle>Pinned Documents</DialogTitle>
          <DialogContent dividers>
            <Typography variant='caption' sx={{ display:'block', mb:1, opacity:.7 }}>Pin documents from other sections (Docs, Visa, etc.).</Typography>
            <Box sx={{ display:'flex', flexWrap:'wrap', gap:1.5 }}>
              {combinedPinnedDocs.length===0 && (
                <Typography variant='body2' sx={{ opacity:.6 }}>No pinned documents yet.</Typography>
              )}
              {combinedPinnedDocs.map(doc => {
                const isImage = /(png|jpe?g|gif|webp|bmp|svg)$/i.test(doc.originalName);
                return (
                  <Paper key={doc.unifiedId} sx={{ width:150, position:'relative', p:0.5, border:'2px solid', borderColor:'primary.main', borderRadius:2, display:'flex', flexDirection:'column', gap:.5 }}>
                    <Box sx={{ width:'100%', height:90, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'linear-gradient(135deg,#eef2f6,#e2e8f0)' }}>
                      {isImage ? <Box component='img' src={doc.url} alt={doc.originalName} sx={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <Typography variant='caption' sx={{ fontWeight:600 }}>{doc.originalName.split('.').pop()?.toUpperCase()}</Typography>}
                    </Box>
                    <Typography variant='caption' sx={{ lineHeight:1.2, wordBreak:'break-all' }}>{doc.originalName}</Typography>
                    <Box sx={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:.25 }}>
                      <Tooltip title='Unpin'>
                        <IconButton size='small' onClick={()=> {
                          if(doc.source==='planner') {
                            dispatch(unpinDoc({ docId: doc.id }));
                          } else {
                            dispatch(togglePinDocSlice(doc.id));
                          }
                        }} sx={{ color:'text.secondary', transition:'color .2s', '&:hover':{ color:'warning.main' } }}>
                          <PushPinIcon fontSize='inherit' />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Delete'>
                        <IconButton size='small' onClick={()=> {
                          if(doc.source==='planner') {
                            const inGlobal = planner.globalDocs?.some(g=> g.id===doc.id);
                            const inVisa = planner.visaDocs?.some(v=> v.id===doc.id);
                            if(inGlobal) dispatch(removeGlobalDoc({ docId: doc.id }));
                            else if(inVisa) dispatch(removeVisaDoc({ docId: doc.id }));
                            else dispatch(unpinDoc({ docId: doc.id }));
                            dispatch(unpinDoc({ docId: doc.id }));
                          } else {
                            dispatch(togglePinDocSlice(doc.id));
                            dispatch(removeDocsSliceDocument(doc.id));
                          }
                        }} sx={{ color:'text.secondary', transition:'color .2s', '&:hover':{ color:'error.main' } }}>
                          <DeleteForeverIcon fontSize='inherit' />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Download'>
                        <IconButton size='small' onClick={()=> {
                          try {
                            const fileName = doc.originalName || 'document';
                            const url = doc.url;
                            if(/^https?:\/\//i.test(url) || /^data:/i.test(url)) {
                              const a = document.createElement('a'); a.href=url; a.download=fileName; a.target='_blank'; document.body.appendChild(a); a.click(); a.remove(); return; }
                            const a = document.createElement('a'); a.href=url; a.download=fileName; a.target='_blank'; document.body.appendChild(a); a.click(); a.remove();
                          } catch(err) { console.error('Download failed', err); }
                        }} sx={{ color:'text.secondary', transition:'color .2s', '&:hover':{ color:'primary.main' } }}>
                          <DownloadIcon fontSize='inherit' />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Box sx={{ position:'absolute', top:4, left:4, bgcolor:'primary.main', color:'primary.contrastText', borderRadius:1, px:.5, py:.2, fontSize:9, fontWeight:600, letterSpacing:.4 }}>
                      {doc.source==='planner' ? 'Trip' : 'Library'}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={()=> setPinnedOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
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
