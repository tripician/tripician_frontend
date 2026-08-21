import React from 'react';
import { Box, InputBase, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { IconSearch } from '@tabler/icons-react';

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  sx?: object;
  'aria-label'?: string;
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
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        height: 42,
        px: 2,
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
      <IconSearch size={17} stroke={1.9} color={theme.palette.text.disabled} style={{ flexShrink: 0 }} />
      <InputBase
        fullWidth
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputProps={{ 'aria-label': ariaLabel ?? placeholder }}
        sx={{ fontSize: 14, fontWeight: 500 }}
      />
    </Box>
  );
};

export default SearchField;
