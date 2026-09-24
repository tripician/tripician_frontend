import React from 'react';
import TripicianAIOrb from './TripicianAIOrb';

interface TripicianAIOrbIconProps {
  size?: number;
  /** Accepted for icon-slot compatibility (Tabler icon props) - not used by the orb */
  stroke?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Icon-slot adapter for TripicianAIOrb: navigation configs pass Tabler-style props
 * (size / stroke / color); the orb only cares about size.
 */
const TripicianAIOrbIcon: React.FC<TripicianAIOrbIconProps> = ({ size = 22, className, style }) => (
  <TripicianAIOrb
    size={typeof size === 'number' ? size : 22}
    className={className}
    style={style}
  />
);

export default TripicianAIOrbIcon;
