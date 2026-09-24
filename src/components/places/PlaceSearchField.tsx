import React from 'react';
import { Box, CircularProgress, InputBase, Typography, useTheme } from '@mui/material';
import { IconMapPin, IconSearch, IconWorld } from '@tabler/icons-react';
import { usePlacesAutocomplete, type PlacePrediction } from './usePlacesAutocomplete';
import { typedPlace, type PickedPlace } from './pickedPlace';

interface PlaceSearchFieldProps {
  placeholder: string;
  /** Read by screen readers, since the placeholder vanishes as you type. */
  ariaLabel: string;
  onPick: (place: PickedPlace) => void;
  types?: string[];
  exclude?: string[];
  autoFocus?: boolean;
  disabled?: boolean;
}

const GOOGLE_LOGO = import.meta.env.VITE_GOOGLE_LOGO || 'https://developers.google.com/static/maps/documentation/images/google_on_white.png';

// A Google place search with its results listed right under it, so a scrolling dialog can never clip them.
const PlaceSearchField: React.FC<PlaceSearchFieldProps> = ({
  placeholder, ariaLabel, onPick, types, exclude, autoFocus, disabled,
}) => {
  const theme = useTheme();
  const { query, setQuery, predictions, loading, available, pick, reset } = usePlacesAutocomplete({ types, exclude });
  const [active, setActive] = React.useState(0);
  const [picking, setPicking] = React.useState(false);
  const listId = React.useId();

  React.useEffect(() => setActive(0), [predictions]);

  const choose = async (p: PlacePrediction) => {
    if (picking) return;
    setPicking(true);
    try {
      onPick(await pick(p));
      reset();
    } finally {
      setPicking(false);
    }
  };

  const typedFallback = available === false && query.trim().length > 1;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && predictions.length) { e.preventDefault(); setActive((i) => (i + 1) % predictions.length); }
    else if (e.key === 'ArrowUp' && predictions.length) { e.preventDefault(); setActive((i) => (i - 1 + predictions.length) % predictions.length); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      // Enter belongs to the search here, not to the dialog's "next".
      e.stopPropagation();
      if (predictions[active]) void choose(predictions[active]);
      else if (typedFallback) { onPick(typedPlace(query)); reset(); }
    } else if (e.key === 'Escape' && query) { e.stopPropagation(); reset(); }
  };

  const open = query.trim().length > 0;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
          borderRadius: '14px',
          border: `1px solid ${theme.custom.surface.border}`,
          bgcolor: 'background.paper',
          transition: `border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}, box-shadow ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
          '&:focus-within': { borderColor: 'text.primary', boxShadow: `0 0 0 3px ${theme.custom.ring}` },
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Box sx={{ display: 'flex', color: 'text.secondary', flexShrink: 0 }}>
          {loading || picking ? <CircularProgress size={18} thickness={5} color="inherit" /> : <IconSearch size={19} stroke={2} />}
        </Box>
        <InputBase
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          inputProps={{
            'aria-label': ariaLabel,
            role: 'combobox',
            'aria-expanded': open && predictions.length > 0,
            'aria-controls': listId,
            'aria-autocomplete': 'list',
            autoComplete: 'off',
          }}
          sx={{ flex: 1, typography: 'body1' }}
        />
      </Box>

      {open && (
        <Box
          id={listId}
          role="listbox"
          sx={{ mt: 1, borderRadius: '14px', border: `1px solid ${theme.custom.surface.border}`, overflow: 'hidden', bgcolor: 'background.paper' }}
        >
          {predictions.map((p, i) => (
            <Box
              key={p.placeId}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => void choose(p)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1.1, cursor: 'pointer',
                bgcolor: i === active ? theme.custom.surface.hover : 'transparent',
                '& + &': { borderTop: `1px solid ${theme.custom.surface.border}` },
              }}
            >
              <Box sx={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: '50%', flexShrink: 0, bgcolor: theme.custom.surface.active, color: 'text.secondary' }}>
                {p.types.includes('country') ? <IconWorld size={16} stroke={1.9} /> : <IconMapPin size={16} stroke={1.9} />}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>{p.main}</Typography>
                {p.secondary && <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary' }}>{p.secondary}</Typography>}
              </Box>
            </Box>
          ))}

          {!loading && predictions.length === 0 && (
            <Typography variant="body2" sx={{ px: 1.5, py: 1.25, color: 'text.secondary' }}>
              {typedFallback ? `Press Enter to add "${query.trim()}"` : available === false ? 'Place search is not available right now.' : 'No places found. Try another spelling.'}
            </Typography>
          )}

          {predictions.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1.5, py: 0.75, borderTop: `1px solid ${theme.custom.surface.border}` }}>
              <Box component="img" src={GOOGLE_LOGO} alt="Powered by Google" sx={{ height: 12, opacity: 0.7 }} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default PlaceSearchField;
