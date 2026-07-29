// TripPlanner main page component (formerly CreateTrip)
import React from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Divider, Button, Avatar, AvatarGroup, Tooltip, IconButton, InputBase, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Snackbar, Alert, useTheme, useMediaQuery, Drawer, Fab } from '@mui/material';
// Props-based TripPlanner; tripId + optional initialTrip provided by route wrapper
import DownloadIcon from '@mui/icons-material/Download';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { updateDestinationNights, setTransport, addDestination, removeDestination, reorderChainExact, addVisaDoc, removeVisaDoc, removeGlobalDoc, pinDoc, unpinDoc, loadState, resetPlanner, setTripDates, setTargetNights, addSpot, addFoodItem, setDestinationNotes, clearDestinationDiscover } from '../../store/plannerSlice';
import { togglePin as togglePinDocSlice, removeDocument as removeDocsSliceDocument } from '../../store/docsSlice';
import { loadPacking } from '../../store/packingSlice';
import { DEFAULT_DOC_RULE } from '../../utils/fileValidation'; // legacy use (validateFiles removed after refactor)
import ValidatedFileInput from '../../components/CommonComponents/ValidatedFileInput';
import CreateTripNav from './TripPlannerNav';
import NewsPanel from './NewsPanel';
import TripSettingsDialog from './TripSettingsDialog';
import DestinationsPanel, { type DestinationRow } from './DestinationsPanel';
import DestinationCardsPanel from './DestinationCardsPanel';
import ExpensesPanel from './ExpensesPanel';
import TripChatPanel from '../../navia/TripChatPanel';
import PackingPanel from './PackingPanel';
import TripPulse, { type PulseDimension } from './TripPulse';
import {
	IconMapPin as PulseRouteIcon,
	IconCalendar as PulseDatesIcon,
	IconMoonStars as PulseNightsIcon,
	IconBed as PulseStaysIcon,
	IconWallet as PulseBudgetIcon,
	IconLuggage as PulseLuggageIcon,
	IconUsers as PulseCrewIcon,
	IconFileDescription as PulseStoryIcon,
	IconShieldCheck,
	IconPlane,
	IconDeviceMobile,
} from '@tabler/icons-react';
import MapDrawer from './MapDrawer';
import TripComments from './TripComments';
import PlanReviewDialog from './PlanReviewDialog';
// Lazy map for the right-rail Map tab (same chunk as MapDrawer's panel)
const SideMapPanel = React.lazy(() => import('./MapPanel'));
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import { fetchUnsplashImage } from '../../services/unsplashService';
import confetti from 'canvas-confetti';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import NightsStayRoundedIcon from '@mui/icons-material/NightsStayRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import Docs from '../DocsPage/Docs';
import SoonTag from '../../components/CommonComponents/SoonTag';
import TripShareModal from '../../components/TripShareModal';
import PublishValidationModal, { type PublishChecks } from './PublishValidationModal';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { apiServices } from '../../services/APIs/apiServices';
import { useNavia, type UseNaviaReturn } from '../../navia/useNavia';
import { planDestination } from '../../navia/naviaService';
import { resolveSpots } from '../../services/placeVerification';
import { suggestCountryItinerary, NaviaRequestError } from '../../navia/naviaService';
import NaviaMessage from '../../navia/NaviaMessage';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { normalizeTrip, type NormalizedTrip } from '../../utils/normalizeTrip';
import { countryNameFromCode } from '../../utils/countryFlags';
import { differenceInDays } from 'date-fns';

type OwnerInfo = { id?: string; email?: string; name?: string; handle?: string; avatar?: string };

const pickFirstString = (...values: any[]): string | undefined => {
	for (const value of values) {
		if (typeof value !== 'string') continue;
		const trimmed = value.trim();
		if (trimmed.length > 0) return trimmed;
	}
	return undefined;
};

const pickFirstId = (...values: any[]): string | undefined => {
	for (const value of values) {
		if (value === undefined || value === null) continue;
		const str = String(value).trim();
		if (str.length > 0) return str;
	}
	return undefined;
};

const normalizeHandle = (value?: string): string | undefined => {
	if (!value) return undefined;
	const trimmed = value.trim().replace(/^@+/, '');
	if (!trimmed) return undefined;
	return `@${trimmed}`;
};

const normalizeCountryLabel = (value?: string): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const direct = countryNameFromCode(trimmed) || countryNameFromCode(trimmed.toUpperCase());
	if (direct) return direct;
	const collapsed = trimmed.replace(/\s+/g, ' ');
	return collapsed
		.split(' ')
		.map(segment => segment ? segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase() : '')
		.join(' ')
		.trim();
};

const normalizeCountryList = (input: unknown): string[] => {
	if (!Array.isArray(input)) return [];
	const normalized = input
		.map(entry => (typeof entry === 'string' ? entry : entry == null ? '' : String(entry)))
		.map(normalizeCountryLabel)
		.filter((entry): entry is string => Boolean(entry));
	return Array.from(new Set(normalized));
};

const deriveOwnerInfo = (tripSources: any[], memberCandidates: any[]): OwnerInfo => {
	const info: OwnerInfo = {};
	const assign = (key: keyof OwnerInfo, value?: string) => {
		if (!value) return;
		if (key === 'email') {
			const lowered = value.toLowerCase();
			if (!info.email) info.email = lowered;
			return;
		}
		if (!info[key]) info[key] = value;
	};
	const processOwnerObject = (owner: any) => {
		if (!owner || typeof owner !== 'object') return;
		const id = pickFirstId(owner.id, owner.Id, owner.userId, owner.UserId);
		const email = pickFirstString(owner.email, owner.Email, owner.userEmail, owner.UserEmail);
		const directName = pickFirstString(owner.name, owner.Name, owner.fullName, owner.FullName, owner.displayName, owner.DisplayName);
		const firstName = pickFirstString(owner.fname, owner.Fname, owner.firstName, owner.FirstName);
		const lastName = pickFirstString(owner.lname, owner.Lname, owner.lastName, owner.LastName);
		const name = directName || (firstName || lastName ? [firstName, lastName].filter(Boolean).join(' ').trim() : undefined);
		const handle = normalizeHandle(pickFirstString(owner.handle, owner.Handle, owner.username, owner.Username, owner.userName));
		const avatar = pickFirstString(owner.avatar, owner.Avatar, owner.profilepicture, owner.profilePicture, owner.photoUrl, owner.PhotoUrl, owner.profilePic, owner.ProfilePic, owner.profilePictureUrl, owner.ProfilePictureUrl);
		assign('id', id);
		assign('email', email);
		assign('name', name);
		assign('handle', handle);
		assign('avatar', avatar);
	};
	const processTripSource = (source: any) => {
		if (!source || typeof source !== 'object') return;
		const root = source.trip && typeof source.trip === 'object' ? source.trip : source;
		const ownerId = pickFirstId(root.OwnerUserId, root.ownerUserId, root.ownerId, root.OwnerId, root.TripOwnerId, root.tripOwnerId, root.tripOwnerUserId, root.ownerUserID);
		const ownerEmail = pickFirstString(root.OwnerEmail, root.ownerEmail, root.ownerUserEmail, root.OwnerUserEmail, root.owner?.email, root.Owner?.email, root.Owner?.Email);
		const ownerName = pickFirstString(root.OwnerName, root.ownerName);
		const handle = normalizeHandle(pickFirstString(root.OwnerHandle, root.ownerHandle));
		const avatar = pickFirstString(root.OwnerAvatar, root.ownerAvatar);
		assign('id', ownerId);
		assign('email', ownerEmail);
		assign('name', ownerName);
		assign('handle', handle);
		assign('avatar', avatar);
		processOwnerObject(root.Owner);
		processOwnerObject(root.owner);
		processOwnerObject(root.TripOwner);
		processOwnerObject(root.tripOwner);
	};
	tripSources.forEach(processTripSource);
	memberCandidates.forEach(candidate => {
		if (!candidate || typeof candidate !== 'object') return;
		const roleRaw = pickFirstString(candidate.role, candidate.Role, candidate.userRole, candidate.UserRole, candidate.membershipRole, candidate.MembershipRole);
		const isOwnerRole = roleRaw ? roleRaw.toLowerCase() === 'owner' : false;
		if (!isOwnerRole && !candidate.isOwner && !candidate.IsOwner && !candidate.isTripOwner && !candidate.IsTripOwner) return;
		processOwnerObject(candidate);
	});
	return info;
};

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
	aiGenerated?: boolean; // when true, auto-generate destinations via Navia on mount
	chatSeed?: { stops: ChatSeedStop[] }; // extracted plan from the Navia home chat (no AI calls needed)
}

/** One extracted stop from the Navia home chat, ready to seed the planner. */
export interface ChatSeedStop {
	name: string;
	nights: number;
	spots: { name: string; description: string }[];
	foods: string[];
	notes: string;
}

/* --- Persistent AI Chat Panel (GitHub Copilot-style right column) --- */
const SUGGESTED_PROMPTS = [
	'Suggest the best route for my destinations',
	'What should I pack for this trip?',
	'Find hidden gems near my stops',
	'Estimate my total travel time',
	'Best local food near my stops?',
];

interface PremiumChatPanelProps { naviaHook: UseNaviaReturn; }

const PremiumChatPanel: React.FC<PremiumChatPanelProps> = ({ naviaHook }) => {
	const { messages, isStreaming, sendMessage } = naviaHook;
	const theme = useTheme();
	const isLight = theme.palette.mode === 'light';
	const [input, setInput] = React.useState('');
	const endRef = React.useRef<HTMLDivElement | null>(null);
	const inputRef = React.useRef<HTMLInputElement | null>(null);

	/* -- Resize & collapse -- */
	const [panelWidth, setPanelWidth] = React.useState(420);
	const [collapsed, setCollapsed] = React.useState(false);
	const panelRef = React.useRef<HTMLDivElement>(null);
	const isResizing = React.useRef(false);
	const resizeStartX = React.useRef(0);
	const resizeStartWidth = React.useRef(420);

	const handleResizeMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		isResizing.current = true;
		resizeStartX.current = e.clientX;
		resizeStartWidth.current = panelRef.current?.offsetWidth || panelWidth;
	};

	React.useEffect(() => {
		const onMove = (e: MouseEvent) => {
			if (!isResizing.current) return;
			const dx = resizeStartX.current - e.clientX;
			const newWidth = Math.max(320, Math.min(760, resizeStartWidth.current + dx));
			setPanelWidth(newWidth);
		};
		const onUp = () => { isResizing.current = false; };
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		return () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		};
	}, []);

	const send = () => {
		if (!input.trim() || isStreaming) return;
		const text = input;
		setInput('');
		sendMessage(text);
		setTimeout(() => inputRef.current?.focus(), 0);
	};

	React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

	return (
		<Box ref={panelRef} sx={{
			width: collapsed ? 44 : panelWidth,
			flexShrink: 0,
			height: '100%',
			display: { xs: 'flex', lg: 'none' },
			flexDirection: 'column',
			borderLeft: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'}`,
			background: isLight ? '#ffffff' : '#0e1012',
			fontFamily: "'Inter', system-ui, sans-serif",
			overflow: 'hidden',
			position: 'relative',
			transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
		}}>
			{/* -- Resize drag handle (left edge) -- */}
			{!collapsed && (
				<Box
					onMouseDown={handleResizeMouseDown}
					sx={{
						position: 'absolute', top: 0, left: 0, bottom: 0, width: 5,
						cursor: 'col-resize', zIndex: 10,
						'&:hover': { background: 'rgba(255,56,92,0.22)' },
						transition: 'background 0.15s',
					}}
				/>
			)}

			{collapsed ? (
				/* -- Collapsed strip -- */
				<Box sx={{ flex: 1, display: { xs: 'flex', lg: 'none' }, flexDirection: 'column', alignItems: 'center', gap: 1.5, pt: 1.5 }}>
					<Box sx={{
						width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
						background: 'linear-gradient(135deg,#FF385C 0%,#D91A50 100%)',
						display: { xs: 'flex', lg: 'none' }, alignItems: 'center', justifyContent: 'center',
						boxShadow: '0 2px 8px rgba(255,56,92,0.35)',
						cursor: 'pointer',
					}} onClick={() => setCollapsed(false)}>
						<ChevronRightIcon sx={{ fontSize: 16, color: '#fff' }} />
					</Box>
					<Box sx={{ mt: 1.5, cursor: 'pointer' }} onClick={() => setCollapsed(false)}>
						<Typography sx={{
							writingMode: 'vertical-rl', textOrientation: 'mixed',
							fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
							color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)',
							fontFamily: 'inherit', textTransform: 'uppercase',
							userSelect: 'none',
						}}>NAVIA</Typography>
					</Box>
				</Box>
			) : (
				<>
					{/* -- Header -- */}
					<Box sx={{
						px: 2, py: 1.25,
						display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1.25,
						borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'}`,
						background: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(14,16,18,0.98)',
						backdropFilter: 'blur(8px)',
						flexShrink: 0,
					}}>
						{/* AI avatar */}
						<Box sx={{
							width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
							background: 'linear-gradient(135deg,#FF385C 0%,#D91A50 100%)',
							display: { xs: 'flex', lg: 'none' }, alignItems: 'center', justifyContent: 'center',
							boxShadow: '0 3px 12px rgba(255,56,92,0.40)',
						}}>
							<Box component='svg' viewBox='0 0 24 24' sx={{ width: 16, height: 16 }}>
								<path fill='#fff' d='M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm0 12a1 1 0 110 2 1 1 0 010-2zm.5-8v6h-1V8h1z'/>
							</Box>
						</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1, color: isLight ? '#0d0d0d' : '#f0f0f0', fontFamily: 'inherit', letterSpacing: -0.3 }}>
								Navia
							</Typography>
							<Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 0.5, mt: 0.3 }}>
								<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 5px rgba(34,197,94,0.7)' }} />
								<Typography sx={{ fontSize: 10.5, color: isLight ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.45)', fontWeight: 500, fontFamily: 'inherit', letterSpacing: 0.2 }}>
									Trip co-planner
								</Typography>
							</Box>
						</Box>
						{/* Collapse button */}
						<Tooltip title='Collapse panel' enterDelay={600}>
							<IconButton size='small' onClick={() => setCollapsed(true)} sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: '#FF385C' }, mr: -0.5 }}>
								<ChevronRightIcon sx={{ fontSize: 16 }} />
							</IconButton>
						</Tooltip>
					</Box>

					{/* -- Messages area -- */}
					<Box sx={{
						flex: 1, overflowY: 'auto', px: 1.75, py: 1.5,
						display: { xs: 'flex', lg: 'none' }, flexDirection: 'column', gap: 1.25,
						'&::-webkit-scrollbar': { width: 4 },
						'&::-webkit-scrollbar-thumb': { borderRadius: 3, background: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)' },
						'&::-webkit-scrollbar-track': { background: 'transparent' },
					}}>
						{messages.length === 0 && (
							<Box sx={{ flex: 1, display: { xs: 'flex', lg: 'none' }, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, pb: 2, mt: 4 }}>
								<Box component='svg' viewBox='0 0 40 40' sx={{ width: 40, height: 40, opacity: 0.28, color: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.35)' }}>
									<circle cx='20' cy='20' r='18' fill='none' stroke='currentColor' strokeWidth='1.5'/>
									<circle cx='20' cy='20' r='2' fill='currentColor'/>
									<path d='M20 4 L22 18 L20 16 L18 18 Z' fill='currentColor'/>
									<path d='M20 36 L22 22 L20 24 L18 22 Z' fill='currentColor' opacity='0.5'/>
									<path d='M4 20 L18 22 L16 20 L18 18 Z' fill='currentColor' opacity='0.5'/>
									<path d='M36 20 L22 22 L24 20 L22 18 Z' fill='currentColor'/>
								</Box>
								<Typography sx={{ fontSize: 12, color: isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.30)', textAlign: 'center', maxWidth: 200, lineHeight: 1.6, fontFamily: 'inherit' }}>
									Your trip story starts here. Ask Navia anything  routes, hidden gems, packing tips, local culture.
								</Typography>
							</Box>
						)}
						{messages.map(m => (
							<NaviaMessage key={m.id} message={m} isLight={isLight} />
						))}
						<div ref={endRef} />
					</Box>

					{/* -- Suggested prompts (hidden once conversation starts) -- */}
					{messages.length === 0 && (
						<Box sx={{
							px: 1.5, py: 0.75,
							display: { xs: 'flex', lg: 'none' }, flexDirection: 'column', gap: 0.5,
							borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'}`,
							flexShrink: 0,
						}}>
							<Typography sx={{ fontSize: 10.5, fontWeight: 600, color: isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.30)', fontFamily: 'inherit', mb: 0.3 }}>
								Suggested
							</Typography>
							{SUGGESTED_PROMPTS.slice(0, 3).map(p => (
								<Box
									key={p}
									onClick={() => { sendMessage(p); }}
									sx={{
										px: 1.25, py: 0.6, borderRadius: '8px',
										border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
										background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
										fontSize: 11.5, color: isLight ? '#444' : 'rgba(255,255,255,0.65)',
										cursor: 'pointer', fontFamily: 'inherit',
										transition: 'background .15s, border-color .15s, color .15s',
										'&:hover': {
											background: isLight ? 'rgba(255,56,92,0.06)' : 'rgba(255,56,92,0.10)',
											borderColor: 'rgba(255,56,92,0.30)',
											color: '#FF385C',
										},
									}}
								>
									{p}
								</Box>
							))}
						</Box>
					)}

					{/* -- Input -- */}
					<Box sx={{
						px: 1.5, pb: 1.5, pt: 0.75,
						borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'}`,
						flexShrink: 0,
					}}>
						<Box sx={{
							display: { xs: 'flex', lg: 'none' }, alignItems: 'flex-end', gap: 0.75,
							border: `1.5px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'}`,
							borderRadius: '12px', px: 1.5, py: 0.75,
							background: isLight ? '#fafafa' : 'rgba(255,255,255,0.03)',
							transition: 'border-color .2s, box-shadow .2s',
							'&:focus-within': {
								borderColor: 'rgba(255,56,92,0.60)',
								boxShadow: '0 0 0 3px rgba(255,56,92,0.10)',
							},
						}}>
							<InputBase
								inputRef={inputRef}
								value={input}
								onChange={e => setInput(e.target.value)}
								onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
								placeholder='Ask Navia anything'
								multiline
								maxRows={4}
								sx={{
									flex: 1, fontSize: 13, lineHeight: 1.5,
									fontFamily: "'Inter', system-ui, sans-serif",
									'& textarea': { padding: 0, color: isLight ? '#1a1a1a' : 'rgba(255,255,255,0.88)', resize: 'none' },
									'& textarea::placeholder': { color: isLight ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.25)', opacity: 1 },
								}}
							/>
							<IconButton
								size='small'
								onClick={send}
								disabled={!input.trim() || isStreaming}
								sx={{
									width: 32, height: 32, borderRadius: '9px', flexShrink: 0, mb: 0.1,
									background: (input.trim() && !isStreaming) ? 'linear-gradient(135deg,#FF385C,#D91A50)' : 'transparent',
									color: (input.trim() && !isStreaming) ? '#fff' : (isLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.20)'),
									boxShadow: (input.trim() && !isStreaming) ? '0 2px 10px rgba(255,56,92,0.35)' : 'none',
									transition: 'background .18s, color .18s, box-shadow .18s',
									'&:hover': { background: (input.trim() && !isStreaming) ? '#D91A50' : undefined },
									'&.Mui-disabled': { background: 'transparent', color: isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.15)' },
								}}
							>
								{isStreaming ? (
									<CircularProgress size={12} sx={{ color: 'inherit' }} />
								) : (
									<Box component='svg' viewBox='0 0 24 24' sx={{ width: 14, height: 14 }}>
										<path fill='currentColor' d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'/>
									</Box>
								)}
							</IconButton>
						</Box>
					</Box>
				</>
			)}
		</Box>
	);
};
void PremiumChatPanel;

