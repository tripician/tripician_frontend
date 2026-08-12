import React from 'react';
import { Box, Tooltip } from '@mui/material';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Tabler icon component, rendered at 14px before the label. */
  Icon?: React.ElementType;
  /** Shown on hover. Also used as the reason when `disabled` is set. */
  tip?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Matches the 32px pill height used across the planner's info bar. */
  size?: 'small' | 'medium';
  'aria-label'?: string;
}

/**
 * Two-or-three option pill switch.
 *
 * Follows the neutral FilterChip treatment established on the Community page:
 * the selected segment is an inverted ink fill, never coral. Coral stays reserved
 * for actions - a mode switch reports state, so it must not compete with the
 * Publish/Save buttons sitting beside it.
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'medium',
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const height = size === 'small' ? 28 : 32;
  const iconSize = size === 'small' ? 13 : 14;

  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={(t) => ({
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        height,
        p: '3px',
        gap: '2px',
        borderRadius: 999,
        border: `1px solid ${t.custom.surface.border}`,
        bgcolor: t.palette.mode === 'light' ? t.custom.surface.hover : 'background.default',
      })}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const segment = (
          <Box
            component="button"
            type="button"
            key={opt.value}
            disabled={opt.disabled}
            aria-pressed={active}
            onClick={() => { if (!opt.disabled && !active) onChange(opt.value); }}
            sx={(t) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              height: '100%',
              px: size === 'small' ? 1.1 : 1.4,
              border: 'none',
              borderRadius: 999,
              bgcolor: active ? 'text.primary' : 'transparent',
              color: active ? 'background.paper' : 'text.secondary',
              fontFamily: 'inherit',
              fontSize: size === 'small' ? 11.5 : 12.5,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              cursor: opt.disabled ? 'not-allowed' : active ? 'default' : 'pointer',
              opacity: opt.disabled ? 0.45 : 1,
              transition: `background-color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}, color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
              '&:hover': active || opt.disabled ? {} : { color: 'text.primary' },
              '&:focus-visible': { outline: `2px solid ${t.custom.ring}`, outlineOffset: 2 },
            })}
          >
            {opt.Icon && <opt.Icon size={iconSize} stroke={1.9} />}
            {opt.label}
          </Box>
        );

        if (!opt.tip) return segment;
        // A disabled button swallows pointer events, so the tooltip needs a live
        // wrapper element to hang off - otherwise the "why is this off?" reason
        // never shows, which is the only time it actually matters.
        return (
          <Tooltip key={opt.value} title={opt.tip} arrow placement="bottom">
            <Box component="span" sx={{ display: 'inline-flex', height: '100%' }}>
              {segment}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

export default SegmentedControl;
