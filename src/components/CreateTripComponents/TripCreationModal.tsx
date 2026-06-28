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
  Avatar,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useNavigate } from 'react-router-dom';
import {
  Close as CloseIcon,
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
  aiGenerating: boolean;
  aiMessage: string;
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

const VIBES: { id: string; label: string; emoji: string; desc: string; bg: string; activeBg: string; activeColor: string; activeBorder: string; tagline: string }[] = [
  { id: 'adventure', label: 'Adventure Junkie', emoji: '🏔️', desc: 'Trails, peaks & adrenaline',     tagline: 'Born for the wild',          bg: '#F0FDF4', activeBg: 'linear-gradient(135deg,#059669,#047857)', activeColor: '#fff', activeBorder: '#059669' },
  { id: 'culture',   label: 'Culture Seeker',   emoji: '🏛️', desc: 'History, art & local stories',   tagline: 'Every place has a tale',     bg: '#F5F3FF', activeBg: 'linear-gradient(135deg,#7C3AED,#5B21B6)', activeColor: '#fff', activeBorder: '#7C3AED' },
  { id: 'romantic',  label: 'Party Lover',       emoji: '🎉', desc: 'Vibes, music & movement',         tagline: 'Life is a dance floor',      bg: '#FFF1F2', activeBg: 'linear-gradient(135deg,#FF385C,#D91A50)', activeColor: '#fff', activeBorder: '#FF385C' },
  { id: 'luxury',    label: 'Slow Traveler',     emoji: '🌸', desc: 'Wander without a rush',           tagline: 'The journey is the goal',    bg: '#FFFBEB', activeBg: 'linear-gradient(135deg,#D97706,#B45309)', activeColor: '#fff', activeBorder: '#D97706' },
  { id: 'spiritual', label: 'Spiritual Explorer',emoji: '🕌', desc: 'Temples, peace & inner purpose',  tagline: 'Travel as transformation',   bg: '#FEFCE8', activeBg: 'linear-gradient(135deg,#CA8A04,#A16207)', activeColor: '#fff', activeBorder: '#CA8A04' },
  { id: 'urban',     label: 'Urban Explorer',    emoji: '🌆', desc: 'City breaks & hidden gems',       tagline: 'The city never sleeps',      bg: '#EFF6FF', activeBg: 'linear-gradient(135deg,#2563EB,#1D4ED8)', activeColor: '#fff', activeBorder: '#2563EB' },
  { id: 'scenic',    label: 'Scenic Chaser',     emoji: '🌅', desc: 'Landscapes & golden hours',       tagline: 'Always chasing sunsets',     bg: '#ECFDF5', activeBg: 'linear-gradient(135deg,#10B981,#059669)', activeColor: '#fff', activeBorder: '#10B981' },
];

const STEP_LABELS = ['The Basics', 'Where & When', 'Travel Style', 'Bring Your Crew'];

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
    aiGenerating: false,
    aiMessage: "",
  });

  const [userSearchResults, setUserSearchResults] = useState<Array<{ id: number; fname: string; lname: string; email: string; profilepicture?: string; profilePicture?: string; profilePic?: string; avatar?: string }>>([]);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; description?: string; countries?: string; dates?: string }>({});
  const { token } = useAuthToken();
  const navigate = useNavigate();

  const modalBoxRef = useRef<HTMLDivElement>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);

  const handleInputChange =
    (field: keyof FormData) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      let value = event.target.value;
      if (field === 'tripDescription') {
        value = value.slice(0, 300);
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
    setUserSearchResults([]);
  };

  const handleUserSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    try {
      const tokenVal = token || localStorage.getItem('accessToken') || '';
      if (!tokenVal) return;
      // Search by email or name
      const emailRegex = /.+@.+\..+/.test(query);
      if (emailRegex) {
        const resp = await apiServices.getUserProfileByEmail(tokenVal, query.toLowerCase());
        if (resp.data) {
          setUserSearchResults([resp.data]);
        }
      } else {
        // Search by name
        const resp = await apiServices.searchUsersByName(tokenVal, query);
        if (resp.data && Array.isArray(resp.data)) {
          setUserSearchResults(resp.data);
        }
      }
    } catch (err) {
      setUserSearchResults([]);
    }
  };

  const handleSelectUser = (user: any) => {
    const email = user.email;
    if (email && !formData.inviteEmails.includes(email)) {
      setFormData(p => ({ ...p, inviteEmails: [...p.inviteEmails, email], inviteEmail: '' }));
    }
    setUserSearchResults([]);
  };

  const handleRemoveInvite = (email: string) => {
    setFormData(p=> ({ ...p, inviteEmails: p.inviteEmails.filter(e=> e!==email) }));
  };

  // AI loading messages
  const AI_LOADING_MESSAGES = [
    "Crafting your trip...",
    "Designing the best compatible path as per your travel style",
    "Adding important notes",
    "Here we are adding the best restaurants & foods",
    "Finalizing your perfect itinerary",
  ];

  const handleGenerateWithAI = async () => {
    if(!token) {
      setErrorMsg('You must be signed in.');
      return;
    }
    if(!validate()) return;
    setFormData(p => ({ ...p, aiGenerating: true, aiMessage: AI_LOADING_MESSAGES[0] }));
    setErrorMsg(null);
    
    // Cycle through AI loading messages
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % AI_LOADING_MESSAGES.length;
      setFormData(p => ({ ...p, aiMessage: AI_LOADING_MESSAGES[messageIndex] }));
    }, 2000);

    try {
      const VISIBILITY_MAP: Record<string, number> = {
        PRIVATE: 0,
        TRIP_MEMBERS: 1,
        EVERYONE: 2,
        PUBLIC: 2,
      };

      const payload = {
        name: formData.tripName.trim(),
        description: formData.tripDescription.trim(),
        countries: formData.selectedCountries,
        startDate: formData.startDate ? formData.startDate.format('YYYY-MM-DD') : null,
        endDate: formData.endDate ? formData.endDate.format('YYYY-MM-DD') : null,
        visibility: VISIBILITY_MAP['PRIVATE'],
        currencyCode: 'USD',
        vibe: formData.vibe,
        invites: formData.inviteEmails,
        generateWithAI: true, // Flag to indicate AI generation
      };
      
      const createResp = await apiServices.createTrip(token, payload);
      const createdId: string | undefined = createResp?.data?.id || createResp?.data?.Id || createResp?.data?.tripId;
      
      if(!createdId){
        throw new Error('Trip created but no id returned');
      }
      
      // Fetch full trip details
      const tripResp = await apiServices.getTripById(token, createdId);
      const tripData = tripResp.data;
      
      clearInterval(messageInterval);
      handleClose();
      
      // Navigate to trip planner with AI-generated flag
      navigate(`/tripplanner/${createdId}`, { 
        state: { 
          tripId: createdId, 
          trip: tripData,
          aiGenerated: true 
        } 
      });
    } catch(err: any) {
      clearInterval(messageInterval);
      console.error('[CreateTripModal] AI generation failed', err);
      if(err?.code === 'ERR_NETWORK') {
        setErrorMsg(`Cannot reach server at ${apiBase}. Make sure the backend is running and accessible (network / certificate).`);
      } else if(err?.response) {
        const msg = err.response.data?.message || `Server error (${err.response.status}). Please try again.`;
        setErrorMsg(msg);
      } else {
        setErrorMsg('Failed to generate trip with AI. Please try again.');
      }
      setFormData(p => ({ ...p, aiGenerating: false, aiMessage: '' }));
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.tripName.trim()) { setFieldErrors({ name: 'Trip name is required' }); return; }
      setFieldErrors({});
    }
    if (step === 2) {
      const errs: { countries?: string; dates?: string } = {};
      if (formData.selectedCountries.length === 0) errs.countries = 'Select at least one country';
      if (formData.startDate && formData.endDate && formData.endDate.isBefore(formData.startDate, 'day')) errs.dates = 'End date must be after start date';
      if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
      setFieldErrors({});
    }
    if (stepContentRef.current) {
      gsap.to(stepContentRef.current, { x: -24, opacity: 0, duration: 0.18, ease: 'power2.in', onComplete: () => {
        setStep(s => s + 1);
        gsap.fromTo(stepContentRef.current!, { x: 24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.28, ease: 'power2.out' });
      }});
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    setFieldErrors({});
    if (stepContentRef.current) {
      gsap.to(stepContentRef.current, { x: 24, opacity: 0, duration: 0.18, ease: 'power2.in', onComplete: () => {
        setStep(s => s - 1);
        gsap.fromTo(stepContentRef.current!, { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.28, ease: 'power2.out' });
      }});
    } else {
      setStep(s => s - 1);
    }
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
      const VISIBILITY_MAP: Record<string, number> = {
        PRIVATE: 0,
        TRIP_MEMBERS: 1,
        EVERYONE: 2,
        PUBLIC: 2,
      };

      const payload = {
        name: formData.tripName.trim(),
        description: formData.tripDescription.trim(),
        countries: formData.selectedCountries,
        startDate: formData.startDate ? formData.startDate.format('YYYY-MM-DD') : null,
        endDate: formData.endDate ? formData.endDate.format('YYYY-MM-DD') : null,
        visibility: VISIBILITY_MAP['PRIVATE'], // default to 0 (Private)
        currencyCode: 'USD',
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
      aiGenerating: false,
      aiMessage: "",
    });
    setStep(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  //  GSAP: modal entrance 
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

  const activeVibe = VIBES.find(v => v.id === formData.vibe) ?? null;
  const canFinish = formData.tripName.trim().length > 0 && formData.selectedCountries.length > 0;

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
            width: { xs: '96vw', sm: '540px' },
            maxWidth: '96vw',
            maxHeight: '96vh',
            bgcolor: '#FFFFFF',
            borderRadius: '24px',
            boxShadow: '0 40px 100px rgba(0,0,0,0.18), 0 12px 32px rgba(255,56,92,0.12)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/*  TOP ACCENT STRIP  */}
          <Box sx={{ height: 3, flexShrink: 0, background: activeVibe ? activeVibe.activeBg : 'linear-gradient(90deg, #FF385C 0%, #FF6B35 50%, #FFB347 100%)', transition: 'background 0.5s ease' }} />

          {/* Loading overlay */}
          {(submitting || formData.aiGenerating) && (
            <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, backdropFilter: 'blur(3px)', background: 'rgba(255,255,255,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Box sx={{ width: 48, height: 48, position: 'relative' }}>
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(255,56,92,0.15)' }} />
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: primary, animation: 'spin 0.85s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
              </Box>
              <Typography sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: 'text.secondary', fontSize: '0.88rem', textAlign: 'center', maxWidth: 280 }}>
                {formData.aiGenerating ? formData.aiMessage : 'Creating your trip…'}
              </Typography>
            </Box>
          )}

          {/*  MAIN PANEL  */}
          <Box sx={{
            p: { xs: '24px 20px 20px', md: '28px 40px 24px' },
            overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
            flex: 1,
            background: '#FAFAFA',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
              <Box>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.2, py: 0.4, borderRadius: '50px', background: 'rgba(255,56,92,0.08)', mb: 0.8 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: primary, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: primary, fontFamily: "'Inter', sans-serif" }}>New Adventure</Typography>
                </Box>
                <Typography sx={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: { xs: '1.6rem', md: '2rem' }, color: '#111', lineHeight: 1.1, letterSpacing: '-0.03em' }}>Where to next?</Typography>
              </Box>
              <IconButton onClick={handleClose} size="small" sx={{ color: '#999', bgcolor: '#EFEFEF', borderRadius: '50%', width: 34, height: 34, mt: 0.5, '&:hover': { bgcolor: '#E5E5E5', color: '#111' } }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {/*  Step indicator  */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
              {STEP_LABELS.map((label, i) => {
                const stepNum = i + 1;
                const isCompleted = step > stepNum;
                const isActive = step === stepNum;
                const dotColor = activeVibe ? activeVibe.activeBorder : primary;
                return (
                  <React.Fragment key={stepNum}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isCompleted || isActive ? dotColor : 'rgba(0,0,0,0.06)',
                        transition: 'all 0.3s ease',
                        boxShadow: isActive ? `0 4px 12px ${dotColor}40` : 'none',
                      }}>
                        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: isCompleted || isActive ? '#fff' : '#CCC', fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>
                          {isCompleted ? '✓' : stepNum}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.5rem', fontWeight: isActive ? 700 : 400, color: isActive ? dotColor : '#CCC', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>{label}</Typography>
                    </Box>
                    {i < STEP_LABELS.length - 1 && (
                      <Box sx={{ flex: 1, height: '2px', mt: '13px', mx: 0.75, background: step > stepNum ? dotColor : 'rgba(0,0,0,0.08)', transition: 'background 0.3s ease', borderRadius: 2 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </Box>

            {errorMsg && (
              <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2, borderRadius: '12px' }}>{errorMsg}</Alert>
            )}

            {/*  STEP CONTENT  */}
            <Box ref={stepContentRef} sx={{ flex: 1 }}>

              {/* STEP 1 — The Basics */}
              {step === 1 && (
                <Box>
                  <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: '1.12rem', fontWeight: 700, color: '#222', mb: 0.4, letterSpacing: '-0.01em' }}>Name your adventure</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#BBB', fontFamily: "'Inter', sans-serif", mb: 2.5 }}>Give your trip an identity — something that captures the vibe.</Typography>
                  <Box className="gs-modal-field" sx={{ mb: 2 }}>
                    <Typography sx={labelSx}>Trip name</Typography>
                    <TextField
                      placeholder="e.g. Temples & Tea in Vietnam"
                      value={formData.tripName}
                      onChange={handleInputChange('tripName')}
                      fullWidth
                      variant="outlined"
                      autoFocus
                      error={!!fieldErrors.name}
                      helperText={fieldErrors.name}
                      sx={fieldSx}
                    />
                  </Box>
                  <Box className="gs-modal-field">
                    <Typography sx={labelSx}>What's on your mind about the trip?</Typography>
                    <TextField
                      placeholder="Tell a little more about your trip…"
                      value={formData.tripDescription}
                      onChange={handleInputChange('tripDescription')}
                      fullWidth
                      variant="outlined"
                      multiline
                      minRows={3}
                      maxRows={5}
                      inputProps={{ maxLength: 300 }}
                      error={!!fieldErrors.description}
                      helperText={fieldErrors.description || `${formData.tripDescription.length}/300`}
                      sx={fieldSx}
                    />
                  </Box>
                </Box>
              )}

              {/* STEP 2 — Where & When */}
              {step === 2 && (
                <Box>
                  <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: '1.12rem', fontWeight: 700, color: '#222', mb: 0.4, letterSpacing: '-0.01em' }}>Plan your route</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#BBB', fontFamily: "'Inter', sans-serif", mb: 2.5 }}>Where are you headed, and when?</Typography>
                  <Box className="gs-modal-field" sx={{ mb: 2 }}>
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
                  <Box className="gs-modal-field">
                    <Typography sx={labelSx}>When are you going?</Typography>
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
                </Box>
              )}

              {/* STEP 3 — Travel Style */}
              {step === 3 && (
                <Box>
                  <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: '1.12rem', fontWeight: 700, color: '#222', mb: 0.4, letterSpacing: '-0.01em' }}>What's your travel style?</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#BBB', fontFamily: "'Inter', sans-serif", mb: 2 }}>Pick the vibe that feels most like you — or skip it.</Typography>

                  {activeVibe && (
                    <Box sx={{
                      mb: 2, borderRadius: '14px', background: activeVibe.activeBg,
                      p: '12px 18px', display: 'flex', alignItems: 'center', gap: 1.5,
                      boxShadow: `0 6px 20px ${activeVibe.activeBorder}40`,
                    }}>
                      <Typography sx={{ fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 }}>{activeVibe.emoji}</Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '0.95rem', color: '#fff', lineHeight: 1.2 }}>{activeVibe.label}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter', sans-serif", mt: 0.2, fontStyle: 'italic' }}>{activeVibe.tagline}</Typography>
                      </Box>
                      <Box onClick={() => setFormData(p => ({ ...p, vibe: null }))} sx={{ px: 1.2, py: 0.4, borderRadius: '20px', bgcolor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' } }}>
                        <Typography sx={{ fontSize: '0.52rem', fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em' }}>CLEAR</Typography>
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: { xs: 0.75, sm: 0.9 } }}>
                    {VIBES.map((v) => {
                      const selected = formData.vibe === v.id;
                      return (
                        <Box
                          key={v.id}
                          onClick={() => setFormData(p => ({ ...p, vibe: p.vibe === v.id ? null : v.id }))}
                          sx={{
                            borderRadius: '14px',
                            border: selected ? `2px solid ${v.activeBorder}` : '2px solid rgba(0,0,0,0.07)',
                            background: selected ? v.activeBg : '#fff',
                            p: '12px 10px 10px',
                            cursor: 'pointer', userSelect: 'none', textAlign: 'center',
                            transition: 'all 0.22s ease',
                            boxShadow: selected ? `0 6px 20px ${v.activeBorder}35` : '0 1px 4px rgba(0,0,0,0.05)',
                            transform: selected ? 'translateY(-2px)' : 'none',
                            '&:hover': !selected ? { border: `2px solid ${v.activeBorder}60`, background: v.bg, transform: 'translateY(-2px)', boxShadow: `0 6px 18px ${v.activeBorder}20` } : {},
                          }}
                        >
                          <Typography sx={{ fontSize: '1.5rem', lineHeight: 1, mb: 0.6 }}>{v.emoji}</Typography>
                          <Typography sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.67rem', color: selected ? '#fff' : '#333', lineHeight: 1.3 }}>{v.label}</Typography>
                          <Typography sx={{ fontSize: '0.56rem', color: selected ? 'rgba(255,255,255,0.72)' : '#AAAAAA', fontFamily: "'Inter', sans-serif", mt: 0.3, lineHeight: 1.3 }}>{v.desc}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* STEP 4 — Bring Your Crew */}
              {step === 4 && (
                <Box>
                  <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: '1.12rem', fontWeight: 700, color: '#222', mb: 0.4, letterSpacing: '-0.01em' }}>Bring your crew</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#BBB', fontFamily: "'Inter', sans-serif", mb: 2 }}>Invite friends to co-plan your trip — totally optional.</Typography>

                  {/* Trip summary */}
                  <Box sx={{ p: '14px 18px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.07)', background: '#fff', mb: 2.5 }}>
                    <Typography sx={{ fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.16em', color: '#CCC', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", mb: 1.2 }}>Your Trip at a Glance</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        <Typography sx={{ fontSize: '0.68rem', color: '#CCC', fontFamily: "'Inter', sans-serif", minWidth: 72, flexShrink: 0 }}>Trip</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: '#333', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>{formData.tripName || '—'}</Typography>
                      </Box>
                      {formData.selectedCountries.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Typography sx={{ fontSize: '0.68rem', color: '#CCC', fontFamily: "'Inter', sans-serif", minWidth: 72, flexShrink: 0 }}>Going to</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: '#333', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>{formData.selectedCountries.join(', ')}</Typography>
                        </Box>
                      )}
                      {(formData.startDate || formData.endDate) && (
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Typography sx={{ fontSize: '0.68rem', color: '#CCC', fontFamily: "'Inter', sans-serif", minWidth: 72, flexShrink: 0 }}>Dates</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: '#333', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                            {formData.startDate ? formData.startDate.format('MMM D, YYYY') : ''}{formData.startDate && formData.endDate ? ' → ' : ''}{formData.endDate ? formData.endDate.format('MMM D, YYYY') : ''}
                          </Typography>
                        </Box>
                      )}
                      {activeVibe && (
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                          <Typography sx={{ fontSize: '0.68rem', color: '#CCC', fontFamily: "'Inter', sans-serif", minWidth: 72, flexShrink: 0 }}>Style</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography sx={{ fontSize: '0.9rem', lineHeight: 1 }}>{activeVibe.emoji}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: activeVibe.activeBorder, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>{activeVibe.label}</Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Invite input */}
                  <Box sx={{ position: 'relative', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        placeholder="Search by name or email"
                        value={formData.inviteEmail}
                        onChange={(e) => {
                          handleInputChange('inviteEmail')(e);
                          handleUserSearch(e.target.value);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInviteFriend(); } }}
                        size="small"
                        fullWidth
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px', backgroundColor: '#FFFFFF', fontSize: '0.88rem',
                            '& fieldset': { borderColor: 'rgba(0,0,0,0.10)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,56,92,0.4)' },
                            '&.Mui-focused fieldset': { borderColor: primary, borderWidth: '1.5px' },
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleInviteFriend}
                        sx={{ background: activeVibe ? activeVibe.activeBg : 'linear-gradient(135deg, #FF385C, #D91A50)', borderRadius: '12px', px: 2.5, textTransform: 'none', fontWeight: 700, fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', boxShadow: `0 4px 12px ${activeVibe ? activeVibe.activeBorder + '44' : 'rgba(255,56,92,0.30)'}`, '&:hover': { filter: 'brightness(1.08)' }, flexShrink: 0, transition: 'all 0.3s' }}
                      >
                        Add
                      </Button>
                    </Box>
                    
                    {/* User search results dropdown */}
                    {userSearchResults.length > 0 && (
                      <Box sx={{
                        position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5,
                        backgroundColor: '#fff', borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        maxHeight: 200, overflowY: 'auto',
                        zIndex: 20,
                        border: '1px solid rgba(0,0,0,0.08)',
                      }}>
                        {userSearchResults.map((user) => (
                          <Box
                            key={user.id}
                            onClick={() => handleSelectUser(user)}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 1.5,
                              px: 2, py: 1.5,
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'rgba(255,56,92,0.05)' },
                              borderBottom: '1px solid rgba(0,0,0,0.04)',
                            }}
                          >
                            <Avatar
                              src={user.profilepicture || user.profilePicture || user.profilePic || user.avatar || undefined}
                              sx={{ width: 36, height: 36, bgcolor: primary, fontWeight: 700, fontSize: 14 }}
                              imgProps={{ referrerPolicy: 'no-referrer', crossOrigin: 'anonymous' as any }}
                            >
                              {user.fname?.[0]}{user.lname?.[0]}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', fontFamily: "'Inter', sans-serif" }}>
                                {user.fname} {user.lname}
                              </Typography>
                              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: "'Inter', sans-serif" }}>
                                {user.email}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>

                  {formData.inviteEmails.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
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

                  <Typography sx={{ fontSize: '0.68rem', color: '#CCC', fontFamily: "'Inter', sans-serif", fontStyle: 'italic' }}>You can always invite more friends after the trip is created.</Typography>
                </Box>
              )}

            </Box>{/* end step content */}

            {/*  FOOTER ACTIONS  */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3, pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <Box>
                {step > 1 && (
                  <Button
                    onClick={handleBack}
                    sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.84rem', px: 2.5, py: 1.1, borderRadius: '50px', textTransform: 'none', color: '#999', border: '1px solid rgba(0,0,0,0.10)', '&:hover': { border: '1px solid rgba(0,0,0,0.20)', color: '#555', bgcolor: 'rgba(0,0,0,0.03)' }, transition: 'all 0.2s' }}
                  >
                    ← Back
                  </Button>
                )}
              </Box>

              {step < 4 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForwardIcon sx={{ fontSize: '1rem !important' }} />}
                  sx={{
                    fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.88rem',
                    px: 3.5, py: 1.3, borderRadius: '50px', textTransform: 'none',
                    background: activeVibe ? activeVibe.activeBg : 'linear-gradient(135deg, #FF385C 0%, #D91A50 100%)',
                    boxShadow: `0 6px 20px ${activeVibe ? activeVibe.activeBorder + '44' : 'rgba(255,56,92,0.35)'}`,
                    '&:hover': { filter: 'brightness(1.08)', transform: 'translateY(-1px)' },
                    transition: 'all 0.22s ease',
                  }}
                >
                  Next
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={handleGenerateWithAI}
                    disabled={!canFinish || submitting || formData.aiGenerating}
                    sx={{
                      fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.82rem',
                      px: 2.5, py: 1.3, borderRadius: '50px', textTransform: 'none',
                      borderColor: primary,
                      color: primary,
                      '&:hover': { backgroundColor: 'rgba(255,56,92,0.05)', borderColor: primary },
                      '&:disabled': { borderColor: '#EEEEEE', color: '#CCCCCC', backgroundColor: 'transparent' },
                      transition: 'all 0.22s ease',
                    }}
                  >
                    ✨ Generate with AI
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleStartPlanning}
                    disabled={!canFinish || submitting || formData.aiGenerating}
                    endIcon={!submitting && !formData.aiGenerating ? <ArrowForwardIcon sx={{ fontSize: '1rem !important' }} /> : undefined}
                    sx={{
                      fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.88rem',
                      px: 3.5, py: 1.3, borderRadius: '50px', textTransform: 'none',
                      background: canFinish ? (activeVibe ? activeVibe.activeBg : 'linear-gradient(135deg, #FF385C 0%, #D91A50 100%)') : undefined,
                      boxShadow: canFinish ? `0 6px 20px ${activeVibe ? activeVibe.activeBorder + '44' : 'rgba(255,56,92,0.35)'}` : 'none',
                      '&:hover': { filter: 'brightness(1.08)', transform: 'translateY(-1px)' },
                      '&:disabled': { background: '#EEEEEE', color: '#CCCCCC', boxShadow: 'none' },
                      transition: 'all 0.22s ease',
                    }}
                  >
                    {submitting ? 'Creating…' : 'Start Planning'}
                  </Button>
                </Box>
              )}
            </Box>

          </Box>{/* end main panel */}
        </Box>
      </LocalizationProvider>
    </Modal>
  );
};

export default TripCreationModal;