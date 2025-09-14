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
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
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
  startDate: string;
  endDate: string;
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

// Use theme palette primary dynamically; fallback to constant for non-themed contexts
const primaryFallback = "#1976d2";

const TripCreationModal: React.FC<TripCreationModalProps> = ({ open, onClose }) => {
  const [formData, setFormData] = useState<FormData>({
    tripName: "",
    selectedCountries: [],
    startDate: "",
    endDate: "",
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
      startDate: "",
      endDate: "",
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
      <Box
        sx={(theme) => ({
          width: showInviteSection ? "70vw" : "40vw",
          maxWidth: "92vw",
          height: 620,
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 18px 42px -6px rgba(0,0,0,0.7), 0 4px 12px -2px rgba(0,0,0,0.5)'
            : '0 24px 48px rgba(25,118,210,0.18)',
            // Consider subtle border in dark mode for edge separation
          border: theme.palette.mode === 'dark' ? `1px solid ${theme.palette.divider}` : 'none',
          overflow: 'hidden',
          display: 'flex',
          backdropFilter: theme.palette.mode === 'dark' ? 'blur(6px)' : 'none',
        })}
      >
        {/* Left panel – main form */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ flex: "0 0 40vw", p: 4, overflowY: "auto" }}>
          {/* Header with close */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography sx={(theme) => ({ fontWeight: 600, color: theme.palette.mode === 'dark' ? theme.palette.text.primary : (theme.palette.primary?.main || primaryFallback), display: 'flex', alignItems: 'center', gap: 1 })}>
              <LocationIcon fontSize="small" />
              Trip name
            </Typography>
            <IconButton
              onClick={handleClose}
              sx={{
                color: (theme) => theme.palette.primary?.main || primaryFallback,
                "&:hover": { backgroundColor: "rgba(25,118,210,0.08)" },
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
            sx={(theme) => ({
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': { borderColor: theme.palette.primary?.main || primaryFallback },
                '&.Mui-focused fieldset': { borderColor: theme.palette.primary?.main || primaryFallback, borderWidth: 2 },
              },
            })}
          />

          {/* Countries */}
          <Typography sx={(theme) => ({ mb: 1.5, fontWeight: 600, color: theme.palette.mode === 'dark' ? theme.palette.text.primary : (theme.palette.primary?.main || primaryFallback), display: 'flex', alignItems: 'center', gap: 1 })}>
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
                const { key, ...chipProps } = getTagProps({ index });
                return (
                  <Chip
                    key={key}
                    label={option}
                    {...chipProps}
                    sx={(theme) => ({
                      bgcolor: theme.palette.primary?.main || primaryFallback,
                      color: '#fff',
                      '& .MuiChip-deleteIcon': { color: '#fff', '&:hover': { color: '#f0f0f0' } },
                    })}
                  />
                );
              })
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
                      <ArrowDropDownIcon sx={(theme) => ({ color: theme.palette.primary?.main || primaryFallback, ml: 0.5 })} />
                    </>
                  ),
                }}
                sx={(theme) => ({
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': { borderColor: theme.palette.primary?.main || primaryFallback },
                    '&.Mui-focused fieldset': { borderColor: theme.palette.primary?.main || primaryFallback, borderWidth: 2 },
                  },
                })}
              />
            )}
            sx={{ mb: 3 }}
          />

          {/* Dates */}
          <Grid container alignItems="flex-start" columnGap={2} sx={{ mb: 1 }}>
            <Grid>
              <Typography sx={(theme) => ({ mb: 0.5, fontWeight: 600, color: theme.palette.mode === 'dark' ? theme.palette.text.primary : (theme.palette.primary?.main || primaryFallback), fontSize: 14 })}>Start date</Typography>
              <DatePicker
                value={formData.startDate ? dayjs(formData.startDate) : null}
                onChange={(val: Dayjs | null) => {
                  setFormData(prev => {
                    let endDate = prev.endDate;
                    if (val && endDate && dayjs(endDate).isBefore(val, 'day')) {
                      endDate = val.toISOString();
                    }
                    return { ...prev, startDate: val ? val.toISOString() : '', endDate };
                  });
                }}
                slotProps={{
                  textField: {
                    placeholder: 'Start Date',
                    size: 'medium',
                    sx: {
                      width: 220,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': { borderColor: (theme) => theme.palette.primary?.main || primaryFallback },
                        '&.Mui-focused fieldset': { borderColor: (theme) => theme.palette.primary?.main || primaryFallback, borderWidth: 2 }
                      }
                    }
                  },
                  openPickerIcon: { sx: (theme: any) => ({ color: theme.palette.primary?.main || primaryFallback }) }
                }}
              />
            </Grid>
            <Grid>
              <ArrowForwardIcon sx={(theme) => ({ color: theme.palette.primary?.main || primaryFallback, fontSize: 28, mt: 5 })} />
            </Grid>
            <Grid>
              <Typography sx={(theme) => ({ mb: 0.5, fontWeight: 600, color: theme.palette.mode === 'dark' ? theme.palette.text.primary : (theme.palette.primary?.main || primaryFallback), fontSize: 14 })}>End date</Typography>
              <DatePicker
                value={formData.endDate ? dayjs(formData.endDate) : null}
                minDate={formData.startDate ? dayjs(formData.startDate) : undefined}
                onChange={(val: Dayjs | null) => {
                  setFormData(prev => ({ ...prev, endDate: val ? val.toISOString() : '' }));
                }}
                slotProps={{
                  textField: {
                    placeholder: 'End Date',
                    size: 'medium',
                    sx: {
                      width: 240,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': { borderColor: (theme) => theme.palette.primary?.main || primaryFallback },
                        '&.Mui-focused fieldset': { borderColor: (theme) => theme.palette.primary?.main || primaryFallback, borderWidth: 2 }
                      }
                    }
                  },
                  openPickerIcon: { sx: (theme: any) => ({ color: theme.palette.primary?.main || primaryFallback }) }
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
          <Typography sx={(theme) => ({ mb: 1.5, fontWeight: 600, color: theme.palette.mode === 'dark' ? theme.palette.text.primary : (theme.palette.primary?.main || primaryFallback), display: 'flex', alignItems: 'center', gap: 1 })}>
            <GroupIcon fontSize="small" />
            Who can view your trip?
          </Typography>
          <ToggleButtonGroup
            value={formData.visibility}
            exclusive
            onChange={handleVisibilityChange}
            sx={(theme) => ({
              mb: 4,
              '& .MuiToggleButton-root': {
                borderColor: theme.palette.mode === 'dark' ? theme.palette.divider : '#e0e0e0',
                color: theme.palette.mode === 'dark' ? theme.palette.text.secondary : '#666',
                borderRadius: 1,
                px: 3,
                py: 1,
                mx: 0.5,
                textTransform: 'none',
              },
              '& .Mui-selected': {
                bgcolor: theme.palette.primary?.main || primaryFallback,
                color: '#fff',
                '&:hover': { bgcolor: theme.palette.primary?.dark || '#1565c0' },
              },
            })}
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
                borderColor: (theme) => theme.palette.primary?.main || primaryFallback,
                color: (theme) => theme.palette.mode === 'dark' ? theme.palette.text.primary : (theme.palette.primary?.main || primaryFallback),
                borderRadius: 2,
                px: 2.5,
                '&:hover': (theme) => ({ borderColor: theme.palette.primary?.dark || '#1565c0', backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(25,118,210,0.08)' }),
              }}
            >
              Invite friends
            </Button>

            <Button
              variant="contained"
              onClick={handleStartPlanning}
              disabled={!canStart}
              sx={(theme) => ({
                bgcolor: theme.palette.primary?.main || primaryFallback,
                borderRadius: 2,
                px: 4,
                py: 1.25,
                fontWeight: 700,
                '&:hover': { bgcolor: theme.palette.primary?.dark || '#1565c0' },
              })}
            >
              Start planning
            </Button>
          </Box>
  </Box>
  </LocalizationProvider>

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
              sx={(theme) => ({ mb: 2.5, fontWeight: 600, color: theme.palette.mode === 'dark' ? theme.palette.text.primary : (theme.palette.primary?.main || primaryFallback), textAlign: 'left', letterSpacing: 0.2 })}
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
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.default : '#fff',
                    '&:hover fieldset': { borderColor: (theme) => theme.palette.primary?.main || primaryFallback },
                    '&.Mui-focused fieldset': { borderColor: (theme) => theme.palette.primary?.main || primaryFallback, borderWidth: 2 },
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleInviteFriend}
                sx={(theme) => ({ bgcolor: theme.palette.primary?.main || primaryFallback, borderRadius: 2, px: 3, '&:hover': { bgcolor: theme.palette.primary?.dark || '#1565c0' } })}
              >
                Add
              </Button>
            </Box>

            <Box sx={{ mt: "auto" }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                You can invite more friends later
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default TripCreationModal;