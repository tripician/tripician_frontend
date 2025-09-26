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
import {
  Close as CloseIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from "@mui/icons-material";

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
  inviteEmail: string;
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
];

const primary = "#1976d2";

const TripCreationModal: React.FC<TripCreationModalProps> = ({ open, onClose }) => {
  const [formData, setFormData] = useState<FormData>({
    tripName: "",
    selectedCountries: [],
    startDate: null,
    endDate: null,
    visibility: "My followers",
    inviteEmail: "",
  });

  const [showInviteSection, setShowInviteSection] = useState(true);

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
    if (formData.inviteEmail.trim()) {
      // integrate invite flow
      console.log("Inviting:", formData.inviteEmail);
      setFormData((p) => ({ ...p, inviteEmail: "" }));
    }
  };

  const handleStartPlanning = () => {
    console.log("Trip data:", formData);
    handleClose();
  };

  const resetForm = () => {
    setFormData({
      tripName: "",
      selectedCountries: [],
    startDate: null,
    endDate: null,
      visibility: "My followers",
      inviteEmail: "",
    });
    setShowInviteSection(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canStart = formData.tripName.trim().length > 0 && formData.selectedCountries.length > 0;

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
        }}
      >
        {/* Left panel – main form */}
        <Box sx={{ flex: "0 0 40vw", p: 4, overflowY: "auto" }}>
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
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  sx={{
                    bgcolor: primary,
                    color: "#fff",
                    "& .MuiChip-deleteIcon": { color: "#fff", "&:hover": { color: "#f0f0f0" } },
                  }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Select countries.."
                variant="outlined"
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
              disabled={!canStart}
              sx={{
                bgcolor: primary,
                borderRadius: 2,
                px: 4,
                py: 1.25,
                fontWeight: 700,
                "&:hover": { bgcolor: "#1565c0" },
              }}
            >
              Start planning
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