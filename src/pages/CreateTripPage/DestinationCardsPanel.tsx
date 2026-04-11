/**
 * Restored rich DestinationCardsPanel with:
 *  - Google Places autocomplete (add destinations with lat/lng + optional photo)
 *  - Timeline rail + numbered nodes + transport legs between destinations
 *  - Discover dialog (spots & foods) with recommendations + spot search (Places) + photo/description fetch
 *  - Stay / Notes / Docs dialogs
 *  - Read-only gating: hide search bar & disable editing when readOnly
 */
import React from 'react';
import {
  Box, Stack, Typography, Fade, Paper, InputBase, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Chip, Tabs, Tab, Checkbox, LinearProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import NotesIcon from '@mui/icons-material/Notes';
import DestinationCard from './DestinationCard';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  addDestination, removeDestination, duplicateDestination, toggleDestinationCompleted, setDestinationCategory, renameDestination,
  setDestinationNotes, addDestinationDoc, removeDestinationDoc,
  addSpot, toggleSpot, removeSpot, addFoodItem, toggleFoodItem, removeFoodItem,
  updateDestinationNights,
  addStayEntry, updateStayEntry, removeStayEntry, setStayNotes
} from '../../store/plannerSlice';
import ValidatedFileInput from '../../components/CommonComponents/ValidatedFileInput';
import SoonTag from '../../components/CommonComponents/SoonTag';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { DEFAULT_DOC_RULE } from '../../utils/fileValidation';
import AiActionButton from '../../components/CommonComponents/AiActionButton';

interface DestinationCardsPanelProps { maxed: boolean; readOnly?: boolean; canAccessDocs?: boolean; canEdit?: boolean }

