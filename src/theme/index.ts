import { createTheme, alpha } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

/**
 * Tripician Design System
 * ------------------------
 * Single source of truth for color, type, shape, elevation and motion.
 * Components should consume tokens via `theme.palette.*` and `theme.custom.*`
 * instead of hardcoding hex values.
 */

// ── Module augmentation ───────────────────────────────────────────────────
declare module '@mui/material/styles' {
  interface TypeBackground {
    /** Rail / side-panel surface, slightly tinted vs. default canvas */
    sidebar: string;
    /** Elevated surface (popovers, hovered cards) in dark mode; equals paper in light */
    elevated: string;
  }
  interface Theme {
    custom: CustomTokens;
  }
  interface ThemeOptions {
    custom?: CustomTokens;
  }
}

export interface CustomTokens {
  /** Display serif for editorial headings (hero, page titles) */
  fontDisplay: string;
  gradients: {
    /** Primary brand gradient ,CTAs */
    brand: string;
    /** Hover state of the brand gradient */
    brandHover: string;
    /** Very subtle brand wash for headers/sections */
    brandSubtle: string;
    /** Sunset accent used for celebratory/hero moments */
    sunset: string;
  };
  shadows: {
    /** Small brand-tinted glow for primary CTAs */
    brandSm: string;
    /** Larger brand-tinted glow (hover) */
    brandMd: string;
    /** Soft ambient card shadow */
    card: string;
    /** Card hover lift */
    cardHover: string;
    /** Floating overlays: popovers, menus */
    overlay: string;
  };
  /** Focus ring color (accessibility) */
  ring: string;
  surface: {
    /** Neutral hover wash for interactive rows/cells */
    hover: string;
    /** Pressed/selected wash */
    active: string;
    /** Brand-tinted selected wash (nav items, chips) */
    brandTint: string;
    /** Hairline border for cards & popovers */
    border: string;
  };
  motion: {
    duration: { fast: string; base: string; slow: string };
    easing: { standard: string; enter: string; exit: string; spring: string };
  };
}

// ── Brand constants (importable for non-MUI contexts: mapbox, canvas, css) ─
export const BRAND = {
  coral: '#FF385C',
  coralDark: '#E31C5F',
  coralDeep: '#D91A50',
  gradient: 'linear-gradient(135deg, #FF385C 0%, #D91A50 100%)',
  gradientHover: 'linear-gradient(135deg, #E31C5F 0%, #B01550 100%)',
} as const;

const FONT_BODY = "'Inter', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, 'Times New Roman', serif";

// ── Palettes ──────────────────────────────────────────────────────────────
const light = {
  primary: { main: BRAND.coral, light: '#FF8A9F', dark: BRAND.coralDark, contrastText: '#ffffff' },
  secondary: { main: '#1F2937', light: '#4B5563', dark: '#111827', contrastText: '#ffffff' },
  success: { main: '#0FA968', light: '#34D399', dark: '#0B7A4B', contrastText: '#ffffff' },
  warning: { main: '#F59E0B', light: '#FBBF24', dark: '#B45309', contrastText: '#ffffff' },
  error: { main: '#E5484D', light: '#F87171', dark: '#B91C1C', contrastText: '#ffffff' },
  info: { main: '#0EA5E9', light: '#38BDF8', dark: '#0369A1', contrastText: '#ffffff' },
  background: {
    default: '#FAFAF8',
    paper: '#FFFFFF',
    sidebar: '#F6F5F2',
    elevated: '#FFFFFF',
  },
  text: { primary: '#1C1C21', secondary: '#6E6E78', disabled: '#A3A3AD' },
  divider: 'rgba(28, 28, 33, 0.08)',
} as const;

const dark = {
  primary: { main: BRAND.coral, light: '#FF8A9F', dark: BRAND.coralDark, contrastText: '#ffffff' },
  secondary: { main: '#E5E7EB', light: '#F3F4F6', dark: '#9CA3AF', contrastText: '#111827' },
  success: { main: '#34D399', light: '#6EE7B7', dark: '#0FA968', contrastText: '#052E1E' },
  warning: { main: '#FBBF24', light: '#FCD34D', dark: '#F59E0B', contrastText: '#3B2503' },
  error: { main: '#F26669', light: '#FCA5A5', dark: '#E5484D', contrastText: '#3D0A0B' },
  info: { main: '#38BDF8', light: '#7DD3FC', dark: '#0EA5E9', contrastText: '#062C3D' },
  background: {
    default: '#0F0F13',
    paper: '#16161B',
    sidebar: '#131318',
    elevated: '#1D1D24',
  },
  text: { primary: '#F5F5F7', secondary: '#A5A5B1', disabled: '#5C5C66' },
  divider: 'rgba(245, 245, 247, 0.09)',
} as const;

