import type { Variants, Transition } from 'framer-motion';

// ─── Premium spring presets ──────────────────────────────────────────────────
export const springs = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  gentle: { type: 'spring', stiffness: 200, damping: 24 } as Transition,
  bouncy: { type: 'spring', stiffness: 300, damping: 20 } as Transition,
  smooth: { type: 'spring', stiffness: 100, damping: 20 } as Transition,
  quick: { type: 'spring', stiffness: 500, damping: 35 } as Transition,
};

// ─── Page transition variants ────────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageTransition: Transition = {
  type: 'tween',
  ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuad
  duration: 0.35,
};

// ─── Fade-in variants ────────────────────────────────────────────────────────
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ─── Scale variants ──────────────────────────────────────────────────────────
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 22 } },
};

// ─── Stagger container ──────────────────────────────────────────────────────
export const staggerContainer = (staggerChildren = 0.06, delayChildren = 0.1): Variants => ({
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export const staggerItemScale: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 26 },
  },
};

// ─── Card hover effects ─────────────────────────────────────────────────────
export const cardHover = {
  rest: { scale: 1, y: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  hover: {
    scale: 1.015,
    y: -4,
    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  tap: { scale: 0.985 },
};

// ─── Slide-in from side ─────────────────────────────────────────────────────
export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 250, damping: 25 } },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

export const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 250, damping: 25 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

// ─── Modal / Dialog animation ───────────────────────────────────────────────
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 350, damping: 28 },
  },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } },
};

// ─── Float / dock animation ─────────────────────────────────────────────────
export const floatIn: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 22, delay: 0.3 },
  },
};

// ─── Icon spin ──────────────────────────────────────────────────────────────
export const iconSpin = {
  rest: { rotate: 0 },
  hover: { rotate: 180, transition: { duration: 0.4, ease: 'easeInOut' } },
};

// ─── Pulse / attention ──────────────────────────────────────────────────────
export const pulseVariant: Variants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

// ─── List item with layout animation ────────────────────────────────────────
export const listItem: Variants = {
  hidden: { opacity: 0, x: -12, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 28 },
  },
  exit: {
    opacity: 0,
    x: 20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

// ─── Tab content transition ─────────────────────────────────────────────────
export const tabContent: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// ─── Banner / hero section ──────────────────────────────────────────────────
export const heroReveal: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ─── Button micro-interaction ───────────────────────────────────────────────
export const buttonTap = {
  whileTap: { scale: 0.96 },
  whileHover: { scale: 1.02 },
  transition: springs.snappy,
};

// ─── Tooltip / chip reveal ──────────────────────────────────────────────────
export const chipReveal: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 500, damping: 25 },
  },
};
