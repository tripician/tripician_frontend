import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Autocomplete,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useNavigate } from 'react-router-dom';
import { IconX, IconArrowRight } from '@tabler/icons-react';
import Alert from '@mui/material/Alert';
import gsap from 'gsap';
import { VIBES } from '../../pages/CommunityPage/vibes';
import { COUNTRIES } from '../../utils/countries';
import NaviaOrb from '../../navia/NaviaOrb';
import { scheduleFeedbackPrompt } from '../../utils/feedbackPrompt';
import FilterChip from '../ui/FilterChip';
import type { Organization } from '../../organization/types';
import SegmentedControl from '../ui/SegmentedControl';
import {
  DEFAULT_TRIP_PREFERENCES,
  type TripCompany,
  type TripDietary,
  type TripPace,
} from '../../utils/tripPreferences';
import {
  COMPANY_OPTIONS,
  DIETARY_OPTIONS,
  INTEREST_OPTIONS,
  PACE_OPTIONS,
} from './preferenceOptions';

interface TripCreationModalProps {
  open: boolean;
  onClose: () => void;
  /** Prefill, used when a failed chat-to-trip hands its extract over to the form. */
  initial?: {
    name?: string;
    countries?: string[];
    vibe?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  };
}


const VIBE_IDS = Object.keys(VIBES);

/** A name the traveler will actually keep, editable, never demanded. */
const suggestTripName = (countries: string[]): string => {
  if (countries.length === 0) return '';
  if (countries.length === 1) return `Trip to ${countries[0]}`;
  if (countries.length === 2) return `${countries[0]} & ${countries[1]}`;
  return `${countries[0]}, ${countries[1]} & beyond`;
};

const AI_LOADING_MESSAGES = [
  'Sketching your route…',
  'Matching places to your travel style…',
  'Finding the meals worth travelling for…',
  'Noting the details most planners miss…',
  'Adding the finishing touches…',
];

/**
 * Zone divider: a short uppercase kicker with a hairline running out from it.
 *
 * The two zones ask for different kinds of thing, so they need to look like
 * different kinds of thing. Without this the form was one undifferentiated stack
 * of labels, which is what made a longer version of it feel like a chore.
 */
const ZoneHeading: React.FC<{ label: string; sx?: object }> = ({ label, sx }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ...sx }}>
    <Typography variant="overline" sx={{ color: 'text.disabled', lineHeight: 1, whiteSpace: 'nowrap' }}>
      {label}
    </Typography>
    <Box sx={(t) => ({ flex: 1, height: '1px', bgcolor: t.custom.surface.border })} />
  </Box>
);

/**
 * One mood question. The question carries the weight, the control sits under it.
 *
 * Asked in plain language rather than labelled `PACE · OPTIONAL`, because the point
 * of this half of the dialog is to read as someone asking rather than a form
 * demanding. The `hint` slot is where the consequence of the answer goes, which is
 * the only reason anyone would bother reading past the first option.
 */