// ── Soft elevation scale ──────────────────────────────────────────────────
const softShadows = (mode: 'light' | 'dark'): string[] => {
  const a1 = mode === 'light' ? 0.05 : 0.34;
  const a2 = mode === 'light' ? 0.08 : 0.42;
  const a3 = mode === 'light' ? 0.11 : 0.5;
  const shadows: string[] = ['none'];
  const steps = [
    `0 1px 2px rgba(16,16,20,${a1})`,
    `0 1px 3px rgba(16,16,20,${a1}), 0 2px 8px rgba(16,16,20,${a1})`,
    `0 2px 4px rgba(16,16,20,${a1}), 0 4px 12px rgba(16,16,20,${a2})`,
    `0 3px 6px rgba(16,16,20,${a1}), 0 6px 16px rgba(16,16,20,${a2})`,
    `0 4px 8px rgba(16,16,20,${a1}), 0 8px 20px rgba(16,16,20,${a2})`,
    `0 5px 10px rgba(16,16,20,${a1}), 0 10px 24px rgba(16,16,20,${a2})`,
    `0 6px 12px rgba(16,16,20,${a2}), 0 12px 28px rgba(16,16,20,${a2})`,
    `0 8px 16px rgba(16,16,20,${a2}), 0 16px 32px rgba(16,16,20,${a2})`,
  ];
  for (let i = 1; i <= 24; i++) {
    shadows.push(steps[Math.min(i - 1, steps.length - 1)].replace(String(a2), String(i > 8 ? a3 : a2)));
  }
  return shadows;
};

