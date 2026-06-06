import React from 'react';
import { IconButton, Tooltip, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import ChatIcon from '@mui/icons-material/Chat';
import MapIcon from '@mui/icons-material/Map';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import { floatIn } from '../utils/animations';

const MotionPaper = motion.create(Paper);
const MotionIconButton = motion.create(IconButton);

/**
 * FloatingDock
 * A small floating action dock that can host quick-access buttons.
 */
const FloatingDock: React.FC = () => {
	return (
		<MotionPaper
			elevation={6}
			variants={floatIn}
			initial="hidden"
			animate="visible"
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
				<MotionIconButton
					size='small'
					color='primary'
					aria-label='Open Chat Assistant'
					whileHover={{ scale: 1.18, rotate: 5 }}
					whileTap={{ scale: 0.9 }}
					transition={{ type: 'spring', stiffness: 400, damping: 17 }}
				>
					<ChatIcon fontSize='small' />
				</MotionIconButton>
			</Tooltip>
			<Tooltip title='Show Map' placement='left'>
				<MotionIconButton
					size='small'
					aria-label='Show Map'
					whileHover={{ scale: 1.18, rotate: -5 }}
					whileTap={{ scale: 0.9 }}
					transition={{ type: 'spring', stiffness: 400, damping: 17 }}
				>
					<MapIcon fontSize='small' />
				</MotionIconButton>
			</Tooltip>
			<Tooltip title='Add Destination' placement='left'>
				<MotionIconButton
					size='small'
					color='secondary'
					aria-label='Add Destination'
					whileHover={{ scale: 1.18, rotate: 5 }}
					whileTap={{ scale: 0.9 }}
					transition={{ type: 'spring', stiffness: 400, damping: 17 }}
				>
					<AddLocationAltIcon fontSize='small' />
				</MotionIconButton>
			</Tooltip>
		</MotionPaper>
	);
};

export default FloatingDock;

