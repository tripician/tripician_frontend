import React from 'react';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import AutoFixNormalIcon from '@mui/icons-material/AutoFixNormal';
import UndoIcon from '@mui/icons-material/Undo';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const COLORS = [
  '#111111', '#ffffff', '#FF385C', '#3b82f6',
  '#22c55e', '#f59e0b', '#a855f7', '#ec4899',
];

const SIZES: { px: number; dot: number }[] = [
  { px: 2,  dot: 5  },
  { px: 5,  dot: 8  },
  { px: 10, dot: 12 },
  { px: 18, dot: 16 },
];

export interface DrawingDockProps {
  active: boolean;
  onToggle: () => void;
  tool: 'pen' | 'eraser';
  onTool: (t: 'pen' | 'eraser') => void;
  color: string;
  onColor: (c: string) => void;
  lineWidth: number;
  onLineWidth: (w: number) => void;
  onUndo: () => void;
  onClear: () => void;
}

const Sep: React.FC<{ light: boolean }> = ({ light }) => (
  <Box sx={{ width: 28, height: '1px', bgcolor: light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)', my: 0.4, flexShrink: 0 }} />
);

const DrawingDock: React.FC<DrawingDockProps> = ({
  active, onToggle, tool, onTool, color, onColor, lineWidth, onLineWidth, onUndo, onClear,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const divider = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const muted = isLight ? '#666' : '#999';

  return (
    <Box sx={{
      position: 'fixed',
      right: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 1300,
      width: 48,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      py: 1.5,
      gap: 0.3,
      borderRadius: '12px 0 0 12px',
      border: `1px solid ${divider}`,
      borderRight: 'none',
      background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(14,16,18,0.92)',
      backdropFilter: 'blur(12px)',
      boxShadow: isLight ? '-4px 0 24px rgba(0,0,0,0.10)' : '-4px 0 24px rgba(0,0,0,0.40)',
      overflowY: 'auto',
      overflowX: 'hidden',
      maxHeight: '80vh',
      '&::-webkit-scrollbar': { display: 'none' },
    }}>

      {/* Activate / deactivate drawing */}
      <Tooltip title={active ? 'Stop drawing' : 'Draw on board'} placement="left">
        <IconButton
          size="small"
          onClick={onToggle}
          sx={{
            width: 34, height: 34, borderRadius: '10px',
            background: active
              ? 'linear-gradient(135deg,#FF385C,#D91A50)'
              : isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
            color: active ? '#fff' : muted,
            border: `1.5px solid ${active ? 'transparent' : divider}`,
            boxShadow: active ? '0 4px 12px rgba(255,56,92,0.30)' : 'none',
            '&:hover': {
              background: active
                ? 'linear-gradient(135deg,#E31C5F,#C8183F)'
                : 'rgba(255,56,92,0.09)',
              color: active ? '#fff' : '#FF385C',
            },
            mb: 0.5,
          }}
        >
          <CreateIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      {active && (
        <>
          <Sep light={isLight} />

          {/* Pen */}
          <Tooltip title="Pen" placement="left">
            <IconButton size="small" onClick={() => onTool('pen')} sx={{
              width: 30, height: 30, borderRadius: '8px',
              bgcolor: tool === 'pen' ? 'rgba(255,56,92,0.12)' : 'transparent',
              color: tool === 'pen' ? '#FF385C' : muted,
              border: `1.5px solid ${tool === 'pen' ? 'rgba(255,56,92,0.35)' : 'transparent'}`,
              '&:hover': { bgcolor: 'rgba(255,56,92,0.09)', color: '#FF385C' },
            }}>
              <CreateIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          {/* Eraser */}
          <Tooltip title="Eraser" placement="left">
            <IconButton size="small" onClick={() => onTool('eraser')} sx={{
              width: 30, height: 30, borderRadius: '8px',
              bgcolor: tool === 'eraser' ? 'rgba(255,56,92,0.12)' : 'transparent',
              color: tool === 'eraser' ? '#FF385C' : muted,
              border: `1.5px solid ${tool === 'eraser' ? 'rgba(255,56,92,0.35)' : 'transparent'}`,
              '&:hover': { bgcolor: 'rgba(255,56,92,0.09)', color: '#FF385C' },
            }}>
              <AutoFixNormalIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          <Sep light={isLight} />

          {/* Colour swatches */}
          {COLORS.map(c => (
            <Box
              key={c}
              onClick={() => onColor(c)}
              sx={{
                width: 20, height: 20, borderRadius: '50%',
                bgcolor: c,
                border: color === c
                  ? '2.5px solid #FF385C'
                  : `1.5px solid ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)'}`,
                boxShadow: color === c ? '0 0 0 3px rgba(255,56,92,0.22)' : 'none',
                cursor: 'pointer',
                mb: 0.3,
                flexShrink: 0,
                transition: 'transform .1s',
                '&:hover': { transform: 'scale(1.2)' },
              }}
            />
          ))}

          <Sep light={isLight} />

          {/* Stroke sizes */}
          {SIZES.map(({ px, dot }) => (
            <Box
              key={px}
              onClick={() => onLineWidth(px)}
              sx={{
                width: 32, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '7px', cursor: 'pointer', flexShrink: 0, mb: 0.2,
                bgcolor: lineWidth === px ? 'rgba(255,56,92,0.10)' : 'transparent',
                border: `1.5px solid ${lineWidth === px ? 'rgba(255,56,92,0.35)' : 'transparent'}`,
                '&:hover': { bgcolor: 'rgba(255,56,92,0.07)' },
              }}
            >
              <Box sx={{ width: dot, height: dot, borderRadius: '50%', bgcolor: isLight ? '#2d2d2d' : '#ccc', flexShrink: 0 }} />
            </Box>
          ))}

          <Sep light={isLight} />

          {/* Undo */}
          <Tooltip title="Undo last stroke" placement="left">
            <IconButton size="small" onClick={onUndo} sx={{
              width: 30, height: 30, borderRadius: '8px', color: muted,
              '&:hover': { bgcolor: 'rgba(255,56,92,0.09)', color: '#FF385C' },
            }}>
              <UndoIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          {/* Clear */}
          <Tooltip title="Clear drawing" placement="left">
            <IconButton size="small" onClick={onClear} sx={{
              width: 30, height: 30, borderRadius: '8px', color: muted,
              '&:hover': { bgcolor: 'rgba(220,38,38,0.09)', color: '#dc2626' },
            }}>
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Box>
  );
};

export default DrawingDock;
