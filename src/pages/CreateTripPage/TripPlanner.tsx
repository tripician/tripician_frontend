// TripPlanner main page component (formerly CreateTrip)
import React from 'react';
import { Box, Tabs, Tab, Typography, Divider, Button, Chip, Menu, MenuItem, Avatar, Tooltip, IconButton, InputBase, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Snackbar, Alert, useTheme } from '@mui/material';
import { KalaMandala } from '../../components/DecorativeComponents/KalaDecor';
// Props-based TripPlanner; tripId + optional initialTrip provided by route wrapper
import DownloadIcon from '@mui/icons-material/Download';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setCurrency as setCurrencyAction, updateDestinationNights, setTransport, addDestination, removeDestination, reorderChainExact, addVisaDoc, removeVisaDoc, removeGlobalDoc, pinDoc, unpinDoc, loadState, resetPlanner, setTripDates, setTargetNights } from '../../store/plannerSlice';
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
// import ImportantNotesEditor from './ImportantNotesEditor'; // legacy rich editor (temporarily disabled)
import TripComments from './TripComments';
import PackingPanel from './PackingPanel';
// ChatAssistant replaced by inline PremiumChatPanel
import MapDrawer from './MapDrawer';
import DrawingCanvas, { type DrawingCanvasHandle } from './DrawingCanvas';
import DrawingDock from './DrawingDock';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import NightsStayRoundedIcon from '@mui/icons-material/NightsStayRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
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
import { countryNameFromCode, flagEmojiFromName } from '../../utils/countryFlags';
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
		const avatar = pickFirstString(owner.avatar, owner.Avatar, owner.profilepicture, owner.profilePicture, owner.photoUrl, owner.PhotoUrl, owner.profilePic, owner.ProfilePic);
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
}

/* ─── Persistent AI Chat Panel (GitHub Copilot-style right column) ─── */
const SUGGESTED_PROMPTS = [
	'Suggest the best route for my destinations',
	'What should I pack for this trip?',
	'Find hidden gems near my stops',
	'Estimate my total travel time',
	'Best local food near my stops?',
];

interface PanelMessage { id: string; role: 'user' | 'assistant'; content: string; }

