import React from 'react';
import { Box, Tabs, Tab, Typography, Divider, Button, Tooltip, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import MapIcon from '@mui/icons-material/Map';
import ShareIcon from '@mui/icons-material/Share';
import MovieCreationIcon from '@mui/icons-material/MovieCreation';
import HotelIcon from '@mui/icons-material/Hotel';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import ExploreIcon from '@mui/icons-material/Explore';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import type { SxProps, Theme } from '@mui/material/styles';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { useTheme } from '@mui/material/styles';

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

interface DestinationRow {
	id: string;
	name: string;
	start: string; // date label already formatted
	end: string;
	nights: number;
	transport?: string;
	todo?: string;
}

const mockDestinations: DestinationRow[] = [
	{ id: '1', name: 'Shillong Airport', start: 'Thu 11 Sep', end: 'Fri 12 Sep', nights: 1, transport: '', todo: '' },
	{ id: '2', name: 'Shillong', start: 'Fri 12 Sep', end: 'Sun 14 Sep', nights: 2, transport: 'Train', todo: '1 to do' },
	{ id: '3', name: 'Meghalaya', start: 'Sun 14 Sep', end: 'Mon 15 Sep', nights: 1, transport: '', todo: '' },
];

const rowHover: SxProps<Theme> = (theme) => ({
	'&:hover': {
		backgroundColor: theme.palette.action.hover,
	}
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

const CreateTrip: React.FC = () => {
	const [tab, setTab] = React.useState(0);
	const handleTabChange = (_: any, value: number) => setTab(value);

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
			<TopBar showSearch={false} logo={<PlannerLogo />} />
			<Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
				{/* Left planning panel */}
				<Box
					sx={(theme) => ({
						width: { xs: '100%', lg: 520 },
						flexShrink: 0,
						display: 'flex',
						flexDirection: 'column',
						backgroundColor: theme.palette.background.paper,
						borderRight: { lg: `1px solid ${theme.palette.divider}` },
					})}
				>
					{/* Trip header summary */}
					<Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<Typography variant='h6' fontWeight={600} noWrap>Trip Title</Typography>
							<Chip size='small' label='Draft' sx={{ fontSize: 11, fontWeight: 500 }} />
						</Box>
						<Typography variant='body2' color='text.secondary'>
							11 September - 19 September
						</Typography>
						<Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
							<Box>
								<Typography variant='caption' color='text.secondary'>Budget</Typography>
								<Typography variant='body2' fontWeight={600}>€0.00</Typography>
							</Box>
							<Box>
								<Typography variant='caption' color='text.secondary'>Nights planned</Typography>
								<Typography variant='body2' fontWeight={600}>4 / 8</Typography>
							</Box>
							<Button size='small' variant='outlined' startIcon={<ShareIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>Share</Button>
							<Button size='small' variant='contained' startIcon={<MovieCreationIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>Create movie</Button>
						</Box>
					</Box>
					<Divider />
					{/* Tabs */}
						<Tabs value={tab} onChange={handleTabChange} variant='scrollable' allowScrollButtonsMobile sx={{ px: 2 }}>
							<Tab label='Destinations' />
							<Tab label='Day by day' />
						</Tabs>
					<Divider />
					{/* Destinations List */}
					<Box sx={{ flex: 1, overflowY: 'auto' }}>
						{tab === 0 && (
							<Box>
								{mockDestinations.map((d, idx) => (
									<Box key={d.id} sx={(theme) => ({ display: 'flex', alignItems: 'stretch', px: 3, py: 2, gap: 2, borderBottom: `1px solid ${theme.palette.divider}` , ...rowHover(theme) })}>
										<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36 }}>
											<Box sx={badgeSx}>{idx + 1}</Box>
										</Box>
										<Box sx={{ flex: 1, minWidth: 0 }}>
											<Typography fontWeight={600} fontSize={15} noWrap>{d.name}</Typography>
											<Typography variant='caption' color='text.secondary'>{d.start} - {d.end}</Typography>
										</Box>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
											<Box sx={{display:'flex', alignItems:'center', gap: 1}}>
												<Box sx={numberButtonSx}><RemoveIcon fontSize='small' /></Box>
												<Typography fontSize={14} fontWeight={600}>{d.nights}</Typography>
												<Box sx={numberButtonSx}><AddIcon fontSize='small' /></Box>
											</Box>
										</Box>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pr: 1 }}>
											<Tooltip title='Sleeping'><HotelIcon fontSize='small' color='disabled' /></Tooltip>
											<Tooltip title='Discover'><ExploreIcon fontSize='small' color='disabled' /></Tooltip>
											<Tooltip title='Transport'><DirectionsBusIcon fontSize='small' color='disabled' /></Tooltip>
										</Box>
									</Box>
								))}
								<Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
									<CalendarMonthIcon fontSize='small' color='action' />
									<Typography variant='body2' color='text.secondary'>Add new destination...</Typography>
									<Box sx={{ flexGrow: 1 }} />
									<Button size='small' variant='outlined' startIcon={<ExploreIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>Discover</Button>
									<Button size='small' variant='outlined' startIcon={<MapIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>Collection</Button>
								</Box>
							</Box>
						)}
						{tab === 1 && (
							<Box sx={{ p: 3 }}>
								<Typography variant='body2' color='text.secondary'>Day planning coming soon...</Typography>
							</Box>
						)}
					</Box>
				</Box>
				{/* Right map panel */}
				<Box sx={(theme) => ({ flex: 1, position: 'relative', backgroundColor: theme.palette.background.default, display: { xs: 'none', lg: 'block' } })}>
					<Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', flexDirection: 'column', gap: 2 }}>
						<MapIcon fontSize='large' opacity={0.25} />
						<Typography variant='body2'>Map placeholder</Typography>
						<Typography variant='caption' color='text.secondary'>Integrate interactive map here.</Typography>
					</Box>
				</Box>
			</Box>
		</Box>
	);
};

export default CreateTrip;