// ── Theme factory ─────────────────────────────────────────────────────────
export const createAppTheme = (mode: 'light' | 'dark') => {
  const p = mode === 'light' ? light : dark;
  const isLight = mode === 'light';

  const custom: CustomTokens = {
    fontDisplay: FONT_DISPLAY,
    gradients: {
      brand: BRAND.gradient,
      brandHover: BRAND.gradientHover,
      brandSubtle: isLight
        ? 'linear-gradient(135deg, rgba(255,56,92,0.07) 0%, rgba(255,56,92,0.02) 100%)'
        : 'linear-gradient(135deg, rgba(255,56,92,0.12) 0%, rgba(255,56,92,0.04) 100%)',
      sunset: 'linear-gradient(135deg, #FF385C 0%, #FF7854 60%, #FFB03A 100%)',
    },
    shadows: {
      brandSm: '0 4px 14px rgba(255,56,92,0.32)',
      brandMd: '0 8px 26px rgba(255,56,92,0.42)',
      card: isLight ? '0 1px 2px rgba(16,16,20,0.04), 0 4px 16px rgba(16,16,20,0.06)' : '0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.35)',
      cardHover: isLight ? '0 4px 8px rgba(16,16,20,0.06), 0 12px 32px rgba(16,16,20,0.11)' : '0 4px 8px rgba(0,0,0,0.45), 0 12px 32px rgba(0,0,0,0.5)',
      overlay: isLight ? '0 12px 24px rgba(16,16,20,0.10), 0 24px 60px rgba(16,16,20,0.14)' : '0 12px 24px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.6)',
    },
    ring: alpha(BRAND.coral, 0.75),
    surface: {
      hover: isLight ? 'rgba(28,28,33,0.045)' : 'rgba(245,245,247,0.06)',
      active: isLight ? 'rgba(28,28,33,0.08)' : 'rgba(245,245,247,0.1)',
      brandTint: isLight ? 'rgba(255,56,92,0.08)' : 'rgba(255,56,92,0.14)',
      border: isLight ? 'rgba(28,28,33,0.08)' : 'rgba(245,245,247,0.09)',
    },
    motion: {
      duration: { fast: '120ms', base: '200ms', slow: '320ms' },
      easing: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        enter: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
        exit: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  };

  const themeOptions: ThemeOptions = {
    custom,
    palette: { mode, ...p },
    shape: { borderRadius: 12 },
    shadows: softShadows(mode) as ThemeOptions['shadows'],
    typography: {
      fontFamily: FONT_BODY,
      h1: { fontWeight: 800, fontSize: 'clamp(2.25rem, 1.6rem + 2vw, 3.25rem)', letterSpacing: '-0.03em', lineHeight: 1.08 },
      h2: { fontWeight: 800, fontSize: 'clamp(1.75rem, 1.35rem + 1.3vw, 2.375rem)', letterSpacing: '-0.025em', lineHeight: 1.14 },
      h3: { fontWeight: 700, fontSize: 'clamp(1.5rem, 1.25rem + 0.8vw, 1.875rem)', letterSpacing: '-0.02em', lineHeight: 1.2 },
      h4: { fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.015em', lineHeight: 1.25 },
      h5: { fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.01em', lineHeight: 1.3 },
      h6: { fontWeight: 650, fontSize: '1rem', letterSpacing: '-0.005em', lineHeight: 1.35 },
      subtitle1: { fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.45 },
      subtitle2: { fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.4 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.55 },
      caption: { fontSize: '0.75rem', lineHeight: 1.45 },
      overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
      button: { fontWeight: 650, letterSpacing: '0', textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { scrollBehavior: 'smooth' },
          body: {
            '&::-webkit-scrollbar': { width: 10, height: 10 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isLight ? 'rgba(28,28,33,0.18)' : 'rgba(245,245,247,0.16)',
              borderRadius: 8,
              border: '2px solid transparent',
              backgroundClip: 'content-box',
            },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
          },
          '*': {
            '&::-webkit-scrollbar': { width: 8, height: 8 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isLight ? 'rgba(28,28,33,0.16)' : 'rgba(245,245,247,0.14)',
              borderRadius: 8,
            },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            scrollbarWidth: 'thin',
          },
          '::selection': {
            backgroundColor: alpha(BRAND.coral, 0.22),
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 650,
            borderRadius: 999,
            transition: `all ${custom.motion.duration.base} ${custom.motion.easing.standard}`,
            '&:focus-visible': { outline: `2px solid ${custom.ring}`, outlineOffset: 2 },
          },
          sizeLarge: { padding: '10px 24px', fontSize: '0.9375rem' },
          sizeMedium: { padding: '7px 18px', fontSize: '0.875rem' },
          sizeSmall: { padding: '4px 12px', fontSize: '0.8125rem' },
          containedPrimary: {
            background: custom.gradients.brand,
            boxShadow: custom.shadows.brandSm,
            '&:hover': { background: custom.gradients.brandHover, boxShadow: custom.shadows.brandMd },
            '&.Mui-disabled': {
              background: isLight ? 'rgba(28,28,33,0.10)' : 'rgba(245,245,247,0.10)',
              color: p.text.disabled,
              boxShadow: 'none',
            },
          },
          outlined: {
            borderColor: custom.surface.border,
            color: p.text.primary,
            '&:hover': { borderColor: BRAND.coral, color: BRAND.coral, backgroundColor: alpha(BRAND.coral, 0.04) },
          },
          text: {
            '&:hover': { backgroundColor: custom.surface.hover },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: `background ${custom.motion.duration.fast} ${custom.motion.easing.standard}`,
            '&:hover': { backgroundColor: custom.surface.hover },
            '&:focus-visible': { outline: `2px solid ${custom.ring}`, outlineOffset: 2 },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: custom.surface.border },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${custom.surface.border}`,
            boxShadow: custom.shadows.card,
            backgroundColor: p.background.paper,
            transition: `box-shadow ${custom.motion.duration.base} ${custom.motion.easing.standard}, transform ${custom.motion.duration.base} ${custom.motion.easing.standard}`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            border: `1px solid ${custom.surface.border}`,
            backgroundColor: p.background.elevated,
            boxShadow: custom.shadows.overlay,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            border: `1px solid ${custom.surface.border}`,
            backgroundColor: p.background.elevated,
            boxShadow: custom.shadows.overlay,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 14,
            border: `1px solid ${custom.surface.border}`,
            backgroundColor: p.background.elevated,
            boxShadow: custom.shadows.overlay,
          },
          list: { padding: 6 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 9,
            fontSize: '0.875rem',
            padding: '8px 12px',
            '&:hover': { backgroundColor: custom.surface.hover },
            '&.Mui-selected': {
              backgroundColor: custom.surface.brandTint,
              '&:hover': { backgroundColor: custom.surface.brandTint },
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            '&:hover': { backgroundColor: custom.surface.hover },
            '&.Mui-selected': {
              backgroundColor: custom.surface.brandTint,
              '&:hover': { backgroundColor: custom.surface.brandTint },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: p.background.paper,
            transition: `box-shadow ${custom.motion.duration.fast} ${custom.motion.easing.standard}`,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: custom.surface.border },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isLight ? 'rgba(28,28,33,0.22)' : 'rgba(245,245,247,0.24)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.coral, borderWidth: 1.5 },
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(BRAND.coral, 0.14)}` },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { '&.Mui-focused': { color: BRAND.coral } },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 600 },
          outlined: { borderColor: custom.surface.border },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 3, borderRadius: 3, backgroundColor: BRAND.coral },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 650,
            fontSize: '0.875rem',
            minHeight: 44,
            '&.Mui-selected': { color: BRAND.coral },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: '0.75rem',
            fontWeight: 550,
            padding: '6px 10px',
            backgroundColor: isLight ? '#1C1C21' : '#2E2E38',
          },
          arrow: { color: isLight ? '#1C1C21' : '#2E2E38' },
        },
      },
      MuiSkeleton: {
        defaultProps: { animation: 'wave' },
        styleOverrides: {
          root: { borderRadius: 8 },
          rounded: { borderRadius: 12 },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: { fontWeight: 700 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12, fontWeight: 500 },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 99, height: 6, backgroundColor: custom.surface.active },
          bar: { borderRadius: 99 },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: p.divider },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15,15,19,0.92)',
            backdropFilter: 'blur(16px)',
            boxShadow: 'none',
            borderBottom: `1px solid ${custom.surface.border}`,
            color: p.text.primary,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: p.background.elevated,
            backgroundImage: 'none',
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: { fontWeight: 700, fontSize: '0.65rem' },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: { padding: 8 },
          thumb: { boxShadow: '0 1px 3px rgba(0,0,0,0.25)' },
          track: { borderRadius: 999, opacity: isLight ? 0.35 : 0.45 },
        },
      },
    },
  };

  return createTheme(themeOptions);
};
