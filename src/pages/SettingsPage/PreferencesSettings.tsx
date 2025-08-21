import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Button,
  type SelectChangeEvent,
} from "@mui/material";
import { KeyboardArrowDown, Save, RestartAlt } from "@mui/icons-material";

const PreferencesSettings: React.FC = () => {
  const [language, setLanguage] = useState("english");
  const [timezone, setTimezone] = useState("thailand");
  const [currency, setCurrency] = useState("usd");
  const [travelStyle, setTravelStyle] = useState("backpacker");
  const [budgetRange, setBudgetRange] = useState("30-50");

  const handleLanguageChange = (event: SelectChangeEvent) => {
    setLanguage(event.target.value);
  };

  const handleTimezoneChange = (event: SelectChangeEvent) => {
    setTimezone(event.target.value);
  };

  const handleCurrencyChange = (event: SelectChangeEvent) => {
    setCurrency(event.target.value);
  };

  const handleTravelStyleChange = (event: SelectChangeEvent) => {
    setTravelStyle(event.target.value);
  };

  const handleBudgetRangeChange = (event: SelectChangeEvent) => {
    setBudgetRange(event.target.value);
  };

  const handleSaveSettings = () => {
    // Handle save settings logic here
    console.log("Settings saved:", {
      language,
      timezone,
      currency,
      travelStyle,
      budgetRange,
    });
  };

  const handleResetToDefaults = () => {
    setLanguage("english");
    setTimezone("thailand");
    setCurrency("usd");
    setTravelStyle("backpacker");
    setBudgetRange("30-50");
  };

  const selectStyles = {
    borderRadius: 1.5,
    backgroundColor: "#f9fafb",
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#d1d5db',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#9ca3af',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3b82f6',
    },
  };

  const SelectField = ({ 
    label, 
    value, 
    onChange, 
    options 
  }: { 
    label: string; 
    value: string; 
    onChange: (event: SelectChangeEvent) => void;
    options: { value: string; label: string }[];
  }) => (
    <Box sx={{ mb: 3 }}>
      <Typography 
        variant="body1" 
        sx={{ 
          fontWeight: 500, 
          color: "#374151",
          mb: 1.5,
          fontSize: "0.95rem"
        }}
      >
        {label}
      </Typography>
      <FormControl fullWidth size="small">
        <Select
          value={value}
          onChange={onChange}
          IconComponent={KeyboardArrowDown}
          sx={selectStyles}
        >
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 2 }}>
      {/* Language & Region Section */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e5e7eb",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600, 
              mb: 3,
              color: "#374151",
              fontSize: "1.1rem"
            }}
          >
            Language & Region
          </Typography>

          <SelectField
            label="Language"
            value={language}
            onChange={handleLanguageChange}
            options={[
              { value: "english", label: "English" },
              { value: "spanish", label: "Spanish" },
              { value: "french", label: "French" },
              { value: "german", label: "German" },
              { value: "chinese", label: "Chinese" },
            ]}
          />

          <SelectField
            label="Timezone"
            value={timezone}
            onChange={handleTimezoneChange}
            options={[
              { value: "thailand", label: "Thailand (UTC+7)" },
              { value: "singapore", label: "Singapore (UTC+8)" },
              { value: "japan", label: "Japan (UTC+9)" },
              { value: "australia", label: "Australia (UTC+10)" },
              { value: "usa_est", label: "USA Eastern (UTC-5)" },
              { value: "usa_pst", label: "USA Pacific (UTC-8)" },
              { value: "uk", label: "United Kingdom (UTC+0)" },
            ]}
          />

          <SelectField
            label="Preferred Currency"
            value={currency}
            onChange={handleCurrencyChange}
            options={[
              { value: "usd", label: "USD - US Dollar" },
              { value: "eur", label: "EUR - Euro" },
              { value: "gbp", label: "GBP - British Pound" },
              { value: "thb", label: "THB - Thai Baht" },
              { value: "sgd", label: "SGD - Singapore Dollar" },
              { value: "jpy", label: "JPY - Japanese Yen" },
              { value: "aud", label: "AUD - Australian Dollar" },
            ]}
          />
        </CardContent>
      </Card>

      {/* Travel Preferences Section */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e5e7eb",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600, 
              mb: 3,
              color: "#374151",
              fontSize: "1.1rem"
            }}
          >
            Travel Preferences
          </Typography>

          <SelectField
            label="Travel Style"
            value={travelStyle}
            onChange={handleTravelStyleChange}
            options={[
              { value: "backpacker", label: "Backpacker" },
              { value: "budget", label: "Budget Traveler" },
              { value: "mid_range", label: "Mid-range" },
              { value: "luxury", label: "Luxury" },
              { value: "business", label: "Business Traveler" },
              { value: "family", label: "Family Travel" },
            ]}
          />

          <SelectField
            label="Typical Budget Range (per day)"
            value={budgetRange}
            onChange={handleBudgetRangeChange}
            options={[
              { value: "under-30", label: "Under $30" },
              { value: "30-50", label: "$30 - $50" },
              { value: "50-100", label: "$50 - $100" },
              { value: "100-200", label: "$100 - $200" },
              { value: "200-500", label: "$200 - $500" },
              { value: "over-500", label: "Over $500" },
            ]}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-start" }}>
        <Button 
          variant="contained"
          startIcon={<Save />}
          onClick={handleSaveSettings}
          sx={{ 
            textTransform: "none",
            fontWeight: 500,
            px: 3,
            py: 1.5,
            borderRadius: 1.5,
            backgroundColor: "#3b82f6",
            "&:hover": {
              backgroundColor: "#2563eb",
            },
          }}
        >
          Save All Settings
        </Button>
        <Button 
          variant="text"
          startIcon={<RestartAlt />}
          onClick={handleResetToDefaults}
          sx={{ 
            textTransform: "none",
            fontWeight: 500,
            px: 3,
            py: 1.5,
            borderRadius: 1.5,
            color: "#6b7280",
            "&:hover": {
              backgroundColor: "#f3f4f6",
            },
          }}
        >
          Reset to Defaults
        </Button>
      </Box>
    </Box>
  );
};

export default PreferencesSettings;