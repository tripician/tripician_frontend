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
  interface TypographyVariants {
    navLabel: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    navLabel?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    navLabel: true;
  }
}

export interface CustomTokens {
  /**
   * The editorial serif.
   *
   * As of 2026-08-18 every h1-h6 is set in this face through the typography
   * scale, by owner decision - so a heading does NOT need this token, and should
   * not reach for it. What this token is still for is opting a NON-heading into
   * the serif: story body copy, a pull quote, a blog byline.
   *
   * `story-serif.guard.test.ts` keeps that boundary: the token may only be named
   * from stories and blogs, which is where non-heading editorial type lives.
   * Weights 600/700, plus a real italic 600.
   */
  fontDisplay: string;
  /**
   * The same serif, different job: the Tripician wordmark and the celebration
   * moment that carries it. A logo is not typography and does not belong under
   * the editorial rule, so it gets its own token rather than an exception in the
   * guard. These two may point at the same stack today and diverge later.
   */
  fontBrand: string;
  /**
   * The brand colour, split by JOB rather than by shade.
   *
   * Coral is a FILL. Measured, it is 3.52:1 against white and 3.36:1 against
   * the light canvas, so it fails AA at body size - and this codebase sets
   * `color: BRAND.coral` on 10-12px text in dozens of places. `onLight` and
   * `onDark` are the same hue moved just far enough to clear 4.5:1, so
   * coloured type has somewhere correct to go.
   *
   * `tint` replaces 37 ad-hoc alpha values with six steps. Keep the existing
   * alphas when migrating a call site; retuning to the ladder is a separate
   * pass, or a migration bug hides behind "we adjusted the tints".
   */
  brand: {
    /** The fill. Buttons, the active pill, the orb. Never body text. */
    fill: string;
    fillHover: string;
    /** Brand-coloured TEXT on a light surface. Clears AA. */
    onLight: string;
    /** Brand-coloured TEXT on the dark canvas. Clears AA. */
    onDark: string;
    /** Raw "R G B" channels, for rgb(var(--brand-rgb) / a) in plain CSS. */
    channels: string;
    tint: {
      subtle: string;
      soft: string;
      medium: string;
      strong: string;
      heavy: string;
      solid: string;
    };
  };
  gradients: {
    /** Primary brand gradient - CTAs */
    brand: string;
    /** Hover state of the brand gradient */
    brandHover: string;
    /** Very subtle brand wash for headers/sections */
    brandSubtle: string;
    /** Sunset accent used for celebratory/hero moments */
    sunset: string;
  };
  shadows: {
    /**
     * The hover ring: a zero-blur, zero-offset box-shadow that sits exactly on
     * a control's edge. This is NOT a glow and must never grow a blur radius.
     *
     * It replaces `brandSm`/`brandMd`, a pair of blurred coral drop-shadows
     * that sat under every primary CTA and grew on hover. That - gradient fill
     * plus coloured glow plus a `translateY` lift - is the single loudest
     * "generated UI" tell there is, and it was the specific thing users were
     * reacting to. The names were deleted rather than retuned so the compiler
     * would stop at every call site and force a decision at each one.
     */
    ringBrand: string;
    /** Softer ring for INPUT focus (not buttons) - still zero blur, wider spread */
    ringFocus: string;
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

import { BRAND_SEED, BRAND_ON_LIGHT, BRAND_ON_DARK, BRAND_CHANNELS, RAMPS } from './brand.generated';

// ── Brand constants (importable for non-MUI contexts: mapbox, canvas, css) ─
export const BRAND = {
  coral: '#FF385C',
  coralDark: '#E31C5F',
  coralDeep: '#D91A50',
  /** = palette primary.light. Named here so call sites stop writing the hex. */
  coralLight: '#FF8A9F',
  gradient: 'linear-gradient(135deg, #FF385C 0%, #D91A50 100%)',
  gradientHover: 'linear-gradient(135deg, #E31C5F 0%, #B01550 100%)',
} as const;

/*
 * The UI face. Geometric-humanist rather than the neutral grotesque this used to
 * be (Inter): the product surfaces are listings - trips, seats, prices, hosts -
 * and a warmer face reads as a place people go rather than as a dashboard.
 *
 * Requested as a variable axis in index.html. The weight ladder is 400/500/600/700
 * and nothing above it; `font-synthesis: none` means an off-ladder weight rounds
 * up silently rather than failing, which is how 550/650/750 once shipped heavier
 * than written.
 */
const FONT_BODY = "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
/*
 * The display face is a SERIF, and its scope is now deliberately NARROW.
 *
 * It was briefly swapped to Poppins to match a geometric-sans reference. At UI
 * sizes that was fine; at display sizes it was not - "Welcome back", "Community",
 * "Trips" all read as interface chrome rather than as a masthead, because a
 * geometric sans set large is just a bigger version of the same voice the body
 * text already speaks.
 *
 * That finding still holds, and it is why the serif did not disappear when the
 * UI face became geometric. But it no longer belongs on every masthead: a trip
 * listing IS product, and dressing it in editorial type made a commercial object
 * pretend to be an essay. So the serif is now reserved for the one surface that
 * has to read as authored - stories: their titles, and the story reading page.
 *
 * Everything else - page headers, cards, buttons, labels, inputs, body copy -
 * stays on FONT_BODY. `story-serif.guard.test.ts` enforces the boundary, because
 * this is exactly the kind of rule that erodes one component at a time.
 */
const FONT_DISPLAY = "'Playfair Display', Georgia, 'Times New Roman', serif";

// ── Palettes ──────────────────────────────────────────────────────────────
/*
 * Light palette, from the generated OKLCH ramps.
 *
 * Every `.main` below is the LIGHTEST stop on its ramp where white text still
 * clears 4.5:1, so a filled button's label is legible by construction rather
 * than by luck. Measured before: white on warning was 2.15:1, on info 2.77:1,
 * on success 3.05:1.
 *
 * Warning is the exception and keeps a bright fill with DARK text. Amber dark
 * enough for white text stops looking like a warning and starts looking like
 * mud; dark mode already solved it this way and light mode never got the fix.
 *
 * `primary.main` is NOT from the ramp - it is the seed, because it has to stay
 * the logo colour. It is the one pair still below the bar (3.52:1), which is
 * why `custom.brand.onLight` exists for coloured type.
 */
const light = {
  primary: { main: BRAND.coral, light: RAMPS.brand[820], dark: RAMPS.brand[520], contrastText: '#ffffff' },
  secondary: { main: RAMPS.neutral[220], light: RAMPS.neutral[420], dark: RAMPS.neutral[120], contrastText: '#ffffff' },
  success: { main: RAMPS.success[520], light: RAMPS.success[720], dark: RAMPS.success[420], contrastText: '#ffffff' },
  warning: { main: RAMPS.warning[720], light: RAMPS.warning[820], dark: RAMPS.warning[520], contrastText: RAMPS.warning[220] },
  error: { main: RAMPS.error[520], light: RAMPS.error[720], dark: RAMPS.error[420], contrastText: '#ffffff' },
  info: { main: RAMPS.info[520], light: RAMPS.info[720], dark: RAMPS.info[420], contrastText: '#ffffff' },
  background: {
    default: RAMPS.neutral[980],
    paper: '#FFFFFF',
    sidebar: RAMPS.neutral[960],
    elevated: '#FFFFFF',
  },
  text: { primary: RAMPS.neutral[220], secondary: RAMPS.neutral[520], disabled: RAMPS.neutral[620] },
  divider: 'rgba(28, 26, 24, 0.08)',
} as const;

/*
 * Dark palette. Same ramps, read from the other end.
 *
 * Semantic `.main` values move UP the ramp so they sit against a dark canvas,
 * and each takes a dark `contrastText` from the low end of its own ramp rather
 * than a shared near-black, which keeps a filled chip legible without going to
 * pure white on a mid tone.
 */
const dark = {
  primary: { main: BRAND.coral, light: RAMPS.brand[820], dark: RAMPS.brand[520], contrastText: '#ffffff' },
  secondary: { main: RAMPS.neutral[900], light: RAMPS.neutral[960], dark: RAMPS.neutral[620], contrastText: RAMPS.neutral[120] },
  success: { main: RAMPS.success[720], light: RAMPS.success[820], dark: RAMPS.success[520], contrastText: RAMPS.success[120] },
  warning: { main: RAMPS.warning[820], light: RAMPS.warning[900], dark: RAMPS.warning[620], contrastText: RAMPS.warning[220] },
  error: { main: RAMPS.error[720], light: RAMPS.error[820], dark: RAMPS.error[520], contrastText: RAMPS.error[120] },
  info: { main: RAMPS.info[720], light: RAMPS.info[820], dark: RAMPS.info[520], contrastText: RAMPS.info[120] },
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
    fontBrand: FONT_DISPLAY,
    brand: {
      fill: BRAND_SEED,
      fillHover: BRAND.coralDark,
      // Generated to be the tone NEAREST the brand that still clears 4.5:1,
      // so coloured type stays recognisably coral instead of going near-black.
      onLight: BRAND_ON_LIGHT,
      onDark: BRAND_ON_DARK,
      channels: BRAND_CHANNELS,
      tint: {
        subtle: alpha(BRAND_SEED, 0.04),
        soft: alpha(BRAND_SEED, 0.08),
        medium: alpha(BRAND_SEED, 0.12),
        strong: alpha(BRAND_SEED, 0.2),
        heavy: alpha(BRAND_SEED, 0.32),
        solid: alpha(BRAND_SEED, 0.5),
      },
    },
    gradients: {
      brand: BRAND.gradient,
      brandHover: BRAND.gradientHover,
      brandSubtle: isLight
        ? 'linear-gradient(135deg, rgba(255,56,92,0.07) 0%, rgba(255,56,92,0.02) 100%)'
        : 'linear-gradient(135deg, rgba(255,56,92,0.12) 0%, rgba(255,56,92,0.04) 100%)',
      sunset: 'linear-gradient(135deg, #FF385C 0%, #FF7854 60%, #FFB03A 100%)',
    },
    shadows: {
      ringBrand: `0 0 0 2px ${BRAND.coral}`,
      ringFocus: `0 0 0 3px ${alpha(BRAND.coral, 0.16)}`,
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
    // MUI multiplies every numeric `borderRadius` in `sx` by this token, so it is
    // not a style choice - it is the unit those ~160 call sites were written
    // against. It sat at 12, which silently tripled every one of them
    // (`borderRadius: 2` rendered 24px, not 8px) and is why the UI read as
    // uniformly blobby. Back to MUI's documented 4, so `1/1.5/2/3/4` mean
    // 4/6/8/12/16px - which is what each author meant. Surfaces that want a
    // card radius state it in px below.
    shape: { borderRadius: 4 },
    shadows: softShadows(mode) as ThemeOptions['shadows'],
    /**
     * The scale. Nine steps, and they are the only sizes the product may use -
     * an audit found 102 distinct font sizes in play, 34 of them between 10 and
     * 15px, which is not hierarchy, it is noise. Reach for `variant=`, not
     * `sx={{ fontSize }}`.
     *
     * Weights run 400/500/600/700 and stop there. Nothing above 700: the display
     * sizes carry voice through size and negative tracking, the way Linear,
     * Geist and Airbnb all do it, rather than through fat. The old 550/650/750
     * values were never loaded by the font link at all, so they silently rounded
     * UP - the app was rendering heavier than it was written.
     */
    typography: {
      fontFamily: FONT_BODY,
      /*
       * Every heading is set in the display serif, by owner decision (2026-08-18),
       * reversing the 2026-08-17 pass that had restricted it to stories and blogs.
       * Setting it HERE rather than at call sites is what makes that one edit
       * instead of nineteen, and it keeps `custom.fontDisplay` free to mean "I am
       * opting a non-heading into the serif", which is what the guard polices.
       *
       * Tracking is near-zero on purpose. The old values were negative because a
       * geometric sans fits loosely at display size; Playfair does not, and the
       * same negative tracking on a high-contrast serif closes the counters and
       * reads as cramped. Only h1 keeps a slight negative.
       *
       * Weights are pinned to what index.html actually fetches (600 and 700).
       * `font-synthesis: none` is set globally, so a weight that is not loaded
       * renders at the nearest one rather than being faked - silently wrong.
       */
      h1: { fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(2rem, 1.5rem + 1.6vw, 2.75rem)', letterSpacing: '-0.01em', lineHeight: 1.1 },
      h2: { fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(1.625rem, 1.3rem + 1vw, 2.125rem)', letterSpacing: '-0.005em', lineHeight: 1.16 },
      h3: { fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(1.375rem, 1.2rem + 0.6vw, 1.625rem)', letterSpacing: '0', lineHeight: 1.22 },
      h4: { fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: '1.25rem', letterSpacing: '0', lineHeight: 1.3 },
      h5: { fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: '1.0625rem', letterSpacing: '0', lineHeight: 1.35 },
      h6: { fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '0.005em', lineHeight: 1.4 },
      subtitle1: { fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.45 },
      subtitle2: { fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.4 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.55 },
      caption: { fontSize: '0.75rem', lineHeight: 1.45 },
      overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' },
      /**
       * The label under a bottom-bar icon.
       *
       * A tenth step, added because the bar was setting its own 0.62rem off the
       * scale entirely. 11px is not a new size: it is what overline already
       * uses, without the uppercasing and letter-spacing that would be wrong
       * under an icon. caption at 12px puts "Community" at roughly 60px inside
       * a 62px slot on a 320px screen, which is not a margin.
       */
      navLabel: { fontSize: '0.6875rem', fontWeight: 600, lineHeight: 1.2, letterSpacing: '0.005em' },
      button: { fontWeight: 600, letterSpacing: '0', textTransform: 'none' },
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
      /**
       * A button has one rest state and one hover state, and the hover is a
       * COLOUR change - never a shadow that grows, never a lift. Everything a
       * button needs is stated here, so a call site should not be reaching for
       * `sx={{ boxShadow }}` or `sx={{ background: linear-gradient(...) }}`.
       *
       * `transition: all` is gone with the glow. It was animating `transform`
       * and `box-shadow` - the two properties this system no longer uses on a
       * button - which is what made every hover feel like it inflated.
       */
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 999,
            boxShadow: 'none',
            transition: [
              `background-color ${custom.motion.duration.fast} ${custom.motion.easing.standard}`,
              `border-color ${custom.motion.duration.fast} ${custom.motion.easing.standard}`,
              `color ${custom.motion.duration.fast} ${custom.motion.easing.standard}`,
              `box-shadow ${custom.motion.duration.fast} ${custom.motion.easing.standard}`,
            ].join(', '),
            '&:hover': { boxShadow: 'none' },
            '&:active': { boxShadow: 'none' },
            '&.Mui-disabled': { boxShadow: 'none' },
            '&:focus-visible': { outline: `2px solid ${custom.ring}`, outlineOffset: 2 },

            /*
             * Opt-in inversion: `<Button variant="contained" className="t-invert">`.
             *
             * For marketing and auth CTAs that sit on a page background with
             * room to breathe (InfoPages, blog, empty states). Inverting to a
             * white fill needs something behind it to invert AGAINST, which a
             * dense planner toolbar does not have - there the fill just
             * disappears into the card. So the app default is a flat darken
             * below, and this is the exception you ask for by name.
             */
            '&.t-invert.MuiButton-containedPrimary:hover': {
              backgroundColor: p.background.paper,
              color: BRAND.coral,
              boxShadow: custom.shadows.ringBrand,
            },
            '&.t-invert.MuiButton-containedPrimary:active': {
              backgroundColor: alpha(BRAND.coral, 0.06),
              color: BRAND.coralDark,
              boxShadow: `0 0 0 2px ${BRAND.coralDark}`,
            },
          },
          sizeLarge: { padding: '10px 24px', fontSize: '0.9375rem' },
          sizeMedium: { padding: '7px 18px', fontSize: '0.875rem' },
          sizeSmall: { padding: '4px 12px', fontSize: '0.8125rem' },

          /* Filled non-primary (secondary/error/success/...). MUI's own hover is
             already `palette[color].dark`, i.e. a flat darken - all this has to
             do is stop elevation and gradients coming back. */
          contained: {
            backgroundImage: 'none',
            '&.Mui-disabled': {
              backgroundColor: isLight ? 'rgba(28,28,33,0.10)' : 'rgba(245,245,247,0.10)',
              color: p.text.disabled,
            },
          },

          /* The in-app primary: flat coral, darkening in two steps.
             `&:active` is stated AFTER `&:hover` deliberately - equal
             specificity, so source order is what decides. */
          containedPrimary: {
            backgroundColor: BRAND.coral,
            backgroundImage: 'none',
            color: '#fff',
            '&:hover': { backgroundColor: BRAND.coralDark },
            '&:active': { backgroundColor: BRAND.coralDeep },
            '&.Mui-disabled': {
              backgroundColor: isLight ? 'rgba(28,28,33,0.10)' : 'rgba(245,245,247,0.10)',
              color: p.text.disabled,
            },
          },

          outlined: {
            borderColor: custom.surface.border,
            color: p.text.primary,
            '&:hover': { borderColor: BRAND.coral, color: BRAND.coral, backgroundColor: alpha(BRAND.coral, 0.04) },
            '&:active': { borderColor: BRAND.coralDark, color: BRAND.coralDark, backgroundColor: alpha(BRAND.coral, 0.09) },
          },
          outlinedPrimary: {
            borderColor: alpha(BRAND.coral, 0.4),
            color: BRAND.coral,
            '&:hover': { borderColor: BRAND.coral, backgroundColor: alpha(BRAND.coral, 0.05) },
          },

          text: {
            '&:hover': { backgroundColor: custom.surface.hover },
            '&:active': { backgroundColor: custom.surface.active },
          },
          textPrimary: {
            color: BRAND.coral,
            '&:hover': { backgroundColor: alpha(BRAND.coral, 0.06) },
            '&:active': { backgroundColor: alpha(BRAND.coral, 0.11) },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: 'none',
            transition: `background-color ${custom.motion.duration.fast} ${custom.motion.easing.standard}, color ${custom.motion.duration.fast} ${custom.motion.easing.standard}`,
            '&:hover': { backgroundColor: custom.surface.hover, boxShadow: 'none' },
            '&:focus-visible': { outline: `2px solid ${custom.ring}`, outlineOffset: 2 },
          },
        },
      },
      /*
       * A Fab genuinely floats over scrolling content and has no border, so it
       * is the one control that keeps a shadow - but a NEUTRAL grey one, which
       * reads as elevation rather than as brand glow. The rule this change
       * enforces is "no coral glow", not "no depth anywhere".
       */
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: custom.shadows.card,
            backgroundImage: 'none',
            textTransform: 'none',
            fontWeight: 600,
            transition: `background-color ${custom.motion.duration.fast} ${custom.motion.easing.standard}`,
            '&:hover': { boxShadow: custom.shadows.cardHover },
            '&:active': { boxShadow: custom.shadows.card },
            '&:focus-visible': { outline: `2px solid ${custom.ring}`, outlineOffset: 2 },
          },
          primary: {
            backgroundColor: BRAND.coral,
            color: '#fff',
            '&:hover': { backgroundColor: BRAND.coralDark },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          // Stated in px rather than inherited from `shape`, which is now 4 - a
          // bare Paper is a card-like surface and wants a card-like corner.
          root: { backgroundImage: 'none', borderRadius: 12 },
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
            '&.Mui-focused': { boxShadow: custom.shadows.ringFocus },
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
          /* Chips are labels, not CTAs: flat, no elevation, no gradient. */
          root: { borderRadius: 999, fontWeight: 600, boxShadow: 'none', backgroundImage: 'none' },
          outlined: { borderColor: custom.surface.border },
          clickable: {
            '&:hover': { boxShadow: 'none' },
            '&:focus-visible': { outline: `2px solid ${custom.ring}`, outlineOffset: 2 },
          },
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
            fontWeight: 600,
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
            fontWeight: 500,
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
          root: { fontWeight: 600 },
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