/* --- Public / View-Mode Info Panel --- */
interface TripViewPanelProps {
	tripId?: string;
	title: string;
	description: string;
	bannerUrl: string;
	countries: string[];
	tripUsers: any[];
	ownerInfo: OwnerInfo;
	startDate: string | null;
	endDate: string | null;
	totalNights: number;
	destinationCount: number;
	showEditAction?: boolean;
	isPublished?: boolean;
	onRequestEdit?: () => void;
	onShare?: () => void;
}

const TripViewPanel: React.FC<TripViewPanelProps> = ({
	tripId, title, description, bannerUrl, countries, tripUsers, ownerInfo,
	startDate, endDate,
	totalNights, destinationCount,
	showEditAction = false, isPublished = false, onRequestEdit, onShare,
}) => {
	const theme = useTheme();
	const isLight = theme.palette.mode === 'light';
	const [sideBarBanner, setSideBarBanner] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (bannerUrl && bannerUrl.trim()) { setSideBarBanner(null); return; }
		const query = (countries && countries[0]) || 'travel';
		let cancelled = false;
		fetchUnsplashImage(query).then(url => { if (!cancelled && url) setSideBarBanner(url); });
		return () => { cancelled = true; };
	}, [bannerUrl, countries && countries[0]]);

	const bg = isLight ? '#ffffff' : '#0e1012';
	const border = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
	const textPrimary = isLight ? '#111111' : '#f0f0f0';
	const textMuted = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.38)';
	const sectionBg = isLight ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.04)';

	// Premium action toggles - persisted server-side via the trip reactions API
	const reactionAuth = useAuthToken();
	const reactionToken = reactionAuth.token;
	const reactionNavigate = useNavigate();
	const [liked, setLiked] = React.useState(false);
	const [saved, setSaved] = React.useState(false);
	const [needsImprovement, setNeedsImprovement] = React.useState(false);

	// Aggregate counts (from server)
	const [likesCount, setLikesCount] = React.useState<number>(0);
	const [savesCount, setSavesCount] = React.useState<number>(0);
	const [needsImprovementCount, setNeedsImprovementCount] = React.useState<number>(0);

	// In-flight guards so rapid clicks don't double-toggle
	const reactionBusyRef = React.useRef<Record<string, boolean>>({});

	const applySummary = React.useCallback((s: any) => {
		if (!s) return;
		setLikesCount(Math.max(0, Number(s.likes) || 0));
		setSavesCount(Math.max(0, Number(s.saves) || 0));
		setNeedsImprovementCount(Math.max(0, Number(s.needsWork) || 0));
		setLiked(!!s.userLiked);
		setSaved(!!s.userSaved);
		setNeedsImprovement(!!s.userNeedsWork);
	}, []);

	// Load reaction summary for this trip. Counts are public, so this runs for guests too;
	// the optional token (may be null) lets the server flag this user's own reactions.
	React.useEffect(() => {
		if (!tripId) return;
		let cancelled = false;
		apiServices.getTripReactions(reactionToken, tripId)
			.then(resp => { if (!cancelled) applySummary(resp.data); })
			.catch(() => { /* keep zeros on failure */ });
		return () => { cancelled = true; };
	}, [tripId, reactionToken, applySummary]);

	const toggleReaction = React.useCallback(async (type: 'like' | 'save' | 'needswork') => {
		if (!tripId) return;
		// Reacting requires an account - send guests to sign in first.
		if (!reactionToken) { reactionNavigate('/signin'); return; }
		if (reactionBusyRef.current[type]) return;
		reactionBusyRef.current[type] = true;
		try {
			const resp = await apiServices.toggleTripReaction(reactionToken, tripId, type);
			applySummary(resp.data);
		} catch {
			/* ignore - UI stays on last known server state */
		} finally {
			reactionBusyRef.current[type] = false;
		}
	}, [tripId, reactionToken, reactionNavigate, applySummary]);


	// Debug: log render to help verify toolbar visibility in browser console
	React.useEffect(() => {
		console.log('[TripViewPanel] mount/update', { tripId, isPublished, liked, saved, needsImprovement });
	}, [tripId, isPublished, liked, saved, needsImprovement]);

	const ownerDisplayName = ownerInfo.name || ownerInfo.handle || ownerInfo.email?.split('@')[0] || 'Unknown';

	const MAX_AVATARS = 5;
	const shownUsers = tripUsers.slice(0, MAX_AVATARS);
	const extraUsers = Math.max(0, tripUsers.length - MAX_AVATARS);

	const getMemberLabel = (u: any) => {
		return u.name || u.displayName || u.username || u.email?.split('@')[0] || 'Member';
	};
	const getMemberInitial = (u: any) => getMemberLabel(u)[0]?.toUpperCase() || 'M';
	const getMemberAvatar = (u: any) => u.avatar || u.profilePic || u.profilePicture || null;

	const formatDateRange = () => {
		if (!startDate && !endDate) return null;
		const fmt = (d: string | null) => {
			if (!d) return '?';
			try {
				return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
			} catch { return d; }
		};
		if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
		if (startDate) return `From ${fmt(startDate)}`;
		return `Until ${fmt(endDate)}`;
	};
	const dateRange = formatDateRange();

	return (
		<Box sx={{
			width: 320,
			flexShrink: 0,
			display: 'flex',
			flexDirection: 'column',
			height: '100%',
			borderLeft: `1px solid ${border}`,
			background: isLight
				? 'linear-gradient(180deg, #fafafa 0%, #ffffff 120px)'
				: 'linear-gradient(180deg, #0c0c12 0%, #0a0a0f 120px)',
			fontFamily: "'Inter', system-ui, sans-serif",
			overflow: 'hidden',
			position: 'relative',
		}}>
			{/*  Banner  */}
			<Box sx={{ position: 'relative', flexShrink: 0 }}>
				{(bannerUrl || sideBarBanner) ? (
					<Box
						component="img" src={bannerUrl || sideBarBanner!} alt={title}
						sx={{ width: '100%', height: 145, objectFit: 'cover', display: 'block' }}
					/>
				) : (
					<Box sx={{
						width: '100%', height: 145,
						background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 45%, #0f3460 100%)',
						display: 'flex', alignItems: 'center', justifyContent: 'center',
					}}>
						<Box sx={{ opacity: 0.08, color: 'text.primary' }}><IconPlane size={44} stroke={1.4} /></Box>
					</Box>
				)}
				{/* Multi-stop gradient overlay */}
				<Box sx={{
					position: 'absolute', inset: 0,
					background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.82) 100%)',
				}} />
				{/* Published pill */}
				{isPublished && (
					<Box sx={{
						position: 'absolute', top: 10, right: 10,
						display: 'flex', alignItems: 'center', gap: 0.5,
						px: 1, py: 0.4, borderRadius: '20px',
						background: 'rgba(0,0,0,0.45)',
						backdropFilter: 'blur(8px)',
						border: '1px solid rgba(34,197,94,0.45)',
					}}>
						<Box sx={{
							width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
							boxShadow: '0 0 8px rgba(34,197,94,0.9)',
							animation: 'trip-view-pulse 2s ease-in-out infinite',
							'@keyframes trip-view-pulse': {
								'0%, 100%': { opacity: 1, transform: 'scale(1)' },
								'50%': { opacity: 0.6, transform: 'scale(0.85)' },
							},
						}} />
						<Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#4ade80', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
							Live
						</Typography>
					</Box>
				)}
				{/* Title block */}
				<Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: 2, pb: 1.75 }}>
					<Typography sx={{
						fontFamily: "'Playfair Display', serif",
						fontWeight: 700, fontStyle: 'italic',
						fontSize: '1.18rem', color: '#fff',
						textShadow: '0 2px 12px rgba(0,0,0,0.6)',
						lineHeight: 1.25,
						letterSpacing: '-0.01em',
					}}>{title}</Typography>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.4 }}>
						<Avatar
							src={ownerInfo.avatar ?? undefined}
							imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any}
							sx={{ width: 16, height: 16, fontSize: '0.48rem', fontWeight: 700,
								background: 'linear-gradient(135deg,#FF385C,#D91A50)', color: '#fff',
								border: '1.5px solid rgba(255,255,255,0.5)', flexShrink: 0 }}
						>{ownerDisplayName[0]?.toUpperCase()}</Avatar>
						<Typography sx={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.72)', fontFamily: 'inherit', letterSpacing: '0.01em' }}>
							by {ownerDisplayName}
						</Typography>
					</Box>
				</Box>
			</Box>

			{/*  Scrollable body  */}
			<Box sx={{
				flex: 1, overflowY: 'auto', px: 2, pt: 2, pb: 1.5,
				display: 'flex', flexDirection: 'column', gap: 2.25,
				'&::-webkit-scrollbar': { width: 3 },
				'&::-webkit-scrollbar-thumb': { borderRadius: 4, background: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)' },
				'&::-webkit-scrollbar-track': { background: 'transparent' },
			}}>

				{/*  About  */}
				{description && (
					<Box sx={{
						pl: 1.5, borderLeft: '3px solid',
						borderImage: 'linear-gradient(to bottom, #FF385C, #E31C5F55) 1',
					}}>
						<Typography sx={{
							fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em',
							textTransform: 'uppercase', color: textMuted, fontFamily: 'inherit', mb: 0.6,
						}}>
							About this trip
						</Typography>
						<Typography sx={{
							fontSize: '0.83rem', color: textPrimary, fontFamily: 'inherit',
							lineHeight: 1.75, opacity: 0.88,
						}}>
							{description}
						</Typography>
					</Box>
				)}

				{/*  Stats grid  */}
				<Box>
					<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
						{[
							{ Icon: NightsStayRoundedIcon, label: 'Nights',       value: totalNights   || null, accent: '#FF385C' },
							{ Icon: AltRouteIcon,           label: 'Destinations', value: destinationCount || null, accent: '#7C3AED' },
						].map(({ Icon, label, value, accent }) => (
							<Box key={label} sx={{
								borderRadius: '12px',
								background: isLight
									? `linear-gradient(135deg, ${accent}09 0%, ${accent}04 100%)`
									: `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`,
								border: `1px solid ${accent}22`,
								p: '11px 13px',
								display: 'flex', flexDirection: 'column', gap: 0.8,
							}}>
								<Box sx={{
									width: 28, height: 28, borderRadius: '8px',
									background: `${accent}18`,
									display: 'flex', alignItems: 'center', justifyContent: 'center',
								}}>
									<Icon sx={{ fontSize: 15, color: accent }} />
								</Box>
								<Box>
									<Typography sx={{ fontSize: '0.54rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: textMuted, fontFamily: 'inherit', mb: 0.2 }}>
										{label}
									</Typography>
									{value ? (
										<Typography sx={{ fontSize: '1rem', fontWeight: 700, color: textPrimary, fontFamily: 'inherit', lineHeight: 1.1 }}>
											{value}
										</Typography>
									) : (
										<Typography sx={{ fontSize: '0.75rem', fontStyle: 'italic', color: textMuted, fontFamily: 'inherit', lineHeight: 1.1 }}>
											Not set
										</Typography>
									)}
								</Box>
							</Box>
						))}
					</Box>

					{/* Date range row */}
					{dateRange && (
						<Box sx={{
							mt: 1, px: 1.5, py: 0.9, borderRadius: '10px',
							background: isLight ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.04)',
							border: `1px solid ${border}`,
							display: 'flex', alignItems: 'center', gap: 1,
						}}>
							<Box sx={{ width: 7, height: 7, borderRadius: '50%', background: '#FF385C', flexShrink: 0 }} />
							<Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: textPrimary, fontFamily: 'inherit' }}>
								{dateRange}
							</Typography>
						</Box>
					)}
				</Box>

				{/*  Reactions toolbar  */}
				{isPublished && (
					<Box sx={{
						display: 'flex', alignItems: 'center', gap: 0.5,
						px: 1.25, py: 0.85, borderRadius: '12px',
						background: isLight ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.04)',
						border: `1px solid ${border}`,
					}}>
						{/* Like */}
						<Tooltip title={liked ? 'Unlike' : 'Like this trip'}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flex: 1, justifyContent: 'center' }}>
								<IconButton size='small' aria-label='like'
									onClick={(e: any) => { e.stopPropagation?.(); toggleReaction('like'); }}
									sx={{ width: 30, height: 30, borderRadius: '8px',
										color: liked ? '#FF385C' : textMuted,
										background: liked ? 'rgba(255,56,92,0.10)' : 'transparent',
										'&:hover': { background: 'rgba(255,56,92,0.10)' },
									}}>
									{liked ? <FavoriteIcon sx={{ fontSize: 16 }} /> : <FavoriteBorderIcon sx={{ fontSize: 16 }} />}
								</IconButton>
								<Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: liked ? '#FF385C' : textMuted, minWidth: 14 }}>{likesCount}</Typography>
							</Box>
						</Tooltip>
						<Box sx={{ width: 1, height: 20, background: border }} />
						{/* Save */}
						<Tooltip title={saved ? 'Unsave' : 'Save trip'}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flex: 1, justifyContent: 'center' }}>
								<IconButton size='small' aria-label='save'
									onClick={(e: any) => { e.stopPropagation?.(); toggleReaction('save'); }}
									sx={{ width: 30, height: 30, borderRadius: '8px',
										color: saved ? '#0EA5E9' : textMuted,
										background: saved ? 'rgba(14,165,233,0.10)' : 'transparent',
										'&:hover': { background: 'rgba(14,165,233,0.10)' },
									}}>
									{saved ? <BookmarkIcon sx={{ fontSize: 16 }} /> : <BookmarkBorderIcon sx={{ fontSize: 16 }} />}
								</IconButton>
								<Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: saved ? '#0EA5E9' : textMuted, minWidth: 14 }}>{savesCount}</Typography>
							</Box>
						</Tooltip>
						<Box sx={{ width: 1, height: 20, background: border }} />
						{/* Needs work */}
						<Tooltip title='Flag for improvement'>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flex: 1, justifyContent: 'center' }}>
								<IconButton size='small' aria-label='needs-improvement'
									onClick={(e: any) => { e.stopPropagation?.(); toggleReaction('needswork'); }}
									sx={{ width: 30, height: 30, borderRadius: '8px',
										color: needsImprovement ? '#F59E0B' : textMuted,
										background: needsImprovement ? 'rgba(245,158,11,0.10)' : 'transparent',
										'&:hover': { background: 'rgba(245,158,11,0.10)' },
									}}>
									{needsImprovement ? <ReportProblemRoundedIcon sx={{ fontSize: 16 }} /> : <ReportProblemOutlinedIcon sx={{ fontSize: 16 }} />}
								</IconButton>
								<Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: needsImprovement ? '#F59E0B' : textMuted, minWidth: 14 }}>{needsImprovementCount}</Typography>
							</Box>
						</Tooltip>
					</Box>
				)}

				{/*  Members  */}
				{tripUsers.length > 0 && (
					<Box sx={{ borderRadius: '14px', background: sectionBg, border: `1px solid ${border}`, overflow: 'hidden' }}>
						{/* Header */}
						<Box sx={{
							px: 1.75, py: 1.1,
							borderBottom: `1px solid ${border}`,
							display: 'flex', alignItems: 'center', justifyContent: 'space-between',
						}}>
							<Typography sx={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: textMuted, fontFamily: 'inherit' }}>
								Travellers
							</Typography>
							<Box sx={{
								px: 0.9, py: 0.25, borderRadius: '20px',
								background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
							}}>
								<Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: textMuted, fontFamily: 'inherit' }}>
									{tripUsers.length}
								</Typography>
							</Box>
						</Box>
						{/* Member rows */}
						<Box sx={{ px: 1.75, py: 1 }}>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
								{shownUsers.map((u, i) => {
									const label = getMemberLabel(u);
									const initial = getMemberInitial(u);
									const avatarSrc = getMemberAvatar(u);
									const role = u.role || u.Role || '';
									const isOwnerMember = role.toLowerCase() === 'owner';
									return (
										<Box key={u.id ?? i} sx={{
											display: 'flex', alignItems: 'center', gap: 1.1,
											py: 0.85,
											borderBottom: i < shownUsers.length - 1 ? `1px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}` : 'none',
										}}>
											<Avatar
												src={avatarSrc ?? undefined}
												imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' } as any}
												sx={{
													width: 30, height: 30, fontSize: '0.62rem', fontWeight: 700, flexShrink: 0,
													background: isOwnerMember
														? 'linear-gradient(135deg,#FF385C,#D91A50)'
														: (isLight ? '#e8e8e8' : 'rgba(255,255,255,0.10)'),
													color: isOwnerMember ? '#fff' : textPrimary,
													border: `2px solid ${isOwnerMember ? 'rgba(255,56,92,0.35)' : border}`,
													boxShadow: isOwnerMember ? '0 2px 8px rgba(255,56,92,0.28)' : 'none',
												}}
											>{initial}</Avatar>
											<Typography sx={{
												fontSize: '0.8rem', fontWeight: 600, color: textPrimary,
												fontFamily: 'inherit', lineHeight: 1.25,
												overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
											}}>{label}</Typography>
											{isOwnerMember && (
												<Box sx={{
													px: 0.85, py: 0.28, borderRadius: '20px',
													background: 'linear-gradient(135deg, rgba(255,56,92,0.12), rgba(255,56,92,0.06))',
													border: '1px solid rgba(255,56,92,0.30)',
													flexShrink: 0,
												}}>
													<Typography sx={{ fontSize: '0.51rem', fontWeight: 700, color: '#FF385C', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
														Host
													</Typography>
												</Box>
											)}
										</Box>
									);
								})}
								{extraUsers > 0 && (
									<Box sx={{ pt: 0.75 }}>
										<Typography sx={{ fontSize: '0.7rem', color: textMuted, fontFamily: 'inherit', fontStyle: 'italic' }}>
											+{extraUsers} more traveller{extraUsers > 1 ? 's' : ''}
										</Typography>
									</Box>
								)}
							</Box>
						</Box>
					</Box>
				)}

			</Box>

			{/*  Footer  */}
			<Box sx={{
				px: 2, pb: 2, pt: 1.25, flexShrink: 0,
				borderTop: `1px solid ${border}`,
				background: bg,
				display: 'flex', flexDirection: 'column', gap: 0.85,
				'&::before': {
					content: '""',
					position: 'absolute',
					bottom: showEditAction ? 118 : 76, left: 0, right: 0, height: 32,
					background: isLight
						? 'linear-gradient(to top, rgba(255,255,255,0.9), transparent)'
						: 'linear-gradient(to top, rgba(10,10,15,0.9), transparent)',
					pointerEvents: 'none',
				},
			}}>
				{showEditAction && (
					<Button
						fullWidth variant="contained" onClick={() => { onRequestEdit?.(); }}
						sx={{
							textTransform: 'none', borderRadius: '12px', fontFamily: 'inherit',
							fontWeight: 700, fontSize: '0.84rem',
							background: 'linear-gradient(135deg, #FF385C 0%, #E31C5F 55%, #c91855 100%)',
							color: '#fff', py: 1,
							boxShadow: '0 4px 14px rgba(255,56,92,0.38)',
							'&:hover': {
								background: 'linear-gradient(135deg, #ff4d6d 0%, #E31C5F 55%, #b5144c 100%)',
								boxShadow: '0 6px 20px rgba(255,56,92,0.50)',
								transform: 'translateY(-1px)',
							},
							transition: 'all .2s ease',
						}}
					>
						Edit Trip
					</Button>
				)}
				<Button
					fullWidth variant="outlined"
					startIcon={<ShareRoundedIcon sx={{ fontSize: 15 }} />}
					onClick={() => { onShare?.(); }}
					sx={{
						textTransform: 'none', borderRadius: '12px', fontFamily: 'inherit',
						fontWeight: 600, fontSize: '0.82rem',
						borderColor: 'rgba(255,56,92,0.35)', color: '#FF385C',
						py: 0.88,
						'&:hover': { borderColor: '#FF385C', background: 'rgba(255,56,92,0.05)', transform: 'translateY(-1px)' },
						transition: 'all .2s ease',
					}}
				>
					Share this trip
				</Button>
			</Box>
		</Box>
	);
};

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
	aiGenerated: aiGeneratedProp = false,
	chatSeed,
}) => {
	// ---------------------------------------------------------------------------
	// Selectors & dispatch
	// ---------------------------------------------------------------------------
	const dispatch = useDispatch<AppDispatch>();
	const navigate = useNavigate();
	const location = useLocation();
	// Read AI-generation flag from navigation state (set by TripCreationModal "Generate with AI" flow)
	const aiGenerated = (location.state as any)?.aiGenerated === true || aiGeneratedProp;
	const planner = useSelector((s:RootState)=> s.planner);
	const docsState = useSelector((s:RootState)=> s.docs);
	const auth = useAuthToken();
	const authToken = auth.token; // string | null
	useNavia(tripId, authToken);

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
	const [tripUsers, setTripUsers] = React.useState<any[]>([]); // authoritative members list from /trips/{id}/users
	const remoteRefreshKeyRef = React.useRef(0);

	// Re-fetch the trip from the server and force re-hydration (used after Navia mutations).
	const refreshTripFromServer = React.useCallback(async () => {
		if (!authToken || !tripId) return;
		try {
			const resp = await apiServices.getTripById(authToken, tripId);
			if (resp?.data) {
				remoteRefreshKeyRef.current += 1;
				hydratedRef.current = null; // allow re-hydration
				setRemoteTrip({ ...resp.data, _refreshed: remoteRefreshKeyRef.current });
				// Commit snapshot after a server-driven refresh so the planner is not
				// considered dirty (which would cause the next save to push stale data
				// back and overwrite Navia-added destinations).
				// requestAnimationFrame ensures Redux has re-rendered with the new state.
				requestAnimationFrame(() => {
					lastCommittedRef.current = computeSignatureRef.current();
				});
			}
		} catch { /* silent */ }
	}, [authToken, tripId]);
	const unifiedTrip = React.useMemo(()=> {
		return remoteTrip ? normalizeTrip(remoteTrip) : normalizedInitial;
	}, [normalizedInitial, remoteTrip]); // naming retained for downstream references
	const hydratedRef = React.useRef<string | null>(null);
	// True while the AI auto-generation pipeline is dispatching into Redux.
	// Re-hydration during that window would replace client destination ids with
	// server ids, making every queued addSpot/addFoodItem silently no-op.
	const aiGenActiveRef = React.useRef(false);
	const cleanedNotesRef = React.useRef(false);
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
	const [tripDescription, setTripDescription] = React.useState<string>(normalizedInitial?.meta.description || '');
	const [vibe, setVibe] = React.useState<string | null>(normalizedInitial?.meta.vibe ?? null);
	// editingTitle removed  title editing moved to Settings dialog
	// Notes field (plain text, auto-grow) seeded from normalized initial trip meta if present
	const [importantNotes, setImportantNotes] = React.useState<string>(
		(normalizedInitial?.meta.importantNotes && typeof normalizedInitial.meta.importantNotes === 'string')
			? normalizedInitial.meta.importantNotes
			: ''
	);
	// Banner image (trip card photo)  store as URL (existing backend-provided or newly selected object URL / base64)
	const [bannerUrl, setBannerUrl] = React.useState<string>(() => {
		try {
			// Prefer normalizedInitial (already extracted photoUrl), fall back to raw
			const fromNormalized = normalizedInitial?.meta.photoUrl;
			if (fromNormalized) return fromNormalized;
			const root = earlyRawTrip || (initialTrip?.trip) || initialTrip;
			const existing = root && typeof root.photoUrl === 'string' ? root.photoUrl : undefined;
			return existing || (import.meta.env.VITE_TRIP_DEFAULT_IMAGE || '');
		} catch { return import.meta.env.VITE_TRIP_DEFAULT_IMAGE || ''; }
	});
	// Countries selected during trip creation (array of display names)
	const [countries, setCountries] = React.useState<string[]>(() => {
		try {
			const root = earlyRawTrip || (initialTrip?.trip) || initialTrip;
			return normalizeCountryList(root && (root as any)?.countries);
		} catch { return []; }
	});
	const handleRemoveCountry = React.useCallback((country:string) => {
		if(!country) return;
		const normalized = normalizeCountryLabel(country);
		setCountries(prev => prev.filter(entry => {
			if(entry === country) return false;
			if(normalized && entry === normalized) return false;
			return true;
		}));
	}, []);
	const handleAddCountry = React.useCallback((country:string) => {
		const normalized = normalizeCountryLabel(country);
		if(!normalized) return;
		setCountries(prev => prev.includes(normalized) ? prev : [...prev, normalized]);
	}, []);
	
	// notesRef removed (notes moved to trip settings)
	const notesRef = React.useRef<HTMLTextAreaElement | null>(null); // retained to avoid large refactor
	void notesRef;
	const [privacy, setPrivacy] = React.useState<'Private'|'Trip Members'|'Everyone'>('Private');
	const [tripStartDate, setTripStartDate] = React.useState<string|null>(normalizedInitial?.meta.startDate ? sanitizeDateString(normalizedInitial.meta.startDate) : null);
	const [tripEndDate, setTripEndDate] = React.useState<string|null>(normalizedInitial?.meta.endDate ? sanitizeDateString(normalizedInitial.meta.endDate) : null);
	// Draft flag: derive published from multiple possible payload shapes; fallback to unpublished.
	const rawInitialTrip: any = (initialTrip as any)?.trip || initialTrip || null;
	const initialPublished =
		typeof rawInitialTrip?.published === 'boolean'
			? rawInitialTrip.published
			: typeof rawInitialTrip?.isPublished === 'boolean'
				? rawInitialTrip.isPublished
				: typeof rawInitialTrip?.status === 'string'
					? String(rawInitialTrip.status).toUpperCase() === 'PUBLISHED'
					: false;
	const [isDraft, setIsDraft] = React.useState<boolean>(!initialPublished);
	// Link-share state: true when Visibility = ReadOnly (anyone with link can view, like Google Drive)
	const [linkShareEnabled, setLinkShareEnabled] = React.useState<boolean>(() => {
		const v = String(rawInitialTrip?.visibility || rawInitialTrip?.Visibility || '').toLowerCase();
		return v === 'readonly';
	});
	const derivePrivacyFromDraft = React.useCallback((draft: boolean): 'Trip Members' | 'Everyone' => (
		draft ? 'Trip Members' : 'Everyone'
	), []);

	// Map UI privacy values to server-expected privacy strings.
	// UI values: 'Private' | 'Trip Members' | 'Everyone'
	// Server expects: 'private' | 'members' | 'everyone' (case-insensitive; prefer lowercase)
	const mapPrivacyForServer = React.useCallback((uiPrivacy: string | null | undefined): 'private' | 'members' | 'everyone' => {
		if (!uiPrivacy) return 'private';
		const v = String(uiPrivacy).trim().toLowerCase();
		if (v === 'trip members' || v === 'trip_members' || v === 'members' || v === 'tripmembers') return 'members';
		if (v === 'everyone' || v === 'public') return 'everyone';
		// default to private for any unknown value
		return 'private';
	}, []);

	// Convert a date string (YYYY-MM-DD or ISO) to full ISO8601 UTC timestamp
	// If input is already an ISO datetime, return it unchanged. If it's date-only
	// (YYYY-MM-DD) convert to YYYY-MM-DDT00:00:00Z.
	const formatDateToIsoUtc = React.useCallback((d: string | null | undefined): string | null => {
		if (!d) return null;
		// already ISO datetime
		if (/\d{4}-\d{2}-\d{2}T/.test(d)) return d;
		// date-only -> append midnight UTC
		if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return `${d}T00:00:00Z`;
		// try to parse and emit ISO
		try {
			const parsed = new Date(d);
			if (!isNaN(parsed.getTime())) return parsed.toISOString();
		} catch {}
		return d;
	}, []);
	const deriveVisibilityEnumFromDraft = React.useCallback((draft: boolean): 'TRIP_MEMBERS' | 'EVERYONE' => (
		draft ? 'TRIP_MEMBERS' : 'EVERYONE'
	), []);

	// Visibility/Privacy is derived from published state; user can't set it independently.
	React.useEffect(() => {
		setPrivacy(derivePrivacyFromDraft(isDraft));
	}, [isDraft, derivePrivacyFromDraft]);


	// Section + tab UI state  persisted in ?tab= query param so refresh keeps the same panel
	const VALID_SECTIONS = ['plan', 'news', 'docs', 'packing'] as const;
	const [searchParams, setSearchParams] = useSearchParams();
	const rawTab = searchParams.get('tab') as typeof VALID_SECTIONS[number] | null;
	const section: typeof VALID_SECTIONS[number] = rawTab && (VALID_SECTIONS as readonly string[]).includes(rawTab) ? rawTab : 'plan';
	const setSectionDebug = (s: typeof VALID_SECTIONS[number]) => {
		setSearchParams(prev => { prev.set('tab', s); return prev; }, { replace: true });
	};
	const [tab, setTab] = React.useState(0);

	// Derived counts
	const totalNights = React.useMemo(()=> planner.destinations.reduce((a,d)=> a + (d.nights||0), 0), [planner.destinations]);
	const targetNights = planner.targetNights || totalNights || 1;
	const currency = planner.currency || 'EUR';

	// Dirty tracking (signature of key planning fields)
	const lastCommittedRef = React.useRef<string>('');
	const persistedPayloadRef = React.useRef<any|null>(null);
	const packingCategories = useSelector((s: RootState) => s.packing.categories);
	const computeSignature = React.useCallback(()=> {
		return JSON.stringify({
			t:title,
			p:privacy,
			s:tripStartDate,
			e:tripEndDate,
			// Every persisted, user-editable field must be in here: anything missing
			// never flips isDirty, so autosave/Save silently skip it (this is exactly
			// how Navia-generated spots/notes were being lost before).
			// Deliberately excluded: spot.verifiedAt. It is re-stamped on every
			// re-verification, so hashing it would leave the plan permanently dirty
			// and fire an autosave loop.
			d:planner.destinations.map(d=> ({
				id:d.id, n:d.name, ti:d.title, sd:d.startDate, ed:d.endDate, nts:d.nights,
				lat:d.lat, lng:d.lng, tr:d.transport, cat:d.category, cp:d.completed, bud:d.budget,
				sp:(d.spots ?? []).map(s=> ({ n:s.name, ck:s.checked, ds:s.description, pid:s.placeId ?? null, pv:s.provenance ?? null })),
				fd:(d.foods ?? []).map(f=> ({ n:f.name, ck:f.checked })),
				no:d.notes ?? null,
				st:(d.stays ?? []).map(s=> ({ n:s.name, r:s.reference })),
				sn:d.stayNotes ?? null,
			})),
			c:currency,
			in:importantNotes.trim(),
			b:bannerUrl,
			cs:countries,
			bg:planner.tripBudget ?? null,
			ex:planner.expenses ?? [],
			pk:packingCategories
		});
	}, [title, privacy, tripStartDate, tripEndDate, planner.destinations, currency, importantNotes, bannerUrl, countries, planner.tripBudget, planner.expenses, packingCategories]);
	// Always keep a ref to the latest computeSignature so rAF callbacks and async
	// handlers never capture a stale closure (the main cause of false-positive isDirty).
	const computeSignatureRef = React.useRef(computeSignature);
	React.useEffect(()=> { computeSignatureRef.current = computeSignature; });
	const commitSnapshot = React.useCallback((draft:boolean)=> { setIsDraft(draft); lastCommittedRef.current = computeSignatureRef.current(); }, []);
	React.useEffect(()=> { if(!lastCommittedRef.current) lastCommittedRef.current = computeSignature(); }, [computeSignature]);
	const isDirty = computeSignature() !== lastCommittedRef.current;
	// Hydration status flag
	const isHydrated = Boolean(hydratedRef.current);

	// Sync planner store dates & target nights when trip date range changes
	React.useEffect(()=> {
		try {
			const sd = tripStartDate && tripStartDate.length>=10 ? tripStartDate.slice(0,10) : undefined;
			const ed = tripEndDate && tripEndDate.length>=10 ? tripEndDate.slice(0,10) : undefined;
			if(sd || ed) {
				dispatch(setTripDates({ startDate: sd, endDate: ed }));
				if(sd && ed && !planner.targetLocked) {
					const start = new Date(sd);
					const end = new Date(ed);
					const diff = Math.max(1, Math.round((end.getTime() - start.getTime())/(24*60*60*1000)));
					dispatch(setTargetNights(diff));
				}
			}
		} catch {}
	}, [tripStartDate, tripEndDate, dispatch, planner.targetLocked]);


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
		if (aiGenActiveRef.current) return; // never reset Redux mid AI-generation
		const { meta, itinerary } = unifiedTrip;
		// Allow re-hydration if the incoming data has more stops than what was previously loaded
		// (e.g. Dashboard passes no itinerary, then remoteTrip arrives with the full list)
		const refreshKey = Number((unifiedTrip.raw as any)?._refreshed ?? 0);
		if (hydratedRef.current && hydratedRef.current.startsWith(meta.id + ':')) {
			const [, prevCountRaw, prevRefreshRaw] = hydratedRef.current.split(':');
			const prevCount = parseInt(prevCountRaw || '0', 10);
			const prevRefreshKey = parseInt(prevRefreshRaw || '0', 10);
			if (prevRefreshKey >= refreshKey && prevCount >= itinerary.length) return;
		}
		if (title === 'Untitled Trip') setTitle(meta.name);
		// hydrate notes (fallback to meta.importantNotes or meta.notes if present)
		try {
			const candidate = (meta as any).importantNotes || (meta as any).notes;
			if (typeof candidate === 'string' && candidate.trim().length) setImportantNotes(candidate);
		} catch {}
		try {
			if (Array.isArray((meta as any).countries)) {
				setCountries(normalizeCountryList((meta as any).countries));
			} else if ((meta as any).countries === null) {
				setCountries([]);
			}
		} catch {}
		setPrivacy(derivePrivacyFromDraft(isDraft));
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
				title: typeof it.title === 'string' && it.title.trim() ? it.title.trim() : undefined,
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
				stay: it.stay || undefined,
				stays: Array.isArray(it.stays) ? it.stays : (it.stay ? [it.stay] : []),
				stayNotes: typeof it.stayNotes === 'string' ? it.stayNotes : undefined,
			};
		});
		// If any stop had notes='general' (category placeholder leaked into notes field), clear it
		let notesWereCleaned = false;
		const cleanedDestinations = hydratedDestinations.map((d) => {
			if (typeof d.notes === 'string' && d.notes.trim().toLowerCase() === 'general') {
				notesWereCleaned = true;
				return { ...d, notes: '' };
			}
			return d;
		});
		if (notesWereCleaned) cleanedNotesRef.current = true;
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
		// Server-persisted extras (TripExtras table): budget, expenses, packing
		const rawExtras: any = remoteTrip || initialTrip || {};
		dispatch(loadState({
			destinations: cleanedDestinations,
			currency: normalizedCurrency,
			targetNights: effectiveTarget,
			targetLocked: lockTarget,
						tripStartDate: metaStart || undefined,
						tripEndDate: metaEnd || undefined,
			globalDocs: [],
			visaDocs: [],
			pinnedDocIds: [],
			tripBudget: typeof rawExtras.budget === 'number' ? rawExtras.budget : undefined,
			expenses: Array.isArray(rawExtras.expenses) ? rawExtras.expenses : [],
			simplifyGroupExpenses: false,
			expenseVisibilityEmails: [],
			comments: []
		}));
		if (rawExtras.packing && Array.isArray(rawExtras.packing.categories) && rawExtras.packing.categories.length > 0) {
			dispatch(loadPacking(rawExtras.packing));
			packingHydratedRef.current = true;
		}
		hydratedRef.current = `${meta.id}:${itinerary.length}:${refreshKey}`;
		// Commit initial snapshot after first hydration.
		// Use computeSignatureRef (not the closure-captured computeSignature) so the rAF
		// always reads the latest signature AFTER React re-renders from the dispatch above.
		requestAnimationFrame(()=> { lastCommittedRef.current = computeSignatureRef.current(); });
	}, [unifiedTrip, title, dispatch, planner.targetNights, derivePrivacyFromDraft, isDraft]);

	// Centralized feature flags
	const ENABLE_EXPENSES = FEATURE_FLAGS.expenses;
	const ENABLE_COMMENTS = FEATURE_FLAGS.comments;
	const ENABLE_DOC_UPLOAD = FEATURE_FLAGS.docsUpload;
	// (moved earlier)
	const [settingsOpen, setSettingsOpen] = React.useState(false);
	const [planReviewOpen, setPlanReviewOpen] = React.useState(false);
	const [optimizingRoute, setOptimizingRoute] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [lastSaveTs, setLastSaveTs] = React.useState<number>(0);
	const [lastSavedDisplay, setLastSavedDisplay] = React.useState<string>('Never');
	const [toast, setToast] = React.useState<{ open:boolean; type:'success'|'error'|'info'; msg:string }>({ open:false, type:'success', msg:'' });
	const openToast = (type:'success'|'error'|'info', msg:string)=> setToast({ open:true, type, msg });
	const closeToast = ()=> setToast(t=> ({ ...t, open:false }));

	//  AI Auto-generation (triggered via "Generate with AI" flow) 
	const AI_GEN_MESSAGES = [
		'Crafting your trip…',
		'Designing the best compatible path for your travel style…',
		'Adding important highlights and notes…',
		'Discovering the best restaurants & local foods…',
		'Mapping out the perfect route for your destinations…',
		'Almost done – finalizing your itinerary…',
	];
	const [aiAutoGenerating, setAiAutoGenerating] = React.useState(false);
	const [aiAutoMessage, setAiAutoMessage] = React.useState('');
	const aiAutoTriggeredRef = React.useRef(false);
	const aiMsgIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
	const aiExpectedDestCountRef = React.useRef(0);
	const aiMsgIdxRef = React.useRef(0);
	// Set when Phase 1 hit an empty trip credit wallet, so Phase 2 skips straight to the toast.
	const aiCreditBlockedRef = React.useRef(false);

	// Phase 1: Trigger on hydration complete when aiGenerated prop is true
	React.useEffect(() => {
		if (!aiGenerated || aiAutoTriggeredRef.current || !isHydrated || !authToken || !tripId) return;
		if (countries.length === 0) return;
		aiAutoTriggeredRef.current = true;

		// Clear location state to prevent re-trigger on reload
		try { window.history.replaceState({}, '', window.location.pathname + window.location.search); } catch {}

		// Start overlay
		aiMsgIdxRef.current = 0;
		setAiAutoMessage(AI_GEN_MESSAGES[0]);
		setAiAutoGenerating(true);
		aiGenActiveRef.current = true;
		aiMsgIntervalRef.current = setInterval(() => {
			aiMsgIdxRef.current = (aiMsgIdxRef.current + 1) % AI_GEN_MESSAGES.length;
			setAiAutoMessage(AI_GEN_MESSAGES[aiMsgIdxRef.current]);
		}, 2200);

		if (planner.destinations.length > 0) {
			// Destinations already seeded (from trip data) - go straight to planning
			aiExpectedDestCountRef.current = -1; // signal Phase 2 to plan all existing
			return;
		}

		// Total nights to cover, derived from the trip date span (fallback: 3 nights per country).
		const computeTripNights = (): number => {
			const s = tripStartDate && tripStartDate.length >= 10 ? tripStartDate.slice(0, 10) : null;
			const e = tripEndDate && tripEndDate.length >= 10 ? tripEndDate.slice(0, 10) : null;
			if (s && e) {
				const diff = Math.round((new Date(e).getTime() - new Date(s).getTime()) / (24 * 60 * 60 * 1000));
				if (diff > 0) return diff;
			}
			return 0;
		};

		const countriesToAdd = countries.slice(0, 8);
		let tripNights = computeTripNights();
		if (tripNights <= 0) tripNights = Math.max(planner.targetNights, countriesToAdd.length * 3);

		// Split the total nights across the selected countries (earlier countries absorb any remainder).
		const perCountry = Math.floor(tripNights / countriesToAdd.length);
		const remainder = tripNights - perCountry * countriesToAdd.length;
		const allocations = countriesToAdd.map((country, i) => ({
			country,
			nights: Math.max(1, perCountry + (i < remainder ? 1 : 0)),
		}));

		(async () => {
			const allStops: { name: string; nights: number }[] = [];
			let creditBlocked = false;
			for (const alloc of allocations) {
				setAiAutoMessage(`Mapping the best route through ${alloc.country}…`);
				if (creditBlocked) {
					// Wallet is empty - don't burn more requests; keep coarse country stops.
					allStops.push({ name: alloc.country, nights: alloc.nights });
					continue;
				}
				try {
					const res = await suggestCountryItinerary(
						{ tripId, country: alloc.country, totalNights: alloc.nights, vibe: vibe ?? undefined },
						authToken,
					);
					const stops = (res.stops ?? []).filter(s => s.name?.trim() && s.nights > 0);
					if (stops.length > 0) {
						stops.forEach(s => allStops.push({ name: s.name.trim(), nights: Math.max(1, Math.round(s.nights)) }));
					} else {
						allStops.push({ name: alloc.country, nights: alloc.nights });
					}
				} catch (err) {
					if (err instanceof NaviaRequestError && err.status === 402) creditBlocked = true;
					// Fallback: single stop for the country covering its allocated nights
					allStops.push({ name: alloc.country, nights: alloc.nights });
				}
			}
			aiCreditBlockedRef.current = creditBlocked;

			if (allStops.length === 0) {
				// Last-resort fallback - original one-destination-per-country behavior
				allocations.forEach(a => allStops.push({ name: a.country, nights: a.nights }));
			}

			// Target must equal the sum of stop nights so every day is covered and nothing is clamped away.
			const grandTotal = allStops.reduce((a, s) => a + s.nights, 0);
			dispatch(setTargetNights(grandTotal));
			aiExpectedDestCountRef.current = allStops.length;
			allStops.forEach(s => dispatch(addDestination({ name: s.name, nights: s.nights })));
		})();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [aiGenerated, isHydrated, authToken, tripId]);

	// Phase 1 (chat seed): the Navia home chat already produced the full plan.
	// Seed destinations here; Phase 2 fills spots/foods/notes from the extracted
	// content POSITIONALLY (no network calls, no credits). Same guards as the
	// AI-generation flow so hydration and autosave can't wipe mid-seed.
	const chatSeedContentRef = React.useRef<ChatSeedStop[] | null>(null);
	React.useEffect(() => {
		if (!chatSeed || chatSeed.stops.length === 0) return;
		if (aiAutoTriggeredRef.current || !isHydrated || !tripId) return;
		aiAutoTriggeredRef.current = true;

		// Clear location state to prevent re-seed on reload
		try { window.history.replaceState({}, '', window.location.pathname + window.location.search); } catch {}

		setAiAutoMessage('Assembling your trip from the chat…');
		setAiAutoGenerating(true);
		aiGenActiveRef.current = true;

		chatSeedContentRef.current = chatSeed.stops;
		const grandTotal = chatSeed.stops.reduce((a, s) => a + Math.max(1, s.nights), 0);
		dispatch(setTargetNights(grandTotal));
		aiExpectedDestCountRef.current = chatSeed.stops.length;
		chatSeed.stops.forEach(s => dispatch(addDestination({ name: s.name, nights: Math.max(1, s.nights) })));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [chatSeed, isHydrated, tripId]);

	// Phase 2: Once destinations reach expected count, plan each one via Navia
	const aiPlanningActiveRef = React.useRef(false);
	React.useEffect(() => {
		if (!aiAutoGenerating || !authToken || !tripId) return;
		if (aiPlanningActiveRef.current) return;

		const expectedCount = aiExpectedDestCountRef.current;
		if (expectedCount === 0) return; // not yet triggered
		if (expectedCount > 0 && planner.destinations.length < expectedCount) return; // waiting

		aiPlanningActiveRef.current = true;
		aiExpectedDestCountRef.current = 0;

		const destsToProcess = expectedCount === -1
			? [...planner.destinations]
			: planner.destinations.slice(-expectedCount);

		// Chat-seed path: content came from the conversation, keyed by position.
		const seedStops = chatSeedContentRef.current;
		chatSeedContentRef.current = null;

		(async () => {
			let planned = 0;
			let failed = 0;
			// Verification tallies, so the completion toast can state what was actually
			// confirmed rather than claiming a blanket success.
			let droppedTotal = 0;
			let uncheckedTotal = 0;
			let creditBlocked = aiCreditBlockedRef.current;
			try {
				for (const [destIdx, dest] of destsToProcess.entries()) {
					if (aiMsgIntervalRef.current) { clearInterval(aiMsgIntervalRef.current); aiMsgIntervalRef.current = null; }

					// Extracted chat content: dispatch locally, no AI call, no credits.
					const seed = seedStops?.[destIdx];
					if (seed) {
						setAiAutoMessage(`Placing ${dest.name}…`);
						// Chat-extracted places are still model output - check them too.
						const seedCandidates = (seed.spots ?? []).filter(s => s.name?.trim());
						const seedResolved = await resolveSpots(seedCandidates, dest.name);
						droppedTotal += seedCandidates.length - seedResolved.length;
						uncheckedTotal += seedResolved.filter(s => s.provenance === 'unchecked').length;
						dispatch(clearDestinationDiscover({ destinationId: dest.id }));
						for (const spot of seedResolved) {
							dispatch(addSpot({
								destinationId: dest.id,
								name: spot.name,
								description: spot.description,
								mapUrl: spot.mapUrl,
								photoUrl: spot.photoUrl,
								placeId: spot.placeId,
								provenance: spot.provenance,
								verifiedAt: spot.verifiedAt,
								lat: spot.lat,
								lng: spot.lng,
								known: Boolean(spot.mapUrl),
							}));
						}
						for (const food of seed.foods ?? []) {
							if (!food?.trim()) continue;
							dispatch(addFoodItem({ destinationId: dest.id, name: food.trim() }));
						}
						const seedNotes = (seed.notes ?? '').trim();
						if (seedNotes) dispatch(setDestinationNotes({ id: dest.id, notes: seedNotes }));
						planned++;
						continue;
					}

					if (creditBlocked) break;
					setAiAutoMessage(`Planning ${dest.name}…`);
					try {
						const result = await planDestination({
							tripId,
							destinationName: dest.name,
							planTitle: dest.title,
							lat: dest.lat,
							lng: dest.lng,
							nights: dest.nights,
							category: dest.category,
							vibe: vibe ?? undefined,
						}, authToken);
						const candidates = (result.spots ?? []).filter(s => s.name?.trim());
						setAiAutoMessage(`Checking places in ${dest.name}…`);
						const resolved = await resolveSpots(candidates, dest.name);
						droppedTotal += candidates.length - resolved.length;
						uncheckedTotal += resolved.filter(s => s.provenance === 'unchecked').length;
						dispatch(clearDestinationDiscover({ destinationId: dest.id }));
						for (const spot of resolved) {
							dispatch(addSpot({
								destinationId: dest.id,
								name: spot.name,
								description: spot.description,
								mapUrl: spot.mapUrl,
								photoUrl: spot.photoUrl,
								placeId: spot.placeId,
								provenance: spot.provenance,
								verifiedAt: spot.verifiedAt,
								lat: spot.lat,
								lng: spot.lng,
								known: Boolean(spot.mapUrl),
							}));
						}
						for (const food of result.foods ?? []) {
							if (!food.name?.trim()) continue;
							dispatch(addFoodItem({ destinationId: dest.id, name: food.name.trim() }));
						}
						const notes = (result.journalNotes ?? '').trim();
						if (notes) dispatch(setDestinationNotes({ id: dest.id, notes }));
						planned++;
					} catch (err) {
						failed++;
						if (err instanceof NaviaRequestError && err.status === 402) creditBlocked = true;
					}
				}
			} finally {
				if (aiMsgIntervalRef.current) { clearInterval(aiMsgIntervalRef.current); aiMsgIntervalRef.current = null; }
				setAiAutoGenerating(false);
				aiGenActiveRef.current = false;
				setAiAutoMessage('');
				aiPlanningActiveRef.current = false;
				aiCreditBlockedRef.current = false;
				// Report what actually happened instead of a blanket success.
				if (creditBlocked) {
					openToast('error', 'This trip ran out of Navia credits - generation stopped early. Your route was saved.');
				} else if (planned === 0 && failed > 0) {
					openToast('error', 'Navia could not plan your stops right now. Your route was saved - try "Plan with Navia" on each stop shortly.');
				} else if (failed > 0) {
					openToast('info', `Trip drafted. ${failed} stop${failed === 1 ? '' : 's'} could not be planned - use "Plan this stop" to retry.`);
				} else if (droppedTotal > 0) {
					openToast('info', `Your trip is ready. ${droppedTotal} place${droppedTotal === 1 ? ' had' : 's had'} closed for good, so we left ${droppedTotal === 1 ? 'it' : 'them'} out.`);
				} else if (uncheckedTotal > 0) {
					openToast('info', `Your trip is ready. ${uncheckedTotal} place${uncheckedTotal === 1 ? '' : 's'} had no listing to check - marked unchecked.`);
				} else if (seedStops) {
					openToast('success', 'Your chat is now a trip - every place confirmed.');
				} else {
					openToast('success', 'Your trip is ready - every place confirmed.');
				}
			}
		})();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [aiAutoGenerating, planner.destinations.length, authToken, tripId]);

	// Cleanup interval on unmount
	React.useEffect(() => () => { if (aiMsgIntervalRef.current) clearInterval(aiMsgIntervalRef.current); }, []);
	//  End AI Auto-generation 
	// Lightweight settings save listener (Save Settings button dispatches browser event)
	React.useEffect(()=> {
		const settingsSaveHandler = async () => {
			if(!authToken || !tripId) { openToast('error','Cannot save settings'); return; }
			try {
				   const visibilityEnum = deriveVisibilityEnumFromDraft(isDraft);
				const sd = sanitizeDateString(tripStartDate) || undefined;
				const ed = sanitizeDateString(tripEndDate) || undefined;
				// Immediately reflect updated date span in nights ring before waiting for refetch
				if(sd && ed){
					try {
						const start = new Date(sd);
						const end = new Date(ed);
						const diff = Math.max(1, Math.round((end.getTime() - start.getTime())/(24*60*60*1000)));
						dispatch(setTargetNights(diff)); // locks target to explicit span
						dispatch(setTripDates({ startDate: sd, endDate: ed }));
					} catch {}
				}
				// Prepare settings payload matching backend expectations
				const visibilityForServer = (visibilityEnum === 'TRIP_MEMBERS') ? 'Members' : (visibilityEnum === 'EVERYONE' ? 'Everyone' : 'Private');
				const startIso = formatDateToIsoUtc(sd) || undefined;
				const endIso = formatDateToIsoUtc(ed) || undefined;
				const safeDescription = typeof tripDescription === 'string' ? tripDescription.slice(0, 300) : undefined;
				const safeVibe = typeof vibe === 'string' ? (vibe.length > 300 ? vibe.slice(0,300) : vibe) : undefined;
				// bannerPhotoId must be a GUID or omitted; we don't have an id yet so omit it (undefined)
				const bannerPhotoId: string | undefined = undefined;

				await apiServices.updateTripSettings(authToken, tripId, {
					name: title,
					description: safeDescription,
					vibe: safeVibe,
					visibility: visibilityForServer,
					startDate: startIso,
					endDate: endIso,
					countries,
					bannerPhotoId,
					photoUrl: bannerUrl || undefined,
				});
				if (bannerUrl && /^https?:\/\//i.test(bannerUrl)) {
					try { await apiServices.saveTripBannerUrl(authToken, tripId, bannerUrl); } catch {}
				}
				try {
					const refreshed = await apiServices.getTripById(authToken, tripId);
					const meta = (refreshed?.data?.trip) || refreshed?.data?.meta || refreshed?.data;
					if(meta){
						if(typeof meta.name==='string') setTitle(meta.name);
						if(typeof meta.photoUrl==='string') setBannerUrl(meta.photoUrl);
						if(Array.isArray(meta.countries)) setCountries(normalizeCountryList(meta.countries));
						if(typeof meta.description==='string') setTripDescription(meta.description);
						if(typeof meta.vibe==='string') setVibe(meta.vibe);
						else if(meta.vibe===null) setVibe(null);
						setPrivacy(derivePrivacyFromDraft(isDraft));
						if(typeof meta.startDate==='string') setTripStartDate(sanitizeDateString(meta.startDate));
						if(typeof meta.endDate==='string') setTripEndDate(sanitizeDateString(meta.endDate));
						setRemoteTrip(refreshed.data);
					}
				} catch { /* silent refresh fail */ }
				openToast('success','Settings saved');
				// Auto-close settings dialog after successful save
				setSettingsOpen(false);
			} catch(err:any){
				const status = err?.response?.status;
				if(status === 404) openToast('error','Trip not found or you are not the owner');
				else if(status === 401) openToast('error','Unauthorized: please sign in');
				else if(status === 400) openToast('error','Invalid settings payload');
				else openToast('error','Save settings failed');
			}
		};
		window.addEventListener('trip:settings:save', settingsSaveHandler);
		// Listen for members updated events (batch invites) to refresh members list
		const membersUpdatedHandler = async (e: any) => {
			try {
				if(!authToken || !tripId) return;
				if(e?.detail?.tripId && e.detail.tripId !== tripId) return; // ignore other trips
				// Fetch authoritative members list
				const usersResp = await apiServices.getTripUsers(authToken, tripId);
				if(Array.isArray(usersResp?.data)) setTripUsers(usersResp.data);
				openToast('success','Members updated');
			} catch {}
		};
		window.addEventListener('trip:members:updated', membersUpdatedHandler);
		return ()=> {
			window.removeEventListener('trip:settings:save', settingsSaveHandler);
			window.removeEventListener('trip:members:updated', membersUpdatedHandler);
		};
	}, [authToken, tripId, title, countries, bannerUrl, openToast, deriveVisibilityEnumFromDraft, derivePrivacyFromDraft, isDraft]);

	// Initial fetch of trip users (when token & tripId available)
	React.useEffect(()=> {
		if(!authToken || !tripId) return;
		let active = true;
		(async()=> {
			try {
				const resp = await apiServices.getTripUsers(authToken, tripId);
				if(!active) return;
				if(Array.isArray(resp?.data)) setTripUsers(resp.data);
			} catch {}
		})();
		return ()=> { active = false; };
	}, [authToken, tripId]);
	
	const [mapDrawerOpen, setMapDrawerOpen] = React.useState(false);
	// Right side-panel rail (desktop editors): which tab is active
	const [sidePanelTab, setSidePanelTab] = React.useState<'chat' | 'comments' | 'map' | 'info'>(readOnly ? 'info' : 'chat');
	const [sidePanelCollapsed, setSidePanelCollapsed] = React.useState(false);
	const [chatUnread, setChatUnread] = React.useState(0);
	// Map mounts on first visit, then stays mounted (hidden) so it doesn't re-initialise per switch
	const [sideMapMounted, setSideMapMounted] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement|null>(null);
	const [visaErrors, setVisaErrors] = React.useState<string[]>([]);

	const [visaOpen, setVisaOpen] = React.useState(false);
	const [pinnedOpen, setPinnedOpen] = React.useState(false);
	const [exitConfirmOpen, setExitConfirmOpen] = React.useState(false);
	const [savePermissionDenied, setSavePermissionDenied] = React.useState(false);
	const [showCelebration, setShowCelebration] = React.useState(false);
	const [showPublishCheck, setShowPublishCheck] = React.useState(false);
	const [publishChecks, setPublishChecks] = React.useState<PublishChecks | null>(null);
	const [naviaDrawerOpen, setNaviaDrawerOpen] = React.useState(false);
	const [exiting, setExiting] = React.useState(false);
	const [deletingTrip, setDeletingTrip] = React.useState(false);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
	const [shareModalOpen, setShareModalOpen] = React.useState(false);

	// Auto-close doc-related dialogs when feature disabled to prevent stray popups
	React.useEffect(()=> {
		if(!ENABLE_DOC_UPLOAD){
			if(visaOpen) setVisaOpen(false);
			if(pinnedOpen) setPinnedOpen(false);
		}
	}, [ENABLE_DOC_UPLOAD, visaOpen, pinnedOpen]);

	// (Removed secondary meta extraction effect; consolidated into primary hydration effect)

	// passportIconUrl / pinnedIconUrl reserved for future settings dialogs
	const passportIconUrl = React.useMemo(() => {
		return import.meta.env.MODE === 'production'
			? (import.meta.env.VITE_PASSPORT_ICON_URL_PROD || import.meta.env.VITE_PASSPORT_ICON_URL)
			: (import.meta.env.VITE_PASSPORT_ICON_URL_DEV || import.meta.env.VITE_PASSPORT_ICON_URL);
	}, []);
	const pinnedIconUrl = React.useMemo(() => {
		return import.meta.env.MODE === 'production'
			? (import.meta.env.VITE_PINNEDDOCS_ICON_URL_PROD || import.meta.env.VITE_PINNEDDOCS_ICON_URL)
			: (import.meta.env.VITE_PINNEDDOCS_ICON_URL_DEV || import.meta.env.VITE_PINNEDDOCS_ICON_URL);
	}, []); void passportIconUrl; void pinnedIconUrl;
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
	const handleChangeNights = (id:string, delta:number)=> dispatch(updateDestinationNights({ id, delta }));
	const handleChangeTransport = (id:string, mode:string)=> dispatch(setTransport({ id, transport: mode }));
	const handleAddDestination = (name:string, coords?:{lat:number; lng:number})=> dispatch(addDestination({ name, lat:coords?.lat, lng:coords?.lng }));
	const handleRemoveDestination = (id:string)=> dispatch(removeDestination(id));



	const computeShortestRoute = () => {
		const pts = planner.destinations.filter(d=> d.lat!=null && d.lng!=null);
		if(pts.length < 3){
			if(import.meta.env.development){ console.warn('[RouteOptimize] Need at least 3 geocoded destinations. Found:', pts.length); }
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
	//  - Privacy string currently uses UI values (Private, Trip Members, Everyone).
	//    Server may map these to enum values (PRIVATE, TRIP_MEMBERS, EVERYONE).
	//    Adjust mapping here if a strict enum is later required.
	//  - Legs, docs, expenses, comments are included for forward compatibility; backend
	//    can ignore unknown properties safely.
	//  - version field reserved for future optimistic concurrency or schema evolution.
	const buildPersistPayload = React.useCallback((_draft:boolean) => {
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
		// Itinerary (extended fields)  omit empty large text fields
		const itinerary = planner.destinations.map(d=> {
			const notesVal: unknown = (d as any).notes;
			const notesClean = (typeof notesVal === 'string' && notesVal.trim().length>0) ? notesVal.trim() : null;
			// Structured stay: include only fields with non-empty trimmed values; send null if all empty
			const stayRaw: any = (d as any).stay || {};
			const stayName = typeof stayRaw.name === 'string' && stayRaw.name.trim() ? stayRaw.name.trim() : undefined;
			const stayRef = typeof stayRaw.reference === 'string' && stayRaw.reference.trim() ? stayRaw.reference.trim() : undefined;
			const stayNotes = typeof stayRaw.notes === 'string' && stayRaw.notes.trim() ? stayRaw.notes.trim() : undefined;
			const stay = (stayName||stayRef||stayNotes) ? { name: stayName ?? null, reference: stayRef ?? null, notes: stayNotes ?? null } : null;
			// Multi stays (new model)  always send array, never undefined
			const multiStays = Array.isArray((d as any).stays)
				? (d as any).stays.filter((s:any)=> (s.name && s.name.trim()) || (s.reference && s.reference.trim())).map((s:any)=> ({ id:s.id, name:s.name?.trim() ?? null, reference:s.reference?.trim() ?? null }))
				: [];
			const stayNotesUnified = typeof (d as any).stayNotes === 'string' && (d as any).stayNotes.trim().length>0 ? (d as any).stayNotes.trim() : null;
			const titleVal = typeof (d as any).title === 'string' && (d as any).title.trim().length > 0 ? (d as any).title.trim() : null;
			return {
				id:d.id,
				externalId:d.id,
				name:d.name,
				title: titleVal,
				startDate:d.startDate,
				endDate:d.endDate,
				nights:d.nights,
				lat:d.lat,
				lng:d.lng,
				placeId:d.placeId ?? null,
				transport:d.transport,
				budget: d.budget ?? 0,
				category: d.category || 'general',
				completed: !!d.completed,
				photoUrl: d.photoUrl ?? null,
				notes: notesClean,
				stay, // deprecated single stay (retained for backward compatibility)
				stays: multiStays,
				stayNotes: stayNotesUnified,
				spots:(d.spots||[]).map(s=> ({ id:s.id, name:s.name, placeId:s.placeId ?? null, checked:!!s.checked, photoUrl:s.photoUrl ?? null, description:s.description ?? null, mapUrl:s.mapUrl ?? null, known: !!s.known, provenance:s.provenance ?? null, verifiedAt:s.verifiedAt ?? null, lat:s.lat ?? null, lng:s.lng ?? null })),
				foods:(d.foods||[]).map(f=> ({ id:f.id, name:f.name, checked:!!f.checked, known: !!(f as any).known })),
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
		const finalStart = userEditedStart || originalStart || sanitizedStart || null;
		let finalEnd = userEditedEnd || originalEnd || sanitizedEnd || null;
		// If start exists but end is missing, keep end equal to start (single-day trip invariant)
		if(finalStart && !finalEnd) finalEnd = finalStart;
		// Dev diagnostic: surface any scenario where dates are still null post-hydration
		if(import.meta.env.development && isHydrated) {
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
				privacy: mapPrivacyForServer(derivePrivacyFromDraft(_draft)),
				currency,
				startDate: formatDateToIsoUtc(finalStart),
				endDate: formatDateToIsoUtc(finalEnd),
				generatedAt: new Date().toISOString(),
				targetNights,
				totalNights,
				geocodedDestinations: geocodedCount,
				legCount: legs.length,
				routeDistanceKm: Number(routeDistanceKm.toFixed(2)),
				importantNotes: notesClean, // always include (empty string signifies clear)
				notes: notesClean, // legacy fallback so clearing propagates
				photoUrl: bannerUrl || (import.meta.env.VITE_TRIP_DEFAULT_IMAGE || ''),
				countries: countries,
				description: tripDescription || null,
				vibe: vibe ?? null
			},
			itinerary,
			legs,
			expenses: planner.expenses || [],
			budget: planner.tripBudget ?? null,
			packing: { categories: packingCategories },
			docs: [],
			comments: [],
			pinnedDocIds: planner.pinnedDocIds || [],
			globalDocs: (planner.globalDocs || []).map(doc => ({ id: doc.id, originalName: doc.originalName, mimeType: doc.mimeType })),
			visaDocs: (planner.visaDocs || []).map(doc => ({ id: doc.id, originalName: doc.originalName, mimeType: doc.mimeType })),
			destinationDocsCount: planner.destinations.reduce((sum, d) => sum + (d.docs?.length || 0), 0),
			version: 1
		};
	}, [planner.destinations, planner.expenses, planner.tripBudget, packingCategories, planner.pinnedDocIds, planner.globalDocs, planner.visaDocs, tripId, title, currency, tripStartDate, tripEndDate, targetNights, totalNights, geocodedCount, importantNotes, vibe, tripDescription, bannerUrl, derivePrivacyFromDraft]);


	// Persist helper (debounced save)
	const persistToBackend = React.useCallback(async (payload:any): Promise<boolean> => {
		if(!authToken){ openToast('error','Not signed in'); return false; }
		const now = Date.now();
		if(saving || (now - lastSaveTs) < 1200) return false;
		setSaving(true);
		setLastSaveTs(now);
		// Snapshot the refresh key before the async save. If a Navia mutation triggers
		// refreshTripFromServer() during the save, remoteRefreshKeyRef.current will be
		// incremented and we must NOT overwrite remoteTrip with the stale payload data.
		const refreshKeyAtSaveStart = remoteRefreshKeyRef.current;
		try {
			// Detailed logging for debugging prod 500s
			try {
				const maskedToken = authToken ? `${authToken.slice(0,8)}...${authToken.slice(-4)}` : '<none>';
				// Log high-level info and a truncated payload preview
				console.debug('[TripPersist] Persisting payload for tripId=', tripId, 'maskedToken=', maskedToken, 'saving=', saving);
				try {
					const preview = JSON.stringify(payload, null, 2).slice(0, 10000);
					console.debug('[TripPersist] Payload preview:', preview);
				} catch (e) {
					console.debug('[TripPersist] Failed to stringify payload preview', e);
				}
			} catch (logErr) {
				console.warn('[TripPersist] Logging preparation failed', logErr);
			}
			await apiServices.updateTrip(authToken, tripId, payload);
			// success log
			console.info('[TripPersist] updateTrip succeeded for', tripId);
			// Only update in-memory remoteTrip if no server-side Navia refresh ran while
			// the save was in-flight. If refreshTripFromServer() incremented the key, the
			// authoritative data is already in remoteTrip and must not be overwritten with
			// the stale payload (which would delete the Navia-added destination from Redux
			// and trigger a follow-up save that would delete it from the DB too).
			if (remoteRefreshKeyRef.current === refreshKeyAtSaveStart) {
				setRemoteTrip({ trip: payload.trip, itinerary: payload.itinerary });
			} else {
				console.debug('[TripPersist] Skipping remoteTrip overwrite - server refresh happened during save (refreshKey changed).');
			}
			setLastSavedDisplay(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
			openToast('success', payload.trip.status==='DRAFT'? 'Saved':'Trip updated');
			// NOTE: no refreshTripFromServer() here. The server round-trips our external
			// ids (TripDay Meta), so there is nothing to reconcile, and the refetch it
			// used to do triggered a full Redux re-hydration that WIPED any edits made
			// while the fetch was in flight (Navia-generated spots/notes vanishing).
			// Server-authored changes still refresh via explicit paths (chat proposals).
			return true;
		} catch(err:any){
			// Enhanced error logging
			try {
				console.error('[TripPersist] updateTrip failed for', tripId, 'error=', err);
				console.debug('[TripPersist] error.response.data=', err?.response?.data);
				console.debug('[TripPersist] error.response.status=', err?.response?.status);
				console.debug('[TripPersist] error.response.headers=', err?.response?.headers);
			} catch (logErr) {
				console.warn('[TripPersist] Failed to log error details', logErr);
			}
			const status = err?.response?.status;
			if(status === 403 || status === 401 || status === 404) {
				setSavePermissionDenied(true);
				openToast('error', "You don't have permission to save");
			} else if (status === 500) {
				openToast('error','Save failed (server error). Check server logs for stack trace.');
			} else {
				openToast('error','Save failed');
			}
			return false;
		} finally {
			setSaving(false);
		}
	}, [authToken, saving, lastSaveTs, tripId, openToast]);

	// ── Autosave ───────────────────────────────────────────────────────────────
	// Debounce-persist 2.5s after the last change. Uses the same payload/commit
	// path as the manual Save button, which remains as an explicit fallback.
	const autosaveTimerRef = React.useRef<number | null>(null);
	React.useEffect(() => {
		// aiAutoGenerating: saving mid-generation triggers a server refresh that
		// re-hydrates Redux with server ids, orphaning the generator's queued spot
		// dispatches. One clean save runs right after generation completes instead.
		if (readOnly || !effectiveCanEdit || !isHydrated || !isDirty || saving || aiAutoGenerating) return;
		if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
		autosaveTimerRef.current = window.setTimeout(() => {
			autosaveTimerRef.current = null;
			// Re-check at fire time: hydration commits update lastCommittedRef (a ref,
			// no re-render) so a timer scheduled during a transient dirty window must
			// not fire a ghost save on every page load.
			if (computeSignatureRef.current() === lastCommittedRef.current) return;
			const payload = buildPersistPayload(isDraft);
			persistedPayloadRef.current = payload;
			persistToBackend(payload).then((ok: boolean) => { if (ok) commitSnapshot(isDraft); });
		}, 2500);
		return () => { if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current); };
	}, [readOnly, effectiveCanEdit, isHydrated, isDirty, saving, isDraft, aiAutoGenerating, buildPersistPayload, persistToBackend, commitSnapshot]);

	// If notes were silently cleaned on hydration (category 'general' leaked into notes field),
	// persist the corrected value automatically so the backend stays in sync.
	React.useEffect(() => {
		if (!isHydrated || !cleanedNotesRef.current || !effectiveCanEdit || !authToken) return;
		cleanedNotesRef.current = false;
		const timer = setTimeout(() => {
			const payload = buildPersistPayload(isDraft);
			persistToBackend(payload).then(ok => { if (ok) commitSnapshot(isDraft); });
		}, 800);
		return () => clearTimeout(timer);
	}, [isHydrated, effectiveCanEdit, authToken, buildPersistPayload, persistToBackend, isDraft, commitSnapshot]);

	const computePublishChecks = React.useCallback((): PublishChecks => {
		const trimmedTitle = title.trim();
		const hasTitle = trimmedTitle.length > 0 && trimmedTitle !== 'Untitled Trip';

		const words = (tripDescription || '').trim().split(/\s+/).filter(w => w.length > 0);
		const wordCount = words.length;
		const hasDescription = wordCount >= 10;

		let expectedNights = 0;
		if (tripStartDate && tripEndDate) {
			try {
				const ms = new Date(tripEndDate).getTime() - new Date(tripStartDate).getTime();
				expectedNights = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
			} catch {}
		}
		const coveredNights = planner.destinations.reduce((a, d) => a + (d.nights || 0), 0);
		const allDatesCovered = expectedNights > 0 && coveredNights >= expectedNights;

		return { hasTitle, hasDescription, allDatesCovered, wordCount, expectedNights, coveredNights };
	}, [title, tripDescription, tripStartDate, tripEndDate, planner.destinations]);

	const handlePublish = async () => {
		if(!currentUserIsOwner || !authToken) return; // safety
		if(isDraft){
			setSaving(true);
			try {
				// Publishing should always make the trip publicly readable.
				await apiServices.changeTripVisibility(authToken, tripId, { visibility: 'Everyone' });
				await apiServices.setTripPublished(authToken, tripId, true);
				setPrivacy('Everyone');
				commitSnapshot(false);
				setShowCelebration(true);
			} catch {
				openToast('error', 'Failed to publish trip. Please try again.');
			} finally {
				setSaving(false);
			}
		} else {
			// Unpublish -> revert to draft
			setSaving(true);
			try {
				await apiServices.setTripPublished(authToken, tripId, false);
				// Unpublished trips should default back to trip-members visibility.
				await apiServices.changeTripVisibility(authToken, tripId, { visibility: 'Members' });
				setPrivacy('Trip Members');
				commitSnapshot(true);
				openToast('info', 'Trip unpublished');
			} catch {
				openToast('error', 'Failed to unpublish trip. Please try again.');
			} finally {
				setSaving(false);
			}
		}
	};

	const redirectToTripView = React.useCallback(() => {
		try { navigate(`/trip/${tripId}`, { replace: true }); } catch { try { window.location.href = `/trip/${tripId}`; } catch {} }
	}, [navigate, tripId]);

	const performSaveDraftAndExit = React.useCallback(async () => {
		if(exiting) return; setExiting(true);
		try {
			if(isDirty && effectiveCanEdit){
				const payload = buildPersistPayload(true);
				persistedPayloadRef.current = payload;
				const ok = await persistToBackend(payload);
				if(ok) commitSnapshot(true);
				if(!ok){ setExiting(false); return; }
			}
			redirectToTripView();
		} finally { setExiting(false); }
	}, [isDirty, effectiveCanEdit, buildPersistPayload, persistToBackend, commitSnapshot, redirectToTripView, exiting]);

	const handleBackHomeClick = () => {
		if(readOnly){
			// On the read-only TripView page, go back in history instead of
			// re-navigating to the same /trip/:id URL (which is a no-op).
			if(window.history.length > 1){ window.history.back(); } else { navigate('/dashboard'); }
			return;
		}
		if(!effectiveCanEdit || savePermissionDenied){
			redirectToTripView();
			return;
		}
		if(!isDirty){ redirectToTripView(); return; }
		setExitConfirmOpen(true);
	};

	const hideSectionsArr: string[] = Array.isArray(hideSections) ? hideSections : [];

	// Build dynamic trip members list (owner + any backend-provided members if structure exists)
	const userProfile = useSelector((s:RootState)=> s.user.profile);
	const ownerInfo = React.useMemo(() => deriveOwnerInfo([initialTrip, remoteTrip], tripUsers), [initialTrip, remoteTrip, tripUsers]);	
	const currentUserIsOwner = React.useMemo(() => {
		if(!userProfile){
			return Boolean(isOwnerExternal);
		}
		const userId = userProfile.id != null ? String(userProfile.id) : undefined;
		const userEmail = typeof userProfile.email === 'string' ? userProfile.email.toLowerCase() : undefined;
		if(ownerInfo.id && userId && ownerInfo.id === userId) return true;
		if(ownerInfo.email && userEmail && ownerInfo.email === userEmail) return true;
		if(ownerInfo.id || ownerInfo.email) return false;
		return Boolean(isOwnerExternal);
	}, [userProfile, ownerInfo, isOwnerExternal]);
	const currentUserRole: 'Owner'|'Editor'|'Viewer' = currentUserIsOwner ? 'Owner' : (effectiveCanEdit ? 'Editor' : 'Viewer');
	const tripMembers = React.useMemo(()=> {
		const list: { id:string; name:string; handle:string; email?:string; avatar?:string; role:'Owner'|'Editor'|'Viewer' }[] = [];
		// Prefer authoritative tripUsers from /trips/{id}/users; fallback to embedded members in initialTrip
		const embeddedMembers: any[] = Array.isArray((initialTrip?.trip as any)?.members) ? (initialTrip!.trip as any).members
			: Array.isArray((initialTrip as any)?.members) ? (initialTrip as any).members : [];
		const rawMembers: any[] = tripUsers.length ? tripUsers : embeddedMembers;
		const ownerIdNormalized = ownerInfo.id ? String(ownerInfo.id) : undefined;
		const ownerEmailNormalized = ownerInfo.email;
		let ownerPresent = false;
		for(const m of rawMembers){
			try {
				const id = pickFirstId(m.id, m.userId, m.Id, m.UserId) || Math.random().toString(36).slice(2);
				const directName = pickFirstString(m.name, m.Name, m.fullName, m.FullName, m.displayName, m.DisplayName);
				const firstName = pickFirstString(m.fname, m.Fname, m.firstName, m.FirstName);
				const lastName = pickFirstString(m.lname, m.Lname, m.lastName, m.LastName);
				let name = directName || (firstName || lastName ? [firstName, lastName].filter(Boolean).join(' ').trim() : '');
				let handle = normalizeHandle(pickFirstString(m.username, m.Username, m.handle, m.Handle, m.userHandle, m.UserHandle)) || '@member';
				let email = pickFirstString(m.email, m.Email, m.userEmail, m.UserEmail, m.emailAddress, m.EmailAddress, m.memberEmail, m.MemberEmail);
				let avatar = pickFirstString(m.avatar, m.Avatar, m.profilepicture, m.profilePicture, m.photoUrl, m.PhotoUrl, m.profilePic, m.ProfilePic);
				if(!name) name = email ? email.split('@')[0] : 'Member';
				if(handle === '@') handle = '@member';
				const rawRole = pickFirstString(m.role, m.Role, m.userRole, m.UserRole, m.membershipRole, m.MembershipRole);
				const normalizedRole = rawRole ? rawRole.toLowerCase() : undefined;
				const emailLower = email ? email.toLowerCase() : undefined;
				const matchesOwner = Boolean(
					(ownerIdNormalized && id === ownerIdNormalized) ||
					(ownerEmailNormalized && emailLower && ownerEmailNormalized === emailLower)
				);
				let role: 'Owner'|'Editor'|'Viewer' = 'Viewer';
				if(matchesOwner || normalizedRole === 'owner' || m.isOwner || m.IsOwner || m.isTripOwner || m.IsTripOwner) role='Owner';
				else if(normalizedRole === 'editor' || m.canEdit || m.CanEdit) role='Editor';
				// Normalize owner: if backend sends canEdit + matches current user id treat as Owner
				if(userProfile && (id === String(userProfile.id)) && role==='Editor' && currentUserIsOwner) role='Owner';
				if(matchesOwner){
					if(ownerInfo.name && (!name || name.toLowerCase() === 'member')) name = ownerInfo.name;
					if(ownerInfo.handle && (handle === '@member' || !handle)) handle = ownerInfo.handle;
					if(ownerInfo.avatar && !avatar) avatar = ownerInfo.avatar;
					if(ownerInfo.email && !email) email = ownerInfo.email;
				}
				if(role==='Owner') ownerPresent = true;
				list.push({ id, name, handle, email, avatar: avatar || undefined, role });
			} catch {}
		}
		if(!ownerPresent && (ownerIdNormalized || ownerEmailNormalized)){
			const fallbackId = ownerIdNormalized || ownerEmailNormalized || 'owner';
			const fallbackName = ownerInfo.name || (ownerInfo.email ? ownerInfo.email.split('@')[0] : 'Trip owner');
			const fallbackHandle = normalizeHandle(ownerInfo.handle || (ownerInfo.email ? ownerInfo.email.split('@')[0] : undefined)) || '@owner';
			list.unshift({ id: fallbackId, name: fallbackName, handle: fallbackHandle, email: ownerInfo.email, avatar: ownerInfo.avatar, role: 'Owner' });
			ownerPresent = true;
		}
		// Ensure current user is present in list with derived role (owner/editor/viewer)
		if(userProfile){
			const currentId = String(userProfile.id || 'me');
			if(!list.some(m=> m.id===currentId)){
				const name = [userProfile.fname, userProfile.lname].filter(Boolean).join(' ') || userProfile.email || 'You';
				const derivedHandle = userProfile.email ? '@'+(userProfile.email.split('@')[0]||'you') : '@you';
				list.unshift({ id: currentId, name, handle: derivedHandle, email: userProfile.email, avatar: userProfile.profilepicture, role: currentUserRole });
			}
			else {
				// Update existing entry to reflect current user's role
				if(currentUserIsOwner){
					for(const member of list){ if(member.id===currentId){ member.role='Owner'; break; } }
				} else if(effectiveCanEdit){
					for(const member of list){ if(member.id===currentId && member.role==='Viewer'){ member.role='Editor'; break; } }
				}
			}
		}
		return list;
	}, [initialTrip, userProfile, tripUsers, ownerInfo, currentUserIsOwner, currentUserRole, effectiveCanEdit]);

	// Toggle "Anyone with link can view" (sets Visibility = ReadOnly or reverts to Members)
	// Declared after currentUserIsOwner to avoid temporal dead zone
	const handleLinkShareToggle = React.useCallback(async (enabled: boolean) => {
		if (!authToken || !currentUserIsOwner) return;
		try {
			await apiServices.changeTripVisibility(authToken, tripId, { visibility: enabled ? 'ReadOnly' : 'Members' });
			setLinkShareEnabled(enabled);
		} catch {
			openToast('error', 'Failed to update link sharing settings');
		}
	}, [authToken, tripId, currentUserIsOwner, openToast]);

	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('md'));

	// ── Trip Pulse: readiness model ─────────────────────────────────────────
	// ── Packing persistence (per-trip, localStorage) ──────────────────────────
	// Until packing gets a backend field, hydrate/save per trip so refreshes don't lose the list.
	const packingHydratedRef = React.useRef(false);
	React.useEffect(() => {
		if (!tripId || packingHydratedRef.current) return;
		packingHydratedRef.current = true;
		try {
			const raw = localStorage.getItem(`tripPacking:${tripId}`);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (parsed && Array.isArray(parsed.categories)) dispatch(loadPacking(parsed));
			}
		} catch { /* corrupt entry - keep defaults */ }
	}, [tripId, dispatch]);
	React.useEffect(() => {
		if (!tripId || !packingHydratedRef.current) return;
		try {
			localStorage.setItem(`tripPacking:${tripId}`, JSON.stringify({ categories: packingCategories }));
		} catch { /* storage full - non-fatal */ }
	}, [tripId, packingCategories]);

	const daysToGo = React.useMemo(() => {
		if (!tripStartDate) return null;
		const start = new Date(tripStartDate).getTime();
		if (!Number.isFinite(start)) return null;
		return Math.ceil((start - Date.now()) / 86400000);
	}, [tripStartDate]);

	const expenseMembers = React.useMemo(
		() => tripMembers.map((m: any) => ({ id: String(m.id), name: m.name || 'Member', avatarUrl: m.avatar || null })),
		[tripMembers],
	);

	const pulseDimensions = React.useMemo((): PulseDimension[] => {
		const destCount = planner.destinations.length;
		const checks = computePublishChecks();
		const staysCovered = planner.destinations.filter((d) => d.stay?.name || (d.stays?.length ?? 0) > 0).length;
		const packingItems = packingCategories.flatMap((c) => c.items);
		const packedCount = packingItems.filter((i) => i.checked).length;
		const hasBudget = planner.tripBudget != null || (planner.expenses?.length ?? 0) > 0;
		const goPlan = () => { setSectionDebug('plan'); setTab(0); };
		return [
			{
				id: 'route', label: 'Plan your route', weight: 20, icon: PulseRouteIcon,
				progress: destCount > 0 ? 1 : 0,
				detail: destCount > 0 ? `${destCount} stop${destCount === 1 ? '' : 's'} planned` : 'No destinations yet',
				actionLabel: 'Add stops', onAction: goPlan,
			},
			{
				id: 'dates', label: 'Set travel dates', weight: 15, icon: PulseDatesIcon,
				progress: tripStartDate && tripEndDate ? 1 : 0,
				detail: tripStartDate && tripEndDate ? `${tripStartDate} → ${tripEndDate}` : 'No dates yet',
				actionLabel: 'Set dates', onAction: () => setSettingsOpen(true),
			},
			{
				id: 'nights', label: 'Allocate every night', weight: 15, icon: PulseNightsIcon,
				progress: targetNights > 0 ? Math.min(1, totalNights / targetNights) : 0,
				detail: `${totalNights} of ${targetNights} nights placed`,
				actionLabel: 'Fill nights', onAction: goPlan,
			},
			{
				id: 'stays', label: 'Book your stays', weight: 15, icon: PulseStaysIcon,
				progress: destCount > 0 ? staysCovered / destCount : 0,
				detail: destCount > 0 ? `${staysCovered} of ${destCount} stops have a stay` : 'Add stops first',
				actionLabel: 'Add stays', onAction: goPlan,
			},
			{
				id: 'budget', label: 'Set up the budget', weight: 10, icon: PulseBudgetIcon,
				progress: hasBudget ? 1 : 0,
				detail: hasBudget
					? planner.tripBudget != null ? 'Budget set' : `${planner.expenses?.length ?? 0} expenses tracked`
					: 'No budget yet',
				actionLabel: 'Open budget', onAction: () => { setSectionDebug('plan'); setTab(1); },
			},
			{
				id: 'packing', label: 'Start the packing list', weight: 10, icon: PulseLuggageIcon,
				progress: packingItems.length === 0 ? 0 : 0.5 + 0.5 * (packedCount / packingItems.length),
				detail: packingItems.length === 0 ? 'Nothing on the list yet' : `${packedCount} of ${packingItems.length} items packed`,
				actionLabel: 'Pack', onAction: () => setSectionDebug('packing'),
			},
			{
				id: 'crew', label: 'Invite your crew', weight: 10, icon: PulseCrewIcon,
				progress: tripMembers.length >= 2 ? 1 : 0,
				detail: tripMembers.length >= 2 ? `${tripMembers.length} travelers on board` : 'Planning solo so far',
				actionLabel: 'Invite', onAction: () => setShareModalOpen(true),
			},
			{
				id: 'story', label: 'Name & describe the trip', weight: 5, icon: PulseStoryIcon,
				progress: (checks.hasTitle ? 0.5 : 0) + (checks.hasDescription ? 0.5 : 0),
				detail: checks.hasTitle && checks.hasDescription ? 'Title & description set' : !checks.hasTitle ? 'Still untitled' : 'Description too short',
				actionLabel: 'Edit', onAction: () => setSettingsOpen(true),
			},
		];
	}, [planner.destinations, planner.tripBudget, planner.expenses, packingCategories, tripMembers.length, tripStartDate, tripEndDate, totalNights, targetNights, computePublishChecks]);

	// Mobile users CAN plan trips now — we just greet them once with a soft
	// disclaimer that the planner shines on a bigger screen, then let them in.
	// The acknowledgement is remembered per-device so returning mobile planners
	// aren't nagged on every visit.
	const [mobilePlannerNoticeAck, setMobilePlannerNoticeAck] = React.useState<boolean>(() => {
		try { return localStorage.getItem('tripician:mobilePlannerNoticeAck') === '1'; } catch { return false; }
	});
	if (isMobile && !readOnly && !mobilePlannerNoticeAck) {
		return (
			<Box sx={{
				display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
				minHeight: '100dvh', px: 3, textAlign: 'center', gap: 2,
				background: theme.palette.background.default,
			}}>
				<Box sx={{ color: 'text.disabled' }}><IconDeviceMobile size={36} stroke={1.4} /></Box>
				<Typography sx={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.4rem', color: 'text.primary' }}>
					Planning is better on a bigger screen
				</Typography>
				<Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: 'text.secondary', maxWidth: 340, lineHeight: 1.7 }}>
					You can absolutely plan right here on your phone. For the full experience — where every one of Navia's magical features has room to breathe — open Tripician on a tablet or computer.
				</Typography>
				<Button
					variant="contained"
					onClick={() => {
						try { localStorage.setItem('tripician:mobilePlannerNoticeAck', '1'); } catch { /* best-effort */ }
						setMobilePlannerNoticeAck(true);
					}}
					sx={{ mt: 1, borderRadius: '50px', textTransform: 'none', fontFamily: "'Inter', sans-serif", background: '#FF385C', boxShadow: 'none', '&:hover': { background: '#E31C5F', boxShadow: 'none' } }}
				>
					Continue on this device
				</Button>
				<Button
					variant="text"
					onClick={() => navigate('/home')}
					sx={{ borderRadius: '50px', textTransform: 'none', fontFamily: "'Inter', sans-serif", color: 'text.secondary', '&:hover': { background: 'transparent', color: 'text.primary' } }}
				>
					Back to Home
				</Button>
			</Box>
		);
	}

	return (
		<React.Fragment>
		{/*  AI Auto-Generation fullscreen overlay  */}
		{aiAutoGenerating && (
			<Box sx={{
				position: 'fixed', inset: 0, zIndex: 9999,
				backdropFilter: 'blur(6px)',
				background: 'rgba(255,255,255,0.88)',
				display: 'flex', flexDirection: 'column',
				alignItems: 'center', justifyContent: 'center', gap: 2.5,
			}}>
				<Box sx={{ position: 'relative', width: 56, height: 56 }}>
					<Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(255,56,92,0.12)' }} />
					<Box sx={{
						position: 'absolute', inset: 0, borderRadius: '50%',
						border: '3px solid transparent', borderTopColor: '#FF385C',
						animation: 'ai-spin 0.9s linear infinite',
						'@keyframes ai-spin': { to: { transform: 'rotate(360deg)' } },
					}} />
				</Box>
				<Typography key={aiAutoMessage} sx={{
					fontFamily: "'Inter', sans-serif", fontWeight: 600,
					fontSize: '1rem', color: 'text.secondary',
					textAlign: 'center', maxWidth: 320,
					animation: 'ai-fadein 0.45s ease',
					'@keyframes ai-fadein': {
						from: { opacity: 0, transform: 'translateY(8px)' },
						to: { opacity: 1, transform: 'translateY(0)' },
					},
				}}>{aiAutoMessage}</Typography>
				{/* Disclosure at the point of generation - state that this is drafted, not
				    researched, exactly where it matters. We disclose; we don't advertise. */}
				<Typography sx={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.35)', fontFamily: "'Inter', sans-serif", textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
					Drafted automatically, then every place checked against a live listing.
				</Typography>
			</Box>
		)}
		<Box sx={{ display:'flex', flexDirection:'row', height:'100vh', overflow:'hidden' }}>
		<CreateTripNav
			active={section === 'plan' && tab === 1 ? 'budget' : section}
			onChange={(id)=> {
				if (id === 'budget') { setSectionDebug('plan'); setTab(1); return; }
				if (id === 'plan') { setSectionDebug('plan'); setTab(0); return; }
				setSectionDebug(id as any);
			}}
			onSettingsClick={()=> setSettingsOpen(true)}
			hideSections={hideSectionsArr}
			canAccessDocs={canAccessDocs}
			docsEnabled={ENABLE_DOC_UPLOAD}
			budgetEnabled={ENABLE_EXPENSES}
			settingsDisabled={readOnly || !effectiveCanEdit}
		/>
			<Box sx={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:0 }}>
				<TopBar showSearch={false} showBurger={false} logo={
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
						<Tooltip title='Back'>
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
					</Box>
				} centerNode={
					<Typography noWrap sx={{ fontFamily:"'Inter', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize:'1.2rem', letterSpacing:'-0.4px', lineHeight:1.15 }}>{title}</Typography>
				} />
				<Box ref={containerRef} sx={{ flex:1, display:'flex', position:'relative', minHeight:0 }}>
					{/* Centre content column */}
					<Box sx={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
					{section==='news' ? (
						<Box sx={{ flex:1, overflowY:'auto', overflowX:'hidden', display:'flex', flexDirection:'column' }}>
							<NewsPanel selectedCountries={countries} />
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
					<Box sx={(theme)=>({ flex:1, minWidth:0, minHeight:0, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative',
						/* Premium board background  dot grid pattern */
						backgroundColor: theme.palette.mode==='light' ? '#f9fafb' : '#111315',
						backgroundImage: theme.palette.mode==='light'
							? 'radial-gradient(circle, rgba(0,0,0,0.10) 1px, transparent 1px)'
							: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
						backgroundSize: '22px 22px',
					})}>
						<Divider />
						{section==='plan' && (
						<Box sx={(t)=>({ display:'flex', alignItems:'center', flexWrap:{ xs:'wrap', md:'nowrap' }, rowGap:.75, px:2, gap:1, py:.75, borderBottom:`1px solid ${t.palette.divider}`, background: t.palette.mode==='light'? 'rgba(255,255,255,0.92)':'rgba(20,22,26,0.92)', backdropFilter:'blur(8px)', position:'sticky', top:0, zIndex:2 })}>
							{/* Vital trip info - dates · stops · travelers. On phones these wrap into tidy rows instead of scrolling off-screen. */}
							<Box sx={{ flex:1, minWidth:0, display:'flex', alignItems:'center', flexWrap:{ xs:'wrap', md:'nowrap' }, rowGap:.75, gap:1, overflowX:{ xs:'visible', md:'auto' }, '::-webkit-scrollbar':{ display:'none' }, scrollbarWidth:'none' }}>
								<Tooltip title={(!readOnly && effectiveCanEdit) ? 'Edit trip dates' : 'Trip dates'} arrow placement='bottom'>
									<Box
										component='button'
										type='button'
										onClick={() => { if (!readOnly && effectiveCanEdit) setSettingsOpen(true); }}
										sx={(t) => ({
											display:'flex', alignItems:'center', gap:.6, height:32, px:1.2, borderRadius:'20px', flexShrink:0,
											border:`1px solid ${t.palette.divider}`, bgcolor:'transparent',
											color:'text.primary', fontFamily:'inherit', fontSize:12.5, fontWeight:600, lineHeight:1,
											cursor:(!readOnly && effectiveCanEdit) ? 'pointer' : 'default',
											transition:'all .15s',
											'&:hover': (!readOnly && effectiveCanEdit) ? { borderColor:'rgba(255,56,92,0.4)', color:'#FF385C' } : {},
										})}
									>
										<PulseDatesIcon size={13} stroke={2} />
										{tripStartDate && tripEndDate
											? `${new Date(tripStartDate).toLocaleDateString(undefined, { day:'numeric', month:'short' })} – ${new Date(tripEndDate).toLocaleDateString(undefined, { day:'numeric', month:'short' })}`
											: 'Set dates'}
									</Box>
								</Tooltip>
								<Box sx={(t)=>({ display:{ xs:'none', md:'flex' }, alignItems:'center', gap:.6, height:32, px:1.2, borderRadius:'20px', flexShrink:0, border:`1px solid ${t.palette.divider}`, color:'text.primary', fontSize:12.5, fontWeight:600, lineHeight:1 })}>
									<PulseRouteIcon size={13} stroke={2} />
									{planner.destinations.length} stop{planner.destinations.length !== 1 ? 's' : ''}
								</Box>
								<Tooltip title='Travelers - invite your crew' arrow placement='bottom'>
									<Box
										component='button'
										type='button'
										onClick={() => setShareModalOpen(true)}
										sx={(t) => ({
											display:'flex', alignItems:'center', gap:.7, height:32, px:1.2, borderRadius:'20px', flexShrink:0,
											border:`1px solid ${t.palette.divider}`, bgcolor:'transparent',
											color:'text.primary', fontFamily:'inherit', fontSize:12.5, fontWeight:600, lineHeight:1,
											cursor:'pointer', transition:'all .15s',
											'&:hover': { borderColor:'rgba(255,56,92,0.4)', color:'#FF385C' },
										})}
									>
										{tripUsers.length > 0 && (
											<AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width:20, height:20, fontSize:9, fontWeight:700, border:'1.5px solid', borderColor:'background.paper' } }}>
												{tripUsers.map((u: any, i: number) => (
													<Avatar key={u.id || i} src={u.avatar || u.profilePic || u.profilePicture || undefined} sx={{ bgcolor:'#FF385C' }}>
														{(u.name || u.displayName || 'T').charAt(0).toUpperCase()}
													</Avatar>
												))}
											</AvatarGroup>
										)}
										{tripUsers.length <= 1 ? 'Invite crew' : `${tripUsers.length} travelers`}
									</Box>
								</Tooltip>
								{ENABLE_EXPENSES && planner.tripBudget != null && (
									<Tooltip title='Open budget & expenses' arrow placement='bottom'>
										<Box
											component='button'
											type='button'
											onClick={() => { setSectionDebug('plan'); setTab(1); }}
											sx={(t) => ({
												display:{ xs:'none', md:'flex' }, alignItems:'center', gap:.6, height:32, px:1.2, borderRadius:'20px', flexShrink:0,
												border:`1px solid ${t.palette.divider}`, bgcolor:'transparent',
												color:'text.primary', fontFamily:'inherit', fontSize:12.5, fontWeight:600, lineHeight:1,
												cursor:'pointer', transition:'all .15s',
												'&:hover': { borderColor:'rgba(255,56,92,0.4)', color:'#FF385C' },
											})}
										>
											<PulseBudgetIcon size={13} stroke={2} />
											{new Intl.NumberFormat().format(planner.tripBudget)} budget
										</Box>
									</Tooltip>
								)}
							</Box>
							{/* Readiness ring — desktop only (mobile is draft-focused) */}
							<Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', flexShrink: 0 }}>
								<TripPulse dimensions={pulseDimensions} daysToGo={daysToGo} />
							</Box>
							<Tooltip title={`${totalNights} of ${targetNights} nights planned`} arrow placement='bottom'>
							<Box sx={(t) => ({
								position: 'relative', display: 'flex', alignItems: 'center', gap: .55,
								px: 1.1, height: 32, borderRadius: '20px', overflow: 'hidden', cursor: 'default', flexShrink: 0,
								border: `1px solid ${totalNights >= targetNights && targetNights > 0 ? 'rgba(255,56,92,0.45)' : t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
								bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
								transition: 'border-color .3s',
							})}>
								{/* Filling progress background */}
								<Box sx={{
									position: 'absolute', left: 0, top: 0, bottom: 0,
									width: `${targetNights ? Math.min(100, (totalNights / targetNights) * 100) : 0}%`,
									bgcolor: 'rgba(255,56,92,0.09)',
									transition: 'width .45s cubic-bezier(.4,0,.2,1)',
									pointerEvents: 'none',
								}} />
								<NightsStayRoundedIcon sx={{ fontSize: 13, color: '#FF385C', position: 'relative', zIndex: 1, flexShrink: 0 }} />
								<Box sx={{ display: 'flex', alignItems: 'baseline', gap: .3, position: 'relative', zIndex: 1 }}>
									<Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1, color: 'text.primary' }}>
										{totalNights}
									</Typography>
									<Typography sx={{ fontSize: 11, fontWeight: 500, lineHeight: 1, color: 'text.secondary' }}>
										/ {targetNights} nights
									</Typography>
								</Box>
							</Box>
						</Tooltip>
							{!readOnly && effectiveCanEdit && (
							<Tooltip title='Check this plan against real distances, opening hours and time budgets' arrow placement='bottom'>
								<Box
									component='button'
									type='button'
									onClick={() => setPlanReviewOpen(true)}
									sx={(t) => ({
										display:{ xs:'none', md:'flex' }, alignItems:'center', gap:.6, height:32, px:1.2, borderRadius:'20px', flexShrink:0,
										border:`1px solid ${t.palette.divider}`, bgcolor:'transparent',
										color:'text.primary', fontFamily:'inherit', fontSize:12.5, fontWeight:600, lineHeight:1,
										cursor:'pointer', transition:'all .15s',
										'&:hover': { borderColor:'rgba(255,56,92,0.4)', color:'#FF385C' },
									})}
								>
									<IconShieldCheck size={14} />
									Reality check
								</Box>
							</Tooltip>
							)}
							{!readOnly && effectiveCanEdit && (
							<Tooltip arrow placement='bottom' title={!isDraft ? 'Your trip is live visible to everyone' : saving ? 'Publishing...' : 'Make your trip public'}>
								{/* Publish — desktop only; on mobile users draft & Save (no publishing) */}
								<Box component='span' sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
									<Button
										size='small'
										variant='contained'
										disabled={!isDraft || saving}
										onClick={() => {
											if (isDraft) {
												const checks = computePublishChecks();
												const allPassed = checks.hasTitle && checks.hasDescription && checks.allDatesCovered;
												if (!allPassed) {
													setPublishChecks(checks);
													setShowPublishCheck(true);
													return;
												}
												handlePublish();
												requestAnimationFrame(() => { lastCommittedRef.current = computeSignature(); });
											}
										}}
										sx={{
											ml: .5,
											textTransform: 'none',
											borderRadius: '20px',
											px: isDraft ? 1.6 : 1.4,
											height: 32,
											fontSize: 12,
											fontWeight: 700,
											minWidth: 0,
											letterSpacing: '-0.1px',
											gap: .4,
											flexShrink: 0,
											transition: 'all .25s cubic-bezier(.4,0,.2,1)',
											...(isDraft ? {
												background: 'linear-gradient(135deg, #FF385C 0%, #E31C5F 55%, #c91855 100%)',
												color: '#fff',
												boxShadow: '0 2px 10px rgba(255,56,92,0.40), 0 1px 3px rgba(0,0,0,0.15)',
												border: '1px solid rgba(255,255,255,0.15)',
												'&:hover': {
													background: 'linear-gradient(135deg, #ff4d6d 0%, #E31C5F 55%, #b5144c 100%)',
													boxShadow: '0 4px 18px rgba(255,56,92,0.55), 0 1px 4px rgba(0,0,0,0.18)',
													transform: 'translateY(-1px)',
												},
												'&:active': { transform: 'translateY(0)', boxShadow: '0 2px 8px rgba(255,56,92,0.4)' },
												'&.Mui-disabled': {
													background: 'linear-gradient(135deg, #FF385C, #E31C5F)',
													color: 'rgba(255,255,255,0.7)',
													boxShadow: 'none',
												},
											} : {
												background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
												color: '#fff',
												boxShadow: '0 0 14px 2px rgba(46,125,50,0.4)',
												border: '1px solid rgba(255,255,255,0.12)',
												'&.Mui-disabled': {
													background: 'linear-gradient(135deg, #1b5e20, #2e7d32)',
													color: '#fff',
													opacity: 1,
													boxShadow: '0 0 14px 2px rgba(46,125,50,0.4)',
												},
											}),
										}}
									>
										{saving ? (
											<><CircularProgress size={12} thickness={5} sx={{ color: 'inherit', mr: .4 }} />Publishing...</>
										) : isDraft ? (
											<><PublishRoundedIcon sx={{ fontSize: 13 }} /> Publish</>
										) : (
											<><ShareRoundedIcon sx={{ fontSize: 13 }} /> Published</>
										)}
									</Button>
								</Box>
							</Tooltip>
							)}
							{!isDraft && (
							<Tooltip arrow placement='bottom' title='Share this published trip'>
								<Button
									size='small'
									variant='outlined'
									onClick={() => setShareModalOpen(true)}
									sx={{
										ml: .5,
										textTransform: 'none',
										borderRadius: '20px',
										px: 1.25,
										height: 32,
										fontSize: 12,
										fontWeight: 700,
										minWidth: 0,
										letterSpacing: '-0.1px',
										gap: .35,
										flexShrink: 0,
										borderColor: 'rgba(255,56,92,0.45)',
										color: '#FF385C',
										'&:hover': {
											borderColor: '#FF385C',
											background: 'rgba(255,56,92,0.08)',
										},
									}}
								>
									<ShareRoundedIcon sx={{ fontSize: 13 }} /> Share
								</Button>
							</Tooltip>
							)}
						</Box>
						)}
						<Divider />
						{/* -- Floating board tools: Map + Optimize -- */}
						{section === 'plan' && (
							<Box sx={{ position: 'absolute', bottom: 72, left: 16, zIndex: 10, display: { xs: 'flex', lg: 'none' }, flexDirection: 'column', gap: .85 }}>
								<Tooltip title='View map' placement='right' arrow>
									<IconButton
										onClick={() => setMapDrawerOpen(true)}
										sx={(t) => ({
											width: 40, height: 40, borderRadius: '13px',
											bgcolor: t.palette.mode === 'dark' ? 'rgba(18,20,24,0.88)' : 'rgba(255,255,255,0.90)',
											border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)'}`,
											color: 'text.secondary', backdropFilter: 'blur(10px)',
											boxShadow: '0 2px 12px rgba(0,0,0,0.13)',
											transition: 'all .15s',
											'&:hover': { bgcolor: 'rgba(255,56,92,0.08)', borderColor: 'rgba(255,56,92,0.38)', color: '#FF385C', boxShadow: '0 4px 18px rgba(255,56,92,0.18)', transform: 'translateY(-1px)' },
										})}
									>
										<MapOutlinedIcon sx={{ fontSize: 18 }} />
									</IconButton>
								</Tooltip>
								{!isExternalNonOwner && (
									<Tooltip
										placement='right' arrow
										title={geocodedCount < 3 ? 'Add at least 3 destinations with coordinates to optimize' : optimizingRoute ? 'Optimizing' : 'Optimize route order'}
									>
										{/* Route optimization is a power feature — hidden on phones (map + settings only) */}
										<Box component='span' sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
											<IconButton
												aria-label='Optimize route'
												onClick={handleOptimizeRouteClick}
												disabled={geocodedCount < 3 || optimizingRoute}
												sx={(t) => ({
													width: 40, height: 40, borderRadius: '13px',
													bgcolor: t.palette.mode === 'dark' ? 'rgba(18,20,24,0.88)' : 'rgba(255,255,255,0.90)',
													border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)'}`,
													color: 'text.secondary', backdropFilter: 'blur(10px)',
													boxShadow: '0 2px 12px rgba(0,0,0,0.13)',
													transition: 'all .15s',
													'&:hover': { bgcolor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.38)', color: '#6366f1', boxShadow: '0 4px 18px rgba(99,102,241,0.18)', transform: 'translateY(-1px)' },
													'&.Mui-disabled': { bgcolor: t.palette.mode === 'dark' ? 'rgba(18,20,24,0.5)' : 'rgba(255,255,255,0.55)', color: 'text.disabled', boxShadow: 'none', border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}` },
												})}
											>
												{optimizingRoute
													? <Box sx={{ width: 16, height: 16, border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
													: <AltRouteIcon sx={{ fontSize: 18 }} />
												}
											</IconButton>
										</Box>
									</Tooltip>
								)}
							{/* Settings  mobile only (desktop uses sidebar) */}
							{(!readOnly && effectiveCanEdit) && (
								<Tooltip title='Trip settings' placement='right' arrow>
									<IconButton
										onClick={() => setSettingsOpen(true)}
										sx={(t) => ({
											display: { xs: 'flex', md: 'none' },
											width: 40, height: 40, borderRadius: '13px',
											bgcolor: t.palette.mode === 'dark' ? 'rgba(18,20,24,0.88)' : 'rgba(255,255,255,0.90)',
											border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)'}`,
											color: 'text.secondary', backdropFilter: 'blur(10px)',
											boxShadow: '0 2px 12px rgba(0,0,0,0.13)',
											transition: 'all .15s',
											'&:hover': { bgcolor: 'rgba(255,56,92,0.08)', borderColor: 'rgba(255,56,92,0.38)', color: '#FF385C', boxShadow: '0 4px 18px rgba(255,56,92,0.18)', transform: 'translateY(-1px)' },
										})}
									>
										<TuneRoundedIcon sx={{ fontSize: 18 }} />
									</IconButton>
								</Tooltip>
							)}
						</Box>
					)}
					<Box sx={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column'}}>
							{section==='plan' && tab===0 && (
								<Box sx={{ px:0 }}>
									{ENABLE_CARD_LAYOUT ? (
										<DestinationCardsPanel
											maxed={totalNights >= targetNights}
											readOnly={readOnly || !effectiveCanEdit}
											canAccessDocs={canAccessDocs}
											canEdit={effectiveCanEdit}
											isPublished={!isDraft}
											tripId={tripId}
											authToken={authToken}
											tripVibe={vibe}
											onNaviaToast={openToast}
											onRequestNaviaTip={(msg) => window.dispatchEvent(new CustomEvent('navia:send', { detail: { message: msg } }))}
										/>
									) : (
										<DestinationsPanel
											destinations={panelDestinations}
											maxed={totalNights >= targetNights}
											onChangeNights={handleChangeNights}
											onChangeTransport={handleChangeTransport}
											onAddDestination={handleAddDestination}
											onRemoveDestination={handleRemoveDestination}
											onNaviaToast={openToast}
										/>
									)}
								</Box>
							)}
								{section==='plan' && tab===1 && ENABLE_EXPENSES && (
									<ExpensesPanel
										readOnly={readOnly || !effectiveCanEdit}
										members={expenseMembers}
										myUserId={userProfile?.id != null ? String(userProfile.id) : null}
										onInvite={() => setShareModalOpen(true)}
									/>
								)}
						</Box>
					</Box>
					)}
					{/* Save/Update footer - always visible on all sections */}
					{showPlannerActions && (
						<Box sx={(t)=>({ borderTop:`1px solid ${t.palette.divider}`, px:2.5, py:1.5, background:t.palette.background.paper, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 })}>
							<Typography variant='caption' color='text.secondary'>Last saved: {lastSavedDisplay}</Typography>
							<Box sx={{ display:'flex', gap:1.2 }}>
								<Button
									size='small'
									variant='outlined'
									onClick={()=> {
										if(!effectiveCanEdit){ openToast('error','Trip is read only'); return; }
										if(!isHydrated){ openToast('error','Trip data still loading'); return; }
										if(!isDraft){
											const payload = buildPersistPayload(false);
											persistedPayloadRef.current = payload;
											persistToBackend(payload).then(ok => { if(ok) commitSnapshot(false); });
										} else {
											const payload = buildPersistPayload(true);
											persistedPayloadRef.current = payload;
											persistToBackend(payload).then(ok => { if(ok) commitSnapshot(true); });
										}
									}}
									disabled={!effectiveCanEdit || !isDirty || saving || !isHydrated}
									sx={{ textTransform:'none', borderRadius:2 }}
								>
									{isDraft ? 'Save' : 'Update'}{saving && <CircularProgress size={16} thickness={5} sx={{ ml:1 }} />}
								</Button>
							</Box>
						</Box>
					)}
                                    </Box>{/* end centre column */}
                                            {/* Right panel - Trip Chat for editors, Trip Info for viewers */}
                                            <Box sx={(t) => ({
                                                    display: { xs: 'none', lg: 'flex' },
                                                    alignSelf: 'stretch',
                                                    width: sidePanelCollapsed ? 44 : ((!readOnly && effectiveCanEdit)
                                                            ? 'calc(30vw + 44px)'
                                                            : (sidePanelTab === 'comments' || sidePanelTab === 'map') ? 'calc(30vw + 44px)' : 364),
                                                    flexShrink: 0,
                                                    height: '100%',
                                                    minHeight: 0,
                                                    overflow: 'hidden',
                                                    transition: `width ${t.custom.motion.duration.base} ${t.custom.motion.easing.standard}`,
                                            })}>
                                                    {/* Active panel */}
                                                    <Box sx={{ flex: 1, minWidth: 0, height: '100%', display: sidePanelCollapsed ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                            {(!readOnly && effectiveCanEdit) ? (
                                                                    /* Navia group chat - kept mounted so the live connection survives tab switches */
                                                                    <Box sx={(t) => ({ flex: 1, minHeight: 0, display: sidePanelTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden', borderLeft: `1px solid ${t.palette.divider}` })}>
                                                                            <TripChatPanel
                                                                                   tripId={tripId}
                                                                                   token={authToken}
                                                                                   members={tripUsers.map((u: any) => ({ id: u.id, name: u.name || u.displayName || '', avatarUrl: u.avatar || u.profilePic || u.profilePicture || null }))}
                                                                                   myUserId={userProfile?.id ? Number(userProfile.id) : null}
                                                                                   onTripUpdated={refreshTripFromServer}
                                                                                   visible={sidePanelTab === 'chat' && !sidePanelCollapsed}
                                                                                   onUnreadChange={setChatUnread}
                                                                            />
                                                                    </Box>
                                                            ) : (
                                                                    /* Trip info - kept mounted so reaction counts don't refetch per switch */
                                                                    <Box sx={{ flex: 1, minHeight: 0, display: (sidePanelTab === 'info' || sidePanelTab === 'chat') ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
                                                                            <TripViewPanel
                                                                                   tripId={tripId}
                                                                                   title={title}
                                                                                   description={tripDescription}
                                                                                   bannerUrl={bannerUrl}
                                                                                   countries={countries}
                                                                                   tripUsers={tripUsers}
                                                                                   ownerInfo={ownerInfo}
                                                                                   startDate={unifiedTrip?.meta.startDate ?? null}
                                                                                   endDate={unifiedTrip?.meta.endDate ?? null}
                                                                                   totalNights={totalNights}
                                                                                   destinationCount={planner.destinations.length}
                                                                                   showEditAction={showViewEditAction}
                                                                                   isPublished={!isDraft}
                                                                                   onRequestEdit={onRequestEdit}
                                                                                   onShare={() => setShareModalOpen(true)}
                                                                            />
                                                                    </Box>
                                                            )}
                                                            {/* Public comments - only for published trips */}
                                                            {ENABLE_COMMENTS && sidePanelTab === 'comments' && !isDraft && (
                                                                    <Box sx={(t) => ({ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.paper', borderLeft: `1px solid ${t.palette.divider}` })}>
                                                                            <TripComments tripId={tripId} authToken={authToken} />
                                                                    </Box>
                                                            )}
                                                            {/* Map - mounts on first visit, then stays mounted (hidden) */}
                                                            {sideMapMounted && (
                                                                    <Box sx={(t) => ({ flex: 1, minHeight: 0, display: sidePanelTab === 'map' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.paper', borderLeft: `1px solid ${t.palette.divider}` })}>
                                                                            <Box sx={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
                                                                                    <React.Suspense fallback={<Box sx={{ p: 2, fontSize: 13, color: 'text.secondary' }}>Loading map…</Box>}>
                                                                                            <SideMapPanel widthFraction={1} />
                                                                                    </React.Suspense>
                                                                            </Box>
                                                                    </Box>
                                                            )}
                                                    </Box>
                                                    {/* Vertical text rail - NAVIA | COMMENTS | MAP */}
                                                    <Box sx={(t) => ({
                                                            width: 44,
                                                            flexShrink: 0,
                                                            height: '100%',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            pt: 2,
                                                            borderLeft: `1px solid ${t.palette.divider}`,
                                                            bgcolor: 'background.paper',
                                                    })}>
                                                            <Tooltip title={sidePanelCollapsed ? 'Expand panel' : 'Collapse panel'} placement='left' arrow>
                                                                    <IconButton
                                                                            size='small'
                                                                            onClick={() => setSidePanelCollapsed(c => !c)}
                                                                            aria-label={sidePanelCollapsed ? 'Expand side panel' : 'Collapse side panel'}
                                                                            sx={{ mb: 1, color: 'text.secondary' }}
                                                                    >
                                                                            <ChevronRightIcon sx={{ fontSize: 18, transform: sidePanelCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                                                                    </IconButton>
                                                            </Tooltip>
                                                            {(((!readOnly && effectiveCanEdit)
                                                                    ? [
                                                                            { id: 'chat', label: 'Discussion', tip: 'Group chat - type @navia to bring in the co-planner', disabled: false },
                                                                            ...(ENABLE_COMMENTS ? [{ id: 'comments', label: 'Comments', tip: isDraft ? 'Publish this trip to enable public comments' : 'Public comments on this trip', disabled: isDraft }] : []),
                                                                            { id: 'map', label: 'Map', tip: 'Trip map - see your route at a glance', disabled: false },
                                                                    ]
                                                                    : [
                                                                            { id: 'info', label: 'Info', tip: 'Trip overview', disabled: false },
                                                                            ...(ENABLE_COMMENTS ? [{ id: 'comments', label: 'Comments', tip: isDraft ? 'Comments open once this trip is published' : 'Public comments on this trip', disabled: isDraft }] : []),
                                                                            { id: 'map', label: 'Map', tip: 'Trip map - see the route at a glance', disabled: false },
                                                                    ]
                                                            ) as Array<{ id: 'chat' | 'comments' | 'map' | 'info'; label: string; tip: string; disabled: boolean }>).map((railTab, railIdx) => {
                                                                    const railActive = sidePanelTab === railTab.id || (railTab.id === 'info' && sidePanelTab === 'chat');
                                                                    return (
                                                                            <React.Fragment key={railTab.id}>
                                                                                    {railIdx > 0 && <Box sx={{ width: 16, height: '1px', bgcolor: 'divider', my: 1.25, flexShrink: 0 }} />}
                                                                                    <Tooltip title={railTab.tip} placement="left" arrow>
                                                                                            <Box component="span" sx={{ display: 'inline-flex' }}>
                                                                                                    <Box
                                                                                                            component="button"
                                                                                                            type="button"
                                                                                                            disabled={railTab.disabled}
                                                                                                            onClick={() => {
                                                                                                                    if (railTab.disabled) return;
                                                                                                                    if (railActive && !sidePanelCollapsed) { setSidePanelCollapsed(true); return; }
                                                                                                                    setSidePanelCollapsed(false);
                                                                                                                    setSidePanelTab(railTab.id);
                                                                                                                    if (railTab.id === 'map') setSideMapMounted(true);
                                                                                                            }}
                                                                                                            aria-label={railTab.tip}
                                                                                                            sx={(t) => ({
                                                                                                                    position: 'relative',
                                                                                                                    writingMode: 'vertical-rl',
                                                                                                                    textOrientation: 'mixed',
                                                                                                                    px: 1,
                                                                                                                    py: 1.5,
                                                                                                                    border: 'none',
                                                                                                                    background: 'transparent',
                                                                                                                    borderRadius: '8px',
                                                                                                                    cursor: railTab.disabled ? 'default' : 'pointer',
                                                                                                                    fontFamily: 'inherit',
                                                                                                                    fontSize: 10.5,
                                                                                                                    fontWeight: 700,
                                                                                                                    letterSpacing: '0.18em',
                                                                                                                    textTransform: 'uppercase',
                                                                                                                    lineHeight: 1,
                                                                                                                    color: railTab.disabled ? t.palette.text.disabled : railActive ? t.palette.primary.main : t.palette.text.secondary,
                                                                                                                    transition: `color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}, background ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
                                                                                                                    '&:hover': railTab.disabled ? {} : { color: railActive ? t.palette.primary.main : t.palette.text.primary, background: t.custom.surface.hover },
                                                                                                                    '&:focus-visible': { outline: `2px solid ${t.custom.ring}`, outlineOffset: 2 },
                                                                                                            })}
                                                                                                    >
                                                                                                            {railTab.label}
                                                                                                            {railTab.id === 'chat' && chatUnread > 0 && (sidePanelTab !== 'chat' || sidePanelCollapsed) && (
                                                                                                                    <Box sx={{
                                                                                                                            position: 'absolute', top: 1, right: 1,
                                                                                                                            minWidth: 15, height: 15, px: 0.35, borderRadius: 999,
                                                                                                                            bgcolor: 'error.main', color: '#fff',
                                                                                                                            fontSize: 9, fontWeight: 700, lineHeight: 1,
                                                                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                                                            writingMode: 'horizontal-tb', letterSpacing: 0,
                                                                                                                    }}>
                                                                                                                            {chatUnread > 9 ? '9+' : chatUnread}
                                                                                                                    </Box>
                                                                                                            )}
                                                                                                    </Box>
                                                                                            </Box>
                                                                                    </Tooltip>
                                                                            </React.Fragment>
                                                                    );
                                                            })}
                                                    </Box>
                                            </Box>
		</Box>
		{/* Mobile Navia FAB (visible only on xs/sm) */}
		{(!readOnly && effectiveCanEdit) && (
			<Fab
				onClick={() => setNaviaDrawerOpen(true)}
				sx={{
					position: 'fixed', bottom: 86, right: 20,
					display: { xs: 'flex', lg: 'none' },
					background: 'linear-gradient(135deg,#FF385C,#E31C5F)',
					color: '#fff', width: 56, height: 56,
					boxShadow: '0 6px 24px rgba(255,56,92,0.45)',
					zIndex: 1200,
					'&:hover': { background: 'linear-gradient(135deg,#E31C5F,#c91855)' },
				}}
			>
				<ChatRoundedIcon />
			</Fab>
		)}
		{/* Mobile Navia bottom sheet */}
		<Drawer
			anchor='bottom'
			open={naviaDrawerOpen}
			onClose={() => setNaviaDrawerOpen(false)}
			sx={{ display: { xs: 'block', lg: 'none' } }}
			slotProps={{ paper: { sx: { height: '75vh', borderRadius: '16px 16px 0 0', overflow: 'hidden', background: 'transparent', boxShadow: 'none' } } }}
		>
			<Box sx={{ height: '100%', display: { xs: 'flex', lg: 'none' }, flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.paper', borderRadius: '16px 16px 0 0' }}>
				<Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
					<Typography sx={{ fontWeight: 700, fontSize: 15 }}>Trip Chat</Typography>
					<IconButton size='small' onClick={() => setNaviaDrawerOpen(false)}><CloseIcon fontSize='small' /></IconButton>
				</Box>
				<Box sx={{ flex: 1, overflow: 'hidden' }}>
					<TripChatPanel
						tripId={tripId}
						token={authToken}
						members={tripUsers.map((u: any) => ({ id: u.id, name: u.name || u.displayName || '', avatarUrl: u.avatar || u.profilePic || u.profilePicture || null }))}
						myUserId={userProfile?.id ? Number(userProfile.id) : null}
						onTripUpdated={refreshTripFromServer}
					/>
				</Box>
				</Box>

		</Drawer>
		{/* Reality check (editors only) - deterministic, so it re-runs instantly on open */}
		{!readOnly && effectiveCanEdit && (
			<PlanReviewDialog
				open={planReviewOpen}
				onClose={() => setPlanReviewOpen(false)}
				tripName={title}
				tripVibe={vibe}
			/>
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
								{visaErrors.map((er,i)=>(<Typography key={i} variant='caption' sx={{ display:'block', color:'error.main' }}> {er}</Typography>))}
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
				bannerUrl={bannerUrl}
				currentUserIsOwner={currentUserIsOwner}
				onChangeBanner={async ({ url, file }) => {
					// If a local file was picked, upload directly to Cloudinary then persist
					if (file && authToken && tripId) {
						try {
							const { data: uploadData } = await apiServices.getTripBannerUploadUrl(authToken, tripId);
							const fd = new FormData();
							fd.append('file', file);
							fd.append('api_key', uploadData.apiKey);
							fd.append('timestamp', String(uploadData.timestamp));
							fd.append('signature', uploadData.signature);
							fd.append('folder', uploadData.folder);
							fd.append('public_id', uploadData.public_id);
							const cloudRes = await fetch(uploadData.uploadUrl, { method: 'POST', body: fd });
							if (cloudRes.ok) {
								const cdnUrl = `${uploadData.fileUrl}?v=${uploadData.timestamp}`;
								setBannerUrl(cdnUrl);
								try { await apiServices.saveTripBannerUrl(authToken, tripId, uploadData.fileUrl); } catch {}
								return;
							}
						} catch { /* fall through to DataURL preview */ }
					}
					setBannerUrl(url);
				}}
				countries={countries}
					onAddCountry={(c: string)=> { // defer persistence until Save Settings
						handleAddCountry(c);
					}}
				onRemoveCountry={(c: string)=> { // defer persistence until Save Settings
					handleRemoveCountry(c); /* mark dirty only */
				}}
					onChangeTitle={(t)=> setTitle(t)}
					onChangeStartDate={(d)=> setTripStartDate(d)}
					onChangeEndDate={(d)=> setTripEndDate(d)}
				onChangePrivacy={()=> { /* privacy is derived from published state */ }}
				description={tripDescription}
					onChangeDescription={(d)=> setTripDescription(d)}
					vibe={vibe ?? ''}
					onChangeVibe={(v)=> setVibe(v)}
				onDeleteTrip={()=> { setConfirmDeleteOpen(true); }}
					onInviteEmail={async(_)=> { /* invite email placeholder */ }}
				importantNotes={importantNotes}
				onChangeImportantNotes={setImportantNotes}
			/>
			<Dialog
				open={exitConfirmOpen}
				onClose={()=> setExitConfirmOpen(false)}
				maxWidth='xs'
				fullWidth
				slotProps={{ paper: { sx: { borderRadius: { xs: '16px', sm: '12px' }, mx: { xs: 2, sm: 'auto' } } } }}
			>
				<DialogTitle sx={{ fontSize: { xs: 17, sm: 20 }, fontWeight: 700, pb: .5 }}>Unsaved Changes</DialogTitle>
				<DialogContent dividers>
					<Typography variant='body2'>You have unsaved changes. Save them as a draft before leaving, or discard changes?</Typography>
				</DialogContent>
				<DialogActions sx={{ flexDirection: { xs: 'column-reverse', sm: 'row' }, justifyContent: { xs: 'stretch', sm: 'space-between' }, p: { xs: 2, sm: 1 }, gap: { xs: .75, sm: 0 } }}>
					<Button
						onClick={()=> setExitConfirmOpen(false)}
						disabled={exiting}
						sx={{ width: { xs: '100%', sm: 'auto' } }}
					>Cancel</Button>
					<Box sx={{ display:'flex', gap:1, flexDirection: { xs: 'column-reverse', sm: 'row' }, width: { xs: '100%', sm: 'auto' } }}>
						<Button
							variant='outlined'
							onClick={()=> { setExitConfirmOpen(false); performSaveDraftAndExit(); }}
							disabled={exiting}
							sx={{ width: { xs: '100%', sm: 'auto' } }}
						>{exiting? 'Saving...' : 'Save Draft & Exit'}</Button>
						<Button
							variant='contained'
							color='error'
							onClick={()=> { setExitConfirmOpen(false); redirectToTripView(); }}
							disabled={exiting}
							sx={{ width: { xs: '100%', sm: 'auto' } }}
						>Discard & Exit</Button>
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
		<MapDrawer
			open={mapDrawerOpen}
			onClose={()=> setMapDrawerOpen(false)}
			destinations={planner.destinations}
			travelMode={planner.destinations[0]?.transport || 'car'}
			tripId={tripId}
		/>
		{/* -- Publish celebration overlay (Feature 6) -- */}
		{showCelebration && (
			<Box
				component='div'
				ref={(el: HTMLDivElement | null) => {
					if (el) {
						confetti({ particleCount: 180, spread: 90, origin: { y: 0.55 }, colors: ['#e8436a', '#FF385C', '#fff', '#fbbf24', '#f0abfc'] });
						setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5, x: 0.2 }, angle: 60, colors: ['#e8436a', '#fff'] }), 350);
						setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5, x: 0.8 }, angle: 120, colors: ['#FF385C', '#fbbf24'] }), 500);
						setTimeout(() => setShowCelebration(false), 4500);
					}
				}}
				onClick={() => setShowCelebration(false)}
				sx={{
					position: 'fixed', inset: 0, zIndex: 9999,
					background: 'rgba(13,13,13,0.97)',
					display: { xs: 'flex', lg: 'none' }, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
					cursor: 'pointer',
					'@keyframes celebFadeIn': { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
					animation: 'celebFadeIn 0.35s ease forwards',
				}}
			>
				{/* Tripician logo mark */}
				<Box sx={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg,#FF385C,#E31C5F)', display: { xs: 'flex', lg: 'none' }, alignItems: 'center', justifyContent: 'center', mb: 0.5, boxShadow: '0 8px 32px rgba(255,56,92,0.45)' }}>
					<Typography sx={{ fontSize: 26, color: '#fff', fontWeight: 700, fontFamily: "'Playfair Display', serif", fontStyle: 'italic', lineHeight: 1 }}>T</Typography>
				</Box>
				<Typography sx={{ fontSize: { xs: '1.6rem', sm: '2.2rem' }, fontWeight: 700, color: '#fff', textAlign: 'center', fontFamily: "'Playfair Display', serif", lineHeight: 1.15 }}>
					Your adventure is ready.
				</Typography>
				<Typography sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem' }, fontWeight: 600, color: '#e8436a', fontStyle: 'italic', textAlign: 'center', fontFamily: "'Playfair Display', serif", lineHeight: 1.2, maxWidth: 400, px: 2 }}>
					{title}
				</Typography>
				<Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', mt: 2 }}>Click anywhere to dismiss</Typography>
				<Box sx={{ display: { xs: 'flex', lg: 'none' }, gap: 1.5, mt: 1 }} onClick={e => e.stopPropagation()}>
					<Button
						variant='contained'
						startIcon={<ShareRoundedIcon />}
						onClick={() => { setShowCelebration(false); setShareModalOpen(true); }}
						sx={{ borderRadius: '40px', px: 3, py: 1, textTransform: 'none', fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg,#FF385C,#E31C5F)', boxShadow: '0 4px 16px rgba(255,56,92,0.40)', '&:hover': { background: 'linear-gradient(135deg,#E31C5F,#c91855)' } }}
					>Share this plan</Button>
					<Button
						variant='outlined'
						onClick={() => setShowCelebration(false)}
						sx={{ borderRadius: '40px', px: 3, py: 1, textTransform: 'none', fontWeight: 700, fontSize: 14, color: '#fff', borderColor: 'rgba(255,255,255,0.35)', '&:hover': { borderColor: '#fff', background: 'rgba(255,255,255,0.08)' } }}
					>Back to board</Button>
				</Box>
			</Box>
		)}
		<Snackbar open={toast.open} autoHideDuration={3000} onClose={closeToast} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
			<Alert onClose={closeToast} severity={toast.type} variant='filled' sx={{ boxShadow:2 }}>
				{toast.msg}
			</Alert>
		</Snackbar>
		<TripShareModal
			open={shareModalOpen}
			onClose={() => setShareModalOpen(false)}
			tripId={tripId}
			tripName={title}
			destinationCount={planner.destinations.length}
			totalNights={totalNights}
			isOwner={currentUserIsOwner}
			linkShareEnabled={linkShareEnabled}
			onLinkShareToggle={handleLinkShareToggle}
		/>
		{publishChecks && (
			<PublishValidationModal
				open={showPublishCheck}
				onClose={() => setShowPublishCheck(false)}
				checks={publishChecks}
			/>
		)}
		</React.Fragment>
	);
};

export default TripPlanner;
