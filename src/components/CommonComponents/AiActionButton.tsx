import React from 'react';
import { Button } from '@mui/material';
import type { ButtonProps } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

// Reusable sheen + subtle pulse for all AI buttons
const sheen = keyframes`
  0% { transform: translateX(-120%) skewX(-20deg); opacity: 0; }
  45% { opacity: .55; }
  60% { opacity: .55; }
  100% { transform: translateX(220%) skewX(-20deg); opacity: 0; }
`;

const pulse = keyframes`
  0%,100% { box-shadow: 0 0 0 0 rgba(140,105,255,0.0); }
  50% { box-shadow: 0 6px 22px -4px rgba(90,55,200,0.45); }
`;

const StyledBtn = styled(Button)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  fontWeight: 600,
  letterSpacing: 0.35,
  padding: '6px 18px',
  minHeight: 0,
  lineHeight: 1.25,
  fontSize: 13.2,
  borderRadius: 20,
  textTransform: 'none',
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 35%, ${theme.palette.secondary.main} 75%, ${theme.palette.secondary.light} 100%)`,
  color: theme.palette.getContrastText(theme.palette.primary.main),
  transition: 'transform .35s cubic-bezier(.34,1.56,.28,1), box-shadow .4s',
  animation: `${pulse} 3.8s ease-in-out infinite`,
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '38%',
    height: '100%',
    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.75) 50%, rgba(255,255,255,0) 100%)',
    transform: 'translateX(-120%) skewX(-20deg)',
    animation: `${sheen} 4.2s linear infinite`,
    pointerEvents: 'none',
  },
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 10px 26px -6px rgba(40,10,120,.48)',
  },
  '&:active': {
    transform: 'translateY(-1px) scale(.97)',
    boxShadow: '0 4px 16px -4px rgba(40,10,120,.5)'
  }
}));

export const AiActionButton: React.FC<ButtonProps> = (props) => <StyledBtn {...props} />;

export default AiActionButton;
