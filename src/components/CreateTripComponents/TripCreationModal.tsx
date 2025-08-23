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
  Divider,
  Grid,
  InputAdornment,
} from "@mui/material";
import {
  Close as CloseIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowForwardIcon,
  LocationOn as LocationIcon,
  GroupAdd as GroupAddIcon,
  Search as SearchIcon,
  Send as SendIcon,
} from "@mui/icons-material";

interface CreateTripModalProps {
  open: boolean;
  onClose: () => void;
}

const CreateTripModal: React.FC<CreateTripModalProps> = ({ open, onClose }) => {
  const [tripName, setTripName] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [travelStyle, setTravelStyle] = useState<string | null>("Relaxed");
  const [showInviteSection, setShowInviteSection] = useState(false);

  const handleDateChange = (_event: ChangeEvent<{}>, newValue: string[]) => {
    setSelectedDates(newValue);
  };

  const handleStyleChange = (_event: React.MouseEvent<HTMLElement>, newStyle: string | null) => {
    if (newStyle !== null) setTravelStyle(newStyle);
  };

  const handleInviteClick = () => setShowInviteSection(true);

  const handleClose = () => {
    setShowInviteSection(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "70vw", // keep width fixed
          height: "85vh",
          bgcolor: "background.paper",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(25, 118, 210, 0.15)",
          overflow: "hidden",
          display: "flex",
          outline: "none",
        }}
      >
        {/* Left Content */}
        <Box
          sx={{
            flex: 1,
            p: 4,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            transition: "all 0.5s ease",
          }}
        >
          {/* Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h5" fontWeight="bold" color="primary">
              Create Your Trip
            </Typography>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Trip Name */}
          <TextField
            label="Trip Name"
            fullWidth
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Destination */}
          <Autocomplete
            freeSolo
            options={["Paris", "London", "New York"]}
            value={destination}
            onChange={(_e, newValue) => setDestination(newValue ?? "")}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Destination"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            sx={{ mb: 3 }}
          />

          {/* Dates */}
          <Autocomplete
            multiple
            freeSolo
            options={["2025-08-20", "2025-08-21"]}
            value={selectedDates}
            onChange={handleDateChange}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} {...getTagProps({ index })} color="primary" />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Dates"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            sx={{ mb: 3 }}
          />

          {/* Travel Style */}
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Travel Style
          </Typography>
          <ToggleButtonGroup
            value={travelStyle}
            exclusive
            onChange={handleStyleChange}
            sx={{ mb: 3 }}
          >
            <ToggleButton value="Relaxed">Relaxed</ToggleButton>
            <ToggleButton value="Adventurous">Adventurous</ToggleButton>
            <ToggleButton value="Luxury">Luxury</ToggleButton>
          </ToggleButtonGroup>

          {/* Invite Button */}
          <Button
            variant="outlined"
            startIcon={<GroupAddIcon />}
            onClick={handleInviteClick}
            sx={{ borderRadius: "12px", mb: 3 }}
          >
            Invite Friends
          </Button>

          <Divider sx={{ my: 2 }} />

          {/* Action Buttons */}
          <Grid container justifyContent="flex-end" spacing={2}>
            <Grid>
              <Button variant="outlined" onClick={handleClose}>
                Cancel
              </Button>
            </Grid>
            <Grid>
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{ borderRadius: "12px" }}
              >
                Create Trip
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Right: Invite Section */}
        <Box
          sx={{
            width: "30vw",
            background: "linear-gradient(135deg, rgba(25, 118, 210, 0.05), rgba(25, 118, 210, 0.1))",
            p: 4,
            borderLeft: "1px solid rgba(25, 118, 210, 0.2)",
            display: "flex",
            flexDirection: "column",
            transition: "all 0.5s ease",
            transform: showInviteSection ? "translateX(0)" : "translateX(100%)",
            opacity: showInviteSection ? 1 : 0,
            pointerEvents: showInviteSection ? "auto" : "none",
            position: "absolute",
            right: 0,
            top: 0,
            height: "100%",
          }}
        >
          <Typography variant="h6" fontWeight="600" mb={2} color="primary">
            Invite Friends
          </Typography>

          <TextField
            placeholder="Search by name or email"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {["Alice", "Bob", "Charlie"].map((name, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1,
                  borderRadius: "8px",
                  "&:hover": { bgcolor: "rgba(25, 118, 210, 0.08)" },
                }}
              >
                <Typography>{name}</Typography>
                <IconButton color="primary">
                  <AddIcon />
                </IconButton>
              </Box>
            ))}
          </Box>

          <Button
            variant="contained"
            fullWidth
            endIcon={<SendIcon />}
            sx={{ borderRadius: "12px", mt: 2 }}
          >
            Send Invites
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default CreateTripModal;
