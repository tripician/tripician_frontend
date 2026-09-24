import React from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, TextField, Typography, useTheme } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import {
  IconCalendarEvent, IconCheck, IconMapPin, IconMinus, IconPencil, IconPlaneDeparture, IconPlus,
  IconToolsKitchen2, IconUsers, IconWorld, IconX,
} from '@tabler/icons-react';
import PlaceSearchField from '../../places/PlaceSearchField';
import type { PickedPlace } from '../../places/pickedPlace';
import TripicianAIOrb from '../../../tripicianai/TripicianAIOrb';
import { DIETARY_OPTIONS, TRIP_TYPE_OPTIONS, dietaryLabel, tripTypeLabel, type PreferenceOption } from '../preferenceOptions';
import {
  MAX_NIGHTS, MAX_PLACES, canContinue, endDateFor, placesLine, tripNameFor,
  type CreateMode, type NewTripAction, type NewTripState,
} from './newTripFlow';

export interface StepProps {
  state: NewTripState;
  dispatch: React.Dispatch<NewTripAction>;
  autoFocus: boolean;
}

// Street-level results make no sense for "where are you going".
const NOT_A_DESTINATION = ['street_address', 'route', 'premise', 'subpremise', 'street_number', 'postal_code', 'plus_code'];

/** The frame every question shares: an icon, the question, a plain hint, the answer area and the buttons. */
const StepShell: React.FC<{
  Icon: React.ElementType;
  question: string;
  hint?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}> = ({ Icon, question, hint, children, footer }) => {
  const theme = useTheme();
  return (
    // Grows to fill the dialog so the buttons sit in the same place on every step.
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto', px: { xs: 2.5, sm: 4 }, pb: { xs: 2.5, sm: 3 } }}>
      <Box sx={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '16px', bgcolor: theme.custom.surface.active, color: 'text.primary' }}>
        <Icon size={24} stroke={1.8} />
      </Box>
      <Typography variant="h4" component="h2" sx={{ mt: 2, lineHeight: 1.15 }}>{question}</Typography>
      {hint && <Typography variant="body1" sx={{ mt: 0.75, color: 'text.secondary' }}>{hint}</Typography>}
      <Box sx={{ mt: 3, flex: 1 }}>{children}</Box>
      <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{footer}</Box>
    </Box>
  );
};

const NextButton: React.FC<{ state: NewTripState; dispatch: React.Dispatch<NewTripAction> }> = ({ state, dispatch }) => (
  <Button variant="contained" size="large" disabled={!canContinue(state)} onClick={() => dispatch({ type: 'next' })} sx={{ ml: 'auto', minWidth: 132 }}>
    Next
  </Button>
);

const TextAction: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <Button variant="text" onClick={onClick} sx={{ color: 'text.secondary', px: 1, '&:hover': { color: 'text.primary' } }}>
    {children}
  </Button>
);

/** A picked place as a removable pill. */
const PlacePill: React.FC<{ place: PickedPlace; onRemove: () => void }> = ({ place, onRemove }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, pl: 1.25, pr: 0.5, py: 0.5, borderRadius: '999px', border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper', maxWidth: '100%' }}>
      <Box sx={{ display: 'flex', color: 'text.secondary', flexShrink: 0 }}>
        {place.kind === 'country' ? <IconWorld size={16} stroke={1.9} /> : <IconMapPin size={16} stroke={1.9} />}
      </Box>
      <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>{place.name}</Typography>
      {place.detail && <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' }, minWidth: 0 }}>{place.detail}</Typography>}
      <IconButton size="small" aria-label={`Remove ${place.name}`} onClick={onRemove} sx={{ p: 0.5, color: 'text.secondary' }}>
        <IconX size={15} />
      </IconButton>
    </Box>
  );
};