const Question: React.FC<{
  question: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ question, hint, children }) => (
  <Box>
    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.35 }}>
      {question}
    </Typography>
    <Box sx={{ mt: 1.1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>{children}</Box>
    {hint && (
      <Typography sx={{ mt: 0.85, fontSize: '0.75rem', lineHeight: 1.45, color: 'text.disabled' }}>
        {hint}
      </Typography>
    )}
  </Box>
);

const TripCreationModal: React.FC<TripCreationModalProps> = ({ open, onClose, initial }) => {
  const theme = useTheme();
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const atLeastSm = useMediaQuery(theme.breakpoints.up('sm'));
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [tripName, setTripName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [vibe, setVibe] = useState<string | null>(null);
  // Every mood question opens on an answer, so none of them can hold up the
  // button and every trip still arrives carrying real values instead of nulls.
  const [pace, setPace] = useState<TripPace>(DEFAULT_TRIP_PREFERENCES.pace);
  const [company, setCompany] = useState<TripCompany>(DEFAULT_TRIP_PREFERENCES.company);
  const [interests, setInterests] = useState<string[]>(DEFAULT_TRIP_PREFERENCES.interests);
  const [dietary, setDietary] = useState<TripDietary>(DEFAULT_TRIP_PREFERENCES.dietary);
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; countries?: string; dates?: string }>({});
  // Only organisations this person can actually run trips for. Empty for almost
  // everybody, and the control stays hidden in that case.
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState<string>('');
  const { token } = useAuthToken();
  const navigate = useNavigate();

  const modalBoxRef = useRef<HTMLDivElement>(null);

  // Destination leads; the name follows it until the traveler makes it their own.
  const handleCountryChange = (_: unknown, newValue: string[]) => {
    setSelectedCountries(newValue);
    if (!nameEdited) setTripName(suggestTripName(newValue));
    if (newValue.length > 0) setFieldErrors(prev => ({ ...prev, countries: undefined }));
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTripName(event.target.value);
    setNameEdited(event.target.value.trim().length > 0);
    if (event.target.value.trim()) setFieldErrors(prev => ({ ...prev, name: undefined }));
  };

  const toggleInterest = (value: string) => {
    setInterests(prev => (prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]));
  };

  const validate = () => {
    const errs: { name?: string; countries?: string; dates?: string } = {};
    if (selectedCountries.length === 0) errs.countries = 'Pick at least one destination';
    if (!tripName.trim()) errs.name = 'Give your trip a name';
    if (startDate && endDate && endDate.isBefore(startDate, 'day')) errs.dates = 'End date must be after start date';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = (generateWithAI: boolean) => ({
    name: tripName.trim(),
    description: '',
    countries: selectedCountries,
    startDate: startDate ? startDate.format('YYYY-MM-DD') : null,
    endDate: endDate ? endDate.format('YYYY-MM-DD') : null,
    visibility: 0, // trips start private; publishing is an explicit later step
    currencyCode: 'USD',
    vibe,
    invites: [] as string[],
    // Every new trip opens in the simple planner - the reviews that prompted this
    // ("from where should I start?") all came from the first five minutes.
    plannerMode: 'Easy' as const,
    // The whole reason this dialog exists. Stored on the trip at creation and read
    // server-side by every generative call, so the first draft is already informed
    // rather than being corrected afterwards.
    preferences: { pace, company, interests, dietary },
    ...(organizationId ? { organizationId } : {}),
    ...(generateWithAI ? { generateWithAI: true } : {}),
  });

  const reportError = (err: any) => {
    if (err?.code === 'ERR_NETWORK') {
      setErrorMsg(`Cannot reach server at ${apiBase}. Make sure the backend is running and accessible (network / certificate).`);
    } else if (err?.response) {
      setErrorMsg(err.response.data?.message || `Server error (${err.response.status}). Please try again.`);
    } else {
      setErrorMsg('Something went wrong creating your trip. Please try again.');
    }
  };

  const createAndOpen = async (generateWithAI: boolean) => {
    if (!token) {
      setErrorMsg('You must be signed in.');
      return;
    }
    if (!validate()) return;
    setErrorMsg(null);

    let messageInterval: ReturnType<typeof setInterval> | undefined;
    if (generateWithAI) {
      setAiGenerating(true);
      setAiMessage(AI_LOADING_MESSAGES[0]);
      let messageIndex = 0;
      messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % AI_LOADING_MESSAGES.length;
        setAiMessage(AI_LOADING_MESSAGES[messageIndex]);
      }, 2000);
    } else {
      setSubmitting(true);
    }

    try {
      const createResp = await apiServices.createTrip(token, buildPayload(generateWithAI));
      // Backend may return id as id, Id, or tripId depending on DTO serialization
      const createdId: string | undefined = createResp?.data?.id || createResp?.data?.Id || createResp?.data?.tripId;
      if (!createdId) throw new Error('Trip created but no id returned');

      const tripResp = await apiServices.getTripById(token, createdId);
      const tripData = tripResp.data;

      if (messageInterval) clearInterval(messageInterval);
      handleClose();
      // One of the two moments that can nudge a first-time user toward feedback -
      // see utils/feedbackPrompt.ts. A no-op after the first trip ever created.
      scheduleFeedbackPrompt('trip_created');
      navigate(`/tripplanner/${createdId}`, {
        state: { tripId: createdId, trip: tripData, ...(generateWithAI ? { aiGenerated: true } : {}) },
      });
    } catch (err: any) {
      if (messageInterval) clearInterval(messageInterval);
      console.error('[CreateTripModal] createTrip failed', err);
      reportError(err);
    } finally {
      setSubmitting(false);
      setAiGenerating(false);
      setAiMessage('');
    }
  };

  const resetForm = () => {
    setSelectedCountries([]);
    setTripName('');
    setNameEdited(false);
    setStartDate(null);
    setEndDate(null);
    setVibe(null);
    setPace(DEFAULT_TRIP_PREFERENCES.pace);
    setCompany(DEFAULT_TRIP_PREFERENCES.company);
    setInterests(DEFAULT_TRIP_PREFERENCES.interests);
    setDietary(DEFAULT_TRIP_PREFERENCES.dietary);
    setOrganizationId('');
    setFieldErrors({});
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Prefill on open. The only caller is the chat-to-trip fallback, which used to
  // open this form blank and throw away everything Navia had already read out of
  // the conversation.
  useEffect(() => {
    if (!open || !initial) return;
    if (initial.countries?.length) setSelectedCountries(initial.countries);
    if (initial.name) { setTripName(initial.name); setNameEdited(true); }
    if (initial.vibe) setVibe(initial.vibe);
  }, [open, initial]);

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    apiServices.getMyOrganizations(token)
      .then((resp) => {
        if (cancelled) return;
        setOrganizations((Array.isArray(resp.data) ? resp.data : [])
          .filter((o) => o.myRole === 'admin' && o.status === 'approved'));
      })
      .catch(() => { if (!cancelled) setOrganizations([]); });
    return () => { cancelled = true; };
  }, [open, token]);

  // GSAP: modal entrance. The context is scoped to the panel so `.gs-modal-field`
  // matches only this instance's fields - the selector is global otherwise, and
  // more than one of these can be mounted at a time.
  useEffect(() => {
    if (!open) return;
    const ctx = gsap.context(() => {
      gsap.from(modalBoxRef.current, {
        scale: 0.92, opacity: 0, duration: 0.45, ease: 'back.out(1.4)',
      });
      gsap.from('.gs-modal-field', {
        y: 18, opacity: 0, duration: 0.4, stagger: 0.07, delay: 0.15, ease: 'power2.out',
      });
    }, modalBoxRef);
    return () => ctx.revert();
  }, [open]);

  const canFinish = tripName.trim().length > 0 && selectedCountries.length > 0;
  const busy = submitting || aiGenerating;
  const paceEffect = PACE_OPTIONS.find(o => o.value === pace)?.effect;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      fontSize: '0.92rem',
      backgroundColor: theme.palette.background.default,
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main, borderWidth: '1.5px' },
    },
  };

  const labelSx = {
    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase' as const, color: 'text.disabled', mb: 1,
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1, md: 2 } }}
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box
          ref={modalBoxRef}
          sx={{
            width: { xs: '96vw', sm: '560px' },
            maxWidth: '96vw',
            maxHeight: '94vh',
            bgcolor: 'background.paper',
            borderRadius: '20px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: theme.custom?.shadows?.overlay ?? '0 32px 80px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Loading overlay */}
          {busy && (
            <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, backdropFilter: 'blur(3px)', background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Box sx={{ width: 44, height: 44, position: 'relative' }}>
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid', borderColor: 'divider' }} />
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: 'primary.main', animation: 'spin 0.85s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
              </Box>
              <Typography sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.88rem', textAlign: 'center', maxWidth: 280 }}>
                {aiGenerating ? aiMessage : 'Opening your planner…'}
              </Typography>
            </Box>
          )}

          {/*
            Scroll region. The scrollbar used to be hidden inside a 94vh panel with
            the buttons at the bottom of the scrolled content, so on a phone there
            was no signal that anything continued below the fold and no way to reach
            the CTA without discovering the scroll. It is now a thin visible bar and
            the actions are pinned outside this box.
          */}
          <Box sx={(t) => ({
            p: { xs: '22px 18px 18px', md: '28px 32px 24px' },
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            display: 'flex', flexDirection: 'column',
            flex: 1,
            scrollbarWidth: 'thin',
            scrollbarColor: `${t.custom.surface.active} transparent`,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: t.custom.surface.active, borderRadius: 3 },
          })}>

            {/* Header */}
            <Box className="gs-modal-field" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 3 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.55rem', md: '1.85rem' }, color: 'text.primary', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                  Where to next?
                </Typography>
                {/*
                  This used to say a destination was all it takes and everything else
                  could wait. That is no longer true, and saying it was the reason
                  people skipped the fields that most improve their first draft. The
                  line now states the trade instead: answer more, get a closer plan.
                */}
                <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.5, color: 'text.secondary', mt: 0.75 }}>
                  Your answers decide which places Navia picks, what it suggests you eat,
                  and how much it fits into a day.
                </Typography>
              </Box>
              <IconButton onClick={handleClose} size="small" sx={{ color: 'text.disabled', mt: 0.5, flexShrink: 0, '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>
                <IconX size={18} />
              </IconButton>
            </Box>

            {errorMsg && (
              <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2, borderRadius: '12px' }}>{errorMsg}</Alert>
            )}

            {/* ── Zone 1: the facts ─────────────────────────────────────────── */}
            <ZoneHeading label="The basics" sx={{ mb: 2 }} />

            {/* Destination, the one thing we insist on */}
            <Box className="gs-modal-field" sx={{ mb: 2.25 }}>
              <Typography sx={labelSx}>Destination</Typography>
              <Autocomplete
                multiple
                options={COUNTRIES}
                value={selectedCountries}
                onChange={handleCountryChange}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        label={option}
                        {...tagProps}
                        size="small"
                        sx={{ bgcolor: 'text.primary', color: 'background.paper', fontWeight: 600, fontSize: '0.72rem', '& .MuiChip-deleteIcon': { color: 'inherit', opacity: 0.7, '&:hover': { opacity: 1, color: 'inherit' } } }}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={selectedCountries.length === 0 ? 'Japan, Italy, Peru…' : 'Add another country'}
                    variant="outlined"
                    /* Focusing on a phone throws the keyboard over a panel that is
                       already 94vh, hiding the form the moment it opens. */
                    autoFocus={atLeastSm}
                    error={!!fieldErrors.countries}
                    helperText={fieldErrors.countries}
                    sx={fieldSx}
                  />
                )}
              />
            </Box>

            {/* Trip name, pre-filled, theirs to change */}
            <Box className="gs-modal-field" sx={{ mb: 2.25 }}>
              <Typography sx={labelSx}>Trip name</Typography>
              <TextField
                placeholder="We'll suggest one from your destination"
                value={tripName}
                onChange={handleNameChange}
                fullWidth
                variant="outlined"
                error={!!fieldErrors.name}
                helperText={fieldErrors.name}
                sx={fieldSx}
              />
            </Box>

            {/* Dates */}
            <Box className="gs-modal-field" sx={{ mb: 3.5 }}>
              <Typography sx={labelSx}>When</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 1.5 } }}>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  slotProps={{ textField: { placeholder: 'Start date', fullWidth: true, sx: fieldSx } }}
                />
                <DatePicker
                  value={endDate}
                  minDate={startDate || undefined}
                  onChange={setEndDate}
                  slotProps={{ textField: { placeholder: 'End date', fullWidth: true, sx: fieldSx } }}
                />
              </Box>
              {fieldErrors.dates
                ? <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, display: 'block' }}>{fieldErrors.dates}</Typography>
                : (
                  /* Not marked optional any more, because the month is what lets
                     Navia route around a monsoon or a closed season. Rough dates
                     genuinely help, and you can still move them later. */
                  <Typography sx={{ mt: 0.85, fontSize: '0.75rem', lineHeight: 1.45, color: 'text.disabled' }}>
                    Rough dates are fine, and you can change them later. The month is
                    what lets Navia plan around the season.
                  </Typography>
                )}
            </Box>

            {/* ── Zone 2: the mood ──────────────────────────────────────────── */}
            <ZoneHeading label="How you travel" sx={{ mb: 1.25 }} />
            <Typography className="gs-modal-field" sx={{ fontSize: '0.8rem', lineHeight: 1.5, color: 'text.secondary', mb: 2.5 }}>
              Four quick answers, already filled in with the usual case. Change the ones
              that are wrong for this trip.
            </Typography>

            <Box className="gs-modal-field" sx={{ display: 'flex', flexDirection: 'column', gap: 2.75 }}>
              <Question question="How full should the days be?" hint={paceEffect}>
                <SegmentedControl
                  options={PACE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  value={pace}
                  onChange={setPace}
                  aria-label="Trip pace"
                />
              </Question>

              <Question question="Who is going?">
                {COMPANY_OPTIONS.map(opt => (
                  <FilterChip
                    key={opt.value}
                    label={opt.label}
                    Icon={opt.Icon}
                    active={company === opt.value}
                    onClick={() => setCompany(opt.value)}
                  />
                ))}
              </Question>

              <Question
                question="What pulls you in?"
                hint={interests.length === 0
                  ? 'Pick any that apply. Leave it empty and you get the usual highlights.'
                  : undefined}
              >
                {INTEREST_OPTIONS.map(opt => (
                  <FilterChip
                    key={opt.value}
                    label={opt.label}
                    Icon={opt.Icon}
                    role="checkbox"
                    active={interests.includes(opt.value)}
                    onClick={() => toggleInterest(opt.value)}
                  />
                ))}
              </Question>

              <Question
                question="Anything you do not eat?"
                hint={dietary === 'none' ? undefined : 'Every dish Navia names will fit this.'}
              >
                {DIETARY_OPTIONS.map(opt => (
                  <FilterChip
                    key={opt.value}
                    label={opt.label}
                    Icon={opt.Icon}
                    active={dietary === opt.value}
                    onClick={() => setDietary(opt.value)}
                  />
                ))}
              </Question>

              <Question
                question="And the overall style?"
                hint="Sets the tone, and it is how other travellers find your trip once you publish it."
              >
                {VIBE_IDS.map((id) => {
                  const { label, Icon } = VIBES[id];
                  return (
                    <FilterChip
                      key={id}
                      label={label}
                      Icon={Icon}
                      active={vibe === id}
                      onClick={() => setVibe(prev => (prev === id ? null : id))}
                    />
                  );
                })}
              </Question>

              {organizations.length > 0 && (
                <Question
                  question="Who is running this trip?"
                  hint="Trips run by an organization carry its name and can be managed by all of its admins."
                >
                  <FilterChip
                    label="Just me"
                    active={organizationId === ''}
                    onClick={() => setOrganizationId('')}
                  />
                  {organizations.map((organization) => (
                    <FilterChip
                      key={organization.id}
                      label={organization.name}
                      active={organizationId === organization.id}
                      onClick={() => setOrganizationId(organization.id)}
                    />
                  ))}
                </Question>
              )}
            </Box>
          </Box>

          {/*
            Pinned actions. Outside the scroll region so the way forward is always
            on screen, which is the whole reason a longer form is safe here.
          */}
          <Box
            sx={(t) => ({
              flexShrink: 0,
              px: { xs: 2.25, md: 4 },
              py: { xs: 1.75, md: 2 },
              borderTop: `1px solid ${t.custom.surface.border}`,
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: { xs: 'stretch', sm: 'space-between' },
              gap: 1.25,
            })}
          >
            <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.7rem', lineHeight: 1.45, color: 'text.disabled', maxWidth: 180 }}>
              Invite your crew and shape the details inside the planner.
            </Typography>
            {/* Stacked on a phone. Side by side, the two labels plus their icons come
                to about 310px, which is wider than a 360px viewport leaves once the
                footer padding is taken off, so `nowrap` was overflowing. DOM order
                matches visual order, and the primary action lands nearest the thumb. */}
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 1,
              flex: { xs: 1, sm: 'none' },
            }}>
              <Button
                variant="outlined"
                onClick={() => createAndOpen(true)}
                disabled={!canFinish || busy}
                startIcon={<NaviaOrb size={16} processing={aiGenerating} />}
                sx={{ fontWeight: 700, fontSize: '0.82rem',
                  px: { xs: 1.5, sm: 2.25 }, py: 1.1, borderRadius: '50px', textTransform: 'none',
                  flex: { xs: 1, sm: 'none' }, whiteSpace: 'nowrap',
                }}
              >
                Let Navia draft it
              </Button>
              <Button
                variant="contained"
                onClick={() => createAndOpen(false)}
                disabled={!canFinish || busy}
                endIcon={<IconArrowRight size={16} />}
                sx={{ fontWeight: 700, fontSize: '0.86rem',
                  px: { xs: 1.75, sm: 2.75 }, py: 1.1, borderRadius: '50px', textTransform: 'none',
                  flex: { xs: 1, sm: 'none' }, whiteSpace: 'nowrap',
                }}
              >
                {submitting ? 'Creating…' : 'Start planning'}
              </Button>
            </Box>
          </Box>
        </Box>
      </LocalizationProvider>
    </Modal>
  );
};

export default TripCreationModal;
