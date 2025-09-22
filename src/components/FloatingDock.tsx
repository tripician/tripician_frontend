import React from 'react';
import { IconButton, Tooltip, Paper } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import MapIcon from '@mui/icons-material/Map';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';

/**
 * FloatingDock
 * A small floating action dock that can host quick-access buttons.
 * Currently implemented as a minimalist placeholder after the source file was empty.
 * Extend by passing children or by wiring onClick handlers below.
 */
const FloatingDock: React.FC = () => {
	return (
		<Paper
			elevation={6}
			sx={(t)=>({
				position:'fixed',
				right:18,
				bottom:18,
				zIndex: t.zIndex.tooltip + 1,
				display:'flex',
				flexDirection:'column',
				gap:.75,
				p:.75,
				borderRadius:3,
				backdropFilter:'blur(6px)',
				background: t.palette.mode==='dark' ? 'rgba(30,41,54,0.78)' : 'rgba(255,255,255,0.85)',
				border:`1px solid ${t.palette.divider}`,
				minWidth:48
			})}
		>
			<Tooltip title='Open Chat Assistant' placement='left'>
				<IconButton size='small' color='primary'>
					<ChatIcon fontSize='small' />
				</IconButton>
			</Tooltip>
			<Tooltip title='Show Map' placement='left'>
				<IconButton size='small'>
					<MapIcon fontSize='small' />
				</IconButton>
			</Tooltip>
			<Tooltip title='Add Destination' placement='left'>
				<IconButton size='small' color='secondary'>
					<AddLocationAltIcon fontSize='small' />
				</IconButton>
			</Tooltip>
			{/* Future: Accept props/onClick callbacks or dynamic actions */}
		</Paper>
	);
};

export default FloatingDock;