export const OriginStep: React.FC<StepProps> = ({ state, dispatch, autoFocus }) => (
  <StepShell
    Icon={IconPlaneDeparture}
    question="Where are you starting from?"
    hint="We use this to plan the way there and back."
    footer={(
      <>
        <TextAction onClick={() => dispatch({ type: 'goBlank' })}>I'll plan everything myself</TextAction>
        <NextButton state={state} dispatch={dispatch} />
      </>
    )}
  >
    {state.origin ? (
      <PlacePill place={state.origin} onRemove={() => dispatch({ type: 'setOrigin', place: null })} />
    ) : (
      <PlaceSearchField
        ariaLabel="Your starting city"
        placeholder="Your city"
        types={['(cities)']}
        autoFocus={autoFocus}
        onPick={(place) => { dispatch({ type: 'setOrigin', place }); dispatch({ type: 'next' }); }}
      />
    )}
  </StepShell>
);

export const PlacesStep: React.FC<StepProps> = ({ state, dispatch, autoFocus }) => (
  <StepShell
    Icon={IconMapPin}
    question="Where do you want to go?"
    hint="Add one place or a few. You can change them later."
    footer={(
      <>
        <TextAction onClick={() => dispatch({ type: 'goBlank' })}>I'll plan everything myself</TextAction>
        <NextButton state={state} dispatch={dispatch} />
      </>
    )}
  >
    {state.places.length > 0 && (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {state.places.map((p) => (
          <PlacePill key={p.placeId} place={p} onRemove={() => dispatch({ type: 'removePlace', placeId: p.placeId })} />
        ))}
      </Box>
    )}
    {state.places.length < MAX_PLACES ? (
      <PlaceSearchField
        ariaLabel="A place you want to go"
        placeholder={state.places.length ? 'Add another place' : 'A city, region or country'}
        types={['geocode', 'establishment']}
        exclude={NOT_A_DESTINATION}
        autoFocus={autoFocus}
        onPick={(place) => dispatch({ type: 'addPlace', place })}
      />
    ) : (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>That is plenty for now. Add more inside the planner.</Typography>
    )}
  </StepShell>
);

const nextSaturday = () => {
  const today = dayjs();
  const add = (6 - today.day() + 7) % 7 || 7;
  return today.add(add, 'day').format('YYYY-MM-DD');
};

const QUICK_DATES: { label: string; value: () => string }[] = [
  { label: 'Next weekend', value: nextSaturday },
  { label: 'Next month', value: () => dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD') },
  { label: 'In 3 months', value: () => dayjs().add(3, 'month').startOf('month').format('YYYY-MM-DD') },
];

export const DatesStep: React.FC<StepProps & { onCreate: (mode: CreateMode) => void; busy: CreateMode | null; error: string | null }> = ({
  state, dispatch, onCreate, busy, error,
}) => {
  const theme = useTheme();
  const back = endDateFor(state.startDate, state.nights);
  return (
    <StepShell
      Icon={IconCalendarEvent}
      question={state.blank ? 'When is your trip?' : 'When are you going?'}
      hint="A rough guess is fine. You can change it later."
      footer={state.blank ? (
        <Button
          variant="contained"
          size="large"
          disabled={!canContinue(state) || busy !== null}
          onClick={() => onCreate('blank')}
          sx={{ ml: 'auto', minWidth: 170 }}
          startIcon={busy === 'blank' ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Create my trip
        </Button>
      ) : <NextButton state={state} dispatch={dispatch} />}
    >
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {QUICK_DATES.map((q) => {
          const value = q.value();
          const on = state.startDate === value;
          return (
            <Button
              key={q.label}
              size="small"
              onClick={() => dispatch({ type: 'setStart', date: value })}
              sx={{
                borderRadius: '999px', px: 1.75,
                border: `1px solid ${on ? theme.palette.text.primary : theme.custom.surface.border}`,
                bgcolor: on ? 'text.primary' : 'transparent',
                color: on ? 'background.paper' : 'text.primary',
                '&:hover': { bgcolor: on ? 'text.primary' : theme.custom.surface.hover },
              }}
            >
              {q.label}
            </Button>
          );
        })}
      </Box>

      <DatePicker
        label="Leaving on"
        format="ddd, D MMM YYYY"
        value={state.startDate ? dayjs(state.startDate) : null}
        onChange={(v) => dispatch({ type: 'setStart', date: v && v.isValid() ? v.format('YYYY-MM-DD') : null })}
        disablePast
        slotProps={{ textField: { fullWidth: true } }}
      />

      <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>How many nights?</Typography>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, border: `1px solid ${theme.custom.surface.border}`, borderRadius: '999px', p: 0.5 }}>
          <IconButton aria-label="One night fewer" size="small" disabled={state.nights <= 1} onClick={() => dispatch({ type: 'setNights', nights: state.nights - 1 })}>
            <IconMinus size={18} />
          </IconButton>
          <Typography variant="h6" component="span" aria-live="polite" sx={{ minWidth: 36, textAlign: 'center', fontFamily: 'inherit' }}>{state.nights}</Typography>
          <IconButton aria-label="One more night" size="small" disabled={state.nights >= MAX_NIGHTS} onClick={() => dispatch({ type: 'setNights', nights: state.nights + 1 })}>
            <IconPlus size={18} />
          </IconButton>
        </Box>
      </Box>

      {back && (
        <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
          {`Back on ${dayjs(back).format('ddd, D MMM YYYY')}`}
        </Typography>
      )}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </StepShell>
  );
};

