import React, { useState, useRef, useEffect, type ChangeEvent } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Autocomplete,
  Chip,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useNavigate } from 'react-router-dom';
import {
  Close as CloseIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import Alert from '@mui/material/Alert';
import gsap from 'gsap';

interface TripCreationModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormData {
  tripName: string;
  selectedCountries: string[];
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  visibility: "Trip members" | "My followers" | "Everyone";
  inviteEmail: string; // current typed email
  inviteEmails: string[]; // collected valid emails
}

const COUNTRIES = [
  "Afghanistan",
  "Aland Islands",
  "Albania",
  "Algeria",
  "American Samoa",
  "Andorra",
  "Angola",
  "Anguilla",
  "Antarctica",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Aruba",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bermuda",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Bouvet Island",
  "Brazil",
  "British Indian Ocean Territory",
  "Brunei Darussalam",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Cayman Islands",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Christmas Island",
  "Cocos (Keeling) Islands",
  "Colombia",
  "Comoros",
  "Congo",
  "Congo, Democratic Republic",
  "Cook Islands",
  "Costa Rica",
  "Cote D'Ivoire",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Ethiopia",
  "Falkland Islands (Malvinas)",
  "Faroe Islands",
  "Fiji",
  "Finland",
  "France",
  "French Guiana",
  "French Polynesia",
  "French Southern Territories",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Gibraltar",
  "Greece",
  "Greenland",
  "Grenada",
  "Guadeloupe",
  "Guam",
  "Guatemala",
  "Guernsey",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Heard Island and McDonald Islands",
  "Holy See (Vatican City State)",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran, Islamic Republic of",
  "Iraq",
  "Ireland",
  "Isle of Man",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jersey",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Korea, Democratic People's Republic of",
  "Korea, Republic of",
  "Kuwait",
  "Kyrgyzstan",
  "Lao People's Democratic Republic",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libyan Arab Jamahiriya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Macao",
  "Macedonia, the Former Yugoslav Republic of",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Martinique",
  "Mauritania",
  "Mauritius",
  "Mayotte",
  "Mexico",
  "Micronesia, Federated States of",
  "Moldova, Republic of",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Montserrat",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "Netherlands Antilles",
  "New Caledonia",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Niue",
  "Norfolk Island",
  "Northern Mariana Islands",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine, State of",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Pitcairn",
  "Poland",
  "Portugal",
  "Puerto Rico",
  "Qatar",
  "Reunion",
  "Romania",
  "Russian Federation",
  "Rwanda",
  "Saint Barthelemy",
  "Saint Helena",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Martin (French part)",
  "Saint Pierre and Miquelon",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Georgia and the South Sandwich Islands",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Svalbard and Jan Mayen",
  "Swaziland",
  "Sweden",
  "Switzerland",
  "Syrian Arab Republic",
  "Taiwan, Province of China",
  "Tajikistan",
  "Tanzania, United Republic of",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tokelau",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Turks and Caicos Islands",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "United States Minor Outlying Islands",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Venezuela",
  "Vietnam",
  "Laos",
  "Virgin Islands, British",
  "Virgin Islands, U.S.",
  "Wallis and Futuna",
  "Western Sahara",
  "Yemen",
  "Zambia",
  "Zimbabwe"
];


const primary = "#FF385C";

const TripCreationModal: React.FC<TripCreationModalProps> = ({ open, onClose }) => {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const [formData, setFormData] = useState<FormData>({
    tripName: "",
    selectedCountries: [],
    startDate: null,
    endDate: null,
    visibility: "My followers",
    inviteEmail: "",
    inviteEmails: [],
  });

  const [showInviteSection, setShowInviteSection] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; countries?: string; dates?: string }>({});
  const { token } = useAuthToken();
  const navigate = useNavigate();

  const modalBoxRef  = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const handleInputChange =
    (field: keyof FormData) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleCountryChange = (_: any, newValue: string[]) => {
    setFormData((prev) => ({ ...prev, selectedCountries: newValue }));
  };

  const handleInviteFriend = () => {
    const raw = formData.inviteEmail.trim();
    if(!raw) return;
    // Basic email regex
    const isValid = /.+@.+\..+/.test(raw);
    if(!isValid){
      setErrorMsg('Invalid email format');
      return;
    }
    setFormData(p=> ({ ...p, inviteEmails: p.inviteEmails.includes(raw)? p.inviteEmails : [...p.inviteEmails, raw], inviteEmail: '' }));
  };

  const handleRemoveInvite = (email: string) => {
    setFormData(p=> ({ ...p, inviteEmails: p.inviteEmails.filter(e=> e!==email) }));
  };

  const validate = () => {
    const errs: { name?: string; countries?: string; dates?: string } = {};
    if(!formData.tripName.trim()) errs.name = 'Trip name is required';
    if(formData.selectedCountries.length === 0) errs.countries = 'Select at least one country';
    if(formData.startDate && formData.endDate && formData.endDate.isBefore(formData.startDate,'day')) errs.dates = 'End date must be after start date';
    setFieldErrors(errs);
    return Object.keys(errs).length===0;
  };

  const handleStartPlanning = async () => {
    if(!token) {
      setErrorMsg('You must be signed in.');
      return;
    }
    if(!validate()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const visibility: 'TRIP_MEMBERS' | 'FOLLOWERS' | 'EVERYONE' =
        formData.visibility === 'Trip members'
          ? 'TRIP_MEMBERS'
          : formData.visibility === 'My followers'
            ? 'FOLLOWERS'
            : 'EVERYONE';
      const payload = {
        name: formData.tripName.trim(),
        countries: formData.selectedCountries,
        startDate: formData.startDate ? formData.startDate.format('YYYY-MM-DD') : null,
        endDate: formData.endDate ? formData.endDate.format('YYYY-MM-DD') : null,
        visibility,
        invites: formData.inviteEmails,
      };
      console.log('[CreateTripModal] Creating trip with payload', payload);
      // Create trip
  const createResp = await apiServices.createTrip(token, payload);
  console.log('[CreateTripModal] Trip created response', createResp);
  // Backend may return id as id, Id, or tripId depending on DTO serialization
  const createdId: string | undefined = createResp?.data?.id || createResp?.data?.Id || createResp?.data?.tripId;
      if(!createdId){
        throw new Error('Trip created but no id returned');
      }
      // Fetch full trip details
      const tripResp = await apiServices.getTripById(token, createdId);
      const tripData = tripResp.data;
      // Close modal before navigation
      handleClose();
    // Navigate to parameterized planner route with state for hydration fallback
  // Pass trip meta under `trip` key (planner route expects `state.trip`)
  navigate(`/tripplanner/${createdId}`, { state: { tripId: createdId, trip: tripData } });
    } catch(err: any) {
      console.error('[CreateTripModal] createTrip failed', err);
      if(err?.code === 'ERR_NETWORK') {
        setErrorMsg(`Cannot reach server at ${apiBase}. Make sure the backend is running and accessible (network / certificate).`);
      } else if(err?.response) {
        const msg = err.response.data?.message || `Server error (${err.response.status}). Please try again.`;
        setErrorMsg(msg);
      } else {
        setErrorMsg('Failed to create trip. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tripName: "",
      selectedCountries: [],
      startDate: null,
      endDate: null,
      visibility: "My followers",
      inviteEmail: "",
      inviteEmails: [],
    });
    setShowInviteSection(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── GSAP: modal entrance ──
  useEffect(() => {
    if (!open) return;
    const ctx = gsap.context(() => {
      gsap.from(modalBoxRef.current, {
        scale: 0.88, opacity: 0, duration: 0.5, ease: 'back.out(1.5)',
      });
      gsap.from('.gs-modal-field', {
        y: 22, opacity: 0, duration: 0.45, stagger: 0.08, delay: 0.18, ease: 'power2.out',
      });
    });
    return () => ctx.revert();
  }, [open]);

  // ── GSAP: right panel slide-in when shown ──
  useEffect(() => {
    if (!showInviteSection || !rightPanelRef.current) return;
    gsap.fromTo(
      rightPanelRef.current,
      { x: 50, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }
    );
  }, [showInviteSection]);

  const canStart = formData.tripName.trim().length>0 && formData.selectedCountries.length>0 && !(formData.startDate && formData.endDate && formData.endDate.isBefore(formData.startDate,'day'));

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      backgroundColor: '#FAFAFA',
      fontSize: '0.92rem',
      '&:hover fieldset': { borderColor: 'rgba(255,56,92,0.5)' },
      '&.Mui-focused fieldset': { borderColor: primary, borderWidth: '1.5px' },
    },
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
            width: showInviteSection ? { xs: '96vw', md: '860px' } : { xs: '96vw', md: '520px' },
            maxWidth: '96vw',
            maxHeight: '96vh',
            bgcolor: '#FFFFFF',
            borderRadius: '24px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(255,56,92,0.10)',
            overflow: 'hidden',
            display: 'flex',
            position: 'relative',
            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Loading overlay */}
          {submitting && (
            <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, backdropFilter: 'blur(3px)', background: 'rgba(255,255,255,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Box sx={{ width: 48, height: 48, position: 'relative' }}>
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(255,56,92,0.15)' }} />
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: primary, animation: 'spin 0.85s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
              </Box>
              <Typography sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: 'text.secondary', fontSize: '0.88rem' }}>Creating your trip…</Typography>
            </Box>
          )}

          {/* ── LEFT PANEL ── */}
          <Box sx={{ flex: '0 0 auto', width: showInviteSection ? { xs: '100%', md: '520px' } : '100%', p: { xs: 3, md: '40px 44px' }, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Top bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5 }}>
              <Box>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#CCCCCC', fontFamily: "'Inter', sans-serif", mb: 0.4 }}>New trip</Typography>
                <Typography sx={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.8rem' }, color: '#111', lineHeight: 1.15, letterSpacing: '-0.03em' }}>Where to next?</Typography>
              </Box>
              <IconButton onClick={handleClose} size="small" sx={{ color: '#AAAAAA', bgcolor: '#F5F5F5', borderRadius: '50%', width: 36, height: 36, '&:hover': { bgcolor: '#EFEFEF', color: '#111' } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {errorMsg && (
              <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2.5, borderRadius: '12px' }}>{errorMsg}</Alert>
            )}

            {/* Trip name */}
            <Box className="gs-modal-field" sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', fontFamily: "'Inter', sans-serif", mb: 1 }}>Trip name</Typography>
              <TextField
                placeholder="e.g. Summer in Southeast Asia"
                value={formData.tripName}
                onChange={handleInputChange('tripName')}
                fullWidth
                variant="outlined"
                error={!!fieldErrors.name}
                helperText={fieldErrors.name}
                sx={fieldSx}
              />
            </Box>

            {/* Countries */}
            <Box className="gs-modal-field" sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', fontFamily: "'Inter', sans-serif", mb: 1 }}>Destinations</Typography>
              <Autocomplete
                multiple
                options={COUNTRIES}
                value={formData.selectedCountries}
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
                        sx={{ background: 'linear-gradient(135deg, #FF385C, #D91A50)', color: '#fff', fontWeight: 600, fontSize: '0.72rem', '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.75)', '&:hover': { color: '#fff' } } }}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search countries…"
                    variant="outlined"
                    error={!!fieldErrors.countries}
                    helperText={fieldErrors.countries}
                    sx={fieldSx}
                  />
                )}
              />
            </Box>

            {/* Dates */}
            <Box className="gs-modal-field" sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', fontFamily: "'Inter', sans-serif", mb: 1 }}>Travel dates <Typography component="span" sx={{ fontSize: '0.68rem', fontWeight: 400, color: '#CCC', textTransform: 'none', letterSpacing: 0 }}>(optional)</Typography></Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DatePicker
                  value={formData.startDate}
                  onChange={(v) => setFormData(p => ({ ...p, startDate: v }))}
                  slotProps={{ textField: { placeholder: 'Start date', fullWidth: true, sx: fieldSx } }}
                />
                <ArrowForwardIcon sx={{ color: '#DDD', flexShrink: 0 }} />
                <DatePicker
                  value={formData.endDate}
                  minDate={formData.startDate || undefined}
                  onChange={(v) => setFormData(p => ({ ...p, endDate: v }))}
                  slotProps={{ textField: { placeholder: 'End date', fullWidth: true, sx: fieldSx } }}
                />
              </Box>
              {fieldErrors.dates && <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, display: 'block' }}>{fieldErrors.dates}</Typography>}
              <Typography sx={{ fontSize: '0.7rem', color: '#BBBBBB', mt: 1, fontFamily: "'Inter', sans-serif", fontStyle: 'italic' }}>Exact dates are only used to calculate trip duration and aren't shown to others.</Typography>
            </Box>

            {/* Visibility */}
            <Box className="gs-modal-field" sx={{ mb: 3.5, mt: 2 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', fontFamily: "'Inter', sans-serif", mb: 1.5 }}>Visibility</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {(['Trip members', 'My followers', 'Everyone'] as const).map((opt) => (
                  <Box
                    key={opt}
                    onClick={() => setFormData(p => ({ ...p, visibility: opt }))}
                    sx={{
                      px: 2.5, py: 1,
                      borderRadius: '50px',
                      border: '1.5px solid',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.18s ease',
                      userSelect: 'none',
                      ...(formData.visibility === opt
                        ? { background: 'linear-gradient(135deg, #FF385C, #D91A50)', borderColor: 'transparent', color: '#fff', boxShadow: '0 4px 14px rgba(255,56,92,0.30)' }
                        : { background: 'transparent', borderColor: 'rgba(0,0,0,0.12)', color: '#666', '&:hover': { borderColor: 'rgba(255,56,92,0.4)', color: primary } }),
                    }}
                  >{opt}</Box>
                ))}
              </Box>
            </Box>

            {/* Footer actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: 1 }}>
              <Box
                onClick={() => setShowInviteSection(s => !s)}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', color: '#AAAAAA', fontSize: '0.8rem', fontFamily: "'Inter', sans-serif", fontWeight: 600, transition: 'color 0.18s', '&:hover': { color: primary }, userSelect: 'none' }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
                {showInviteSection ? 'Hide invite' : 'Invite friends'}
              </Box>
              <Button
                variant="contained"
                onClick={handleStartPlanning}
                disabled={!canStart || submitting}
                sx={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.9rem',
                  px: 4, py: 1.35,
                  borderRadius: '50px',
                  textTransform: 'none',
                  background: canStart ? 'linear-gradient(135deg, #FF385C 0%, #D91A50 100%)' : undefined,
                  boxShadow: canStart ? '0 6px 20px rgba(255,56,92,0.35)' : 'none',
                  '&:hover': { background: 'linear-gradient(135deg, #E31C5F 0%, #B01550 100%)', boxShadow: '0 10px 28px rgba(255,56,92,0.45)', transform: 'translateY(-1px)' },
                  '&:disabled': { background: '#F0F0F0', color: '#BBBBBB', boxShadow: 'none' },
                  transition: 'all 0.22s ease',
                }}
              >
                {submitting ? 'Creating…' : 'Start planning'}
              </Button>
            </Box>
          </Box>

          {/* ── DIVIDER ── */}
          {showInviteSection && (
            <Box sx={{ width: '1px', flexShrink: 0, background: 'rgba(0,0,0,0.07)', display: { xs: 'none', md: 'block' } }} />
          )}

          {/* ── RIGHT PANEL – Invite ── */}
          {showInviteSection && (
            <Box
              ref={rightPanelRef}
              sx={{
                flex: 1,
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                p: '40px 36px',
                background: 'linear-gradient(160deg, #FFF5F7 0%, #FFF0F3 50%, #FFF8FA 100%)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorative blobs */}
              <Box sx={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,56,92,0.08) 0%, transparent 70%)', top: -60, right: -60, pointerEvents: 'none' }} />
              <Box sx={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,56,92,0.05) 0%, transparent 70%)', bottom: 40, left: -40, pointerEvents: 'none' }} />

              <Typography sx={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: '1.35rem', color: '#111', letterSpacing: '-0.02em', mb: 0.5, position: 'relative' }}>Bring your crew</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#AAAAAA', fontFamily: "'Inter', sans-serif", mb: 3, position: 'relative' }}>Invite friends to co-plan this trip.</Typography>

              <Box sx={{ display: 'flex', gap: 1, position: 'relative' }}>
                <TextField
                  placeholder="friend@email.com"
                  value={formData.inviteEmail}
                  onChange={handleInputChange('inviteEmail')}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInviteFriend(); } }}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.88rem',
                      '&:hover fieldset': { borderColor: 'rgba(255,56,92,0.4)' },
                      '&.Mui-focused fieldset': { borderColor: primary, borderWidth: '1.5px' },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleInviteFriend}
                  sx={{ background: 'linear-gradient(135deg, #FF385C, #D91A50)', borderRadius: '10px', px: 2.5, textTransform: 'none', fontWeight: 700, fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', boxShadow: '0 4px 12px rgba(255,56,92,0.30)', '&:hover': { background: 'linear-gradient(135deg, #E31C5F, #B01550)' }, flexShrink: 0 }}
                >
                  Add
                </Button>
              </Box>

              {formData.inviteEmails.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.75, position: 'relative' }}>
                  {formData.inviteEmails.map(email => (
                    <Chip
                      key={email}
                      label={email}
                      onDelete={() => handleRemoveInvite(email)}
                      size="small"
                      sx={{ background: 'linear-gradient(135deg, #FF385C, #D91A50)', color: '#fff', fontWeight: 600, fontSize: '0.72rem', '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.75)', '&:hover': { color: '#fff' } } }}
                    />
                  ))}
                </Box>
              )}

              <Box sx={{ mt: 'auto', pt: 3, position: 'relative' }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#CCCCCC', fontFamily: "'Inter', sans-serif", fontStyle: 'italic' }}>You can always invite more friends after the trip is created.</Typography>
              </Box>
            </Box>
          )}
        </Box>
      </LocalizationProvider>
    </Modal>
  );
};

export default TripCreationModal;