import React from 'react';
import { Box, InputBase, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { IconSearch, IconX } from '@tabler/icons-react';

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  sx?: object;
  'aria-label'?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  /** Shows a clear button while there is text, in place of the browser's own. */
  onClear?: () => void;
  autoFocus?: boolean;
  enterKeyHint?: 'search' | 'go' | 'done' | 'enter';
  /** Large is the page-level field: taller, and 16px text so iOS does not zoom on focus. */
  size?: 'medium' | 'large';
}

/**
 * Rounded search field matching the theme's focused-input treatment.
 *
 * Started as a local component on Community and moved here when the crew
 * directory became its own page and needed the same control. Preferred over a
 * bare MUI `TextField` because the pill shape, the 42px height and the focus
 * ring are what make it read as search rather than as a form field.
 */
const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder,
  sx,
  'aria-label': ariaLabel,
  inputRef,
  onKeyDown,
  onFocus,
  onClear,
  autoFocus,
  enterKeyHint,
  size = 'medium',
}) => {
  const theme = useTheme();
  const large = size === 'large';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        height: large ? 52 : 42,
        px: large ? 2.25 : 2,
        borderRadius: 999,
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        transition: `box-shadow ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}, border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:focus-within': {
          borderColor: 'primary.main',
          boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.14)}`,
        },
        ...sx,
      }}
    >
      <IconSearch size={large ? 19 : 17} stroke={1.9} color={theme.palette.text.disabled} style={{ flexShrink: 0 }} />
      <InputBase
        fullWidth
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputRef={inputRef}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        autoFocus={autoFocus}
        inputProps={{ 'aria-label': ariaLabel ?? placeholder, enterKeyHint }}
        sx={{
          ...(large ? { typography: 'body1' } : { fontSize: 14 }),
          fontWeight: 500,
          ...(onClear ? { '& input::-webkit-search-cancel-button': { display: 'none' } } : {}),
        }}
      />
      {onClear && value && (
        <Box
          component="button"
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          sx={{
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            width: 28,
            height: 28,
            p: 0,
            border: 'none',
            borderRadius: 999,
            bgcolor: theme.custom.surface.hover,
            color: 'text.secondary',
            cursor: 'pointer',
            '&:hover': { color: 'text.primary' },
            '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
          }}
        >
          <IconX size={15} stroke={2} />
        </Box>
      )}
    </Box>
  );
};

export default SearchField;