/** Big tappable answers. Picking one moves on by itself; picking it again clears it. */
function ChoiceTiles<T extends string>({ options, value, onChange }: { options: PreferenceOption<T>[]; value: T | null; onChange: (v: T | null, advance: boolean) => void }) {
  const theme = useTheme();
  return (
    <Box role="radiogroup" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Box
            key={o.value}
            component="button"
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? null : o.value, !on)}
            sx={{
              position: 'relative', textAlign: 'left', font: 'inherit', cursor: 'pointer',
              p: 1.5, borderRadius: '16px',
              border: `${on ? 2 : 1}px solid ${on ? theme.palette.text.primary : theme.custom.surface.border}`,
              m: on ? 0 : '1px',
              bgcolor: on ? theme.custom.surface.hover : 'background.paper',
              color: 'text.primary',
              transition: `transform ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}, border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
              '&:hover': { borderColor: 'text.primary' },
              '&:active': { transform: 'scale(0.97)' },
              '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
            }}
          >
            <o.Icon size={24} stroke={1.8} />
            <Typography variant="body1" sx={{ fontWeight: 700, mt: 1 }}>{o.label}</Typography>
            {o.hint && <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{o.hint}</Typography>}
            {on && (
              <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', bgcolor: 'text.primary', color: 'background.paper' }}>
                <IconCheck size={13} stroke={3} />
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// A short pause after a tap, so the tick is seen before the screen moves on.
const useAdvance = (dispatch: React.Dispatch<NewTripAction>) => {
  const timer = React.useRef<number | null>(null);
  React.useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  return () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => dispatch({ type: 'next' }), 260);
  };
};

export const TripTypeStep: React.FC<StepProps> = ({ state, dispatch }) => {
  const advance = useAdvance(dispatch);
  return (
    <StepShell
      Icon={IconUsers}
      question="What kind of trip is it?"
      hint="So TripicianAI picks places that suit you."
      footer={(
        <>
          <TextAction onClick={() => { dispatch({ type: 'setTripType', value: null }); dispatch({ type: 'next' }); }}>Skip</TextAction>
          <NextButton state={state} dispatch={dispatch} />
        </>
      )}
    >
      <ChoiceTiles options={TRIP_TYPE_OPTIONS} value={state.tripType} onChange={(v, go) => { dispatch({ type: 'setTripType', value: v }); if (go) advance(); }} />
    </StepShell>
  );
};

export const FoodStep: React.FC<StepProps> = ({ state, dispatch }) => {
  const advance = useAdvance(dispatch);
  return (
    <StepShell
      Icon={IconToolsKitchen2}
      question="Any food needs?"
      hint="We only suggest food you can eat."
      footer={(
        <>
          <TextAction onClick={() => { dispatch({ type: 'setDietary', value: null }); dispatch({ type: 'next' }); }}>Skip</TextAction>
          <NextButton state={state} dispatch={dispatch} />
        </>
      )}
    >
      <ChoiceTiles options={DIETARY_OPTIONS} value={state.dietary} onChange={(v, go) => { dispatch({ type: 'setDietary', value: v }); if (go) advance(); }} />
    </StepShell>
  );
};

/** One of the two ways to start: a big card with a line saying what happens. */
const StartChoice: React.FC<{ icon: React.ReactNode; title: string; body: string; onClick: () => void; busy: boolean; disabled: boolean; primary?: boolean }> = ({
  icon, title, body, onClick, busy, disabled, primary,
}) => {
  const theme = useTheme();
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', textAlign: 'left', font: 'inherit',
        p: 2, borderRadius: '18px', cursor: disabled ? 'default' : 'pointer',
        border: `1px solid ${primary ? theme.palette.text.primary : theme.custom.surface.border}`,
        bgcolor: primary ? 'text.primary' : 'background.paper',
        color: primary ? 'background.paper' : 'text.primary',
        opacity: disabled && !busy ? 0.55 : 1,
        transition: `transform ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:hover': disabled ? undefined : { transform: 'translateY(-1px)' },
        '&:active': disabled ? undefined : { transform: 'scale(0.99)' },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
      }}
    >
      <Box sx={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 44, height: 44 }}>
        {busy ? <CircularProgress size={22} color="inherit" /> : icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography variant="body2" sx={{ opacity: 0.75 }}>{body}</Typography>
      </Box>
    </Box>
  );
};