/* ---- Google Maps JS SDK loader (standalone, since MapPanel now uses Mapbox) ---- */
function ensureGoogleMapsLoaded(apiKey: string): Promise<void> {
  if ((window as any).google?.maps?.places) return Promise.resolve();
  const existing = document.getElementById('gm-sdk');
  if (existing) {
    return new Promise(resolve => existing.addEventListener('load', () => resolve(), { once: true }));
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = 'gm-sdk';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=quarterly`;
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const DestinationCardsPanel: React.FC<DestinationCardsPanelProps> = ({ maxed, readOnly=false, canAccessDocs=false, canEdit=false }) => {
  const dispatch = useDispatch<AppDispatch>();
  const destinations = useSelector((s:RootState)=> s.planner.destinations);
  // completedCount removed with Timeline header
  /* Load Google Maps SDK once on mount so Places autocomplete works independently of MapPanel */
  React.useEffect(() => {
    const key = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (key) ensureGoogleMapsLoaded(key).catch(() => {});
  }, []);
  const ENABLE_DOC_UPLOAD = FEATURE_FLAGS.docsUpload;

  /* ----------------------------- Autocomplete ----------------------------- */
  const [searchValue, setSearchValue] = React.useState('');
  const [predictions, setPredictions] = React.useState<any[]>([]);
  const [loadingPred, setLoadingPred] = React.useState(false);
  const sessionTokenRef = React.useRef<any | null>(null);
  const getAutocompleteService = () => {
    const g = (window as any).google;
    if(!g?.maps?.places) return null;
    if(!sessionTokenRef.current) sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
    if(!(window as any)._tripicianPlaceService){ (window as any)._tripicianPlaceService = new g.maps.places.AutocompleteService(); }
    return (window as any)._tripicianPlaceService as any;
  };
  React.useEffect(()=> {
    if(!searchValue.trim() || readOnly){ setPredictions([]); return; }
    const svc = getAutocompleteService(); if(!svc) return; let active=true; setLoadingPred(true);
    try {
      svc.getPlacePredictions({ input: searchValue, sessionToken: sessionTokenRef.current, types:['geocode','establishment'] }, (res:any[]|null,status:string)=>{
        if(!active) return; setLoadingPred(false);
        if(status!=='OK' || !Array.isArray(res)){ setPredictions([]); return; }
        setPredictions(res.slice(0,7));
      });
    } catch { setLoadingPred(false); setPredictions([]); }
    return ()=> { active=false; };
  }, [searchValue, readOnly]);
  const selectPrediction = (p:any) => {
    if(readOnly) return; const g=(window as any).google; if(!g?.maps?.places) return;
    const svc = new g.maps.places.PlacesService(document.createElement('div'));
    svc.getDetails({ placeId: p.place_id, fields:['name','geometry','photos'] }, (place:any,status:string)=>{
      if(status==='OK' && place){
        const name = place.name || p.description;
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();
        let photoUrl: string | undefined;
        if(place.photos && place.photos.length){ try { photoUrl = place.photos[0].getUrl({ maxWidth:800, maxHeight:600 }); } catch {} }
        if(name) dispatch(addDestination({ name, lat, lng, placeId:p.place_id, photoUrl }));
        setSearchValue(''); setPredictions([]);
      }
    });
  };

  /* -------------------------- Discover dialog (spots) -------------------------- */
  const [discoverFor, setDiscoverFor] = React.useState<string | null>(null);
  const [discoverTab, setDiscoverTab] = React.useState<'spots'|'foods'>('spots');
  const [spotSearch, setSpotSearch] = React.useState('');
  const [spotPredictions, setSpotPredictions] = React.useState<any[]>([]);
  const [spotSearchLoading, setSpotSearchLoading] = React.useState(false);
  const recommendedSpots = ['Central Park','Old Town','Museum of Art','River Walk','Sunset Point'];
  const recommendedFoods = ['Local BBQ','Seafood Platter','Street Tacos','Traditional Dessert','Coffee Roastery'];
  const placesServiceRef = React.useRef<any>(null);
  const scriptLoadingRef = React.useRef(false);
  const ensurePlacesScript = React.useCallback(()=>{
    if(placesServiceRef.current) return true; const w:any = window;
    if(w.google?.maps?.places){ placesServiceRef.current = new w.google.maps.places.AutocompleteService(); return true; }
    if(scriptLoadingRef.current) return false; const key=import.meta.env.VITE_GOOGLE_MAPS_API_KEY; if(!key) return false;
    scriptLoadingRef.current = true; const script=document.createElement('script'); script.src=`https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`; script.async=true; script.defer=true;
    script.onload=()=>{ scriptLoadingRef.current=false; if(w.google?.maps?.places){ placesServiceRef.current = new w.google.maps.places.AutocompleteService(); if(spotSearch) triggerSpotSearch(spotSearch); } };
    document.head.appendChild(script); return false;
  }, [spotSearch]);
  const triggerSpotSearch = React.useCallback((query:string)=>{
    if(!query.trim()){ setSpotPredictions([]); return; }
    const ready = ensurePlacesScript(); if(!ready || !placesServiceRef.current){
      setSpotSearchLoading(true); const fake=Array.from({length:2}).map((_,i)=>({ description:query+` (loading ${i+1})`, place_id:query+'_fake_'+i }));
      setTimeout(()=>{ setSpotPredictions(fake); setSpotSearchLoading(false); }, 300); return; }
    setSpotSearchLoading(true);
    try { placesServiceRef.current.getPlacePredictions({ input:query }, (preds:any[]|null,status:string)=>{
      if(status!=='OK' || !Array.isArray(preds)){ setSpotPredictions([]); setSpotSearchLoading(false); return; }
      const allow = new Set(['tourist_attraction','point_of_interest','establishment']);
      const filtered = preds.filter(p=> !p.types || p.types.some((t:string)=> allow.has(t)));
      setSpotPredictions(filtered.slice(0,8)); setSpotSearchLoading(false);
    }); } catch{ setSpotSearchLoading(false); setSpotPredictions([]); }
  }, [ensurePlacesScript]);
  React.useEffect(()=> { const t=setTimeout(()=> triggerSpotSearch(spotSearch), 450); return ()=> clearTimeout(t); }, [spotSearch, triggerSpotSearch]);
  const placeDetailsCache = React.useRef<Record<string,{ photoUrl?: string; mapUrl?: string; description?: string }>>({});
  const fetchPlacePhoto = React.useCallback((placeId:string):Promise<{ photoUrl?:string; mapUrl?:string; description?:string }>=>(
    placeDetailsCache.current[placeId] ? Promise.resolve(placeDetailsCache.current[placeId]) : new Promise(resolve=>{
      const g=(window as any).google; if(!g?.maps?.places) return resolve({});
      const svc=new g.maps.places.PlacesService(document.createElement('div'));
      svc.getDetails({ placeId, fields:['photos','url','editorial_summary','formatted_address','types','name'] }, (pl:any, status:string)=>{
        if(status!=='OK'||!pl) return resolve({});
        let photoUrl: string | undefined; if(pl.photos && pl.photos.length){ try { photoUrl = pl.photos[0].getUrl({ maxWidth:480, maxHeight:320 }); } catch {} }
        let description: string | undefined; if(pl.editorial_summary?.overview){ description = pl.editorial_summary.overview.split(/\n|\.|!/)[0].trim(); }
        if(!description && pl.formatted_address){ const addr = pl.formatted_address as string; const nameLower=(pl.name||'').toLowerCase(); description = addr.toLowerCase().startsWith(nameLower)? addr.slice(pl.name.length).replace(/^,\s*/, ''): addr; }
        if(!description && Array.isArray(pl.types) && pl.types.length){ description = pl.types[0].replace(/_/g,' '); }
        const result={ photoUrl, mapUrl:pl.url as string|undefined, description }; placeDetailsCache.current[placeId]=result; resolve(result);
      });
    })
  ), []);
  const addSpotFromPrediction = (p:any) => { if(!discoverFor) return; fetchPlacePhoto(p.place_id).then(det=>{
    dispatch(addSpot({ destinationId: discoverFor, name: p.description.split(',')[0], photoUrl: det.photoUrl, mapUrl: det.mapUrl, description: det.description, placeId: p.place_id, known:true })); setSpotSearch(''); setSpotPredictions([]);
  }); };

  /* ---------------------------- Notes / Stay / Docs ---------------------------- */
  const [notesFor, setNotesFor] = React.useState<string | null>(null);
  const [notesDraft, setNotesDraft] = React.useState('');
  const openNotes = (id:string) => { setNotesFor(id); const d=destinations.find(p=> p.id===id); setNotesDraft(d?.notes||''); };
  const saveNotes = () => { if(notesFor) dispatch(setDestinationNotes({ id: notesFor, notes: notesDraft })); setNotesFor(null); };
  // Multi Stay panel
  const [stayFor, setStayFor] = React.useState<string | null>(null);
  const openStay = (id:string) => { setStayFor(id); };
  const closeStayPanel = () => setStayFor(null);
  const destinationStays = React.useMemo(()=> {
    if(!stayFor) return [] as Array<{ id:string; name?:string; reference?:string }>;
    const d = destinations.find(p=> p.id===stayFor);
    return d?.stays || [];
  }, [stayFor, destinations]);
  const stayNotesVal = React.useMemo(()=> {
    if(!stayFor) return '';
    const d = destinations.find(p=> p.id===stayFor);
    return d?.stayNotes || '';
  }, [stayFor, destinations]);
  const addProperty = () => { if(!stayFor) return; dispatch(addStayEntry({ destinationId: stayFor })); };
  const updatePropertyField = (stayId:string, patch: { name?:string; reference?:string }) => { if(!stayFor) return; dispatch(updateStayEntry({ destinationId: stayFor, stayId, patch })); };
  const deleteProperty = (stayId:string) => { if(!stayFor) return; dispatch(removeStayEntry({ destinationId: stayFor, stayId })); };
  const saveStayNotes = (notes:string) => { if(!stayFor) return; dispatch(setStayNotes({ destinationId: stayFor, notes })); };
  const [docsFor, setDocsFor] = React.useState<string | null>(null);
  // Docs feature disabled (Coming Soon); openDocs intentionally unused
  const onAcceptDocs = (files: File[]) => { if(!docsFor) return; files.forEach((f,idx)=>{ const id=f.name+'_'+Date.now().toString(36)+'_'+idx; const url=URL.createObjectURL(f); dispatch(addDestinationDoc({ destinationId: docsFor, doc:{ id, originalName:f.name, mimeType:f.type, url } })); }); };
  const removeDoc = (docId:string) => { if(!docsFor) return; dispatch(removeDestinationDoc({ destinationId: docsFor, docId })); };

  /* --------------------------- Timeline rail geometry -------------------------- */
  const cardRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [centers, setCenters] = React.useState<number[]>([]);
  const [railBounds, setRailBounds] = React.useState<{ top:number; bottom:number } | null>(null);
  const recompute = React.useCallback(()=>{
    const cont=containerRef.current; if(!cont){ setCenters([]); setRailBounds(null); return; }
    const list:number[]=[]; destinations.forEach(d=>{ const el=cardRefs.current[d.id]; if(el){ const r=el.getBoundingClientRect(); const cr=cont.getBoundingClientRect(); list.push(r.top-cr.top + r.height/2); } });
    setCenters(list); if(list.length>=2) setRailBounds({ top:list[0], bottom:list[list.length-1] }); else setRailBounds(null);
  }, [destinations]);
  React.useLayoutEffect(()=> { recompute(); }, [recompute]);
  React.useEffect(()=> { const onResize=()=> recompute(); window.addEventListener('resize', onResize); return ()=> window.removeEventListener('resize', onResize); }, [recompute]);

  /* --------------------------------- Render --------------------------------- */
  return (
    <Fade in timeout={300}>
      <Box sx={{ px:2.5, pt:2, pb:1.5, display:'flex', flexDirection:'column', gap:1.5, position:'relative' }}>
        {/* Search bar (hidden when readOnly) */}
        {!readOnly && (
          <Box sx={{ maxWidth:900, position:'relative', mx:'auto', width:'100%' }}>
            <Paper elevation={0} sx={(t)=>({ display:'flex', alignItems:'center', gap:1, pl:2, pr:.75, py:.55, borderRadius:'50px', border:`1px solid ${t.palette.mode==='dark'?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'}`, background:t.palette.mode==='dark'?t.palette.background.paper:'#fff', boxShadow: t.palette.mode==='dark'?'none':'0 1px 8px rgba(0,0,0,0.07)', transition:'border-color .2s, box-shadow .2s', '&:focus-within':{ borderColor:'rgba(255,56,92,0.45)', boxShadow:'0 0 0 3px rgba(255,56,92,0.10)' } })}>
              <SearchIcon fontSize='small' sx={{ opacity:.4, flexShrink:0 }} />
              <InputBase value={searchValue} onChange={e=> setSearchValue(e.target.value)} placeholder={maxed? 'Night limit reached':'Search or add destination'} disabled={maxed} sx={{ flex:1, fontSize:14 }} />
              <Box sx={{ display:'flex', alignItems:'center', gap:.4, opacity:.5, fontSize:11, whiteSpace:'nowrap', mr:.75, flexShrink:0 }}>
                <span>Powered by</span>
                <Box component='img' alt='Google' src={import.meta.env.VITE_GOOGLE_LOGO || 'https://developers.google.com/static/maps/documentation/images/google_on_white.png'} sx={{ height:13 }} />
              </Box>
              <Button size='small' variant='contained' disabled={!searchValue.trim() || maxed} onClick={()=> { if(!searchValue.trim()) return; dispatch(addDestination({ name: searchValue.trim() })); setSearchValue(''); }} sx={{ borderRadius:'40px', px:2.25, py:.5, fontSize:12, fontWeight:700, textTransform:'none', background:'linear-gradient(135deg,#FF385C,#E31C5F)', boxShadow:'0 2px 8px rgba(255,56,92,0.3)', '&:hover':{ background:'linear-gradient(135deg,#E31C5F,#D91A50)', boxShadow:'0 4px 12px rgba(255,56,92,0.4)' }, '&.Mui-disabled':{ background:'rgba(0,0,0,0.07)', boxShadow:'none' } }}>Add</Button>
            </Paper>
            {(predictions.length>0 || loadingPred) && searchValue && (
              <Paper elevation={8} sx={{ position:'absolute', top:'100%', left:0, mt:1, width:'100%', maxHeight:320, overflowY:'auto', zIndex:10, borderRadius:'16px', overflow:'hidden' }}>
                {loadingPred && <Box sx={{ px:2, py:1, fontSize:12, opacity:.7 }}>Searching...</Box>}
                {predictions.map(p=> (
                  <Box key={p.place_id} onClick={()=> selectPrediction(p)} sx={{ px:2, py:.9, cursor:'pointer', borderBottom:'1px solid', borderColor:'divider', '&:hover':{ background:'rgba(255,56,92,0.05)' }, fontSize:13, transition:'background .12s' }}>
                    <strong>{p.structured_formatting?.main_text || p.description}</strong>
                    {p.structured_formatting?.secondary_text && <Box sx={{ fontSize:11, opacity:.55, mt:.15 }}>{p.structured_formatting.secondary_text}</Box>}
                  </Box>
                ))}
                {!loadingPred && predictions.length===0 && (
                  <Box sx={{ px:2, py:1, fontSize:12, opacity:.65 }}>No matches</Box>
                )}
              </Paper>
            )}
          </Box>
        )}

        <Box ref={containerRef} sx={{ position:'relative', pl:8, maxWidth:900, mx:'auto', width:'100%' }}>
          {railBounds && (
            <>
              <Box sx={{ position:'absolute', top:railBounds.top, height: railBounds.bottom - railBounds.top, left:18, width:2, background:'repeating-linear-gradient(to bottom,rgba(255,56,92,0.35) 0 6px,transparent 6px 11px)', pointerEvents:'none' }} />
              {centers.map((c, idx)=>(
                <Box key={idx} sx={{ position:'absolute', top:c, left:6, width:28, height:24, display:'flex', alignItems:'center', justifyContent:'center', transform:'translateY(-50%)', zIndex:3 }}>
                  <Box sx={{ width:22, height:22, borderRadius:'50%', background:'linear-gradient(135deg,#FF385C,#E31C5F)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, boxShadow:'0 2px 8px rgba(255,56,92,0.4)' }}>{idx+1}</Box>
                </Box>
              ))}
            </>
          )}
          {destinations.length===0 && (
            <Box sx={(t)=>({ mt:3, p:5, border:'2px dashed rgba(255,56,92,0.2)', borderRadius:3, textAlign:'center', fontSize:14, color:t.palette.text.secondary })}>Search above to add your first destination.</Box>
          )}
          <Stack spacing={1}>
            {destinations.map(d=> (
              <Box key={d.id} ref={el=> { cardRefs.current[d.id]=el as HTMLDivElement | null; }}>
                <DestinationCard
                  destination={d}
                  onRename={readOnly? undefined : (id,name)=> dispatch(renameDestination({ id, name }))}
                  onChangeCategory={readOnly? undefined : (id,cat)=> dispatch(setDestinationCategory({ id, category:cat }))}
                  onToggleComplete={readOnly? undefined : (id)=> dispatch(toggleDestinationCompleted({ id }))}
                  onDuplicate={readOnly? undefined : (id)=> dispatch(duplicateDestination({ id }))}
                  onRemove={readOnly? undefined : (id)=> dispatch(removeDestination(id))}
                  onOpenNotes={readOnly? undefined : ()=> openNotes(d.id)}
                  onOpenDocs={(!canAccessDocs /* docs globally inaccessible */)? undefined : undefined /* disabled docs feature (Coming Soon) */}
                  onOpenStay={readOnly? undefined : ()=> openStay(d.id)}
                  onOpenDiscover={readOnly? undefined : ()=> { setDiscoverFor(d.id); setDiscoverTab('spots'); }}
                  onChangeNights={readOnly? undefined : (id,delta)=> dispatch(updateDestinationNights({ id, delta }))}
                />
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Discover Dialog */}
        <Dialog open={!!discoverFor} onClose={()=> setDiscoverFor(null)} fullWidth maxWidth='lg' PaperProps={{ sx:{ height:'80vh' } }}>
          {discoverFor && (()=>{ const pd=destinations.find(p=> p.id===discoverFor); const spots=pd?.spots||[]; const foods=pd?.foods||[]; return (
            <>
              <DialogTitle sx={{ pb:0 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
                  <Box>
                    <Typography variant='h6' sx={{ fontWeight:700 }}>{pd?.name || 'Destination'}</Typography>
                    <Typography variant='caption' sx={{ opacity:.7 }}>Curate must‑see spots & foods.</Typography>
                  </Box>
                  <Tabs value={discoverTab} onChange={(_,v)=> setDiscoverTab(v)} textColor='primary' indicatorColor='primary'>
                    <Tab value='spots' label={`Spots (${spots.length})`} />
                    <Tab value='foods' label={`Foods (${foods.length})`} />
                  </Tabs>
                </Box>
              </DialogTitle>
              <DialogContent dividers sx={{ display:'flex', gap:3, alignItems:'flex-start' }}>
                <Box sx={{ flex:2, display:'flex', flexDirection:'column', gap:1 }} onDragOver={(e)=> e.preventDefault()}>
                  {discoverTab==='spots' && (
                    <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                      {spots.map((s:any)=>(
                        <Paper key={s.id} elevation={0} sx={{ display:'flex', alignItems:'center', gap:1, p:1, border:'1px solid', borderColor:'divider', borderRadius:2 }}>
                          <Checkbox size='small' checked={s.checked} onChange={()=> dispatch(toggleSpot({ destinationId: discoverFor!, spotId: s.id }))} />
                          <Typography variant='body2' sx={{ flex:1 }}>{s.name}</Typography>
                          <IconButton size='small' onClick={()=> dispatch(removeSpot({ destinationId: discoverFor!, spotId: s.id }))}><DeleteOutlineIcon fontSize='inherit' /></IconButton>
                          <DragIndicatorIcon fontSize='small' sx={{ opacity:.4 }} />
                        </Paper>
                      ))}
                      {spots.length===0 && <Typography variant='caption' sx={{ opacity:.6 }}>No spots yet.</Typography>}
                    </Box>
                  )}
                  {discoverTab==='foods' && (
                    <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                      {foods.map((f:any)=>(
                        <Paper key={f.id} elevation={0} sx={{ display:'flex', alignItems:'center', gap:1, p:1, border:'1px solid', borderColor:'divider', borderRadius:2 }}>
                          <Checkbox size='small' checked={f.checked} onChange={()=> dispatch(toggleFoodItem({ destinationId: discoverFor!, foodId: f.id }))} />
                          <Typography variant='body2' sx={{ flex:1 }}>{f.name}</Typography>
                          <IconButton size='small' onClick={()=> dispatch(removeFoodItem({ destinationId: discoverFor!, foodId: f.id }))}><DeleteOutlineIcon fontSize='inherit' /></IconButton>
                        </Paper>
                      ))}
                      {foods.length===0 && <Typography variant='caption' sx={{ opacity:.6 }}>No foods yet.</Typography>}
                    </Box>
                  )}
                </Box>
                <Paper variant='outlined' sx={{ flex:1.2, p:2.25, borderRadius:3, position:'relative' }}>
                  <Typography variant='subtitle2' sx={{ fontWeight:700, mb:1 }}>{discoverTab==='spots'? `Recommendations in ${pd?.name}` : `Local Foods in ${pd?.name}`}</Typography>
                  <Box sx={{ display:'flex', flexWrap:'wrap', gap:1, mb:2 }}>
                    {(discoverTab==='spots'? recommendedSpots : recommendedFoods).map(r => (
                      <Chip key={r} label={r} size='small' color={discoverTab==='spots'?'primary':'secondary'} variant='outlined' onClick={()=> discoverTab==='spots'? dispatch(addSpot({ destinationId: discoverFor!, name: r, known:true, mapUrl:`https://maps.google.com/?q=${encodeURIComponent(r+' '+(pd?.name||''))}` })) : dispatch(addFoodItem({ destinationId: discoverFor!, name: r })) } />
                    ))}
                  </Box>
                  {discoverTab==='spots' && (
                    <Box>
                      <Typography variant='caption' sx={{ fontWeight:600, textTransform:'uppercase', display:'block', mb:.5 }}>Search Spots</Typography>
                      <Box sx={{ position:'relative' }}>
                        <InputBase value={spotSearch} onChange={e=> setSpotSearch(e.target.value)} placeholder='Search attractions...' sx={{ border:'1px solid', borderColor:'divider', borderRadius:1.5, px:1, py:.5, width:'100%', fontSize:14 }} startAdornment={<SearchIcon fontSize='small' style={{ marginRight:4, opacity:.6 }} />} />
                        {spotSearchLoading && <LinearProgress sx={{ position:'absolute', left:0, right:0, bottom:-2, height:2 }} />}
                      </Box>
                      <Box sx={{ mt:1, maxHeight:170, overflowY:'auto', pr:0.5 }}>
                        {spotPredictions.map(p => (
                          <Box key={p.place_id} onClick={()=> addSpotFromPrediction(p)} sx={{ p:0.6, px:1, border:'1px solid', borderColor:'divider', borderRadius:1, mb:0.5, cursor:'pointer', fontSize:12.5, display:'flex', alignItems:'center', gap:.5, '&:hover':{ background:'action.hover' } }}>
                            <SearchIcon sx={{ fontSize:14, opacity:.5 }} /> {p.description}
                          </Box>
                        ))}
                        {!spotSearchLoading && spotSearch && spotPredictions.length===0 && <Typography variant='caption' sx={{ opacity:.6 }}>No results.</Typography>}
                      </Box>
                      <Typography variant='caption' sx={{ display:'flex', alignItems:'center', gap:0.5, mt:1.5, opacity:.75 }}>Powered by <Box component='img' alt='Google' src={import.meta.env.VITE_GOOGLE_LOGO || 'https://developers.google.com/static/maps/documentation/images/google_on_white.png'} sx={{ height:14 }} /></Typography>
                    </Box>
                  )}
                  <Box sx={{ position:'absolute', bottom:12, right:12 }}>
                    <AiActionButton startIcon={<SmartToyIcon />}>AI Suggest</AiActionButton>
                  </Box>
                </Paper>
              </DialogContent>
              <DialogActions><Button onClick={()=> setDiscoverFor(null)}>Close</Button></DialogActions>
            </>
          ); })()}
        </Dialog>

        {/* Notes Dialog */}
        <Dialog
          open={!!notesFor}
          onClose={()=> setNotesFor(null)}
          fullWidth
          maxWidth='xs'
          PaperProps={{ sx:(t)=>({ borderRadius:3, overflow:'hidden', background: t.palette.mode==='dark'? '#1a1a1a':'#fff', boxShadow:'0 24px 80px rgba(0,0,0,0.18)' }) }}
        >
          {/* Header */}
          <Box sx={(t)=>({ display:'flex', alignItems:'center', gap:1.5, px:3, pt:2.5, pb:2, borderBottom:`1px solid ${t.palette.divider}` })}>
            <Box sx={{ width:32, height:32, borderRadius:'10px', background:'linear-gradient(135deg,#FF385C,#E31C5F)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <NotesIcon sx={{ fontSize:16, color:'#fff' }} />
            </Box>
            <Box sx={{ flex:1 }}>
              <Typography sx={{ fontSize:15, fontWeight:700, lineHeight:1.2 }}>
                {destinations.find(p=>p.id===notesFor)?.name || 'Destination'}
              </Typography>
              <Typography sx={{ fontSize:11, color:'text.secondary', lineHeight:1.3 }}>Travel notes</Typography>
            </Box>
            <IconButton size='small' onClick={()=>setNotesFor(null)} sx={{ color:'text.disabled', '&:hover':{ color:'text.primary', background:'action.hover' }, p:.5 }}>
              <CloseIcon sx={{ fontSize:16 }} />
            </IconButton>
          </Box>

          {/* Body – flat notepad */}
          <Box sx={(t)=>({
            mx:0, px:3, pt:2, pb:2,
            background: t.palette.mode==='dark'
              ? 'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(255,255,255,0.05) 28px)'
              : 'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(0,0,0,0.06) 28px)',
            backgroundPositionY: '16px',
          })}>
            <InputBase
              autoFocus
              disabled={readOnly}
              multiline
              minRows={7}
              maxRows={14}
              value={notesDraft}
              onChange={e=>setNotesDraft(e.target.value)}
              placeholder='Write your travel notes here…'
              sx={{
                width:'100%',
                fontSize:14,
                lineHeight:'28px',
                color:'text.primary',
                alignItems:'flex-start',
                border:'none',
                p:0,
                '& textarea': { lineHeight:'28px', padding:0, backgroundImage:'none' },
                '& textarea::placeholder':{ color:'text.disabled', opacity:1 },
              }}
            />
          </Box>

          {/* Footer */}
          {!readOnly && (
            <Box sx={(t)=>({ display:'flex', justifyContent:'flex-end', gap:1, px:3, pb:2.5, pt:.5, borderTop:`1px solid ${t.palette.divider}` })}>
              <Button
                onClick={()=>setNotesFor(null)}
                sx={{ borderRadius:2, textTransform:'none', fontWeight:600, fontSize:13, color:'text.secondary', px:2, '&:hover':{ background:'action.hover' } }}
              >Discard</Button>
              <Button
                variant='contained'
                onClick={saveNotes}
                sx={{ borderRadius:2, textTransform:'none', fontWeight:700, fontSize:13, px:3, background:'linear-gradient(135deg,#FF385C,#E31C5F)', boxShadow:'none', '&:hover':{ background:'linear-gradient(135deg,#e02d50,#c91855)', boxShadow:'0 4px 16px rgba(255,56,92,0.35)' } }}
              >Save</Button>
            </Box>
          )}
          {readOnly && (
            <Box sx={(t)=>({ display:'flex', justifyContent:'flex-end', px:3, pb:2.5, pt:.5, borderTop:`1px solid ${t.palette.divider}` })}>
              <Button onClick={()=>setNotesFor(null)} sx={{ borderRadius:2, textTransform:'none', fontWeight:600, fontSize:13, color:'text.secondary', px:2 }}>Close</Button>
            </Box>
          )}
        </Dialog>

        {/* Stay Dialog (discover-style) */}
        <Dialog open={!!stayFor} onClose={closeStayPanel} fullWidth maxWidth='lg' PaperProps={{ sx:{ height:'80vh' } }}>
          {stayFor && (()=> { const d = destinations.find(p=> p.id===stayFor); return (
            <>
              <DialogTitle sx={{ pb:0 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
                  <Box>
                    <Typography variant='h6' sx={{ fontWeight:700 }}>{d?.name || 'Destination'} – Accommodation</Typography>
                    <Typography variant='caption' sx={{ opacity:.65 }}>Manage one or multiple properties & general stay notes.</Typography>
                  </Box>
                  {!readOnly && <Button size='small' variant='outlined' onClick={addProperty} sx={{ textTransform:'none', borderRadius:2 }}>Add Property</Button>}
                </Box>
              </DialogTitle>
              <DialogContent dividers sx={{ display:'flex', gap:3, alignItems:'flex-start' }}>
                {/* Properties list */}
                <Box sx={{ flex:1.4, display:'flex', flexDirection:'column', gap:1 }}>
                  {destinationStays.map(prop => (
                    <Paper key={prop.id} elevation={0} sx={{ p:1.2, border:'1px solid', borderColor:'divider', borderRadius:2, display:'flex', flexDirection:'column', gap:1 }}>
                      <Box sx={{ display:'flex', flexDirection:{ xs:'column', sm:'row' }, gap:1 }}>
                        <InputBase
                          disabled={readOnly}
                          value={prop.name||''}
                          onChange={e=> updatePropertyField(prop.id,{ name: e.target.value })}
                          placeholder='Property name'
                          sx={{ flex:1, border:'1px solid', borderColor:'divider', borderRadius:1.5, px:1, py:.55, fontSize:13 }}
                        />
                        <InputBase
                          disabled={readOnly}
                          value={prop.reference||''}
                          onChange={e=> updatePropertyField(prop.id,{ reference: e.target.value })}
                          placeholder='Booking reference'
                          sx={{ flex:1, border:'1px solid', borderColor:'divider', borderRadius:1.5, px:1, py:.55, fontSize:13 }}
                        />
                        {!readOnly && <IconButton size='small' onClick={()=> deleteProperty(prop.id)} sx={{ alignSelf:{ xs:'flex-end', sm:'flex-start' }, mt:{ xs:0, sm:.2 } }}><DeleteOutlineIcon fontSize='small' /></IconButton>}
                      </Box>
                    </Paper>
                  ))}
                  {destinationStays.length===0 && (
                    <Typography variant='caption' sx={{ opacity:.6 }}>No properties yet. Click "Add Property".</Typography>
                  )}
                </Box>
                {/* Notes section */}
                <Paper elevation={0} variant='outlined' sx={{ flex:1, p:2.25, borderRadius:3, position:'relative', display:'flex', flexDirection:'column', gap:1.25 }}>
                  <Typography variant='subtitle2' sx={{ fontWeight:700 }}>General Notes</Typography>
                  <InputBase
                    disabled={readOnly}
                    multiline
                    minRows={10}
                    value={stayNotesVal}
                    onChange={e=> saveStayNotes(e.target.value)}
                    placeholder='Check‑in at 2 PM, parking details, key pickup instructions...'
                    sx={{ border:'1px solid', borderColor:'divider', borderRadius:2, px:1.2, py:.8, fontSize:13 }}
                  />
                  <Typography variant='caption' sx={{ opacity:.65 }}>Only non-empty fields are saved in payload.</Typography>
                </Paper>
              </DialogContent>
              <DialogActions>
                <Button onClick={closeStayPanel}>Close</Button>
              </DialogActions>
            </>
          ); })()}
        </Dialog>

        {/* Docs Dialog */}
        <Dialog open={!!docsFor} onClose={()=> setDocsFor(null)} fullWidth maxWidth='sm'>
          <DialogTitle>Documents</DialogTitle>
          <DialogContent>
            {canEdit && ENABLE_DOC_UPLOAD && (
              <ValidatedFileInput
                buttonLabel='Add Files'
                startIcon={<UploadFileIcon />}
                onAccept={onAcceptDocs}
                rule={DEFAULT_DOC_RULE}
                multiple
              />
            )}
            {!ENABLE_DOC_UPLOAD && (<SoonTag sx={{ mb:2 }} />)}
            {docsFor && (destinations.find(d=> d.id===docsFor)?.docs?.length ? (
              <Box sx={{ mt:2, display:'flex', flexWrap:'wrap', gap:2 }}>
                {destinations.find(d=> d.id===docsFor)!.docs!.map(doc => { const isImage=/(png|jpe?g|gif|webp|bmp|svg)$/i.test(doc.originalName); return (
                  <Box key={doc.id} sx={{ width:'30%', minWidth:120 }}>
                    <Box onClick={()=> { const a=document.createElement('a'); a.href=doc.url; a.download=doc.originalName; a.target='_blank'; a.rel='noopener'; a.click(); }} sx={{ cursor:'pointer', border:'1px solid', borderColor:'divider', borderRadius:1, overflow:'hidden', p:0.5, display:'flex', flexDirection:'column', alignItems:'center', gap:0.5, position:'relative' }}>
                      {isImage ? <Box component='img' src={doc.url} alt={doc.originalName} sx={{ width:'100%', height:70, objectFit:'cover', borderRadius:0.5 }} /> : <Box sx={{ width:'100%', height:70, display:'flex', alignItems:'center', justifyContent:'center', bgcolor:'action.hover', fontSize:12 }}>{doc.originalName.split('.').pop()?.toUpperCase()}</Box>}
                      <Typography variant='caption' sx={{ textAlign:'center', wordBreak:'break-all' }}>{doc.originalName}</Typography>
                      {canEdit && ENABLE_DOC_UPLOAD && (
                        <IconButton
                          size='small'
                          sx={{ position:'absolute', top:2, right:2, bgcolor:'background.paper' }}
                          onClick={(e)=> { e.stopPropagation(); removeDoc(doc.id); }}
                        >
                          <DeleteOutlineIcon fontSize='inherit' />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                ); })}
              </Box>
            ) : (<Typography variant='body2' sx={{ opacity:.7, mt:2 }}>No documents yet.</Typography>))}
          </DialogContent>
          <DialogActions><Button onClick={()=> setDocsFor(null)}>Close</Button></DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
};

export default DestinationCardsPanel;
