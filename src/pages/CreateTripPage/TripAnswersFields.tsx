import React from 'react';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import { IconPlaneDeparture, IconX } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { setTripPreferences } from '../../store/plannerSlice';
import PlaceSearchField from '../../components/places/PlaceSearchField';
import { FilterChip } from '../../components/ui/FilterChip';
import { DIETARY_OPTIONS, TRIP_TYPE_OPTIONS } from '../../components/CreateTripComponents/preferenceOptions';
import { companyForTripType, type TripPreferences } from '../../utils/tripPreferences';

// The answers from the new trip flow, editable later. They live in the planner store, so the plan's autosave carries them.
const useAnswers = () => {
  const dispatch = useDispatch<AppDispatch>();
  const prefs = useSelector((s: RootState) => s.planner.preferences);
  const update = (patch: Partial<TripPreferences>) => {
    const next: TripPreferences = { interests: [], ...prefs, ...patch };
    (Object.keys(next) as (keyof TripPreferences)[]).forEach((k) => { if (next[k] === undefined) delete next[k]; });
    dispatch(setTripPreferences(next));
  };
  return { prefs, update };
};

export const OriginField: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const theme = useTheme();
  const { prefs, update } = useAnswers();
  const origin = prefs?.origin;
  if (origin) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, pl: 1.25, pr: 0.5, py: 0.5, borderRadius: '999px', border: `1px solid ${theme.custom.surface.border}` }}>
        <IconPlaneDeparture size={16} stroke={1.9} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{origin.country ? `${origin.name}, ${origin.country}` : origin.name}</Typography>
        {!disabled && (
          <IconButton size="small" aria-label="Change starting city" onClick={() => update({ origin: undefined })} sx={{ p: 0.5 }}>
            <IconX size={15} />
          </IconButton>
        )}
      </Box>
    );
  }
  return (
    <PlaceSearchField
      ariaLabel="Starting city"
      placeholder="Where does the trip start?"
      types={['(cities)']}
      disabled={disabled}
      onPick={(p) => update({
        origin: {
          name: p.name,
          ...(p.lat !== undefined && p.lng !== undefined && { lat: p.lat, lng: p.lng }),
          ...(!p.placeId.startsWith('typed:') && { placeId: p.placeId }),
          ...(p.country && { country: p.country }),
        },
      })}
    />
  );
};

export const TripTypeField: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const { prefs, update } = useAnswers();
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {TRIP_TYPE_OPTIONS.map((o) => (
        <FilterChip
          key={o.value}
          label={o.label}
          Icon={o.Icon}
          active={prefs?.tripType === o.value}
          onClick={() => {
            if (disabled) return;
            const on = prefs?.tripType === o.value;
            update(on ? { tripType: undefined, company: undefined } : { tripType: o.value, company: companyForTripType(o.value) });
          }}
        />
      ))}
    </Box>
  );
};

export const FoodField: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const { prefs, update } = useAnswers();
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {DIETARY_OPTIONS.map((o) => (
        <FilterChip
          key={o.value}
          label={o.label}
          Icon={o.Icon}
          active={prefs?.dietary === o.value}
          onClick={() => { if (!disabled) update({ dietary: prefs?.dietary === o.value ? undefined : o.value }); }}
        />
      ))}
    </Box>
  );
};