export const FinishStep: React.FC<StepProps & { onCreate: (mode: CreateMode) => void; busy: CreateMode | null; error: string | null; groupName: string | null }> = ({
  state, dispatch, onCreate, busy, error, groupName,
}) => {
  const theme = useTheme();
  const when = state.startDate ? `${dayjs(state.startDate).format('D MMM')}, ${state.nights} ${state.nights === 1 ? 'night' : 'nights'}` : null;
  const extras = [tripTypeLabel(state.tripType), dietaryLabel(state.dietary)].filter(Boolean).join(' · ');
  const rows: { Icon: React.ElementType; text: string }[] = [
    ...(state.origin ? [{ Icon: IconPlaneDeparture, text: `From ${state.origin.name}` }] : []),
    { Icon: IconMapPin, text: placesLine(state.places) },
    ...(when ? [{ Icon: IconCalendarEvent, text: when }] : []),
    ...(extras ? [{ Icon: IconUsers, text: extras }] : []),
  ];

  return (
    <StepShell
      Icon={IconCheck}
      question="All set. How do you want to plan?"
      hint={groupName ? `This plan is for ${groupName}.` : undefined}
      footer={null}
    >
      <Box sx={{ display: 'grid', gap: 0.75, p: 1.75, borderRadius: '16px', bgcolor: theme.custom.surface.hover }}>
        {rows.map((r) => (
          <Box key={r.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Box sx={{ display: 'flex', color: 'text.secondary', flexShrink: 0 }}><r.Icon size={17} stroke={1.9} /></Box>
            <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>{r.text}</Typography>
          </Box>
        ))}
      </Box>

      <TextField
        label="Trip name"
        value={tripNameFor(state)}
        onChange={(e) => dispatch({ type: 'setName', name: e.target.value })}
        fullWidth
        sx={{ mt: 2.5 }}
        inputProps={{ maxLength: 160 }}
      />

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gap: 1.25, mt: 2.5 }}>
        <StartChoice
          primary
          icon={<TripicianAIOrb size={30} />}
          title="Plan it for me"
          body="TripicianAI adds places to see, food to try and tips for each stop. Uses trip credits."
          onClick={() => onCreate('ai')}
          busy={busy === 'ai'}
          disabled={busy !== null}
        />
        <StartChoice
          icon={<IconPencil size={24} stroke={1.8} />}
          title="I'll plan it myself"
          body="Your places are added as stops. Fill them in your way."
          onClick={() => onCreate('self')}
          busy={busy === 'self'}
          disabled={busy !== null}
        />
      </Box>
    </StepShell>
  );
};
