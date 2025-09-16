import React from 'react';
import { Box, Tabs, Tab, Typography, Divider, Button, Chip, Menu, MenuItem, Avatar, CircularProgress, Tooltip, IconButton } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setCurrency as setCurrencyAction, updateDestinationNights, setTransport, addDestination, removeDestination, reorderChain } from '../../store/plannerSlice';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// Map removed per updated requirements
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { useTheme } from '@mui/material/styles';
import CreateTripNav from './CreateTripNav';
import DestinationsPanel, { type DestinationRow } from './DestinationsPanel';
import DayByDayPanel from './DayByDayPanel';
import TripComments from './TripComments';
import ChatAssistant from '../../components/CommonComponents/ChatAssistant';
import MapPanel from './MapPanel';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import AltRouteIcon from '@mui/icons-material/AltRoute';

// Theme-aware logo: use black variant in light mode, white variant in dark mode, with fallbacks
const PlannerLogo: React.FC = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const whiteLogo = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_URL || import.meta.env.VITE_TRIPICIAN_LOGO_URL;
    const blackLogo = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_BLACK_URL || whiteLogo;
    const logoSrc = isDark ? whiteLogo : blackLogo;

    return (
    	<Box
    		sx={{
    			display: 'flex',
    			alignItems: 'center',
    			cursor: 'pointer',
                mt: 0.5,
    			maxHeight: 48,
    			'&:hover': { opacity: 0.9 },
    			transition: 'opacity .25s ease'
    		}}
    		onClick={() => window.location.href = '/home'}
    	>
    		<img
    			src={logoSrc}
    			alt="Tripician Logo"
    			style={{ height: 40, width: 'auto', display: 'block' }}
    		/>
    	</Box>
    );
};

