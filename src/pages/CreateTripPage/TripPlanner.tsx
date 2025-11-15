// TripPlanner main page component (formerly CreateTrip)
import React from 'react';
import { Box, Tabs, Tab, Typography, Divider, Button, Chip, Menu, MenuItem, Avatar, Tooltip, IconButton, InputBase, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Snackbar, Alert, TextareaAutosize } from '@mui/material';
// Props-based TripPlanner; tripId + optional initialTrip provided by route wrapper
import DownloadIcon from '@mui/icons-material/Download';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setCurrency as setCurrencyAction, updateDestinationNights, setTransport, addDestination, removeDestination, reorderChainExact, addVisaDoc, removeVisaDoc, removeGlobalDoc, pinDoc, unpinDoc, loadState, resetPlanner } from '../../store/plannerSlice';
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
import ImportantNotesEditor from './ImportantNotesEditor'; // legacy rich editor (temporarily disabled)
import TripComments from './TripComments';
import PackingPanel from './PackingPanel';
import ChatAssistant from '../../components/CommonComponents/ChatAssistant';
import MapPanel from './MapPanel';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
// Removed useLocation to allow TripPlanner usage outside Router context.
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import Docs from '../DocsPage/Docs';
import SoonTag from '../../components/CommonComponents/SoonTag';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { normalizeTrip, type NormalizedTrip } from '../../utils/normalizeTrip';
import { differenceInDays } from 'date-fns';

// Helper: ensure date string conforms to YYYY-MM-DD for HTML date inputs & backend consistency.
// Accepts ISO strings like 2025-10-26T00:00:00Z or with milliseconds; returns date portion.
const sanitizeDateString = (v: string | null | undefined): string | null => {
	if (!v) return null;
	// Fast path already correct
	if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
	// Extract first 10 chars if starts with ISO pattern
	if (v.length >= 10 && /\d{4}-\d{2}-\d{2}T/.test(v)) {
		const base = v.slice(0,10);
		if (/^\d{4}-\d{2}-\d{2}$/.test(base)) return base;
	}
	// Fallback: try Date parse then rebuild YYYY-MM-DD
	try {
		const d = new Date(v);
		if (!isNaN(d.getTime())) {
			const m = (d.getMonth()+1).toString().padStart(2,'0');
			const day = d.getDate().toString().padStart(2,'0');
			return `${d.getFullYear()}-${m}-${day}`;
		}
	} catch {}
	return v.length >= 10 ? v.slice(0,10) : v; // last resort
};

// Props interface (lightweight; align with TripPlannerRoute expectations)
interface TripPlannerProps {
	tripId: string;
	initialTrip?: any;
	readOnly?: boolean;
	hideSections?: string[] | boolean;
	canAccessDocs?: boolean;
	effectiveCanEdit?: boolean; // editing permission after external view logic
	showPlannerActions?: boolean; // show save/publish buttons
	showViewEditAction?: boolean; // show Edit button when in view mode
	onRequestEdit?: () => void;
	isExternalNonOwner?: boolean; // viewing someone else's published trip
	isOwnerExternal?: boolean; // current user owns trip (controls publish)
}