const PremiumChatPanel: React.FC = () => {
	const theme = useTheme();
	const isLight = theme.palette.mode === 'light';
	const [messages, setMessages] = React.useState<PanelMessage[]>([
		{ id: 'welcome', role: 'assistant', content: "Hi! I'm Navia, your AI trip assistant. Ask me anything about your plan — routes, packing, local tips and more." },
	]);
	const [input, setInput] = React.useState('');
	const endRef = React.useRef<HTMLDivElement | null>(null);

	const send = (text: string) => {
		if (!text.trim()) return;
		const trimmed = text.trim();
		setMessages(prev => [...prev, { id: Date.now() + 'u', role: 'user', content: trimmed }]);
		setInput('');
		setTimeout(() => {
			setMessages(prev => [...prev, {
				id: Date.now() + 'a', role: 'assistant',
				content: 'AI agent response coming soon — I\'m being connected to your trip data now.',
			}]);
		}, 480);
	};

	React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

	return (
		<Box sx={{
			width: 420,
			flexShrink: 0,
			display: 'flex',
			flexDirection: 'column',
			borderLeft: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'}`,
			background: isLight ? '#ffffff' : '#0e1012',
			fontFamily: "'Inter', system-ui, sans-serif",
			overflow: 'hidden',
		}}>
			{/* Header */}
			<Box sx={{
				px: 2, py: 1.25,
				display: 'flex', alignItems: 'center', gap: 1.25,
				borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'}`,
				background: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(14,16,18,0.98)',
				backdropFilter: 'blur(8px)',
				flexShrink: 0,
			}}>
				{/* AI avatar */}
				<Box sx={{
					width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
					background: 'linear-gradient(135deg,#FF385C 0%,#D91A50 100%)',
					display: 'flex', alignItems: 'center', justifyContent: 'center',
					boxShadow: '0 3px 12px rgba(255,56,92,0.40)',
				}}>
					<Box component='svg' viewBox='0 0 24 24' sx={{ width: 16, height: 16 }}>
						<path fill='#fff' d='M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm0 12a1 1 0 110 2 1 1 0 010-2zm.5-8v6h-1V8h1z'/>
					</Box>
				</Box>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Typography sx={{ fontWeight: 800, fontSize: 14, lineHeight: 1, color: isLight ? '#0d0d0d' : '#f0f0f0', fontFamily: 'inherit', letterSpacing: -0.3 }}>
						Navia
					</Typography>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
						<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'rgba(255,56,92,0.7)', boxShadow: '0 0 5px rgba(255,56,92,0.6)' }} />
						<Typography sx={{ fontSize: 10.5, color: 'rgba(255,56,92,0.85)', fontWeight: 600, fontFamily: 'inherit', letterSpacing: 0.4 }}>
							AI PREVIEW
						</Typography>
					</Box>
				</Box>
			</Box>

			{/* Messages area */}
			<Box sx={{
				flex: 1, overflowY: 'auto', px: 1.75, py: 1.5,
				display: 'flex', flexDirection: 'column', gap: 1.25,
				'&::-webkit-scrollbar': { width: 4 },
				'&::-webkit-scrollbar-thumb': { borderRadius: 3, background: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)' },
				'&::-webkit-scrollbar-track': { background: 'transparent' },
			}}>
				{messages.map(m => (
					<Box key={m.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
						{m.role === 'assistant' && (
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.4 }}>
								<Box sx={{
									width: 16, height: 16, borderRadius: '5px',
									background: 'linear-gradient(135deg,#FF385C,#D91A50)',
									display: 'flex', alignItems: 'center', justifyContent: 'center',
								}}>
									<Box component='svg' viewBox='0 0 24 24' sx={{ width: 9, height: 9 }}>
										<path fill='#fff' d='M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm0 12a1 1 0 110 2 1 1 0 010-2zm.5-8v6h-1V8h1z'/>
									</Box>
								</Box>
								<Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#FF385C', fontFamily: 'inherit', letterSpacing: 0.5, textTransform: 'uppercase' }}>
									Navia
								</Typography>
							</Box>
						)}
						<Box sx={{
							px: 1.5, py: 0.9,
							maxWidth: '88%',
							borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
							fontSize: 13, lineHeight: 1.65, fontFamily: 'inherit',
							background: m.role === 'user'
								? 'linear-gradient(135deg,#FF385C,#D91A50)'
								: (isLight ? '#f4f4f4' : 'rgba(255,255,255,0.06)'),
							color: m.role === 'user' ? '#fff' : (isLight ? '#1a1a1a' : 'rgba(255,255,255,0.88)'),
							boxShadow: m.role === 'user' ? '0 2px 12px rgba(255,56,92,0.28)' : 'none',
							border: m.role === 'user' ? 'none' : `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'}`,
						}}>
							{m.content}
						</Box>
					</Box>
				))}
				<div ref={endRef} />
			</Box>

			{/* Suggested prompts */}
			<Box sx={{
				px: 1.5, py: 0.75,
				display: 'flex', flexDirection: 'column', gap: 0.5,
				borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'}`,
				flexShrink: 0,
			}}>
				<Typography sx={{ fontSize: 10.5, fontWeight: 600, color: isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.30)', fontFamily: 'inherit', mb: 0.3 }}>
					Suggested
				</Typography>
				{SUGGESTED_PROMPTS.slice(0, 3).map(p => (
					<Box
						key={p}
						onClick={() => send(p)}
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

			{/* Input */}
			<Box sx={{
				px: 1.5, pb: 1.5, pt: 0.75,
				borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'}`,
				flexShrink: 0,
			}}>
				<Box sx={{
					display: 'flex', alignItems: 'flex-end', gap: 0.75,
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
						value={input}
						onChange={e => setInput(e.target.value)}
						onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
						placeholder='Ask Navia anything…'
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
						onClick={() => send(input)}
						disabled={!input.trim()}
						sx={{
							width: 32, height: 32, borderRadius: '9px', flexShrink: 0, mb: 0.1,
							background: input.trim() ? 'linear-gradient(135deg,#FF385C,#D91A50)' : 'transparent',
							color: input.trim() ? '#fff' : (isLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.20)'),
							boxShadow: input.trim() ? '0 2px 10px rgba(255,56,92,0.35)' : 'none',
							transition: 'background .18s, color .18s, box-shadow .18s',
							'&:hover': { background: input.trim() ? '#D91A50' : undefined },
							'&.Mui-disabled': { background: 'transparent', color: isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.15)' },
						}}
					>
						<Box component='svg' viewBox='0 0 24 24' sx={{ width: 14, height: 14 }}>
							<path fill='currentColor' d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'/>
						</Box>
					</IconButton>
				</Box>
				<Typography sx={{ fontSize: 10, color: isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.20)', mt: 0.6, textAlign: 'center', fontFamily: 'inherit' }}>
					Navia · AI travel agent · coming soon
				</Typography>
				<Typography sx={{ fontSize: 9.5, color: isLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.15)', mt: 0.3, textAlign: 'center', fontFamily: 'inherit', letterSpacing: 0.2 }}>
					Powered by GPT-5
				</Typography>
			</Box>
		</Box>
	);
};

/* ─── Public / View-Mode Info Panel ─── */
interface TripViewPanelProps {
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
	onRequestEdit?: () => void;
}

const TripViewPanel: React.FC<TripViewPanelProps> = ({
	title, description, bannerUrl, countries, tripUsers, ownerInfo,
	startDate, endDate, totalNights, destinationCount,
	showEditAction = false, onRequestEdit,
}) => {
	const theme = useTheme();
	const isLight = theme.palette.mode === 'light';
	const [userRating, setUserRating] = React.useState(0);
	const [hoverRating, setHoverRating] = React.useState(0);
	const [ratingSubmitted, setRatingSubmitted] = React.useState(false);

	const handleRate = (star: number) => {
		setUserRating(star);
		setRatingSubmitted(true);
	};

	const bg = isLight ? '#ffffff' : '#0e1012';
	const border = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
	const textPrimary = isLight ? '#111111' : '#f0f0f0';
	const textMuted = isLight ? 'rgba(0,0,0,0.44)' : 'rgba(255,255,255,0.38)';
	const sectionBg = isLight ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.04)';

	const formatDate = (raw: string | null) => {
		if (!raw) return '—';
		const d = new Date(raw);
		return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	};

	const ownerDisplayName = ownerInfo.name || ownerInfo.handle || ownerInfo.email?.split('@')[0] || 'Unknown';

	const MAX_AVATARS = 5;
	const shownUsers = tripUsers.slice(0, MAX_AVATARS);
	const extraUsers = Math.max(0, tripUsers.length - MAX_AVATARS);

	const getMemberLabel = (u: any) => {
		return u.name || u.displayName || u.username || u.email?.split('@')[0] || 'Member';
	};
	const getMemberInitial = (u: any) => getMemberLabel(u)[0]?.toUpperCase() || 'M';
	const getMemberAvatar = (u: any) => u.avatar || u.profilePic || u.profilePicture || null;

	return (
		<Box sx={{
			width: 320,
			flexShrink: 0,
			display: 'flex',
			flexDirection: 'column',
			borderLeft: `1px solid ${border}`,
			background: bg,
			fontFamily: "'Inter', system-ui, sans-serif",
			overflow: 'hidden',
			position: 'relative',
		}}>
			{/* Indian kala mandala — empty middle area, above Share button */}
			<KalaMandala size={280} color="#FF385C" opacity={0.05} style={{ position: 'absolute', bottom: 120, right: -70, zIndex: 0, pointerEvents: 'none' }} />
			{/* ── Banner + Title header ── */}
			<Box sx={{ position: 'relative', flexShrink: 0 }}>
				{bannerUrl ? (
					<Box
						component="img" src={bannerUrl} alt={title}
						sx={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
					/>
				) : (
					<Box sx={{
						width: '100%', height: 110,
						background: 'linear-gradient(135deg, #FF385C 0%, #C2185B 100%)',
						display: 'flex', alignItems: 'center', justifyContent: 'center',
					}}>
						<Typography sx={{ fontSize: '2.5rem', opacity: 0.25 }}>✈</Typography>
					</Box>
				)}
				{/* Gradient overlay */}
				<Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 55%)' }} />
				{/* Title */}
				<Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: 2, pb: 1.5 }}>
					<Typography sx={{
						fontFamily: "'Playfair Display', serif",
						fontWeight: 800, fontStyle: 'italic',
						fontSize: '1.05rem', color: '#fff',
						textShadow: '0 1px 6px rgba(0,0,0,0.5)',
						lineHeight: 1.2,
					}}>{title}</Typography>
					{ownerInfo.name && (
						<Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', mt: 0.25 }}>
							by {ownerDisplayName}
						</Typography>
					)}
				</Box>
			</Box>

			{/* ── Scrollable body ── */}
			<Box sx={{
				flex: 1, overflowY: 'auto', px: 2, py: 1.75,
				display: 'flex', flexDirection: 'column', gap: 2,
				'&::-webkit-scrollbar': { width: 4 },
				'&::-webkit-scrollbar-thumb': { borderRadius: 3, background: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)' },
			}}>

				{/* ── Rate this trip ── */}
				<Box sx={{ borderRadius: '12px', background: sectionBg, border: `1px solid ${border}`, p: '12px 14px' }}>
					<Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: textMuted, fontFamily: 'inherit', mb: 1 }}>
						Rate this trip
					</Typography>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
						{[1, 2, 3, 4, 5].map(star => {
							const active = (hoverRating || userRating) >= star;
							return (
								<Box
									key={star}
									onMouseEnter={() => !ratingSubmitted && setHoverRating(star)}
									onMouseLeave={() => !ratingSubmitted && setHoverRating(0)}
									onClick={() => handleRate(star)}
									sx={{ cursor: ratingSubmitted ? 'default' : 'pointer', lineHeight: 0, transition: 'transform 0.15s', '&:hover': { transform: ratingSubmitted ? 'none' : 'scale(1.2)' } }}
								>
									{active
										? <StarRoundedIcon sx={{ fontSize: 28, color: '#FFD700', filter: 'drop-shadow(0 1px 4px rgba(255,200,0,0.45))' }} />
										: <StarBorderRoundedIcon sx={{ fontSize: 28, color: isLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)' }} />
									}
								</Box>
							);
						})}
						{ratingSubmitted && (
							<Typography sx={{ ml: 0.75, fontSize: '0.75rem', fontWeight: 600, color: '#FF385C', fontFamily: 'inherit' }}>
								Thanks!
							</Typography>
						)}
					</Box>
					{!ratingSubmitted && (
						<Typography sx={{ fontSize: '0.65rem', color: textMuted, mt: 0.6, fontFamily: 'inherit' }}>
							Tap a star to rate
						</Typography>
					)}
				</Box>

				{/* ── Description ── */}
				{description && (
					<Box>
						<Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: textMuted, fontFamily: 'inherit', mb: 0.75 }}>
							About this trip
						</Typography>
						<Typography sx={{ fontSize: '0.82rem', color: textPrimary, fontFamily: 'inherit', lineHeight: 1.7, opacity: 0.85 }}>
							{description}
						</Typography>
					</Box>
				)}

				{/* ── Quick stats ── */}
				<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
					{[
						{ Icon: NightsStayRoundedIcon,  label: 'Nights',       value: totalNights || '—' },
						{ Icon: GroupsRoundedIcon,       label: 'Destinations', value: destinationCount || '—' },
					].map(({ Icon, label, value }) => (
						<Box key={label} sx={{
							borderRadius: '10px', background: sectionBg, border: `1px solid ${border}`,
							p: '10px 12px', display: 'flex', flexDirection: 'column', gap: 0.35,
						}}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
								<Icon sx={{ fontSize: 12, color: '#FF385C' }} />
								<Typography sx={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: textMuted, fontFamily: 'inherit' }}>
									{label}
								</Typography>
							</Box>
							<Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: textPrimary, fontFamily: 'inherit', lineHeight: 1.15 }}>
								{value}
							</Typography>
						</Box>
					))}
				</Box>

				{/* ── Members ── */}
				{tripUsers.length > 0 && (
					<Box sx={{ borderRadius: '12px', background: sectionBg, border: `1px solid ${border}`, p: '12px 14px' }}>
						<Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: textMuted, fontFamily: 'inherit', mb: 1.25 }}>
							Members · {tripUsers.length}
						</Typography>
						{/* Avatar stack row */}
						<Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
							{shownUsers.map((u, i) => {
								const initial = getMemberInitial(u);
								const avatarSrc = getMemberAvatar(u);
								const role = u.role || u.Role || '';
								const isOwnerMember = role.toLowerCase() === 'owner';
								return (
									<Tooltip key={u.id ?? i} title={getMemberLabel(u)} arrow placement="top">
										<Avatar
											src={avatarSrc ?? undefined}
											sx={{
												width: 36, height: 36, fontSize: '0.72rem', fontWeight: 800,
												ml: i === 0 ? 0 : '-10px',
												zIndex: shownUsers.length - i,
												background: isOwnerMember
													? 'linear-gradient(135deg,#FF385C,#D91A50)'
													: (isLight ? '#e0e0e0' : 'rgba(255,255,255,0.14)'),
												color: isOwnerMember ? '#fff' : textPrimary,
												border: `2.5px solid ${isLight ? '#fff' : '#0e1012'}`,
												boxShadow: isOwnerMember ? '0 0 0 1.5px rgba(255,56,92,0.45)' : 'none',
												cursor: 'default',
											}}
										>{initial}</Avatar>
									</Tooltip>
								);
							})}
							{extraUsers > 0 && (
								<Avatar sx={{
									width: 36, height: 36, fontSize: '0.65rem', fontWeight: 700,
									ml: '-10px', zIndex: 0,
									background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)',
									color: textMuted,
									border: `2.5px solid ${isLight ? '#fff' : '#0e1012'}`,
								}}>+{extraUsers}</Avatar>
							)}
						</Box>
						{/* Name list below */}
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
							{shownUsers.map((u, i) => {
								const label = getMemberLabel(u);
								const initial = getMemberInitial(u);
								const avatarSrc = getMemberAvatar(u);
								const role = u.role || u.Role || '';
								const isOwnerMember = role.toLowerCase() === 'owner';
								return (
									<Box key={u.id ?? i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<Avatar
											src={avatarSrc ?? undefined}
											sx={{
												width: 24, height: 24, fontSize: '0.58rem', fontWeight: 800,
												background: isOwnerMember
													? 'linear-gradient(135deg,#FF385C,#D91A50)'
													: (isLight ? '#e0e0e0' : 'rgba(255,255,255,0.12)'),
												color: isOwnerMember ? '#fff' : textPrimary,
												border: `1.5px solid ${border}`,
												flexShrink: 0,
											}}
										>{initial}</Avatar>
										<Typography sx={{
											fontSize: '0.78rem', fontWeight: 600, color: textPrimary,
											fontFamily: 'inherit', lineHeight: 1.2,
											overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
										}}>{label}</Typography>
										{isOwnerMember && (
											<Box sx={{
												px: 0.8, py: 0.2, borderRadius: '50px',
												background: 'rgba(255,56,92,0.10)',
												border: '1px solid rgba(255,56,92,0.25)',
											}}>
												<Typography sx={{ fontSize: '0.52rem', fontWeight: 800, color: '#FF385C', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
													Owner
												</Typography>
											</Box>
										)}
									</Box>
								);
							})}
							{extraUsers > 0 && (
								<Typography sx={{ fontSize: '0.7rem', color: textMuted, fontFamily: 'inherit', pl: 0.25 }}>
									+{extraUsers} more member{extraUsers > 1 ? 's' : ''}
								</Typography>
							)}
						</Box>
					</Box>
				)}

			</Box>

			{/* ── Footer: edit + share buttons ── */}
			<Box sx={{
				px: 2, py: 1.25, flexShrink: 0,
				borderTop: `1px solid ${border}`,
				background: bg,
				display: 'flex', flexDirection: 'column', gap: 1,
			}}>
				{showEditAction && (
					<Button
						fullWidth
						variant="contained"
						onClick={() => { onRequestEdit?.(); }}
						sx={{
							textTransform: 'none', borderRadius: '10px', fontFamily: 'inherit',
							fontWeight: 600, fontSize: '0.82rem',
							background: 'linear-gradient(135deg,#FF385C,#D91A50)',
							color: '#fff', py: 0.9,
							'&:hover': { background: 'linear-gradient(135deg,#e02d50,#c01545)' },
						}}
					>
						Edit Trip
					</Button>
				)}
				<Button
					fullWidth
					variant="outlined"
					startIcon={<ShareRoundedIcon sx={{ fontSize: 16 }} />}
					onClick={() => { navigator.clipboard.writeText(window.location.href); }}
					sx={{
						textTransform: 'none', borderRadius: '10px', fontFamily: 'inherit',
						fontWeight: 600, fontSize: '0.82rem',
						borderColor: 'rgba(255,56,92,0.30)', color: '#FF385C',
						py: 0.9,
						'&:hover': { borderColor: '#FF385C', background: 'rgba(255,56,92,0.05)' },
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
	const [tripUsers, setTripUsers] = React.useState<any[]>([]); // authoritative members list from /trips/{id}/users
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

	console.log('info from trip view: ', { showViewEditAction, isOwnerExternal, isExternalNonOwner });
	debugger;

	// Core meta state
	const [title, setTitle] = React.useState<string>(normalizedInitial?.meta.name || 'Untitled Trip');
	const [tripDescription, setTripDescription] = React.useState<string>((normalizedInitial?.meta as any)?.description || '');
	const [editingTitle, setEditingTitle] = React.useState(false);
	// Notes field (plain text, auto-grow) seeded from normalized initial trip meta if present
	const [importantNotes, setImportantNotes] = React.useState<string>(
		(normalizedInitial?.meta.importantNotes && typeof normalizedInitial.meta.importantNotes === 'string')
			? normalizedInitial.meta.importantNotes
			: ''
	);
	// Banner image (trip card photo) – store as URL (existing backend-provided or newly selected object URL / base64)
	const [bannerUrl, setBannerUrl] = React.useState<string>(() => {
		try {
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
			in:importantNotes.trim(),
			b:bannerUrl,
			cs:countries
		});
	}, [title, privacy, tripStartDate, tripEndDate, planner.destinations, currency, isDraft, importantNotes, bannerUrl, countries]);
	const commitSnapshot = React.useCallback((draft:boolean)=> { setIsDraft(draft); lastCommittedRef.current = computeSignature(); }, [computeSignature]);
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
		const { meta, itinerary } = unifiedTrip;
		if (hydratedRef.current === meta.id) return;
		if (title === 'Untitled Trip' && !editingTitle) setTitle(meta.name);
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
	// Lightweight settings save listener (Save Settings button dispatches browser event)
	React.useEffect(()=> {
		const settingsSaveHandler = async () => {
			if(!authToken || !tripId) { openToast('error','Cannot save settings'); return; }
			try {
				const visibilityEnum = privacy==='Private' ? 'PRIVATE' : privacy==='Trip Members' ? 'TRIP_MEMBERS' : privacy==='My Followers' ? 'FOLLOWERS' : 'EVERYONE';
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
				await apiServices.updateTripSettings(authToken, tripId, {
					name: title,
					visibility: visibilityEnum,
					startDate: sd,
					endDate: ed,
					countries,
					photoUrl: bannerUrl || undefined // fallback until bannerPhotoId flow is implemented
				});
				try {
					const refreshed = await apiServices.getTripById(authToken, tripId);
					const meta = (refreshed?.data?.trip) || refreshed?.data?.meta || refreshed?.data;
					if(meta){
						if(typeof meta.name==='string') setTitle(meta.name);
						if(typeof meta.photoUrl==='string') setBannerUrl(meta.photoUrl);
						if(Array.isArray(meta.countries)) setCountries(normalizeCountryList(meta.countries));
						if(typeof meta.visibility==='string') {
							const vis = meta.visibility.toLowerCase();
							setPrivacy(vis.startsWith('every')? 'Everyone' : vis.startsWith('trip')? 'Trip Members' : vis.startsWith('my')? 'My Followers' : 'Private');
						}
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
	}, [authToken, tripId, title, privacy, countries, bannerUrl, openToast]);

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
	const [drawingActive, setDrawingActive] = React.useState(false);
	const [drawingTool, setDrawingTool] = React.useState<'pen' | 'eraser'>('pen');
	const [drawingColor, setDrawingColor] = React.useState('#111111');
	const [drawingWidth, setDrawingWidth] = React.useState(4);
	const drawingCanvasRef = React.useRef<DrawingCanvasHandle | null>(null);
	const containerRef = React.useRef<HTMLDivElement|null>(null);
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
				,photoUrl: bannerUrl || (import.meta.env.VITE_TRIP_DEFAULT_IMAGE || ''),
				countries: countries
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
		if(!currentUserIsOwner) return; // safety
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

	const redirectDashboard = React.useCallback(() => {
		try { window.location.href = '/dashboard'; } catch {}
	}, []);

	const performSaveDraftAndExit = React.useCallback(async () => {
		if(exiting) return; setExiting(true);
		try {
			if(isDirty && effectiveCanEdit){
				const payload = buildPersistPayload(true);
				persistedPayloadRef.current = payload;
				await persistToBackend(payload);
				commitSnapshot(true);
			}
			redirectDashboard();
		} finally { setExiting(false); }
	}, [isDirty, effectiveCanEdit, buildPersistPayload, persistToBackend, commitSnapshot, redirectDashboard, exiting]);

	const handleBackHomeClick = () => {
		if(readOnly || !effectiveCanEdit){
			redirectDashboard();
			return;
		}
		if(!isDirty){ redirectDashboard(); return; }
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
								<Typography noWrap sx={{ fontFamily:"'Playfair Display', Georgia, serif", fontWeight:700, fontStyle:'italic', fontSize:'1.2rem', letterSpacing:'-0.35px', lineHeight:1.15, cursor:isDraft && !isExternalNonOwner ? 'text':'default' }} onClick={()=> { if(isDraft && !isExternalNonOwner) setEditingTitle(true); }}>{title}</Typography>
								{isDraft && !isExternalNonOwner && <IconButton size='small' onClick={()=> setEditingTitle(true)} sx={{ ml:-.5 }}><EditIcon fontSize='small' /></IconButton>}
							</Box>
						)}
						<Chip size='small' label={isDraft? 'Draft':'Published'} color={isDraft? 'default':'success'} sx={{ fontSize:11, fontWeight:600, letterSpacing:'0.2px', ml:1 }} />
					</Box>
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
					<Box sx={(theme)=>({ flex:1, minWidth:0, display:'flex', flexDirection:'column',
						/* Premium board background — dot grid pattern */
						backgroundColor: theme.palette.mode==='light' ? '#f9fafb' : '#111315',
						backgroundImage: theme.palette.mode==='light'
							? 'radial-gradient(circle, rgba(0,0,0,0.10) 1px, transparent 1px)'
							: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
						backgroundSize: '22px 22px',
					})}>
						<Divider />
						{section==='plan' && (
						<Box sx={(t)=>({ display:'flex', alignItems:'center', px:2, gap:1, py:.75, borderBottom:`1px solid ${t.palette.divider}`, background: t.palette.mode==='light'? 'rgba(255,255,255,0.92)':'rgba(20,22,26,0.92)', backdropFilter:'blur(8px)', position:'sticky', top:0, zIndex:2 })}>
							<Tabs value={tab} onChange={(e,v)=> {
								// Block navigation into disabled features
								if((v===1 && !ENABLE_EXPENSES) || (v===2 && !ENABLE_COMMENTS)) return;
								handleTabChange(e,v);
							}} variant='scrollable' allowScrollButtonsMobile sx={{ flex:1, minHeight:40, '& .MuiTab-root':{ minHeight:40, fontSize:14, fontWeight:600, textTransform:'none', fontFamily:"'Inter', system-ui, sans-serif", letterSpacing:'-0.1px' }, '& .Mui-selected':{ color:'#FF385C !important', fontWeight:700 }, '& .MuiTabs-indicator':{ backgroundColor:'#FF385C', height:2.5, borderRadius:2 } }}>
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
							{/* Budget + Privacy compact */}
							<Box sx={{ display:'flex', alignItems:'center', gap:1, mr:.5 }}>
								<Tooltip title='Budget currency'>
									<Button size='small' variant='text' onClick={readOnly? undefined : openCurrency} disabled={readOnly} endIcon={<ExpandMoreIcon sx={{ fontSize:14 }} />} sx={{ textTransform:'none', fontWeight:700, fontSize:13, px:.75, minWidth:0, color:'text.primary', fontFamily:"'Inter', sans-serif", letterSpacing:'-0.1px' }}>
										{(planner.tripBudget!=null ? planner.tripBudget : 0).toFixed(0)} {currency}
									</Button>
								</Tooltip>
								<Tooltip title='Privacy'>
									<Button size='small' variant='text' onClick={readOnly? undefined: openPrivacy} disabled={readOnly} endIcon={<ExpandMoreIcon sx={{ fontSize:14 }} />} sx={{ textTransform:'none', fontWeight:700, fontSize:13, px:.75, minWidth:0, color:'text.primary', fontFamily:"'Inter', sans-serif", letterSpacing:'-0.1px' }}>
										{privacy}
									</Button>
								</Tooltip>
							</Box>
							<Box sx={{ display:'flex', alignItems:'center', gap:.75 }}>
								<Box sx={{ position:'relative', width:38, height:38 }}>
									<CircularProgress
										variant='determinate'
										value={100}
										size={38}
										thickness={4.5}
										sx={(t)=>({ color: t.palette.mode==='dark'? t.palette.grey[800] : t.palette.grey[300] })}
									/>
									<CircularProgress
										variant='determinate'
										value={targetNights? Math.min(100,(totalNights/targetNights)*100):0}
										size={38}
										thickness={4.5}
										sx={{
											position:'absolute',
											left:0,
											top:0,
											color:'#FF385C',
											transition:'color .3s'
										}}
									/>
									<Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
										<Typography variant='caption' fontWeight={700} sx={{ fontSize:10 }}>{totalNights}/{targetNights}</Typography>
									</Box>
								</Box>
								<Typography variant='caption' fontWeight={600} sx={{ fontSize:11 }}>Nights</Typography>
							</Box>
							<Tooltip title='View map'>
								<IconButton size='small' onClick={()=> setMapDrawerOpen(true)} sx={{ bgcolor:'background.paper', border:(t)=>`1px solid ${t.palette.divider}`, '&:hover':{ bgcolor:'rgba(255,56,92,0.07)', borderColor:'rgba(255,56,92,0.4)', color:'#FF385C' }, mr:.25, color:'text.secondary' }}>
									<MapOutlinedIcon fontSize='small' />
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
						<Box sx={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column'}}>
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
												if(!effectiveCanEdit){ openToast('error','Trip is read only'); return; }
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
													disabled={!effectiveCanEdit || !isDirty || saving || !isHydrated}
											sx={{ textTransform:'none', borderRadius:2 }}
										>
											{isDraft ? 'Save as Draft' : 'Update'}{saving && <CircularProgress size={16} thickness={5} sx={{ ml:1 }} />}
										</Button>
											{currentUserIsOwner && (
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
														disabled={!currentUserIsOwner || !isDirty || saving || !isHydrated}
											>
												{isDraft? 'Publish' : 'Unpublish'}{saving && <CircularProgress size={16} thickness={5} sx={{ ml:1 }} />}
											</Button>
										)}
									</>
								)}

							</Box>
						</Box>
					</Box>
					)}
					{/* Drawing canvas overlay — sits on top of all board content when active */}
					<DrawingCanvas
						ref={drawingCanvasRef}
						tool={drawingTool}
						color={drawingColor}
						lineWidth={drawingWidth}
						active={drawingActive}
					/>
					</Box>{/* end centre column */}
				{/* Right panel — Navia for owners/editors, trip info for public viewers */}
				{isExternalNonOwner ? (
					<TripViewPanel
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
						onRequestEdit={onRequestEdit}
					/>
				) : (
					<PremiumChatPanel />
				)}
		</Box>
		{/* Drawing dock — only visible in edit mode, not for view-only visitors */}
		{!isExternalNonOwner && (
		<DrawingDock
			active={drawingActive}
			onToggle={() => setDrawingActive(v => !v)}
			tool={drawingTool}
			onTool={setDrawingTool}
			color={drawingColor}
			onColor={setDrawingColor}
			lineWidth={drawingWidth}
			onLineWidth={setDrawingWidth}
			onUndo={() => drawingCanvasRef.current?.undo()}
			onClear={() => drawingCanvasRef.current?.clear()}
		/>
		)}
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
				bannerUrl={bannerUrl}
				currentUserIsOwner={currentUserIsOwner}
				onChangeBanner={({ url })=> { setBannerUrl(url); }}
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
				onChangePrivacy={(p)=> setPrivacy(p as any)}
				description={tripDescription}
				onChangeDescription={(d)=> setTripDescription(d)}
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
						<Button variant='contained' color='error' onClick={()=> { setExitConfirmOpen(false); redirectDashboard(); }} disabled={exiting}>Discard & Exit</Button>
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
		<Snackbar open={toast.open} autoHideDuration={3000} onClose={closeToast} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
			<Alert onClose={closeToast} severity={toast.type} variant='filled' sx={{ boxShadow:2 }}>
				{toast.msg}
			</Alert>
		</Snackbar>
		</React.Fragment>
	);
};

export default TripPlanner;