const CreateTrip: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const [tab, setTab] = React.useState(0);
	const [currencyAnchor, setCurrencyAnchor] = React.useState<null | HTMLElement>(null);

	const planner = useSelector((s: RootState) => s.planner);
	const currency = planner.currency;
	const targetNights = planner.targetNights;

	// Route optimization UI state
	const [optimizingRoute, setOptimizingRoute] = React.useState(false);
	const geocodedCount = React.useMemo(() => planner.destinations.filter(d=> d.lat!=null && d.lng!=null).length, [planner.destinations]);

	// Map planner destinations to panel shape (format dates nicely)
	const dateFormatter = React.useCallback((iso: string) => {
		try {
			const d = new Date(iso + 'T00:00:00');
			return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
		} catch { return iso; }
	}, []);

	const panelDestinations: DestinationRow[] = React.useMemo(() => planner.destinations.map(d => ({
		id: d.id,
		name: d.name,
		start: dateFormatter(d.startDate),
		end: dateFormatter(d.endDate),
		nights: d.nights,
		transport: d.transport || '',
		todo: ''
	})), [planner.destinations, dateFormatter]);

	const totalNights = planner.destinations.reduce((a,c)=>a+c.nights,0);

	// Map panel layout state
	const [mapCollapsed, setMapCollapsed] = React.useState(false);
	const [mapWidth, setMapWidth] = React.useState(0.40); // 40% initial fraction
	const containerRef = React.useRef<HTMLDivElement|null>(null);
	const resizingRef = React.useRef(false);
	const startResize = (e: React.MouseEvent) => {
		if (mapCollapsed) return;
		resizingRef.current = true;
		document.body.style.cursor = 'col-resize';
		e.preventDefault();
	};
	React.useEffect(()=>{
		const handleMove = (e: MouseEvent) => {
			if(!resizingRef.current || !containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			const leftWidth = e.clientX - rect.left;
			const ratioLeft = Math.min(0.80, Math.max(0.20, leftWidth / rect.width));
			setMapWidth(1 - ratioLeft);
		};
		const handleUp = () => { if(resizingRef.current){ resizingRef.current=false; document.body.style.cursor=''; }};
		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseup', handleUp);
		return ()=>{ window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
	}, []);
	const openCurrency = (e: React.MouseEvent<HTMLButtonElement>) => setCurrencyAnchor(e.currentTarget);
	const closeCurrency = () => setCurrencyAnchor(null);
	const selectCurrency = (c: 'EUR'|'USD'|'GBP') => { dispatch(setCurrencyAction(c)); closeCurrency(); };
	const handleTabChange = (_: any, value: number) => setTab(value);
	const handleChangeNights = (id: string, delta: number) => {
		dispatch(updateDestinationNights({ id, delta }));
	};
	const handleChangeTransport = (id: string, mode: string) => {
		dispatch(setTransport({ id, transport: mode }));
	};
	const handleAddDestination = (name: string, coords?: { lat: number; lng: number }) => {
		dispatch(addDestination({ name, lat: coords?.lat, lng: coords?.lng }));
	};
	const handleRemoveDestination = (id: string) => {
		dispatch(removeDestination(id));
	};

	// Compute shortest route (simple heuristic) keeping first destination fixed
	const computeShortestRoute = () => {
		const list = planner.destinations.filter(d=> d.lat!=null && d.lng!=null);
		if (list.length < 3) return; // need at least start + 2
		const start = list[0];
		const others = list.slice(1);
		const dist = (a: any, b: any) => {
			const dx = (a.lat - b.lat); const dy = (a.lng - b.lng);
			return Math.sqrt(dx*dx + dy*dy);
		};
		// Nearest neighbor initial path
		const remaining = [...others];
		const path: any[] = [start];
		let current = start;
		while(remaining.length) {
			let bestIdx = 0; let bestD = Infinity;
			for (let i=0;i<remaining.length;i++) {
				const d = dist(current, remaining[i]);
				if (d < bestD) { bestD = d; bestIdx = i; }
			}
			current = remaining.splice(bestIdx,1)[0];
			path.push(current);
		}
		// 2-opt improvement (limited iterations)
		const twoOptSwap = (arr: any[], i: number, k: number) => {
			const res = arr.slice(0,i).concat(arr.slice(i,k+1).reverse()).concat(arr.slice(k+1));
			return res;
		};
		const routeDistance = (arr: any[]) => arr.reduce((acc,_,i)=> i===0?0:acc+dist(arr[i-1],arr[i]),0);
		let improved = true; let best = path; let bestLen = routeDistance(best);
		let iterations=0;
		while(improved && iterations<30) {
			improved = false; iterations++;
			for (let i=1;i<best.length-2;i++) { // skip first fixed
				for (let k=i+1;k<best.length-1;k++) {
					const swapped = twoOptSwap(best,i,k);
					const len = routeDistance(swapped);
					if (len < bestLen - 1e-6) { best=swapped; bestLen=len; improved=true; }
				}
			}
		}
		const ids = best.map(d=> d.id);
		dispatch(reorderChain({ ids }));
		// Emit event for MapPanel to draw polyline (optional) or rely on marker reorder detection
		window.dispatchEvent(new CustomEvent('tripician:route-updated', { detail: { ids } }));
	};

	const handleOptimizeRouteClick = () => {
		if (optimizingRoute) return;
		if (geocodedCount < 3) return;
		setOptimizingRoute(true);
		// Allow spinner to render even though computation is fast
		requestAnimationFrame(() => {
			try { computeShortestRoute(); }
			finally { setTimeout(()=> setOptimizingRoute(false), 60); }
		});
	};

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
			<TopBar showSearch={false} logo={<PlannerLogo />} />
			<Box ref={containerRef} sx={{ flex: 1, display: 'flex', minHeight: 0, position:'relative' }}>
				{/* Left vertical nav */}
				<CreateTripNav />
				{/* Planning panel (rest width beside map) */}
				<Box
					sx={(theme) => ({
						flexBasis: mapCollapsed ? '100%' : `calc(${(1 - mapWidth)*100}% - 2px)`,
						maxWidth: mapCollapsed ? '100%' : `calc(${(1 - mapWidth)*100}% - 2px)`,
						minWidth: 0,
						flexShrink: 0,
						display: 'flex',
						flexDirection: 'column',
						backgroundColor: theme.palette.background.paper,
						borderRight: mapCollapsed ? 'none' : { lg: `1px solid ${theme.palette.divider}` },
						transition: resizingRef.current ? 'none' : 'flex-basis .18s ease'
					})}
				>
					{/* Header row redesigned */}
					<Box sx={{ p:3, display:'flex', alignItems:'center', gap:3, flexWrap:'wrap' }}>
						<Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
							<Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
								<Typography variant='h6' fontWeight={600} noWrap>Trip Title</Typography>
								<Chip size='small' label='Draft' sx={{ fontSize:11, fontWeight:500 }} />
							</Box>
							<Typography variant='body2' color='text.secondary'>11 September - 19 September</Typography>
						</Box>
						<Box sx={{ ml:'auto', display:'flex', alignItems:'center', gap:3, flexWrap:'wrap' }}>
							<Box sx={{ display:'flex', flexDirection:'column' }}>
								<Typography variant='caption' color='text.secondary'>Budget ({currency})</Typography>
								<Box sx={{ display:'flex', alignItems:'center', gap:.5 }}>
									<Typography variant='body2' fontWeight={600}>0.00</Typography>
									<Button size='small' variant='text' onClick={openCurrency} endIcon={<ExpandMoreIcon fontSize='small' />} sx={{ textTransform:'none', px:1, minWidth:0 }}>{currency}</Button>
								</Box>
							</Box>
							<Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
								<Box sx={{ position:'relative', width:52, height:52 }}>
									<CircularProgress variant='determinate' value={Math.min(100, (totalNights/targetNights)*100)} size={52} thickness={4} />
									<Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
										<Typography variant='caption' fontWeight={600}>{totalNights}/{targetNights}</Typography>
									</Box>
								</Box>
								<Box sx={{ display:'flex', flexDirection:'column' }}>
									<Typography variant='caption' color='text.secondary'>Nights planned</Typography>
									<Typography variant='body2' fontWeight={600}>{totalNights} / {targetNights}</Typography>
								</Box>
							</Box>
							<Button size='small' variant='outlined' onClick={()=> setMapCollapsed(c=> !c)} sx={{ minWidth:0, px:1 }} startIcon={mapCollapsed ? <OpenInFullIcon fontSize='small' /> : <CloseFullscreenIcon fontSize='small' />}>{mapCollapsed? 'Show map' : 'Hide map'}</Button>
						</Box>
					</Box>
					<Menu anchorEl={currencyAnchor} open={Boolean(currencyAnchor)} onClose={closeCurrency} elevation={3}>
						{(['EUR','USD','GBP'] as const).map(c => (
							<MenuItem key={c} selected={c===currency} onClick={()=>selectCurrency(c)}>
								<Avatar sx={{ width:20, height:20, mr:1, fontSize:11 }}>{c==='EUR'? '€': c==='USD'? '$':'£'}</Avatar>
								{c}
							</MenuItem>
						))}
					</Menu>
					<Divider />
					{/* Tabs row with action button on right */}
								<Box sx={{ display:'flex', alignItems:'center', px:2 }}>
									<Tabs value={tab} onChange={handleTabChange} variant='scrollable' allowScrollButtonsMobile sx={{ flex:1 }}>
										<Tab label='Destinations' />
										<Tab label='Day by day' />
										<Tab label='Comments' />
									</Tabs>
									<Tooltip
										arrow
										placement='top'
										title={geocodedCount < 3 ? 'Add at least 3 destinations with coordinates to optimize' : optimizingRoute ? 'Optimizing route...' : 'Optimize route (keeps first fixed)'}
									>
										<span>
											<IconButton
												aria-label='Optimize route'
												onClick={handleOptimizeRouteClick}
												disabled={geocodedCount < 3 || optimizingRoute}
												sx={{ ml:1, bgcolor:'primary.main', color:'primary.contrastText', borderRadius:2, '&:hover':{ bgcolor:'primary.dark' }, '&.Mui-disabled':{ bgcolor:'action.disabledBackground', color:'text.disabled' } }}
											>
												{optimizingRoute ? <CircularProgress size={20} color='inherit' thickness={5} /> : <AltRouteIcon fontSize='small' />}
											</IconButton>
										</span>
									</Tooltip>
								</Box>
					<Divider />
					{/* Panel Content */}
					<Box sx={{ flex: 1, overflowY: 'auto' }}>
						{tab === 0 && <DestinationsPanel destinations={panelDestinations} maxed={totalNights >= targetNights} onChangeNights={handleChangeNights} onChangeTransport={handleChangeTransport} onAddDestination={handleAddDestination} onRemoveDestination={handleRemoveDestination} />}
						{tab === 1 && <DayByDayPanel />}
						{tab === 2 && <TripComments />}
					</Box>
				</Box>
				{!mapCollapsed && (
					<>
						{/* Resize handle */}
						<Box onMouseDown={startResize} sx={{ width:4, cursor:'col-resize', background:(theme)=> theme.palette.mode==='dark'? theme.palette.grey[800]: theme.palette.grey[200], '&:hover':{ background:(theme)=> theme.palette.primary.main } }} />
						<MapPanel widthFraction={mapWidth} />
					</>
				)}
				{mapCollapsed && null}
				<ChatAssistant />
			</Box>
		</Box>
	);
};

export default CreateTrip;