const TripPlanner: React.FC<TripPlannerProps> = ({
	tripId,
	initialTrip,
	readOnly = false,
	hideSections = [],
	canAccessDocs = true,
	effectiveCanEdit = true,
	showPlannerActions = true,
	showViewEditAction = false,
	onRequestEdit,
	isExternalNonOwner = false,
	isOwnerExternal = true,
}) => {
	// ---------------------------------------------------------------------------
	// Selectors & dispatch
	// ---------------------------------------------------------------------------
	const dispatch = useDispatch<AppDispatch>();
	const planner = useSelector((s:RootState)=> s.planner);
	const docsState = useSelector((s:RootState)=> s.docs);
		const auth = useAuthToken();
		const authToken = auth.token; // string | null

	// Normalize initial trip (stable backend shape: { trip, itinerary })
		const normalizedInitial = React.useMemo<NormalizedTrip | null>(() => initialTrip ? normalizeTrip(initialTrip) : null, [initialTrip]);
		// Early raw meta extraction (before hydration) to prevent save race overwriting dates with 'today'
		const earlyRawTrip = React.useMemo<any>(() => {
			if(!initialTrip) return null;
			const root = initialTrip.trip && typeof initialTrip.trip === 'object' ? initialTrip.trip : initialTrip;
			return root;
		}, [initialTrip]);
	// Support direct page reload without location.state by performing a fallback fetch.
	const [remoteTrip, setRemoteTrip] = React.useState<any|null>(null);
	const unifiedTrip = React.useMemo(()=> {
		return normalizedInitial || (remoteTrip ? normalizeTrip(remoteTrip) : null);
	}, [normalizedInitial, remoteTrip]); // naming retained for downstream references
	const hydratedRef = React.useRef<string | null>(null);
	// Preserve original creation start/end dates (first hydration) so itinerary edits don't implicitly adjust them.
	const originalDatesRef = React.useRef<{ start:string|null; end:string|null }|null>(null);
	// Seed originalDatesRef from earlyRawTrip if available and not yet set (pre-hydration reload safeguard)
	if(!originalDatesRef.current && earlyRawTrip) {
		const rawStart = sanitizeDateString(earlyRawTrip.startDate) || null;
		const rawEnd = sanitizeDateString(earlyRawTrip.endDate) || null;
		if(rawStart || rawEnd) {
			originalDatesRef.current = { start: rawStart, end: rawEnd };
		}
	}

	// Core meta state
	const [title, setTitle] = React.useState<string>(normalizedInitial?.meta.name || 'Untitled Trip');
	const [editingTitle, setEditingTitle] = React.useState(false);
	// Notes field (plain text, auto-grow) seeded from normalized initial trip meta if present
	const [importantNotes, setImportantNotes] = React.useState<string>(
		(normalizedInitial?.meta.importantNotes && typeof normalizedInitial.meta.importantNotes === 'string')
			? normalizedInitial.meta.importantNotes
			: ''
	);
	
	const notesRef = React.useRef<HTMLTextAreaElement | null>(null);
	const [privacy, setPrivacy] = React.useState<'Private'|'Trip Members'|'My Followers'|'Everyone'>('Private');
	const [tripStartDate, setTripStartDate] = React.useState<string|null>(normalizedInitial?.meta.startDate ? sanitizeDateString(normalizedInitial.meta.startDate) : null);
	const [tripEndDate, setTripEndDate] = React.useState<string|null>(normalizedInitial?.meta.endDate ? sanitizeDateString(normalizedInitial.meta.endDate) : null);
	// Draft flag: derive from raw initialTrip.trip.status if provided; fallback to true
	const initialStatus = (initialTrip && initialTrip.trip && typeof initialTrip.trip.status === 'string') ? String(initialTrip.trip.status).toUpperCase() : undefined;
	const [isDraft, setIsDraft] = React.useState<boolean>(initialStatus ? initialStatus !== 'PUBLISHED' : true);

	// Section + tab UI state
	const [section, setSection] = React.useState<'plan'|'news'|'docs'|'packing'>('plan');
	const setSectionDebug = (s:any)=> setSection(s); // preserve prop expectation
	const [tab, setTab] = React.useState(0);

	// Derived counts
	const totalNights = React.useMemo(()=> planner.destinations.reduce((a,d)=> a + (d.nights||0), 0), [planner.destinations]);
	const targetNights = planner.targetNights || totalNights || 1;
	const currency = planner.currency || 'EUR';

	// Dirty tracking (signature of key planning fields)
	const lastCommittedRef = React.useRef<string>('');
	const persistedPayloadRef = React.useRef<any|null>(null);
	const computeSignature = React.useCallback(()=> {
		return JSON.stringify({
			t:title,
			p:privacy,
			s:tripStartDate,
			e:tripEndDate,
			d:planner.destinations.map(d=> ({ id:d.id, n:d.name, sd:d.startDate, ed:d.endDate, nts:d.nights, lat:d.lat, lng:d.lng, tr:d.transport })),
			c:currency,
			dr:isDraft,
			in:importantNotes.trim()
		});
	}, [title, privacy, tripStartDate, tripEndDate, planner.destinations, currency, isDraft, importantNotes]);
	const commitSnapshot = React.useCallback((draft:boolean)=> { setIsDraft(draft); lastCommittedRef.current = computeSignature(); }, [computeSignature]);
	React.useEffect(()=> { if(!lastCommittedRef.current) lastCommittedRef.current = computeSignature(); }, [computeSignature]);
	const isDirty = computeSignature() !== lastCommittedRef.current;
	// Hydration status flag
	const isHydrated = Boolean(hydratedRef.current);


	// Fallback remote fetch when initialTrip absent (direct reload of planner route)
	React.useEffect(()=> {
		if(initialTrip || remoteTrip || !tripId) return;
		if(!authToken) return; // wait for token before network fetch
		let active = true;
		(async()=> {
			try {
				const resp = await apiServices.getTripById(authToken, tripId);
				if(!active) return;
				if(resp?.data){
					setRemoteTrip(resp.data);
				}
			} catch(err) {
				// silent fail; user can retry later
			}
		})();
		return ()=> { active=false; };
	}, [initialTrip, remoteTrip, tripId, authToken]);

	// Hydration effect (simplified for stable backend shape)
	React.useEffect(() => {
		if (!unifiedTrip) return;
		const { meta, itinerary } = unifiedTrip;
		if (hydratedRef.current === meta.id) return;
		if (title === 'Untitled Trip' && !editingTitle) setTitle(meta.name);
		// hydrate notes (fallback to meta.importantNotes or meta.notes if present)
		try {
			const candidate = (meta as any).importantNotes || (meta as any).notes;
			if (typeof candidate === 'string' && candidate.trim().length) setImportantNotes(candidate);
		} catch {}
		setPrivacy((() => {
			const v = (meta.visibility||'').toLowerCase();
			if (v.startsWith('every')) return 'Everyone';
			if (v.startsWith('trip')) return 'Trip Members';
			if (v.startsWith('my')) return 'My Followers';
			return 'Private';
		})());
		const metaStart = sanitizeDateString(meta.startDate) || null;
		const metaEnd = sanitizeDateString(meta.endDate) || null;
		setTripStartDate(metaStart);
		setTripEndDate(metaEnd);
		if(!originalDatesRef.current) {
			originalDatesRef.current = { start: metaStart, end: metaEnd };
		}
		const allowedCurrencies = ['EUR','USD','GBP'] as const;
		const currencyCode = meta.currencyCode;
		const normalizedCurrency = allowedCurrencies.includes(currencyCode as any) ? currencyCode as typeof allowedCurrencies[number] : 'EUR';
		const hydratedDestinations = itinerary.map((it:any, idx:number) => {
			const startDateRaw = sanitizeDateString(it.startDate) || new Date().toISOString().slice(0,10);
			const endDateRaw = sanitizeDateString(it.endDate) || sanitizeDateString(it.startDate) || startDateRaw;
			// Recalculate nights from date range if backend value missing or clearly wrong (e.g., always 1 despite multi-day span)
			const rawNightsVal = (it as any).nights;
			let nightsRaw = Number(rawNightsVal);
			if(!isFinite(nightsRaw)) nightsRaw = NaN;
			let diffDays = 0;
			try {
				if(startDateRaw && endDateRaw) {
					diffDays = differenceInDays(new Date(endDateRaw + 'T00:00:00'), new Date(startDateRaw + 'T00:00:00'));
					if(diffDays < 0) diffDays = 0; // guard inverted range
				}
			} catch { diffDays = 0; }
			// Nights semantic: number of overnights; if endDate is checkout day, diffDays already matches nights.
			// Decide final nights:
			//  - If backend gave a valid >=0 number and (diffDays <=1 || nightsRaw > 1), keep it.
			//  - If backend gave 0 or 1 but diffDays > 1, override with diffDays (likely placeholder value).
			//  - If backend missing/invalid (NaN/negative), use diffDays (may be 0 for same-day).
			let nights: number;
			if(isNaN(nightsRaw) || nightsRaw < 0) {
				nights = diffDays; // derive
			} else if(diffDays > 1 && nightsRaw <= 1) {
				nights = diffDays; // override inaccurate placeholder
			} else {
				nights = nightsRaw; // trust backend value
			}
			// Ensure non-negative
			if(nights < 0) nights = 0;
			return {
				id: it.id || ('dest_'+idx),
				name: it.name || 'Destination '+(idx+1),
				startDate: startDateRaw,
				endDate: endDateRaw,
				nights,
				transport: it.transport || '',
				budget: it.budget ?? 0,
				lat: typeof it.lat === 'number'? it.lat : undefined,
				lng: typeof it.lng === 'number'? it.lng : undefined,
				placeId: it.placeId || undefined,
				photoUrl: it.photoUrl || undefined,
				category: it.category || 'general',
				completed: !!it.completed,
				spots: Array.isArray(it.spots)? it.spots: [],
				foods: Array.isArray(it.foods)? it.foods: [],
				docs: Array.isArray(it.docs)? it.docs: [],
				notes: it.notes,
				stay: it.stay || undefined
			};
		});
		// Backend target nights preference
		const metaTarget = (meta as any).targetNights;
		const computedTotal = hydratedDestinations.reduce((a,d)=> a + (d.nights||0),0);
		// Derive span nights from trip-level dates if itinerary empty
		let spanDiff = 0;
		try {
			const startMeta = sanitizeDateString(meta.startDate);
			const endMeta = sanitizeDateString(meta.endDate);
			if(startMeta && endMeta) {
				spanDiff = differenceInDays(new Date(endMeta + 'T00:00:00'), new Date(startMeta + 'T00:00:00'));
				if(spanDiff < 0) spanDiff = 0;
			}
		} catch { spanDiff = 0; }
		let effectiveTarget: number; let lockTarget = false;
		if(typeof metaTarget === 'number' && metaTarget > 0) {
			// Explicit backend target overrides everything.
			effectiveTarget = metaTarget; lockTarget = true;
		} else if(spanDiff > 0) {
			// User-defined trip date range: keep target fixed to span regardless of current itinerary fill state.
			effectiveTarget = spanDiff; lockTarget = true;
		} else if(computedTotal > 0) {
			// Fall back to itinerary sum only if no explicit dates / span available.
			effectiveTarget = computedTotal; lockTarget = false;
		} else {
			// Ultimate fallback.
			effectiveTarget = (planner.targetNights || 1); lockTarget = false;
		}
		dispatch(resetPlanner({ tripId: meta.id }));
		dispatch(loadState({
			destinations: hydratedDestinations,
			currency: normalizedCurrency,
			targetNights: effectiveTarget,
			targetLocked: lockTarget,
						tripStartDate: metaStart || undefined,
						tripEndDate: metaEnd || undefined,
			globalDocs: [],
			visaDocs: [],
			pinnedDocIds: [],
			tripBudget: undefined,
			expenses: [],
			simplifyGroupExpenses: false,
			expenseVisibilityEmails: [],
			comments: []
		}));
		hydratedRef.current = meta.id;
		// Commit initial snapshot after first hydration
		requestAnimationFrame(()=> { lastCommittedRef.current = computeSignature(); });
	}, [unifiedTrip, title, editingTitle, dispatch, planner.targetNights, computeSignature]);

	// Centralized feature flags
	const ENABLE_EXPENSES = FEATURE_FLAGS.expenses;
	const ENABLE_COMMENTS = FEATURE_FLAGS.comments;
	const ENABLE_DOC_UPLOAD = FEATURE_FLAGS.docsUpload;
	// (moved earlier)
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
	const [exitConfirmOpen, setExitConfirmOpen] = React.useState(false);
	const [exiting, setExiting] = React.useState(false);
	const [deletingTrip, setDeletingTrip] = React.useState(false);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);

	// Auto-close doc-related dialogs when feature disabled to prevent stray popups
	React.useEffect(()=> {
		if(!ENABLE_DOC_UPLOAD){
			if(visaOpen) setVisaOpen(false);
			if(pinnedOpen) setPinnedOpen(false);
		}
	}, [ENABLE_DOC_UPLOAD, visaOpen, pinnedOpen]);

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
		// diagnostics removed
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
		// route optimization diagnostics removed
		// Use exact reorder allowing first to move
		dispatch(reorderChainExact({ ids: optimizedIds }));
		window.dispatchEvent(new CustomEvent('tripician:route-updated',{ detail:{ ids: optimizedIds }}));
	};
	const handleOptimizeRouteClick=()=>{ if(optimizingRoute||geocodedCount<3) return; setOptimizingRoute(true); requestAnimationFrame(()=>{ try { computeShortestRoute(); } finally { setTimeout(()=> setOptimizingRoute(false),120); } }); };

	// Build backend-ready persistence payload (draft or publish)
	// Mapping Notes (TripPlanImportDto tentative):
	//  - Backend currently expects PUT /trips/{tripId} with a DTO that likely includes
	//    trip-level metadata plus itinerary collection. We retain a `trip` wrapper
	//    for meta to avoid a breaking change while backend stabilizes. If the server
	//    later requires a flattened shape, we can unwrap easily by sending:
	//       { id, name, startDate, endDate, status, privacy, currency, itinerary:[...] }
	//  - Added startDate/endDate fields to trip meta (derived from explicit state or
	//    first/last destination) so backend can compute duration without relying on
	//    itinerary scan.
	//  - Privacy string currently uses UI values (Private, Trip Members, My Followers, Everyone).
	//    Server may map these to enum values (PRIVATE, TRIP_MEMBERS, FOLLOWERS, EVERYONE).
	//    Adjust mapping here if a strict enum is later required.
	//  - Legs, docs, expenses, comments are included for forward compatibility; backend
	//    can ignore unknown properties safely.
	//  - version field reserved for future optimistic concurrency or schema evolution.
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
		// ------------------------------------------------------------------
		// Trip-level start/end persistence strategy
		// ------------------------------------------------------------------
		// Hard rule: Never auto-shift trip start/end to "today" just because they
		// are missing at save time. Preserve the originally hydrated values unless
		// the user has explicitly edited them. This prevents silent date drift.
		const originalStart = originalDatesRef.current?.start || null;
		const originalEnd = originalDatesRef.current?.end || null;
		const sanitizedStart = sanitizeDateString(tripStartDate) || null;
		const sanitizedEnd = sanitizeDateString(tripEndDate) || null;
		// Detect user edits: a value different from original (and non-null) counts as an edit.
		const userEditedStart = sanitizedStart && originalStart && sanitizedStart !== originalStart ? sanitizedStart : (sanitizedStart && !originalStart ? sanitizedStart : null);
		const userEditedEnd = sanitizedEnd && originalEnd && sanitizedEnd !== originalEnd ? sanitizedEnd : (sanitizedEnd && !originalEnd ? sanitizedEnd : null);
		// Final selection prioritizes user edits, then original, then (last resort) sanitized state.
		// We deliberately DO NOT introduce a current-date fallback.
		let finalStart = userEditedStart || originalStart || sanitizedStart || null;
		let finalEnd = userEditedEnd || originalEnd || sanitizedEnd || null;
		// If start exists but end is missing, keep end equal to start (single-day trip invariant)
		if(finalStart && !finalEnd) finalEnd = finalStart;
		// Dev diagnostic: surface any scenario where dates are still null post-hydration
		if(import.meta.env.DEV && isHydrated) {
			if(!finalStart || !finalEnd) {
				console.warn('[TripPersist] Missing trip dates at save. start=', finalStart, 'end=', finalEnd, 'originalRef=', originalDatesRef.current);
			}
			if(finalStart !== originalStart) {
				console.info('[TripPersist] Start date differs from original. original=', originalStart, 'persisting=', finalStart);
			}
			if(finalEnd !== originalEnd) {
				console.info('[TripPersist] End date differs from original. original=', originalEnd, 'persisting=', finalEnd);
			}
		}
		const notesClean = importantNotes.trim();
		return {
			trip: {
				id: tripId,
				name: title,
				status: draft ? 'DRAFT' : 'PUBLISHED',
				privacy,
				currency,
				startDate: finalStart,
				endDate: finalEnd,
				generatedAt: new Date().toISOString(),
				targetNights,
				totalNights,
				geocodedDestinations: geocodedCount,
				legCount: legs.length,
				routeDistanceKm: Number(routeDistanceKm.toFixed(2)),
				importantNotes: notesClean, // always include (empty string signifies clear)
				notes: notesClean // legacy fallback so clearing propagates
			},
			itinerary,
			legs,
			expenses: [],
			docs: [],
			comments: [],
			version: 1
		};
	}, [planner.destinations, tripId, title, privacy, currency, tripStartDate, tripEndDate, targetNights, totalNights, geocodedCount, importantNotes]);

	// Persist helper (debounced save)
	const persistToBackend = React.useCallback(async (payload:any) => {
		if(!authToken){ openToast('error','Not signed in'); return; }
		const now = Date.now();
		if(saving || (now - lastSaveTs) < 1200) return;
		setSaving(true);
		setLastSaveTs(now);
		try {
			await apiServices.updateTrip(authToken, tripId, payload);
			// Update in-memory remoteTrip so navigation without initialTrip still reflects latest
			setRemoteTrip({ trip: payload.trip, itinerary: payload.itinerary });
			setLastSavedDisplay(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
			openToast('success', payload.trip.status==='DRAFT'? 'Draft saved':'Trip updated');
		} catch(err:any){
			openToast('error','Save failed');
		} finally {
			setSaving(false);
		}
	}, [authToken, saving, lastSaveTs, tripId, openToast]);

	const handlePublish = () => {
		if(!isOwnerExternal) return; // safety
		if(isDraft){
			// Build enriched published payload (draft=false)
			const payload = buildPersistPayload(false);
			persistedPayloadRef.current = payload;
			// Persist first, then commit snapshot to update dirty signature
			persistToBackend(payload);
			commitSnapshot(false);
		} else {
			// Unpublish -> revert to draft
			commitSnapshot(true);
			openToast('info','Trip reverted to draft');
		}
	};

	const redirectHome = React.useCallback(() => {
		try { window.location.href = '/'; } catch {}
	}, []);

	const performSaveDraftAndExit = React.useCallback(async () => {
		if(exiting) return; setExiting(true);
		try {
			if(isDirty && isOwnerExternal){
				const payload = buildPersistPayload(true);
				persistedPayloadRef.current = payload;
				await persistToBackend(payload);
				commitSnapshot(true);
			}
			redirectHome();
		} finally { setExiting(false); }
	}, [isDirty, isOwnerExternal, buildPersistPayload, persistToBackend, commitSnapshot, redirectHome, exiting]);

	const handleBackHomeClick = () => {
		if(!isDirty){ redirectHome(); return; }
		setExitConfirmOpen(true);
	};

	const hideSectionsArr: string[] = Array.isArray(hideSections) ? hideSections : [];

	// Build dynamic trip members list (owner + any backend-provided members if structure exists)
	const userProfile = useSelector((s:RootState)=> s.user.profile);
	const tripMembers = React.useMemo(()=> {
		const list: { id:string; name:string; handle:string; avatar?:string; role:'Owner'|'Editor'|'Viewer' }[] = [];
		// Backend may include members in initialTrip.trip.members or initialTrip.members
		const rawMembers: any[] = Array.isArray((initialTrip?.trip as any)?.members) ? (initialTrip!.trip as any).members
			: Array.isArray((initialTrip as any)?.members) ? (initialTrip as any).members : [];
		for(const m of rawMembers){
			try {
				const id = String(m.id || m.userId || Math.random().toString(36).slice(2));
				const nameParts = [m.name, m.fullName, m.fname, m.lname].filter(v=> typeof v==='string' && v.trim());
				let name = nameParts.join(' ').trim();
				if(!name) name = (typeof m.username==='string' && m.username) || 'Member';
				const handle = typeof m.username==='string' && m.username ? '@'+m.username : (typeof m.handle==='string' ? m.handle : '@member');
				const avatar = (m.avatar || m.profilepicture || m.photoUrl) as string | undefined;
				// Role heuristic: if object marks owner/self, else Editor if canEdit flag, else Viewer
				let role: 'Owner'|'Editor'|'Viewer' = 'Viewer';
				if(m.role==='Owner' || m.isOwner) role='Owner'; else if(m.role==='Editor' || m.canEdit) role='Editor';
				list.push({ id, name, handle, avatar, role });
			} catch {}
		}
		// Always include current user as Owner (or Viewer if external non-owner) at top if not already present
		if(userProfile){
			const currentId = String(userProfile.id || 'me');
			if(!list.some(m=> m.id===currentId)){
				const name = [userProfile.fname, userProfile.lname].filter(Boolean).join(' ') || userProfile.email || 'You';
				const handle = userProfile.email ? '' : '';
				list.unshift({ id: currentId, name, handle, avatar: userProfile.profilepicture, role: isOwnerExternal? 'Owner':'Viewer' });
			}
		}
		return list;
	}, [initialTrip, userProfile, isOwnerExternal]);
	return (
		<React.Fragment>
		<Box sx={{ display:'flex', flexDirection:'row', height:'100vh', overflow:'hidden' }}>
	<CreateTripNav active={section} onChange={(id)=> setSectionDebug(id as any)} onSettingsClick={()=> setSettingsOpen(true)} hideSections={hideSectionsArr} canAccessDocs={canAccessDocs} docsEnabled={ENABLE_DOC_UPLOAD} />
			<Box sx={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:0 }}>
				<TopBar showSearch={false} logo={
					<Tooltip title='Back to Home'>
						<IconButton
							onClick={handleBackHomeClick}
							sx={{
								width:44,
								height:44,
								borderRadius:'50%',
								color:'text.secondary',
								transition:'background-color .15s ease, transform .15s ease',
								'&:hover':{ backgroundColor:'rgba(0,0,0,0.04)' },
								'&:active':{ transform:'scale(.92)' }
							}}
						>
							<ArrowBackIosNewIcon fontSize='small' />
						</IconButton>
					</Tooltip>
				} centerNode={
					<Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
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
						<Box sx={{ px:2, py:1.25, display:'flex', alignItems:'stretch', gap:2, borderBottom:(t)=>`1px solid ${t.palette.divider}`, position:'relative' }}>
							<Box sx={{ flex:1.4, minWidth:360, display:'flex', alignItems:'stretch' }}>
								{/* Legacy rich editor commented out */}
								<Box sx={{ width:'100%', display:'flex', flexDirection:'column', gap:.75 }}>
									<Paper elevation={0} sx={(t)=>({ p:.75, border:`1px solid ${t.palette.divider}`, borderRadius:1.25, background:t.palette.mode==='dark'? '#1e2933':'#f8fafc' })}>
										<TextareaAutosize
											ref={notesRef}
											value={importantNotes}
											onChange={(e)=> setImportantNotes(e.target.value)}
											minRows={4}
											placeholder={isExternalNonOwner? 'Notes (read only)':'Add trip notes...'}
											readOnly={isExternalNonOwner}
											style={{
												width:'100%',
												fontSize:'13px',
												lineHeight:'1.4',
												padding:'0.6rem 0.7rem',
												borderRadius:6,
												border:'1px solid var(--mui-palette-divider, #ccc)',
												background:'inherit',
												resize:'vertical',
												outline:'none'
											}}
										/>
										<Typography variant='caption' sx={{ opacity:.55, mt:.25 }}>Saved with draft/update.</Typography>
									</Paper>
								</Box>
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
									{canAccessDocs && (
									<Paper
									  role={ENABLE_DOC_UPLOAD? 'button': undefined}
									  aria-disabled={!ENABLE_DOC_UPLOAD}
									  onClick={()=> { if(!ENABLE_DOC_UPLOAD) return; setVisaOpen(true); }}
									  sx={(t)=>({ mt:1.25, cursor: ENABLE_DOC_UPLOAD? 'pointer':'not-allowed', width:140, px:1.2, py:1, borderRadius:1, display:'flex', flexDirection:'row', gap:.75, alignItems:'center', border:`1px dashed ${t.palette.divider}`, background: t.palette.mode==='dark'? '#13202b':'#f5fbff', '&:hover': ENABLE_DOC_UPLOAD? { borderColor:t.palette.primary.main } : undefined, opacity: ENABLE_DOC_UPLOAD? 1: .65 })}
									>
										<Box component='img' src={passportIconUrl} alt='Visa docs' loading='lazy' style={{ width:30, height:30, objectFit:'contain', filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
										<Box sx={{ display:'flex', flexDirection:'column', minWidth:0 }}>
											<Typography variant='caption' sx={{ fontWeight:700, letterSpacing:.4, opacity: ENABLE_DOC_UPLOAD?1:.5 }}>Visa(s)</Typography>
											{ENABLE_DOC_UPLOAD ? (
												<Typography variant='caption' sx={{ opacity:.6, lineHeight:1 }}>{planner.visaDocs?.length||0} file(s)</Typography>
											) : (
												<SoonTag sx={{ mt:.3 }} />
											)}
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
									{canAccessDocs && (
									<Paper
									  role={ENABLE_DOC_UPLOAD? 'button': undefined}
									  aria-disabled={!ENABLE_DOC_UPLOAD}
									  onClick={()=> { if(!ENABLE_DOC_UPLOAD) return; setPinnedOpen(true); }}
									  sx={(t)=>({ mt:1.8, cursor: ENABLE_DOC_UPLOAD? 'pointer':'not-allowed', width:140, px:1.2, py:1, borderRadius:1, display:'flex', flexDirection:'row', gap:.75, alignItems:'center', border:`1px dashed ${t.palette.divider}`, background: t.palette.mode==='dark'? '#181c24':'#f7f7fa', '&:hover': ENABLE_DOC_UPLOAD? { borderColor:t.palette.primary.main } : undefined, opacity: ENABLE_DOC_UPLOAD? 1: .65 })}
									>
										<Box component='img' src={pinnedIconUrl} alt='Pinned docs' loading='lazy' style={{ width:30, height:30, objectFit:'contain', filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
										<Box sx={{ display:'flex', flexDirection:'column', minWidth:0 }}>
											<Typography variant='caption' sx={{ fontWeight:700, letterSpacing:.4, opacity: ENABLE_DOC_UPLOAD?1:.55 }}>Pinned</Typography>
											{ENABLE_DOC_UPLOAD ? (
												<Typography variant='caption' sx={{ opacity:.6, lineHeight:1 }}>{combinedPinnedDocs.length} pinned</Typography>
											) : (
												<SoonTag sx={{ mt:.3 }} />
											)}
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
										{!ENABLE_EXPENSES && <SoonTag />}
									</Box>
								} disabled={!ENABLE_EXPENSES} />
								<Tab label={
									<Box sx={{ display:'flex', alignItems:'center', gap:.75 }}>
										<span>Comments</span>
										{!ENABLE_COMMENTS && <SoonTag />}
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
										<DestinationCardsPanel maxed={totalNights >= targetNights} readOnly={readOnly || !effectiveCanEdit} canAccessDocs={canAccessDocs} canEdit={effectiveCanEdit} />
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
								{showPlannerActions && (
									<>
										{/* Primary draft/update button (only in planner mode) */}
										<Button
											size='small'
											variant='outlined'
											onClick={()=> {
												if(!isOwnerExternal) return; // safety
																									if(!isHydrated){ openToast('error','Trip data still loading'); return; }
																									// Dev logging removed (pre-save)
												if(!isDraft){
													const payload = buildPersistPayload(false);
													persistedPayloadRef.current = payload;
													persistToBackend(payload);
													commitSnapshot(false);
																				// Dev logging removed (post-save update)
												} else {
													const payload = buildPersistPayload(true);
													persistedPayloadRef.current = payload;
													persistToBackend(payload);
													commitSnapshot(true);
																				// Dev logging removed (post-save draft)
												}
											}}
																		disabled={!isOwnerExternal || !isDirty || saving || !isHydrated}
											sx={{ textTransform:'none', borderRadius:2 }}
										>
											{isDraft ? 'Save as Draft' : 'Update'}{saving && <CircularProgress size={16} thickness={5} sx={{ ml:1 }} />}
										</Button>
										{isOwnerExternal && (
											<Button
												size='small'
												variant='contained'
												color={isDraft? 'primary':'warning'}
												onClick={()=> {
																if(!isHydrated){ openToast('error','Trip data still loading'); return; }
																// Dev logging removed (publish pre-save)
													if(isDraft){
														// Publish commit
														handlePublish();
														requestAnimationFrame(()=> { lastCommittedRef.current = computeSignature(); });
																	// Dev logging removed (post-publish)
													} else {
														// Unpublish -> return to draft
														commitSnapshot(true);
														openToast('info','Trip reverted to draft');
																	// Dev logging removed (reverted to draft)
													}
												}}
														sx={{ textTransform:'none', borderRadius:2, opacity: isDraft? 1 : 0.7 }}
														disabled={!isOwnerExternal || !isDirty || saving || !isHydrated}
											>
												{isDraft? 'Publish' : 'Unpublish'}{saving && <CircularProgress size={16} thickness={5} sx={{ ml:1 }} />}
											</Button>
										)}
									</>
								)}
								{showViewEditAction && (
									<Button
										size='small'
										variant='contained'
										color='primary'
										onClick={()=> { onRequestEdit?.(); }}
										sx={{ textTransform:'none', borderRadius:2 }}
									>
										Edit
									</Button>
								)}
							</Box>
						</Box>
					</Box>
					)}
					{section==='plan' && !mapCollapsed && (<><Box onMouseDown={startResize} sx={{ width:4, cursor:'col-resize', background:(t)=> t.palette.mode==='dark'? t.palette.grey[800]: t.palette.grey[200], '&:hover':{ background:(t)=> t.palette.primary.main } }} /><MapPanel widthFraction={mapWidth} /></>)}
					<ChatAssistant />
				</Box>
				{effectiveCanEdit && (
				<Menu anchorEl={currencyAnchor} open={Boolean(currencyAnchor)} onClose={closeCurrency} elevation={3}>
					{(['EUR','USD','GBP'] as const).map(c=> (<MenuItem key={c} selected={c===currency} onClick={()=> selectCurrency(c)}><Avatar sx={{ width:20, height:20, mr:1, fontSize:11 }}>{c==='EUR'?'€': c==='USD'? '$':'£'}</Avatar>{c}</MenuItem>))}
				</Menu>
				)}
				{effectiveCanEdit && (
				<Menu anchorEl={privacyAnchor} open={Boolean(privacyAnchor)} onClose={closePrivacy} elevation={3}>
					{(['Private','Trip Members','My Followers','Everyone'] as const).map(p=> (<MenuItem key={p} selected={p===privacy} onClick={()=> selectPrivacy(p)}>{p}</MenuItem>))}
				</Menu>
				)}
				{canAccessDocs && ENABLE_DOC_UPLOAD && (
				<Dialog open={visaOpen} onClose={()=> setVisaOpen(false)} fullWidth maxWidth='sm'>
					<DialogTitle>Visa Documents</DialogTitle>
					<DialogContent dividers>
						{effectiveCanEdit && ENABLE_DOC_UPLOAD && (
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
						)}
						{!ENABLE_DOC_UPLOAD && <SoonTag sx={{ mb:2 }} />}
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
												{effectiveCanEdit && ENABLE_DOC_UPLOAD && (
													<>
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
													</>
												)}
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
				{canAccessDocs && ENABLE_DOC_UPLOAD && (
				<Dialog open={pinnedOpen} onClose={()=> setPinnedOpen(false)} fullWidth maxWidth='md'>
					<DialogTitle>Pinned Documents</DialogTitle>
					<DialogContent dividers>
						<Typography variant='caption' sx={{ display:'block', mb:1, opacity:.7 }}>Pin documents from other sections (Docs, Visa, etc.). { !effectiveCanEdit && '(view only)' }</Typography>
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
											{effectiveCanEdit && ENABLE_DOC_UPLOAD && (
												<>
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
												</>
											)}
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
				tripId={tripId}
				startDate={tripStartDate || planner.destinations[0]?.startDate || new Date().toISOString().slice(0,10)}
				endDate={tripEndDate || planner.destinations[planner.destinations.length-1]?.endDate || tripStartDate || new Date().toISOString().slice(0,10)}
				privacy={privacy}
				members={tripMembers}
				onChangeTitle={(t)=> setTitle(t)}
		onChangeStartDate={()=> {/* future: update chain */}}
		onChangeEndDate={()=> {/* future: update chain */}}
				onChangePrivacy={(p)=> setPrivacy(p as any)}
				onDeleteTrip={()=> { setConfirmDeleteOpen(true); }}
					onInviteEmail={async(_)=> { /* invite email placeholder */ }}
			/>
			<Dialog open={exitConfirmOpen} onClose={()=> setExitConfirmOpen(false)} maxWidth='xs' fullWidth>
				<DialogTitle>Unsaved Changes</DialogTitle>
				<DialogContent dividers>
					<Typography variant='body2'>You have unsaved changes. Save them as a draft before leaving, or discard changes?</Typography>
				</DialogContent>
				<DialogActions sx={{ justifyContent:'space-between' }}>
					<Button onClick={()=> setExitConfirmOpen(false)} disabled={exiting}>Cancel</Button>
					<Box sx={{ display:'flex', gap:1 }}>
						<Button variant='outlined' onClick={()=> { setExitConfirmOpen(false); performSaveDraftAndExit(); }} disabled={exiting}>{exiting? 'Saving...' : 'Save Draft & Exit'}</Button>
						<Button variant='contained' color='error' onClick={()=> { setExitConfirmOpen(false); redirectHome(); }} disabled={exiting}>Discard & Exit</Button>
					</Box>
				</DialogActions>
			</Dialog>
			{/* Confirm delete trip dialog */}
			<Dialog open={confirmDeleteOpen} onClose={()=> !deletingTrip && setConfirmDeleteOpen(false)} maxWidth='xs' fullWidth>
				<DialogTitle>Delete Trip Plan?</DialogTitle>
				<DialogContent dividers>
					<Typography variant='body2'>Are you sure you want to permanently delete this entire trip plan? This action cannot be undone.</Typography>
				</DialogContent>
				<DialogActions sx={{ justifyContent:'space-between' }}>
					<Button onClick={()=> setConfirmDeleteOpen(false)} disabled={deletingTrip}>Cancel</Button>
					<Button
						variant='contained'
						color='error'
						disabled={deletingTrip}
						onClick={async()=> {
							if(!authToken){ openToast('error','Not signed in'); return; }
							if(deletingTrip) return;
							setDeletingTrip(true);
							try {
								await apiServices.deleteTrip(authToken, tripId);
								openToast('success','Trip deleted');
								setConfirmDeleteOpen(false);
								setSettingsOpen(false);
								setTimeout(()=> { try { window.location.href = '/'; } catch {} }, 300);
							} catch(err){
								openToast('error','Delete failed');
							} finally { setDeletingTrip(false); }
						}}
					>
						{deletingTrip ? 'Deleting...' : 'Delete Trip'}
					</Button>
				</DialogActions>
			</Dialog>
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
