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

interface TripCreationModalProps {
  open: boolean;
  onClose: () => void;
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

const TripCreationModal: React.FC<TripCreationModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [tripName, setTripName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [vibe, setVibe] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; countries?: string; dates?: string }>({});
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
    setFieldErrors({});
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // GSAP: modal entrance
  useEffect(() => {
    if (!open) return;
    const ctx = gsap.context(() => {
      gsap.from(modalBoxRef.current, {
        scale: 0.92, opacity: 0, duration: 0.45, ease: 'back.out(1.4)',
      });
      gsap.from('.gs-modal-field', {
        y: 18, opacity: 0, duration: 0.4, stagger: 0.07, delay: 0.15, ease: 'power2.out',
      });
    });
    return () => ctx.revert();
  }, [open]);

  const canFinish = tripName.trim().length > 0 && selectedCountries.length > 0;
  const busy = submitting || aiGenerating;

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
    textTransform: 'uppercase' as const, color: 'text.disabled',
    fontFamily: "'Inter', sans-serif", mb: 1,
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
            width: { xs: '96vw', sm: '520px' },
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
              <Typography sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: 'text.secondary', fontSize: '0.88rem', textAlign: 'center', maxWidth: 280 }}>
                {aiGenerating ? aiMessage : 'Opening your planner…'}
              </Typography>
            </Box>
          )}

          <Box sx={{
            p: { xs: '24px 20px 20px', md: '28px 36px 24px' },
            overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
            flex: 1,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>

            {/* Header */}
            <Box className="gs-modal-field" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography sx={{ fontFamily: theme.custom.fontDisplay, fontWeight: 700, fontSize: { xs: '1.55rem', md: '1.85rem' }, color: 'text.primary', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                  Where to next?
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontFamily: "'Inter', sans-serif", mt: 0.75 }}>
                  A destination is all it takes, everything else can wait.
                </Typography>
              </Box>
              <IconButton onClick={handleClose} size="small" sx={{ color: 'text.disabled', mt: 0.5, '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>
                <IconX size={18} />
              </IconButton>
            </Box>

            {errorMsg && (
              <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2, borderRadius: '12px' }}>{errorMsg}</Alert>
            )}

            {/* Destination, the one thing we ask for */}
            <Box className="gs-modal-field" sx={{ mb: 2.5 }}>
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
                    autoFocus
                    error={!!fieldErrors.countries}
                    helperText={fieldErrors.countries}
                    sx={fieldSx}
                  />
                )}
              />
            </Box>

            {/* Trip name, pre-filled, theirs to change */}
            <Box className="gs-modal-field" sx={{ mb: 2.5 }}>
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

            {/* Dates, explicitly optional */}
            <Box className="gs-modal-field" sx={{ mb: 2.5 }}>
              <Typography sx={labelSx}>
                Dates
                <Box component="span" sx={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: 'text.disabled', ml: 0.75 }}>· optional</Box>
              </Typography>
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
              {fieldErrors.dates && <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, display: 'block' }}>{fieldErrors.dates}</Typography>}
              <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', mt: 0.75, fontFamily: "'Inter', sans-serif" }}>
                Still dreaming? Leave them blank and decide later.
              </Typography>
            </Box>

            {/* Travel style, optional, one tap */}
            <Box className="gs-modal-field" sx={{ mb: 1 }}>
              <Typography sx={labelSx}>
                Travel style
                <Box component="span" sx={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: 'text.disabled', ml: 0.75 }}>· optional</Box>
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {VIBE_IDS.map((id) => {
                  const { label, Icon } = VIBES[id];
                  const selected = vibe === id;
                  return (
                    <Chip
                      key={id}
                      label={label}
                      icon={<Icon size={14} />}
                      onClick={() => setVibe(prev => (prev === id ? null : id))}
                      variant={selected ? 'filled' : 'outlined'}
                      sx={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
                        fontSize: '0.76rem',
                        borderRadius: '50px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        ...(selected
                          ? { bgcolor: 'text.primary', color: 'background.paper', '& .MuiChip-icon': { color: 'inherit' }, '&:hover': { bgcolor: 'text.primary' } }
                          : { borderColor: 'divider', color: 'text.secondary', '& .MuiChip-icon': { color: 'inherit' }, '&:hover': { borderColor: 'text.primary', color: 'text.primary', bgcolor: 'transparent' } }),
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            {/* Footer actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5, mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                variant="outlined"
                onClick={() => createAndOpen(true)}
                disabled={!canFinish || busy}
                startIcon={<NaviaOrb size={16} processing={aiGenerating} />}
                sx={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.84rem',
                  px: 2.5, py: 1.2, borderRadius: '50px', textTransform: 'none',
                }}
              >
                Let Navia draft it
              </Button>
              <Button
                variant="contained"
                onClick={() => createAndOpen(false)}
                disabled={!canFinish || busy}
                endIcon={<IconArrowRight size={16} />}
                sx={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.88rem',
                  px: 3, py: 1.2, borderRadius: '50px', textTransform: 'none',
                }}
              >
                {submitting ? 'Creating…' : 'Start planning'}
              </Button>
            </Box>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', fontFamily: "'Inter', sans-serif", textAlign: 'right', mt: 1 }}>
              Invite your crew and shape the details inside the planner.
            </Typography>

          </Box>
        </Box>
      </LocalizationProvider>
    </Modal>
  );
};

export default TripCreationModal;
