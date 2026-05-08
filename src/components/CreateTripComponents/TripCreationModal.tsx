import React, { useState, useRef, useEffect, type ChangeEvent } from "react";
import { KalaMandala } from '../DecorativeComponents/KalaDecor';
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
  tripDescription: string;
  selectedCountries: string[];
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  vibe: string | null;
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

const VIBES: { id: string; label: string; img: string; desc: string; bg: string; activeBg: string; activeColor: string; activeBorder: string }[] = [
  { id: 'adventure', label: 'Adventure Junkie', img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=75', desc: 'Trails, peaks & thrills',      bg: '#F0FDF4', activeBg: 'linear-gradient(135deg,#059669,#047857)', activeColor: '#fff', activeBorder: '#059669' },
  { id: 'culture',   label: 'Culture Seeker',   img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=400&q=75', desc: 'History, art & local life',    bg: '#F5F3FF', activeBg: 'linear-gradient(135deg,#7C3AED,#5B21B6)', activeColor: '#fff', activeBorder: '#7C3AED' },
  { id: 'romantic',  label: 'Party Lover',       img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=75', desc: 'Vibes, music & movement',     bg: '#FFF1F2', activeBg: 'linear-gradient(135deg,#FF385C,#D91A50)', activeColor: '#fff', activeBorder: '#FF385C' },
  { id: 'luxury',    label: 'Slow Traveler',     img: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=400&q=75', desc: 'Wander, rest, repeat',         bg: '#FFFBEB', activeBg: 'linear-gradient(135deg,#D97706,#B45309)', activeColor: '#fff', activeBorder: '#D97706' },
  { id: 'spiritual', label: 'Spiritual Explorer',img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=75', desc: 'Temples, peace & purpose',    bg: '#FEFCE8', activeBg: 'linear-gradient(135deg,#CA8A04,#A16207)', activeColor: '#fff', activeBorder: '#CA8A04' },
  { id: 'urban',     label: 'Urban',             img: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=400&q=75', desc: 'City breaks & nightlife',      bg: '#EFF6FF', activeBg: 'linear-gradient(135deg,#2563EB,#1D4ED8)', activeColor: '#fff', activeBorder: '#2563EB' },
  { id: 'scenic',    label: 'Scenic',            img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=75', desc: 'Landscapes & golden hours',   bg: '#ECFDF5', activeBg: 'linear-gradient(135deg,#10B981,#059669)', activeColor: '#fff', activeBorder: '#10B981' },
];

const primary = "#FF385C";

const TripCreationModal: React.FC<TripCreationModalProps> = ({ open, onClose }) => {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const [formData, setFormData] = useState<FormData>({
    tripName: "",
    tripDescription: "",
    selectedCountries: [],
    startDate: null,
    endDate: null,
    vibe: null,
    inviteEmail: "",
    inviteEmails: [],
  });

  const [showInviteSection, setShowInviteSection] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; description?: string; countries?: string; dates?: string }>({});
  const { token } = useAuthToken();
  const navigate = useNavigate();

  const modalBoxRef  = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const handleInputChange =
    (field: keyof FormData) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      let value = event.target.value;
      if (field === 'tripDescription') {
        value = value.slice(0, 300); // Enforce max length
      }
      setFormData((prev) => ({
        ...prev,
        [field]: value,
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
    const errs: { name?: string; description?: string; countries?: string; dates?: string } = {};
    if(!formData.tripName.trim()) errs.name = 'Trip name is required';
    if(formData.tripDescription.length > 300) errs.description = 'Description must be 300 characters or less';
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
      const payload = {
        name: formData.tripName.trim(),
        description: formData.tripDescription.trim(),
        countries: formData.selectedCountries,
        startDate: formData.startDate ? formData.startDate.format('YYYY-MM-DD') : null,
        endDate: formData.endDate ? formData.endDate.format('YYYY-MM-DD') : null,
        visibility: 'PRIVATE' as const,
        vibe: formData.vibe,
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
      tripDescription: "",
      selectedCountries: [],
      startDate: null,
      endDate: null,
      vibe: null,
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

  const activeVibe = VIBES.find(v => v.id === formData.vibe) ?? null;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '14px',
      backgroundColor: '#F7F7F8',
      fontSize: '0.92rem',
      transition: 'background 0.2s',
      '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' },
      '&:hover': { backgroundColor: '#F3F3F5' },
      '&:hover fieldset': { borderColor: 'rgba(255,56,92,0.35)' },
      '&.Mui-focused': { backgroundColor: '#fff' },
      '&.Mui-focused fieldset': { borderColor: primary, borderWidth: '1.5px' },
    },
  };

  const labelSx = {
    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em',
    textTransform: 'uppercase' as const, color: '#AAA',
    fontFamily: "'Inter', sans-serif", mb: 1,
    display: 'flex', alignItems: 'center', gap: 0.75,
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
            width: showInviteSection ? { xs: '96vw', md: '880px' } : { xs: '96vw', md: '540px' },
            maxWidth: '96vw',
            maxHeight: '96vh',
            bgcolor: '#FFFFFF',
            borderRadius: '24px',
            boxShadow: '0 40px 100px rgba(0,0,0,0.18), 0 12px 32px rgba(255,56,92,0.12)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* ── TOP ACCENT STRIP ── */}
          <Box sx={{ height: 3, flexShrink: 0, background: activeVibe ? activeVibe.activeBg : 'linear-gradient(90deg, #FF385C 0%, #FF6B35 50%, #FFB347 100%)', transition: 'background 0.5s ease' }} />
          {/* ── PANELS ROW ── */}
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
          <Box sx={{
            flex: '0 0 auto',
            width: showInviteSection ? { xs: '100%', md: '540px' } : '100%',
            p: { xs: '24px 20px', md: '32px 44px 28px' },
            overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
            background: '#FAFAFA',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>

            {/* Top bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                {/* Badge */}
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.4, borderRadius: '50px', background: 'rgba(255,56,92,0.08)', mb: 1 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: primary, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: primary, fontFamily: "'Inter', sans-serif" }}>New Adventure</Typography>
                </Box>
                <Typography sx={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: { xs: '1.6rem', md: '2rem' }, color: '#111', lineHeight: 1.1, letterSpacing: '-0.03em' }}>Where to next?</Typography>
              </Box>
              <IconButton onClick={handleClose} size="small" sx={{ color: '#999', bgcolor: '#EFEFEF', borderRadius: '50%', width: 34, height: 34, mt: 0.5, '&:hover': { bgcolor: '#E5E5E5', color: '#111' } }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {errorMsg && (
              <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2.5, borderRadius: '12px' }}>{errorMsg}</Alert>
            )}

            {/* Trip name */}
            <Box className="gs-modal-field" sx={{ mb: 1.5 }}>
              <Typography sx={labelSx}>Give your trip a name</Typography>
              <TextField
                placeholder="e.g. Temples & Tea in Vietnam"
                value={formData.tripName}
                onChange={handleInputChange('tripName')}
                fullWidth
                variant="outlined"
                error={!!fieldErrors.name}
                helperText={fieldErrors.name}
                sx={fieldSx}
              />
            </Box>
            {/* Trip description */}
            <Box className="gs-modal-field" sx={{ mb: 1.5 }}>
              <Typography sx={labelSx}>What's coming in your mind about the trip?</Typography>
              <TextField
                placeholder="Tell a little more about your trip…"
                value={formData.tripDescription}
                onChange={handleInputChange('tripDescription')}
                fullWidth
                variant="outlined"
                multiline
                minRows={2}
                maxRows={4}
                inputProps={{ maxLength: 300 }}
                error={!!fieldErrors.description}
                helperText={fieldErrors.description || `${formData.tripDescription.length}/300`}
                sx={fieldSx}
              />
            </Box>

            {/* Countries */}
            <Box className="gs-modal-field" sx={{ mb: 1.5 }}>
              <Typography sx={labelSx}>Where are you headed?</Typography>
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
                    placeholder="Search a country or city..."
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
              <Typography sx={labelSx}>When are you going? <span style={{ fontWeight: 400, color: '#CCC', letterSpacing: 0, textTransform: 'none', fontSize: '0.65rem' }}>(optional)</span></Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 1.5 } }}>
                <DatePicker
                  value={formData.startDate}
                  onChange={(v) => setFormData(p => ({ ...p, startDate: v }))}
                  slotProps={{ textField: { placeholder: 'Start date', fullWidth: true, sx: fieldSx } }}
                />
                <ArrowForwardIcon sx={{ color: '#DDD', flexShrink: 0, display: { xs: 'none', sm: 'block' } }} />
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

            {/* Trip Vibe */}
            <Box className="gs-modal-field" sx={{ mb: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={labelSx}>I travel as a...</Typography>
                {formData.vibe && (
                  <Box
                    onClick={() => setFormData(p => ({ ...p, vibe: null }))}
                    sx={{ fontSize: '0.65rem', color: '#BBBBBB', cursor: 'pointer', fontFamily: "'Inter', sans-serif", '&:hover': { color: '#888' } }}
                  >clear</Box>
                )}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: { xs: 0.75, sm: 1 } }}>
                {VIBES.map((v) => {
                  const selected = formData.vibe === v.id;
                  return (
                    <Box
                      key={v.id}
                      onClick={() => setFormData(p => ({ ...p, vibe: p.vibe === v.id ? null : v.id }))}
                      sx={{
                        position: 'relative',
                        height: { xs: 80, sm: 88 },
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        userSelect: 'none',
                        flexShrink: 0,
                        outline: selected ? `2.5px solid ${v.activeBorder}` : '2.5px solid transparent',
                        outlineOffset: '2px',
                        boxShadow: selected
                          ? `0 8px 24px ${v.activeBorder}50`
                          : '0 2px 8px rgba(0,0,0,0.10)',
                        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                        transform: selected ? 'scale(1.04) translateY(-2px)' : 'none',
                        '&:hover': !selected ? {
                          transform: 'translateY(-3px)',
                          boxShadow: '0 8px 22px rgba(0,0,0,0.18)',
                        } : {},
                      }}
                    >
                      {/* Photo */}
                      <Box sx={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url(${v.img})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }} />
                      {/* Overlay */}
                      <Box sx={{
                        position: 'absolute', inset: 0,
                        background: selected
                          ? `linear-gradient(to top, ${v.activeBorder}CC 0%, rgba(0,0,0,0.18) 100%)`
                          : 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.12) 100%)',
                        transition: 'background 0.22s',
                      }} />
                      {/* Label */}
                      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: '7px 9px 8px' }}>
                        <Typography sx={{
                          fontFamily: "'Playfair Display', serif",
                          fontStyle: 'italic',
                          fontWeight: 700,
                          fontSize: '0.74rem',
                          color: '#fff',
                          lineHeight: 1.2,
                          textShadow: '0 1px 6px rgba(0,0,0,0.55)',
                        }}>{v.label}</Typography>
                      </Box>
                      {/* Selected indicator */}
                      {selected && (
                        <Box sx={{
                          position: 'absolute', top: 6, right: 6,
                          width: 16, height: 16, borderRadius: '50%',
                          bgcolor: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        }}>
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: v.activeBorder }} />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
              {formData.vibe && (
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: activeVibe?.activeBorder, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '0.72rem', color: activeVibe?.activeBorder, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                    {activeVibe?.desc}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Footer actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 1, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <Box
                onClick={() => setShowInviteSection(s => !s)}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.6, cursor: 'pointer', color: '#BBBBBB', fontSize: '0.76rem', fontFamily: "'Inter', sans-serif", fontWeight: 600, transition: 'color 0.18s', '&:hover': { color: primary }, userSelect: 'none' }}
              >
                <AddIcon sx={{ fontSize: 15 }} />
                {showInviteSection ? 'Hide invite' : 'Invite friends'}
              </Box>
              <Button
                variant="contained"
                onClick={handleStartPlanning}
                disabled={!canStart || submitting}
                endIcon={!submitting && canStart ? <ArrowForwardIcon sx={{ fontSize: '1rem !important' }} /> : undefined}
                sx={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.88rem',
                  px: 3.5, py: 1.3,
                  borderRadius: '50px',
                  textTransform: 'none',
                  background: canStart ? (activeVibe ? activeVibe.activeBg : 'linear-gradient(135deg, #FF385C 0%, #D91A50 100%)') : undefined,
                  boxShadow: canStart ? `0 6px 20px ${activeVibe ? activeVibe.activeBorder + '44' : 'rgba(255,56,92,0.35)'}` : 'none',
                  '&:hover': { filter: 'brightness(1.08)', boxShadow: canStart ? `0 10px 28px ${activeVibe ? activeVibe.activeBorder + '55' : 'rgba(255,56,92,0.45)'}` : 'none', transform: 'translateY(-1px)' },
                  '&:disabled': { background: '#EEEEEE', color: '#CCCCCC', boxShadow: 'none' },
                  transition: 'all 0.22s ease',
                }}
              >
                {submitting ? 'Creating…' : 'Start planning'}
              </Button>
            </Box>
          </Box>

          {/* ── DIVIDER ── */}
          {showInviteSection && (
            <Box sx={{ width: '1px', flexShrink: 0, background: 'rgba(0,0,0,0.06)', display: { xs: 'none', md: 'block' } }} />
          )}

          {/* ── RIGHT PANEL – Invite ── */}
          {showInviteSection && (
            <Box
              ref={rightPanelRef}
              sx={{
                flex: 1,
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                p: '36px 32px 32px',
                background: activeVibe
                  ? `linear-gradient(160deg, ${activeVibe.bg} 0%, white 60%)`
                  : 'linear-gradient(160deg, #FFF5F7 0%, #FFF8FA 100%)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background 0.5s ease',
              }}
            >
              {/* Ambient glow */}
              <Box sx={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: activeVibe
                ? `radial-gradient(circle, ${activeVibe.activeBorder}18 0%, transparent 70%)`
                : 'radial-gradient(circle, rgba(255,56,92,0.07) 0%, transparent 70%)', top: -80, right: -80, pointerEvents: 'none', transition: 'background 0.5s' }} />

              {/* Kala mandalas */}
              <KalaMandala size={340} opacity={0.06} style={{ position: 'absolute', bottom: -90, right: -90, zIndex: 0 }} />
              <KalaMandala size={180} opacity={0.04} style={{ position: 'absolute', top: -40, left: -40, zIndex: 0 }} />

              {/* Vibe image watermark */}
              {activeVibe && (
                <Box sx={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: '65%', height: '40%',
                  backgroundImage: `url(${activeVibe.img})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  opacity: 0.10, filter: 'blur(3px) saturate(1.2)',
                  borderRadius: '0 0 24px 0',
                  pointerEvents: 'none', zIndex: 0,
                  maskImage: 'linear-gradient(to top left, rgba(0,0,0,0.7) 0%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to top left, rgba(0,0,0,0.7) 0%, transparent 100%)',
                  transition: 'all 0.5s ease',
                }} />
              )}

              {/* Header */}
              <Box sx={{ position: 'relative', mb: 3 }}>
                {activeVibe && (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.4, borderRadius: '50px', background: `${activeVibe.activeBorder}18`, mb: 1 }}>
                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: activeVibe.activeBorder, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: activeVibe.activeBorder, fontFamily: "'Inter', sans-serif" }}>
                      {activeVibe.label}
                    </Typography>
                  </Box>
                )}
                <Typography sx={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: '1.4rem', color: '#111', letterSpacing: '-0.02em', lineHeight: 1.15, mb: 0.6 }}>
                  {activeVibe ? `${activeVibe.label} trip` : 'Bring your crew'}
                </Typography>
                <Typography sx={{ fontSize: '0.76rem', color: '#999', fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                  {activeVibe
                    ? activeVibe.desc + '\u00a0· invite friends to co-plan.'
                    : 'Invite friends to plan together.'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, position: 'relative' }}>
                <TextField
                  placeholder="email or username"
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
                  sx={{ background: activeVibe ? activeVibe.activeBg : 'linear-gradient(135deg, #FF385C, #D91A50)', borderRadius: '10px', px: 2.5, textTransform: 'none', fontWeight: 700, fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', boxShadow: `0 4px 12px ${activeVibe ? activeVibe.activeBorder + '44' : 'rgba(255,56,92,0.30)'}`, '&:hover': { filter: 'brightness(1.08)' }, flexShrink: 0, transition: 'all 0.3s' }}
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
                      sx={{ background: activeVibe ? activeVibe.activeBg : 'linear-gradient(135deg, #FF385C, #D91A50)', color: '#fff', fontWeight: 600, fontSize: '0.72rem', '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.75)', '&:hover': { color: '#fff' } } }}
                    />
                  ))}
                </Box>
              )}

              <Box sx={{ mt: 'auto', pt: 3, position: 'relative' }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#BBBBBB', fontFamily: "'Inter', sans-serif", fontStyle: 'italic' }}>You can always invite more friends after the trip is created.</Typography>
              </Box>
            </Box>
          )}
          </Box>{/* ── end panels row ── */}
        </Box>
      </LocalizationProvider>
    </Modal>
  );
};

export default TripCreationModal;