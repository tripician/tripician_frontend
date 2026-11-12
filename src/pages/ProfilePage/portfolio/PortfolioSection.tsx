import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';

/**
 * The pieces every profile section is built from, matching the app's
 * `features/profile/content/SectionHeader.tsx`: a title in the display cut with
 * a quiet label at its right, one muted line saying what the section is, a
 * quote where an empty section's content would be, and a hairline between
 * sections. Together they make the profile read as one composed piece rather
 * than a stack of widgets.
 */

export const SectionHeader: React.FC<{
  title: string;
  description?: string | null;
  /** A figure or a link, right-aligned on the title's line. */
  accessory?: React.ReactNode;
  id?: string;
}> = ({ title, description, accessory, id }) => (
  <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}>
      <Typography
        id={id}
        component="h2"
        sx={(theme) => ({
          fontFamily: theme.custom.fontDisplay,
          fontWeight: 700,
          fontSize: { xs: '1.375rem', md: '1.625rem' },
          letterSpacing: '-0.018em',
          lineHeight: 1.2,
          minWidth: 0,
        })}
        noWrap
      >
        {title}
      </Typography>
      {accessory ? <Box sx={{ flexShrink: 0 }}>{accessory}</Box> : null}
    </Box>
    {description ? (
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
        {description}
      </Typography>
    ) : null}
  </Box>
);

/** The quiet figure at a title's right: "24 photos", "Latest first". */
export const SectionNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, whiteSpace: 'nowrap' }}>
    {children}
  </Typography>
);

/** A small text link at a title's right: "Edit", "View all". */
export const SectionLink: React.FC<{ label: string; onClick: () => void; ariaLabel?: string }> = ({ label, onClick, ariaLabel }) => (
  <ButtonBase
    onClick={onClick}
    aria-label={ariaLabel ?? label}
    sx={(theme) => ({
      fontFamily: 'inherit',
      fontSize: '0.8125rem',
      fontWeight: 600,
      color: 'text.primary',
      px: 1,
      py: 0.5,
      mr: -1,
      borderRadius: '8px',
      transition: `background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
      '&:hover': { bgcolor: theme.custom.surface.hover },
      '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
    })}
  >
    {label}
  </ButtonBase>
);

/**
 * What an empty section shows instead of disappearing: a travel quote on its
 * own under a red quotation mark, and for the owner a way to add the first
 * thing. `line` is only for a read that failed, so "Try again" says what it
 * retries (owner rule: the quote otherwise stands alone).
 */
export const SectionQuote: React.FC<{ quote: string; line?: string | null; action?: React.ReactNode }> = ({ quote, line, action }) => (
  <Box
    sx={(theme) => ({
      borderRadius: '16px',
      bgcolor: theme.custom.surface.hover,
      px: { xs: 3, md: 5 },
      py: { xs: 3.5, md: 4.5 },
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 1.25,
    })}
  >
    <Typography
      aria-hidden
      sx={(theme) => ({
        fontFamily: theme.custom.fontDisplay,
        fontWeight: 700,
        fontSize: 56,
        lineHeight: 1,
        height: 30,
        color: 'primary.main',
      })}
    >
      “
    </Typography>
    <Typography sx={{ fontWeight: 500, fontSize: { xs: '1rem', md: '1.0625rem' }, lineHeight: 1.5, letterSpacing: '-0.01em', maxWidth: 520, textWrap: 'balance' }}>
      {quote}
    </Typography>
    {line ? (
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {line}
      </Typography>
    ) : null}
    {action ? <Box sx={{ mt: 0.75, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>{action}</Box> : null}
  </Box>
);

/** The hairline between two sections. */
export const SectionRule: React.FC = () => (
  <Box
    role="presentation"
    sx={(theme) => ({ height: '1px', bgcolor: theme.custom.surface.border, my: { xs: 4, md: 6 } })}
  />
);
