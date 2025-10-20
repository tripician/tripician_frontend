// TripPlanner main page component (formerly CreateTrip)
import React from 'react';
import { Box, Tabs, Tab, Typography, Divider, Button, Chip, Menu, MenuItem, Avatar, Tooltip, IconButton, InputBase, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Snackbar, Alert } from '@mui/material';
// Props-based TripPlanner; tripId + optional initialTrip provided by route wrapper
import DownloadIcon from '@mui/icons-material/Download';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setCurrency as setCurrencyAction, updateDestinationNights, setTransport, addDestination, removeDestination, reorderChainExact, addVisaDoc, removeVisaDoc, removeGlobalDoc, pinDoc, unpinDoc, loadState } from '../../store/plannerSlice';
import { togglePin as togglePinDocSlice, removeDocument as removeDocsSliceDocument } from '../../store/docsSlice';
import { DEFAULT_DOC_RULE } from '../../utils/fileValidation'; // legacy use (validateFiles removed after refactor)
import ValidatedFileInput from '../../components/CommonComponents/ValidatedFileInput';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CreateTripNav from './TripPlannerNav';
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
import Docs from '../DocsPage/Docs';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';

// Feature gating flags (non-destructive). Set to true to re-enable tabs.
// Underlying components (ExpensesPanel, TripComments) remain fully implemented.
const ENABLE_EXPENSES = false;
const ENABLE_COMMENTS = false;

export interface TripPlannerProps {
	tripId: string;
	initialTrip?: any; // TODO: Replace with Trip type when available
	readOnly?: boolean; // external view mode
	hideSections?: string[];
	isOwnerExternal?: boolean; // provided by TripView to control publish visibility
	onRequestEdit?: ()=>void; // TripView can trigger enabling edit mode
}

