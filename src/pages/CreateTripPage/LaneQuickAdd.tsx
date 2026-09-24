import React from 'react';
import { Box, ClickAwayListener, InputBase, Paper, Popper, Typography, useTheme } from '@mui/material';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import { usePlacesAutocomplete, type PlacePrediction } from '../../components/places/usePlacesAutocomplete';
import type { PickedPlace } from '../../components/places/pickedPlace';

export type QuickAddKind = 'place' | 'stay' | 'food';

interface LaneQuickAddProps {
  kind: QuickAddKind;
  /** The stop this lane belongs to: names the search and biases it to the right part of the world. */
  stopName: string;
  lat?: number;
  lng?: number;
  /** Tone of the lane, used for the focus ring so each lane still reads as itself. */
  tone: string;
  onAddPlace: (place: PickedPlace) => void;
  /** Whatever was typed, when Google has nothing to offer or the lane takes plain words. */
  onAddText: (name: string) => void;
  onClose: () => void;
  /** The fuller browse, for when somebody wants photos and a list rather than one quick line. */
  onOpenSheet?: () => void;
}

const PLACEHOLDER: Record<QuickAddKind, string> = {
  place: 'A place to see',
  stay: 'Hotel, hostel or flat',
  food: 'A dish or a place to eat',
};

const SEARCH_TYPES: Partial<Record<QuickAddKind, string[]>> = {
  place: ['establishment'],
  stay: ['lodging'],
};

/**
 * Add one thing to a lane without leaving the card: type, pick, it lands as a chip,
 * and the field stays open for the next one.
 */
const LaneQuickAdd: React.FC<LaneQuickAddProps> = ({
  kind, stopName, lat, lng, tone, onAddPlace, onAddText, onClose, onOpenSheet,
}) => {
  const theme = useTheme();
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [active, setActive] = React.useState(0);
  const [picking, setPicking] = React.useState(false);

  const searchable = kind !== 'food';
  const { query, setQuery, predictions, available, pick, reset } = usePlacesAutocomplete({
    types: SEARCH_TYPES[kind],
    bias: { lat, lng },
    limit: 5,
  });

  React.useEffect(() => setActive(0), [predictions]);

  const typed = query.trim();
  const open = searchable && predictions.length > 0;

  const choose = async (p: PlacePrediction) => {
    if (picking) return;
    setPicking(true);
    try {
      onAddPlace(await pick(p));
      reset();
      inputRef.current?.focus();
    } finally {
      setPicking(false);
    }
  };

  const addTyped = () => {
    if (!typed) return;
    onAddText(typed);
    reset();
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'ArrowDown' && predictions.length) { e.preventDefault(); setActive((i) => (i + 1) % predictions.length); return; }
    if (e.key === 'ArrowUp' && predictions.length) { e.preventDefault(); setActive((i) => (i - 1 + predictions.length) % predictions.length); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      // A highlighted suggestion wins; otherwise the words themselves are worth keeping.
      if (predictions[active]) void choose(predictions[active]);
      else addTyped();
    }
  };

  return (
    <ClickAwayListener onClickAway={() => { if (!typed) onClose(); }}>
      <Box ref={wrapRef} sx={{ display: 'inline-flex', flexDirection: 'column', minWidth: { xs: '100%', sm: 240 } }}>
        <Box
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5, height: 28, px: 1,
            borderRadius: '999px', border: `1.5px solid ${tone}`, bgcolor: 'background.paper',
          }}
        >
          <IconSearch size={13} stroke={2} style={{ color: theme.palette.text.disabled, flexShrink: 0 }} />
          <InputBase
            inputRef={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={PLACEHOLDER[kind]}
            inputProps={{ 'aria-label': `Add to ${stopName}` }}
            sx={{ flex: 1, minWidth: 0, fontSize: 12.5, '& input': { p: 0 } }}
          />
          {typed && (
            <Box
              component="button"
              type="button"
              aria-label="Add it"
              onClick={() => { if (predictions[active]) void choose(predictions[active]); else addTyped(); }}
              sx={{
                display: 'inline-flex', border: 0, p: 0, bgcolor: 'transparent', color: tone, cursor: 'pointer', flexShrink: 0,
                '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2, borderRadius: '50%' },
              }}
            >
              <IconArrowRight size={14} stroke={2.2} />
            </Box>
          )}
        </Box>

        <Popper open={open} anchorEl={wrapRef.current} placement="bottom-start" style={{ zIndex: 1300 }}>
          <Paper elevation={6} sx={{ mt: 0.5, borderRadius: '12px', overflow: 'hidden', minWidth: 260, maxWidth: 340 }}>
            {predictions.map((p, i) => (
              <Box
                key={p.placeId}
                component="button"
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => void choose(p)}
                sx={{
                  display: 'block', width: '100%', textAlign: 'left', border: 0, cursor: 'pointer',
                  px: 1.5, py: 1, font: 'inherit',
                  bgcolor: i === active ? theme.custom.surface.hover : 'transparent',
                }}
              >
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{p.main}</Typography>
                {p.secondary && <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary' }}>{p.secondary}</Typography>}
              </Box>
            ))}
          </Paper>
        </Popper>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1.25, pt: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {searchable && available === false ? 'Type it and press Enter' : 'Enter adds, Esc closes'}
          </Typography>
          {onOpenSheet && (
            <Box
              component="button"
              type="button"
              onClick={onOpenSheet}
              sx={{
                border: 0, p: 0, bgcolor: 'transparent', font: 'inherit', fontSize: 11.5, fontWeight: 600,
                color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'text.primary' },
              }}
            >
              Browse ideas
            </Box>
          )}
        </Box>
      </Box>
    </ClickAwayListener>
  );
};

export default LaneQuickAdd;
