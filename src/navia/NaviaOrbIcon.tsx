import React, { useEffect, useState } from 'react';
import NaviaOrb from './NaviaOrb';

interface NaviaOrbIconProps {
  size?: number;
  /** Accepted for icon-slot compatibility (Tabler icon props) - not used by the orb */
  stroke?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

// Periodic attention glow: every GLOW_EVERY_MS the orb "breathes" for GLOW_FOR_MS
// so Navia quietly reminds users it exists without being annoying.
const GLOW_EVERY_MS = 20_000;
const GLOW_FOR_MS = 2_700;

/**
 * Icon-slot adapter for NaviaOrb: navigation configs pass Tabler-style props
 * (size / stroke / color); the orb only cares about size.
 * Includes a timed attention glow for nav placements.
 */
const NaviaOrbIcon: React.FC<NaviaOrbIconProps> = ({ size = 22, className, style }) => {
  const [glowing, setGlowing] = useState(false);

  useEffect(() => {
    // Respect users who asked the OS to minimise motion.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let glowTimeout: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setGlowing(true);
      glowTimeout = setTimeout(() => setGlowing(false), GLOW_FOR_MS);
    }, GLOW_EVERY_MS);

    return () => {
      clearInterval(interval);
      if (glowTimeout) clearTimeout(glowTimeout);
    };
  }, []);

  return (
    <NaviaOrb
      size={typeof size === 'number' ? size : 22}
      processing={glowing}
      className={className}
      style={style}
    />
  );
};

export default NaviaOrbIcon;