const TripPlanner: React.FC<TripPlannerProps> = ({ tripId, initialTrip, readOnly=false, hideSections=[], isOwnerExternal=true, onRequestEdit }) => {
	const { token: authToken } = useAuthToken();
	const dispatch = useDispatch<AppDispatch>();
	const planner = useSelector((s: RootState) => s.planner);
	const docsState = useSelector((s: RootState) => s.docs);
	const currency = planner.currency;
	const targetNights = planner.targetNights;
	const totalNights = planner.destinations.reduce((a,c)=>a+c.nights,0);

	// External non-owner viewer (not allowed to see / edit sensitive sections)
	// External (view-only) mode distinction: if readOnly, ALL editing of privacy, expenses, budget etc is disabled.
	// Previous logic only disabled for non-owners; requirement: privacy should be read only in ANY view-only context.
	const isExternalNonOwner = readOnly && !isOwnerExternal; // kept for existing gating of other owner-specific UI

	const [tab, setTab] = React.useState(0);

    console.log('[TripPlanner] Initial trip data', initialTrip);

	// Hydrate planner state from initialTrip if provided
	React.useEffect(()=> {
		if(!initialTrip) {
			console.log('[TripPlanner] No initialTrip provided; (future) fetch by id', tripId);
			return;
		}
		const trip = initialTrip as any;
		// Title (only if user hasn't edited)
		if(title === 'Untitled Trip' && !editingTitle && typeof trip.name === 'string') {
			setTitle(trip.name);
		}
		// Privacy mapping from backend visibility (Followers -> My Followers)
		if(privacy === 'Private' && typeof trip.visibility === 'string') {
			const vis = trip.visibility.toLowerCase();
			if(vis.startsWith('follow')) setPrivacy('My Followers');
			else if(vis.startsWith('every')) setPrivacy('Everyone');
			else if(vis.startsWith('trip')) setPrivacy('Trip Members');
			else setPrivacy('Private');
		}
		// Dates (meta only). Backend returns full ISO with T00:00:00
		const rawStart: string | undefined = trip.startDate;
		const rawEnd: string | undefined = trip.endDate;
		const toDateOnly = (v?:string) => v? v.split('T')[0] : undefined;
		const s = toDateOnly(rawStart);
		const e = toDateOnly(rawEnd);
		if(s && !tripStartDate) setTripStartDate(s);
		if(e && !tripEndDate) setTripEndDate(e);
		// Compute target nights from date range (difference in days). If invalid, fallback to 1.
		let targetFromRange = 1;
		try {
			if(s && e) {
				const ms = new Date(e).getTime() - new Date(s).getTime();
				const days = Math.round(ms / (1000*60*60*24));
				// Nights between start and end; ensure >=1
				targetFromRange = Math.max(1, days);
			}
		} catch { /* ignore */ }
		// Only initialize planner slice once (when empty). Do NOT fabricate destinations from countries.
		if(planner.destinations.length===0) {
			const currencyCode: string | undefined = trip.currencyCode;
			const allowedCurrencies = ['EUR','USD','GBP'] as const;
			const normalizedCurrency = allowedCurrencies.includes(currencyCode as any) ? currencyCode as typeof allowedCurrencies[number] : 'EUR';
			// Prefer backend-provided itinerary array if present
			let hydratedDestinations: any[] = [];
			const rawItinerary: any[] | undefined = Array.isArray((trip as any).itinerary) ? (trip as any).itinerary : undefined;
			if(rawItinerary && rawItinerary.length){
				hydratedDestinations = rawItinerary.map((item, idx) => {
					const startDate = (item.startDate || s) ?? new Date().toISOString().slice(0,10);
					const endDate = (item.endDate || startDate) ?? startDate;
					// Nights fallback based on date diff
					let nights = 1;
					try { const ms = new Date(endDate).getTime() - new Date(startDate).getTime(); nights = Math.max(1, Math.round(ms / (1000*60*60*24))); } catch {}
					return {
						id: item.id || ('dest_'+idx+'_'+Date.now()),
						name: item.name || item.title || 'Destination '+(idx+1),
						startDate,
						endDate,
						nights,
						transport: item.transport || '',
						budget: item.budget ?? 0,
						lat: item.lat ?? item.latitude ?? undefined,
						lng: item.lng ?? item.longitude ?? undefined,
						placeId: item.placeId || undefined,
						photoUrl: item.photoUrl || undefined,
						category: item.category || 'general',
						completed: !!item.completed,
						spots: Array.isArray(item.spots)? item.spots.map((sp:any)=> ({ id: sp.id || sp.name || ('spot_'+Math.random().toString(36).slice(2)), name: sp.name || 'Spot', checked: !!sp.checked, placeId: sp.placeId, photoUrl: sp.photoUrl, description: sp.description })) : [],
						foods: Array.isArray(item.foods)? item.foods.map((fd:any)=> ({ id: fd.id || fd.name || ('food_'+Math.random().toString(36).slice(2)), name: fd.name || 'Food', checked: !!fd.checked })) : [],
						docs: Array.isArray(item.docs)? item.docs.map((d:any)=> ({ id: d.id || ('doc_'+Math.random().toString(36).slice(2)), originalName: d.originalName || d.name || 'document', mimeType: d.mimeType || d.type || 'application/octet-stream', url: d.url || d.href || '' })) : [],
						notes: item.notes || undefined,
						stay: item.stay || undefined
					};
				});
				console.log('[TripPlanner] Hydrated destinations from initialTrip.itinerary', hydratedDestinations.length);
			}
			const initialState = {
				destinations: hydratedDestinations,
				currency: normalizedCurrency,
				targetNights: targetFromRange,
				globalDocs: [],
				visaDocs: [],
				pinnedDocIds: [],
				tripBudget: undefined,
				expenses: [],
				simplifyGroupExpenses: false,
				expenseVisibilityEmails: [],
				comments: []
			};
			dispatch(loadState(initialState));
			console.log('[TripPlanner] Initialized planner from initialTrip meta', { tripId, targetNights: targetFromRange, currency: normalizedCurrency, destinations: hydratedDestinations.length });
		} else {
			console.log('[TripPlanner] Skipped planner loadState; destinations already present');
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialTrip, tripId]);
	const [section, setSection] = React.useState<'plan'|'news'|'packing'|'docs'>('plan');
	const setSectionDebug = (next: 'plan'|'news'|'packing'|'docs') => {
		// eslint-disable-next-line no-console
		console.log('[TripPlanner] section change:', section, '=>', next);
		setSection(next);
	};
	const [isDraft, setIsDraft] = React.useState(true);
	const [title, setTitle] = React.useState('Untitled Trip');
	const [editingTitle, setEditingTitle] = React.useState(false);
	const [privacy, setPrivacy] = React.useState<'Private'|'Trip Members'|'My Followers'|'Everyone'>('Private');
	// Track a hash of the last committed state to decide if buttons should enable
	const lastCommittedRef = React.useRef<string>('');
	const computeSignature = React.useCallback(()=> {
		// Include transport, nights plus lightweight discover + stay markers
		const destSig = (planner.destinations||[]).map(d=> {
			const singleStayMarker = d.stay && (d.stay.name||d.stay.reference||d.stay.notes) ? 'S' : 'N';
			const multiStayCount = Array.isArray((d as any).stays)? (d as any).stays.length : 0;
			const stayNotesMarker = (d as any).stayNotes && (d as any).stayNotes.trim() ? 'SN' : '0';
			const spotCount = Array.isArray(d.spots)? d.spots.length : 0;
			const foodCount = Array.isArray(d.foods)? d.foods.length : 0;
			return d.id+':'+d.nights+':'+d.transport+':'+singleStayMarker+':M'+multiStayCount+':'+stayNotesMarker+':'+spotCount+':'+foodCount;
		}).join('|');
		const expSig = (planner.expenses||[]).map(e=> e.id+':'+e.amount).join('|');
		return [title, privacy, currency, isDraft?'draft':'pub', destSig, expSig, planner.tripBudget ?? 'none'].join('#');
	}, [title, privacy, currency, isDraft, planner.destinations, planner.expenses, planner.tripBudget]);
	const signature = computeSignature();
	const isDirty = lastCommittedRef.current !== signature;
	React.useEffect(()=> { if(!lastCommittedRef.current) lastCommittedRef.current = signature; }, [signature]);
	const commitSnapshot = React.useCallback((nextDraftState: boolean) => {
		setIsDraft(nextDraftState);
		requestAnimationFrame(()=> { lastCommittedRef.current = computeSignature(); });
	}, [computeSignature]);
	// Meta date range sourced from backend trip (independent of destination ordering)
	const [tripStartDate, setTripStartDate] = React.useState<string | null>(null);
	const [tripEndDate, setTripEndDate] = React.useState<string | null>(null);
	const [currencyAnchor, setCurrencyAnchor] = React.useState<null | HTMLElement>(null);
	const [privacyAnchor, setPrivacyAnchor] = React.useState<null | HTMLElement>(null);
	const [settingsOpen, setSettingsOpen] = React.useState(false);
	const [optimizingRoute, setOptimizingRoute] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [lastSaveTs, setLastSaveTs] = React.useState<number>(0);
	const [lastSavedDisplay, setLastSavedDisplay] = React.useState<string>('Never');
	const [toast, setToast] = React.useState<{ open:boolean; type:'success'|'error'|'info'; msg:string }>({ open:false, type:'success', msg:'' });
	const openToast = (type:'success'|'error'|'info', msg:string)=> setToast({ open:true, type, msg });
	const closeToast = ()=> setToast(t=> ({ ...t, open:false }));
	const [mapCollapsed, setMapCollapsed] = React.useState(false);
	const [mapWidth, setMapWidth] = React.useState(0.30); // default map takes 30% width now
	const containerRef = React.useRef<HTMLDivElement|null>(null);
	const resizingRef = React.useRef(false);
	const [visaErrors, setVisaErrors] = React.useState<string[]>([]);

	const [visaOpen, setVisaOpen] = React.useState(false);
	const [pinnedOpen, setPinnedOpen] = React.useState(false);

	// (Removed secondary meta extraction effect; consolidated into primary hydration effect)

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
		const seen = new Set<string>();
		const deduped: typeof combined = [];
		for(const doc of combined){
			if(seen.has(doc.id)) continue;
			seen.add(doc.id);
			deduped.push(doc);
		}
		const finalList = deduped;
		// eslint-disable-next-line no-console
		console.log('[TripPlanner] combinedPinnedDocs recalculated', { plannerPinnedCount: plannerPinned.length, externalPinnedCount: externalPinned.length, combinedCount: combined.length, dedupedCount: finalList.length, plannerPinnedIds: plannerPinned.map(p=>p.id), externalPinnedIds: externalPinned.map(p=>p.id) });
		return finalList;
	}, [planner.destinations, planner.globalDocs, planner.visaDocs, planner.pinnedDocIds, docsState.docs]);

	const geocodedCount = React.useMemo(()=> planner.destinations.filter(d=> d.lat!=null && d.lng!=null).length, [planner.destinations]);
	const dateFormatter = React.useCallback((iso: string) => {
		try { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString(undefined, { weekday:'short', day:'2-digit', month:'short' }); } catch { return iso; }
	}, []);
	const panelDestinations: DestinationRow[] = React.useMemo(()=> planner.destinations.map(d=> ({
		id:d.id, name:d.name, start:dateFormatter(d.startDate), end:dateFormatter(d.endDate), nights:d.nights, transport:d.transport||'', todo:''
	})), [planner.destinations, dateFormatter]);
	const ENABLE_CARD_LAYOUT = true;
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
		const pts = planner.destinations.filter(d=> d.lat!=null && d.lng!=null);
		if(pts.length < 3){
			if(import.meta.env.DEV){ console.warn('[RouteOptimize] Need at least 3 geocoded destinations. Found:', pts.length); }
			return;
		}
		// Haversine distance for better geographic accuracy
		const R = 6371; // km
		const hav = (a:any,b:any)=> {
			const toRad = (deg:number)=> deg*Math.PI/180;
			const dLat = toRad(b.lat - a.lat);
			const dLon = toRad(b.lng - a.lng);
			const lat1 = toRad(a.lat); const lat2 = toRad(b.lat);
			const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
			return 2*R*Math.asin(Math.min(1, Math.sqrt(h)));
		};
		const routeDistance = (arr:any[]) => arr.reduce((acc:number,_,i)=> i===0?0:acc + hav(arr[i-1],arr[i]),0);
		// Multi-start nearest neighbor (try each point as start) then refine with 2-opt
		const twoOptSwap=(arr:any[],i:number,k:number)=> arr.slice(0,i).concat(arr.slice(i,k+1).reverse()).concat(arr.slice(k+1));
		let bestOrder:any[] = []; let bestLen = Infinity;
		for(let sIdx=0; sIdx<pts.length; sIdx++){
			const start = pts[sIdx];
			const remaining = pts.filter((_,i)=> i!==sIdx);
			const path=[start]; let curr=start;
			while(remaining.length){
				let bestI=0, bestD=Infinity;
				for(let i=0;i<remaining.length;i++){ const dVal=hav(curr,remaining[i]); if(dVal<bestD){ bestD=dVal; bestI=i; } }
				curr = remaining.splice(bestI,1)[0]; path.push(curr);
			}
			// 2-opt improvement on this path
			let improved=true; let localBest = path; let localLen = routeDistance(localBest); let iter=0;
			while(improved && iter<60){
				improved=false; iter++;
				for(let i=1;i<localBest.length-2;i++){
					for(let k=i+1;k<localBest.length-1;k++){
						const swapped = twoOptSwap(localBest,i,k); const len = routeDistance(swapped);
						if(len < localLen - 1e-9){ localBest = swapped; localLen = len; improved=true; }
					}
				}
			}
			if(localLen < bestLen - 1e-9){ bestLen = localLen; bestOrder = localBest; }
		}
		const optimizedIds = bestOrder.map(d=> d.id);
		if(import.meta.env.DEV){
			console.log('[RouteOptimize] Optimized order IDs:', optimizedIds, 'distanceKm=', bestLen.toFixed(2));
		}
		// Use exact reorder allowing first to move
		dispatch(reorderChainExact({ ids: optimizedIds }));
		window.dispatchEvent(new CustomEvent('tripician:route-updated',{ detail:{ ids: optimizedIds }}));
	};
	const handleOptimizeRouteClick=()=>{ if(optimizingRoute||geocodedCount<3) return; setOptimizingRoute(true); requestAnimationFrame(()=>{ try { computeShortestRoute(); } finally { setTimeout(()=> setOptimizingRoute(false),120); } }); };

	// Build backend-ready persistence payload (draft or publish)
	const buildPersistPayload = React.useCallback((draft:boolean) => {
		// ------------------------------------------------------------------
		// Leg transport semantics
		// Each destination.transport represents the mode used to DEPART that
		// destination toward the next one. Legs are built pairwise using the
		// 'from' destination's transport as leg.mode. This is minimal,
		// efficient to render, and unambiguous for consumers.
		// ------------------------------------------------------------------
		// Distance helpers (Haversine)
		const R = 6371; const toRad=(deg:number)=> deg*Math.PI/180;
		const havDist = (a:{lat?:number; lng?:number}, b:{lat?:number; lng?:number}) => {
			if(a.lat==null||a.lng==null||b.lat==null||b.lng==null) return null;
			const dLat = toRad(b.lat - a.lat); const dLon = toRad(b.lng - a.lng);
			const lat1 = toRad(a.lat); const lat2 = toRad(b.lat);
			const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
			return 2*R*Math.asin(Math.min(1, Math.sqrt(h)));
		};
		interface PersistLeg { fromId:string; toId:string; mode:string; distanceKm:number|null; from:{lat?:number; lng?:number}; to:{lat?:number; lng?:number}; }
		const legs: PersistLeg[] = [];
		for(let i=1;i<planner.destinations.length;i++){
			const from = planner.destinations[i-1]; const to = planner.destinations[i];
			const distanceKm = havDist(from, to);
			const mode = (from.transport || 'car');
			legs.push({
				fromId: from.id,
				toId: to.id,
				mode,
				distanceKm: distanceKm!=null? Number(distanceKm.toFixed(2)) : null,
				from: { lat: from.lat, lng: from.lng },
				to: { lat: to.lat, lng: to.lng }
			});
		}
		const routeDistanceKm = legs.reduce((a,l)=> l.distanceKm!=null? a + l.distanceKm : a, 0);
		const destinationDocsCount = planner.destinations.reduce((a,d)=> a + (d.docs?.length||0), 0);
		// Itinerary (extended fields) – omit empty large text fields
		const itinerary = planner.destinations.map(d=> {
			const notesVal: unknown = (d as any).notes;
			const notesClean = (typeof notesVal === 'string' && notesVal.trim().length>0) ? notesVal : undefined;
			// Structured stay: include only fields with non-empty trimmed values; omit entirely if all empty
			const stayRaw: any = (d as any).stay || {};
			const stayName = typeof stayRaw.name === 'string' && stayRaw.name.trim() ? stayRaw.name.trim() : undefined;
			const stayRef = typeof stayRaw.reference === 'string' && stayRaw.reference.trim() ? stayRaw.reference.trim() : undefined;
			const stayNotes = typeof stayRaw.notes === 'string' && stayRaw.notes.trim() ? stayRaw.notes.trim() : undefined;
			const stay = (stayName||stayRef||stayNotes) ? { name: stayName, reference: stayRef, notes: stayNotes } : undefined;
			// Multi stays (new model)
			const multiStays = Array.isArray((d as any).stays) ? (d as any).stays.filter((s:any)=> (s.name && s.name.trim()) || (s.reference && s.reference.trim())).map((s:any)=> ({ id:s.id, name:s.name?.trim(), reference:s.reference?.trim() })) : undefined;
			const stayNotesUnified = typeof (d as any).stayNotes === 'string' && (d as any).stayNotes.trim().length>0 ? (d as any).stayNotes.trim() : undefined;
			return {
				id:d.id,
				name:d.name,
				startDate:d.startDate,
				endDate:d.endDate,
				nights:d.nights,
				lat:d.lat,
				lng:d.lng,
				placeId:d.placeId,
				transport:d.transport,
				budget: d.budget ?? 0,
				category: d.category || 'general',
				completed: !!d.completed,
				photoUrl: d.photoUrl,
				notes: notesClean,
				stay, // deprecated single stay (retained for backward compatibility)
				stays: multiStays,
				stayNotes: stayNotesUnified,
				spots:(d.spots||[]).map(s=> ({ id:s.id, name:s.name, placeId:s.placeId, checked:s.checked, photoUrl:s.photoUrl, description:s.description, mapUrl:s.mapUrl, known: !!s.known })),
				foods:(d.foods||[]).map(f=> ({ id:f.id, name:f.name, checked:f.checked, known: !!(f as any).known })),
				docs:(d.docs||[]).map(doc=> ({ id:doc.id, originalName:doc.originalName, mimeType:doc.mimeType, url:doc.url }))
			};
		});
		return {
			trip: {
				id: tripId,
				name: title,
				status: draft? 'DRAFT':'PUBLISHED',
				privacy,
				currency,
				generatedAt: new Date().toISOString(),
				targetNights,
				totalNights,
				geocodedDestinations: geocodedCount,
				legCount: legs.length,
				routeDistanceKm: Number(routeDistanceKm.toFixed(2))
			},
			itinerary,
			legs,
			expenses: planner.expenses || [],
			budget: planner.tripBudget ?? null,
			comments: planner.comments || [],
			pinnedDocIds: planner.pinnedDocIds || [],
			globalDocs: (planner.globalDocs||[]).map(d=> ({ id:d.id, originalName:d.originalName, mimeType:d.mimeType, url:d.url })),
			visaDocs: (planner.visaDocs||[]).map(d=> ({ id:d.id, originalName:d.originalName, mimeType:d.mimeType, url:d.url })),
			destinationDocsCount,
			version: 1
		};
	}, [planner, tripId, title, privacy, currency, targetNights, totalNights, geocodedCount]);

	// Ref storing latest prepared payload for backend
	const persistedPayloadRef = React.useRef<any>(null);
	const persistToBackend = async (payload:any) => {
		if(!authToken){ console.warn('[TripPlanner] Cannot persist – no auth token'); openToast('error','Not signed in'); return; }
		const now = Date.now();
		if(saving || (now - lastSaveTs) < 1200){
			console.warn('[TripPlanner] Save ignored (debounced or already saving)');
			return;
		}
		setSaving(true);
		setLastSaveTs(now);
		try {
			await apiServices.updateTrip(authToken, tripId, payload);
			console.log('[TripPlanner] Persisted trip successfully (PUT /trips)', { tripId, status: payload.trip.status });
			setLastSavedDisplay(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
			openToast('success', payload.trip.status==='DRAFT'? 'Draft saved':'Trip updated');
		} catch(err:any){
			console.error('[TripPlanner] Backend persistence failed', err?.response?.status, err?.message);
			openToast('error','Save failed');
		} finally {
			setSaving(false);
		}
	};

	const handlePublish = () => {
		if(!isOwnerExternal) return; // safety
		if(isDraft){
			// Build enriched published payload (draft=false)
			const payload = buildPersistPayload(false);
			// Console preview
			// eslint-disable-next-line no-console
			console.log('TRIPICIAN_PUBLISH_PAYLOAD =>', payload, '\nJSON STRING =>', JSON.stringify(payload, null, 2));
			persistedPayloadRef.current = payload;
			// Persist first, then commit snapshot to update dirty signature
			persistToBackend(payload);
			commitSnapshot(false);
		} else {
			// Unpublish -> revert to draft
			commitSnapshot(true);
			console.log('[TripPlanner] Unpublish -> back to draft');
			openToast('info','Trip reverted to draft');
		}
	};

	return (
		<React.Fragment>
		<Box sx={{ display:'flex', flexDirection:'row', height:'100vh', overflow:'hidden' }}>
	<CreateTripNav active={section} onChange={(id)=> setSectionDebug(id as any)} onSettingsClick={()=> setSettingsOpen(true)} hideSections={hideSections} />
			<Box sx={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:0 }}>
				<TopBar showSearch={false} centerNode={
					<Box sx={{ display:'flex', alignItems:'center' }}>
						{editingTitle ? (
							<Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
								<InputBase value={title} onChange={e=> setTitle(e.target.value)} autoFocus onBlur={()=> setEditingTitle(false)} disabled={isExternalNonOwner} sx={{ px:1.2, py:.5, borderRadius:1.5, fontWeight:600, fontSize:18, border:(t)=>`1px solid ${t.palette.divider}`, background:(t)=> t.palette.mode==='dark'? '#1e2936':'#f5f7f9', minWidth:180, opacity:isExternalNonOwner? .6:1 }} />
								{!isExternalNonOwner && <IconButton size='small' onClick={()=> setEditingTitle(false)}><CheckIcon fontSize='small' /></IconButton>}
							</Box>
						) : (
							<Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
								<Typography variant='h6' fontWeight={600} noWrap sx={{ cursor:isDraft && !isExternalNonOwner ? 'text':'default' }} onClick={()=> { if(isDraft && !isExternalNonOwner) setEditingTitle(true); }}>{title}</Typography>
								{isDraft && !isExternalNonOwner && <IconButton size='small' onClick={()=> setEditingTitle(true)} sx={{ ml:-.5 }}><EditIcon fontSize='small' /></IconButton>}
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
								<ImportantNotesEditor compact readOnly={isExternalNonOwner} />
							</Box>
							<Box sx={{ ml:'auto', display:'flex', alignItems:'flex-start', gap:3, minWidth:300 }}>
								<Box sx={{ display:'flex', flexDirection:'column', maxWidth:140 }}>
									<Typography variant='caption' color='text.secondary'>Budget ({currency})</Typography>
									<Box sx={{ display:'flex', alignItems:'center', gap:.5 }}>
										<Typography variant='body2' fontWeight={600}>
											{(planner.tripBudget!=null ? planner.tripBudget : 0).toFixed(2)}
										</Typography>
										<Button size='small' variant='text' onClick={readOnly? undefined : openCurrency} disabled={readOnly} endIcon={<ExpandMoreIcon fontSize='small' />} sx={{ textTransform:'none', px:1, minWidth:0 }}>{currency}</Button>
									</Box>
									{!isExternalNonOwner && (
									<Paper role='button' onClick={()=> setVisaOpen(true)} sx={(t)=>({ mt:1.25, cursor:'pointer', width:140, px:1.2, py:1, borderRadius:1, display:'flex', flexDirection:'row', gap:.75, alignItems:'center', border:`1px dashed ${t.palette.divider}`, background: t.palette.mode==='dark'? '#13202b':'#f5fbff', '&:hover':{ borderColor:t.palette.primary.main } })}>
										<Box component='img' src={passportIconUrl} alt='Visa docs' loading='lazy' style={{ width:30, height:30, objectFit:'contain', filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
										<Box sx={{ display:'flex', flexDirection:'column', minWidth:0 }}>
											<Typography variant='caption' sx={{ fontWeight:700, letterSpacing:.4 }}>Visa(s)</Typography>
											<Typography variant='caption' sx={{ opacity:.6, lineHeight:1 }}>{planner.visaDocs?.length||0} file(s)</Typography>
										</Box>
									</Paper>
									)}
								</Box>
								<Box sx={{ display:'flex', flexDirection:'column', maxWidth:140 }}>
									<Typography variant='caption' color='text.secondary'>Privacy</Typography>
									<Box sx={{ display:'flex', alignItems:'center', gap:.5 }}>
										<Typography variant='body2' fontWeight={600}>{privacy}</Typography>
										<Button size='small' variant='text' onClick={readOnly? undefined: openPrivacy} disabled={readOnly} endIcon={<ExpandMoreIcon fontSize='small' />} sx={{ textTransform:'none', px:1, minWidth:0 }} />
									</Box>
									{!isExternalNonOwner && (
									<Paper role='button' onClick={()=> setPinnedOpen(true)} sx={(t)=>({ mt:1.8, cursor:'pointer', width:140, px:1.2, py:1, borderRadius:1, display:'flex', flexDirection:'row', gap:.75, alignItems:'center', border:`1px dashed ${t.palette.divider}`, background: t.palette.mode==='dark'? '#181c24':'#f7f7fa', '&:hover':{ borderColor:t.palette.primary.main } })}>
										<Box component='img' src={pinnedIconUrl} alt='Pinned docs' loading='lazy' style={{ width:30, height:30, objectFit:'contain', filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
										<Box sx={{ display:'flex', flexDirection:'column', minWidth:0 }}>
											<Typography variant='caption' sx={{ fontWeight:700, letterSpacing:.4 }}>Pinned</Typography>
											<Typography variant='caption' sx={{ opacity:.6, lineHeight:1 }}>{combinedPinnedDocs.length} pinned</Typography>
										</Box>
									</Paper>
									)}
								</Box>
							</Box>
						</Box>
						<Divider />
						{section==='plan' && (
						<Box sx={{ display:'flex', alignItems:'center', px:2, gap:1, py:1 }}>
							<Tabs value={tab} onChange={(e,v)=> {
								// Block navigation into disabled features
								if((v===1 && !ENABLE_EXPENSES) || (v===2 && !ENABLE_COMMENTS)) return;
								handleTabChange(e,v);
							}} variant='scrollable' allowScrollButtonsMobile sx={{ flex:1, minHeight:44, '& .MuiTab-root':{ minHeight:44 } }}>
								<Tab label='Planning' />
								<Tab label={
									<Box sx={{ display:'flex', alignItems:'center', gap:.75 }}>
										<span>Expenses</span>
										{!ENABLE_EXPENSES && <Chip label='Soon' size='small' color='default' sx={{ height:18, fontSize:10 }} />}
									</Box>
								} disabled={!ENABLE_EXPENSES} />
								<Tab label={
									<Box sx={{ display:'flex', alignItems:'center', gap:.75 }}>
										<span>Comments</span>
										{!ENABLE_COMMENTS && <Chip label='Soon' size='small' color='default' sx={{ height:18, fontSize:10 }} />}
									</Box>
								} disabled={!ENABLE_COMMENTS} />
							</Tabs>
							<Box sx={{ display:'flex', alignItems:'center', gap:.75, mr:1 }}>
								<Box sx={{ position:'relative', width:46, height:46 }}>
									<CircularProgress
										variant='determinate'
										value={100}
										size={46}
										thickness={4.2}
										sx={(t)=>({ color: t.palette.mode==='dark'? t.palette.grey[800] : t.palette.grey[300] })}
									/>
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
							{!isExternalNonOwner && (
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
							)}
						</Box>
						)}
						<Divider />
						<Box sx={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
							{section==='plan' && tab===0 && (
								<Box sx={{ px:0 }}>
									{ENABLE_CARD_LAYOUT ? (
										<DestinationCardsPanel maxed={totalNights >= targetNights} readOnly={readOnly} />
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
								{section==='plan' && tab===1 && ENABLE_EXPENSES && <ExpensesPanel readOnly={readOnly} />}
								{section==='plan' && tab===2 && ENABLE_COMMENTS && <TripComments />}
						</Box>
						<Box sx={(t)=>({ borderTop:`1px solid ${t.palette.divider}`, px:2.5, py:1.5, background:t.palette.background.paper, display:'flex', alignItems:'center', justifyContent:'space-between' })}>
							<Typography variant='caption' color='text.secondary'>Last saved: {lastSavedDisplay}</Typography>
							<Box sx={{ display:'flex', gap:1.2 }}>
								{/* Primary draft/update button */}
								<Button
									size='small'
									variant='outlined'
									onClick={()=> {
										if(!isOwnerExternal) return; // safety
										if(!isDraft){
											const payload = buildPersistPayload(false);
											// Console preview before sending
											// eslint-disable-next-line no-console
											console.log('TRIPICIAN_SAVE_PAYLOAD =>', payload, '\nJSON STRING =>', JSON.stringify(payload, null, 2));
											persistedPayloadRef.current = payload;
											persistToBackend(payload);
											commitSnapshot(false); // remain published state after update
										} else {
											const payload = buildPersistPayload(true);
											// eslint-disable-next-line no-console
											console.log('TRIPICIAN_SAVE_PAYLOAD =>', payload, '\nJSON STRING =>', JSON.stringify(payload, null, 2));
											persistedPayloadRef.current = payload;
											persistToBackend(payload);
											commitSnapshot(true); // commit draft snapshot after persist
										}
									}}
									disabled={!isOwnerExternal || !isDirty || saving}
									sx={{ textTransform:'none', borderRadius:2 }}
								>
									{isDraft ? 'Save as Draft' : 'Update'}{saving && <CircularProgress size={16} thickness={5} sx={{ ml:1 }} />}
								</Button>
								{!isOwnerExternal && readOnly && (
									<Button size='small' variant='contained' color='primary' onClick={()=> { onRequestEdit?.(); }} sx={{ textTransform:'none', borderRadius:2 }}>Edit</Button>
								)}
								{isOwnerExternal && (
									<Button
										size='small'
										variant='contained'
										color={isDraft? 'primary':'warning'}
										onClick={()=> {
											if(isDraft){
												// Publish commit
												handlePublish(); // sets isDraft false already
												requestAnimationFrame(()=> { lastCommittedRef.current = computeSignature(); });
											} else {
												// Unpublish -> return to draft
												commitSnapshot(true);
												console.log('[TripPlanner] Unpublish -> back to draft');
												openToast('info','Trip reverted to draft');
											}
										}}
										sx={{ textTransform:'none', borderRadius:2, opacity: isDraft? 1 : 0.7 }}
										disabled={!isOwnerExternal || !isDirty || saving}
									>
										{isDraft? 'Publish' : 'Unpublish'}{saving && <CircularProgress size={16} thickness={5} sx={{ ml:1 }} />}
									</Button>
								)}
							</Box>
						</Box>
					</Box>
					)}
					{section==='plan' && !mapCollapsed && (<><Box onMouseDown={startResize} sx={{ width:4, cursor:'col-resize', background:(t)=> t.palette.mode==='dark'? t.palette.grey[800]: t.palette.grey[200], '&:hover':{ background:(t)=> t.palette.primary.main } }} /><MapPanel widthFraction={mapWidth} /></>)}
					<ChatAssistant />
				</Box>
				{!readOnly && (
				<Menu anchorEl={currencyAnchor} open={Boolean(currencyAnchor)} onClose={closeCurrency} elevation={3}>
					{(['EUR','USD','GBP'] as const).map(c=> (<MenuItem key={c} selected={c===currency} onClick={()=> selectCurrency(c)}><Avatar sx={{ width:20, height:20, mr:1, fontSize:11 }}>{c==='EUR'?'€': c==='USD'? '$':'£'}</Avatar>{c}</MenuItem>))}
				</Menu>
				)}
				{!readOnly && (
				<Menu anchorEl={privacyAnchor} open={Boolean(privacyAnchor)} onClose={closePrivacy} elevation={3}>
					{(['Private','Trip Members','My Followers','Everyone'] as const).map(p=> (<MenuItem key={p} selected={p===privacy} onClick={()=> selectPrivacy(p)}>{p}</MenuItem>))}
				</Menu>
				)}
				{!isExternalNonOwner && (
				<Dialog open={visaOpen} onClose={()=> setVisaOpen(false)} fullWidth maxWidth='sm'>
					<DialogTitle>Visa Documents</DialogTitle>
					<DialogContent dividers>
						<ValidatedFileInput
						  buttonLabel='Upload File(s)'
						  onAccept={(accepted)=> {
							setVisaErrors([]);
							accepted.forEach(f=> {
							  try {
								const url = URL.createObjectURL(f);
								dispatch(addVisaDoc({ doc:{ id: 'visa_'+Date.now()+'_'+Math.random().toString(36).slice(2), originalName:f.name, mimeType:f.type, url } }));
							  } catch(err){ console.error('[VisaUpload] object URL failed', err); }
							});
						  }}
						  rule={DEFAULT_DOC_RULE}
						  multiple
						  hideErrors
						  sx={{ mb:2 }}
						/>
						{/* Display aggregated errors captured via state for backwards compatibility */}
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
				)}
				{!isExternalNonOwner && (
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
				)}
			</Box>
			<TripSettingsDialog
				open={settingsOpen}
				onClose={()=> setSettingsOpen(false)}
				title={title}
				startDate={tripStartDate || planner.destinations[0]?.startDate || new Date().toISOString().slice(0,10)}
				endDate={tripEndDate || planner.destinations[planner.destinations.length-1]?.endDate || tripStartDate || new Date().toISOString().slice(0,10)}
				privacy={privacy}
				members={[{ id:'me', name: "Rover's Compass", handle:'@username', avatar: undefined, role:'Owner' }]}
				onChangeTitle={(t)=> setTitle(t)}
	onChangeStartDate={()=> {/* future: update chain */}}
	onChangeEndDate={()=> {/* future: update chain */}}
				onChangePrivacy={(p)=> setPrivacy(p as any)}
				onDeleteTrip={()=> { setSettingsOpen(false); }}
				onInviteEmail={async(email)=> { console.log('Invite email placeholder', email); }}
			/>
		</Box>
		<Snackbar open={toast.open} autoHideDuration={3000} onClose={closeToast} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
			<Alert onClose={closeToast} severity={toast.type} variant='filled' sx={{ boxShadow:2 }}>
				{toast.msg}
			</Alert>
		</Snackbar>
		</React.Fragment>
	);
};

export default TripPlanner;
