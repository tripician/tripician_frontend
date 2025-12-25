import React, { useState, type ChangeEvent } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Autocomplete,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Divider,
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
  LocationOn as LocationIcon,
  Group as GroupIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from "@mui/icons-material";
import Alert from '@mui/material/Alert';

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


const primary = "#1976d2";

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

  const handleVisibilityChange = (_: any, newVisibility: FormData["visibility"] | null) => {
    if (newVisibility) {
      setFormData((prev) => ({ ...prev, visibility: newVisibility }));
    }
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
      debugger;
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

  const canStart = formData.tripName.trim().length>0 && formData.selectedCountries.length>0 && !(formData.startDate && formData.endDate && formData.endDate.isBefore(formData.startDate,'day'));

  return (
    <Modal
      open={open}
      onClose={handleClose}
      sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          width: showInviteSection ? "70vw" : "40vw",
          maxWidth: "92vw",
          height: 620,
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: "0 24px 48px rgba(25,118,210,0.18)",
          overflow: "hidden",
          display: "flex",
          position: 'relative'
        }}
      >
        {submitting && (
          <Box sx={{ position:'absolute', inset:0, zIndex:10, backdropFilter:'blur(2px)', background:'rgba(0,0,0,0.35)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
            <Typography variant='body2' sx={{ color:'#fff', fontWeight:600 }}>Creating trip...</Typography>
            <Box sx={{ width:48, height:48, position:'relative' }}>
              <Box sx={{ position:'absolute', inset:0, borderRadius:'50%', border:'4px solid rgba(255,255,255,0.3)' }} />
              <Box sx={{ position:'absolute', inset:0, borderRadius:'50%', border:'4px solid transparent', borderTopColor:'#fff', animation:'rotate 0.9s linear infinite', '@keyframes rotate': { to: { transform:'rotate(360deg)' } } }} />
            </Box>
          </Box>
        )}
        {/* Left panel – main form */}
        <Box sx={{ flex: "0 0 40vw", p: 4, overflowY: "auto" }}>
          {errorMsg && (
            <Alert severity="error" onClose={()=> setErrorMsg(null)} sx={{ mb:2 }} variant='filled'>
              {errorMsg}
            </Alert>
          )}
          {/* Header with close */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography sx={{ fontWeight: 600, color: 'text.primary', display: "flex", alignItems: "center", gap: 1 }}>
              <LocationIcon fontSize="small" />
              Trip name
            </Typography>
            <IconButton
              onClick={handleClose}
              sx={{
                color: 'text.secondary',
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <TextField
            placeholder="Give your trip a name.."
            value={formData.tripName}
            onChange={handleInputChange("tripName")}
            fullWidth
            variant="outlined"
            error={!!fieldErrors.name}
            helperText={fieldErrors.name}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                "&:hover fieldset": { borderColor: primary },
                "&.Mui-focused fieldset": { borderColor: primary, borderWidth: 2 },
              },
            }}
          />

          {/* Countries */}
          <Typography sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary', display: "flex", alignItems: "center", gap: 1 }}>
            <LocationIcon fontSize="small" />
            Which countries are you going?
          </Typography>
          <Autocomplete
            multiple
            options={COUNTRIES}
            value={formData.selectedCountries}
            onChange={handleCountryChange}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                // React 19 warns if "key" is provided via spread; extract it explicitly.
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <Chip
                    key={key}
                    label={option}
                    {...tagProps}
                    sx={{
                      bgcolor: primary,
                      color: "#fff",
                      "& .MuiChip-deleteIcon": { color: "#fff", "&:hover": { color: "#f0f0f0" } },
                    }}
                  />
                );
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Select countries.."
                variant="outlined"
                error={!!fieldErrors.countries}
                helperText={fieldErrors.countries}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {params.InputProps.endAdornment}
                      <ArrowDropDownIcon sx={{ color: 'text.secondary', ml: 0.5 }} />
                    </>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    "&:hover fieldset": { borderColor: primary },
                    "&.Mui-focused fieldset": { borderColor: primary, borderWidth: 2 },
                  },
                }}
              />
            )}
            sx={{ mb: 3 }}
          />

          {/* Dates */}
          <Grid container alignItems="flex-start" columnGap={2} sx={{ mb: 1 }}>
            <Grid>
              <Typography sx={{ mb: 0.5, fontWeight: 600, color: 'text.primary', fontSize: 14 }}>Start date</Typography>
              <DatePicker
                value={formData.startDate}
                onChange={(newVal) => setFormData(p => ({ ...p, startDate: newVal }))}
                slotProps={{
                  textField: {
                    placeholder: 'Start Date',
                    sx: {
                      width: 220,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': { borderColor: primary },
                        '&.Mui-focused fieldset': { borderColor: primary, borderWidth: 2 },
                      }
                    }
                  }
                }}
              />
            </Grid>
            <Grid>
              <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 28, mt: 5}} />
            </Grid>
            <Grid>
              <Typography sx={{ mb: 0.5, fontWeight: 600, color: 'text.primary', fontSize: 14 }}>End date</Typography>
              <DatePicker
                value={formData.endDate}
                minDate={formData.startDate || undefined}
                onChange={(newVal) => setFormData(p => ({ ...p, endDate: newVal }))}
                slotProps={{
                  textField: {
                    placeholder: 'End Date',
                    sx: {
                      width: 240,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': { borderColor: primary },
                        '&.Mui-focused fieldset': { borderColor: primary, borderWidth: 2 },
                      }
                    }
                  }
                }}
              />
            </Grid>
          </Grid>
          {fieldErrors.dates && (
            <Typography variant='caption' sx={{ color:'error.main', mb:2, display:'block' }}>{fieldErrors.dates}</Typography>
          )}

          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontStyle: "italic", display: "block", mb: 3, fontSize: 12 }}
          >
            Use this date range to set the amount of days of the trip. The exact dates don't matter and won't be visible
            to your audience.
          </Typography>

          {/* Visibility */}
          <Typography sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary', display: "flex", alignItems: "center", gap: 1 }}>
            <GroupIcon fontSize="small" />
            Who can view your trip?
          </Typography>
          <ToggleButtonGroup
            value={formData.visibility}
            exclusive
            onChange={handleVisibilityChange}
            sx={{
              mb: 4,
                '& .MuiToggleButton-root': {
                  borderColor: 'divider',
                  color: 'text.secondary',
                  borderRadius: 1,
                  px: 3,
                  py: 1,
                  mx: 0.5,
                  textTransform: 'none',
                },
                '& .Mui-selected': {
                  bgcolor: primary,
                  color: '#fff',
                  '&:hover': { bgcolor: '#1565c0' },
                },
            }}
          >
            <ToggleButton value="Trip members">Trip members</ToggleButton>
            <ToggleButton value="My followers">My followers</ToggleButton>
            <ToggleButton value="Everyone">Everyone</ToggleButton>
          </ToggleButtonGroup>

          {/* Bottom actions (left invite, right start) */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setShowInviteSection((s) => !s)}
              sx={{
                borderColor: 'divider',
                color: 'text.primary',
                borderRadius: 2,
                px: 2.5,
                '&:hover': { borderColor: 'text.secondary', backgroundColor: 'action.hover' },
              }}
            >
              {showInviteSection ? 'Hide invite' : 'Invite friends'}
            </Button>

            <Button
              variant="contained"
              onClick={handleStartPlanning}
              disabled={!canStart || submitting}
              sx={{
                bgcolor: primary,
                borderRadius: 2,
                px: 4,
                py: 1.25,
                fontWeight: 700,
                "&:hover": { bgcolor: "#1565c0" },
              }}
            >
              {submitting ? 'Creating...' : 'Start planning'}
            </Button>
          </Box>
        </Box>

        {/* Divider between panes when right side visible (subtle like screenshot) */}
        {showInviteSection && <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(25,118,210,0.15)" }} />}

        {/* Right panel – invite */}
        {showInviteSection && (
          <Box
            sx={{
              flex: 1,
              background: "linear-gradient(135deg, rgba(25,118,210,0.05) 0%, rgba(25,118,210,0.1) 100%)",
              p: 4,
              display: "flex",
              flexDirection: "column",
              minWidth: "20vw",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2.5, fontWeight: 600, color: 'text.primary', textAlign: "left", letterSpacing: 0.2 }}
            >
              Invite a friend to your trip
            </Typography>

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                placeholder="Enter email address"
                value={formData.inviteEmail}
                onChange={handleInputChange("inviteEmail")}
                onKeyDown={(e)=> { if(e.key==='Enter'){ e.preventDefault(); handleInviteFriend(); } }}
                size="medium"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'background.default',
                    '&:hover fieldset': { borderColor: primary },
                    '&.Mui-focused fieldset': { borderColor: primary, borderWidth: 2 },
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleInviteFriend}
                sx={{ bgcolor: primary, borderRadius: 2, px: 3, "&:hover": { bgcolor: "#1565c0" } }}
              >
                Add
              </Button>
            </Box>
            {formData.inviteEmails.length>0 && (
              <Box sx={{ mt:2, display:'flex', flexWrap:'wrap', gap:1 }}>
                {formData.inviteEmails.map(email=> (
                  <Chip key={email} label={email} onDelete={()=> handleRemoveInvite(email)} size='small' sx={{ bgcolor:'primary.main', color:'primary.contrastText' }} />
                ))}
              </Box>
            )}

            <Box sx={{ mt: "auto" }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                You can invite more friends later
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
      </LocalizationProvider>
    </Modal>
  );
};

export default TripCreationModal;