import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Select,
  MenuItem,
  FormControl,
  type SelectChangeEvent,
} from "@mui/material";
import { KeyboardArrowDown } from "@mui/icons-material";

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

const PrivacySettings: React.FC = () => {
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [privacySettings, setPrivacySettings] = useState<PrivacySetting[]>([
    {
      id: "show_travel_history",
      title: "Show Travel History",
      description: "Display your visited countries and trips",
      enabled: true,
    },
    {
      id: "show_contact_information",
      title: "Show Contact Information",
      description: "Allow others to see your contact details",
      enabled: false,
    },
    {
      id: "allow_direct_messages",
      title: "Allow Direct Messages",
      description: "Let other travelers send you messages",
      enabled: true,
    },
  ]);

  const handleVisibilityChange = (event: SelectChangeEvent) => {
    setProfileVisibility(event.target.value);
  };

  const handlePrivacyToggle = (id: string) => {
    setPrivacySettings(prev =>
      prev.map(item =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };


  const PrivacyItem = ({ 
    item, 
    onToggle 
  }: { 
    item: PrivacySetting; 
    onToggle: (id: string) => void;
  }) => (
    <Box sx={{ mb: 3, '&:last-child': { mb: 0 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 500, 
              color: 'text.primary',
              mb: 0.5,
              fontSize: '0.95rem'
            }}
          >
            {item.title}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              fontSize: '0.875rem',
              lineHeight: 1.4
            }}
          >
            {item.description}
          </Typography>
        </Box>
        <Switch
          checked={item.enabled}
          onChange={() => onToggle(item.id)}
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: '#3b82f6',
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: '#3b82f6',
            },
            '& .MuiSwitch-track': {
              backgroundColor: '#d1d5db',
            },
          }}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: "100%"}}>
      {/* Profile Privacy Section */}
      <Card
        sx={{
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
              mb: 4,
              color: 'text.primary',
              fontSize: '1.1rem'
            }}
          >
            Profile Privacy
          </Typography>

          {/* Profile Visibility */}
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="body1" 
              sx={{ 
                fontWeight: 500, 
                color: 'text.primary',
                mb: 1.5,
                fontSize: '0.95rem'
              }}
            >
              Profile Visibility
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={profileVisibility}
                onChange={handleVisibilityChange}
                IconComponent={KeyboardArrowDown}
                MenuProps={{
                  PaperProps: {
                    sx: (theme) => ({
                      backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
                      borderRadius: 2,
                      mt: 1,
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 4px 18px -2px rgba(0,0,0,0.6)'
                        : '0 6px 20px -2px rgba(0,0,0,0.15)',
                      '& .MuiMenuItem-root': {
                        fontSize: '0.85rem',
                        '&.Mui-selected': {
                          backgroundColor: (theme.palette.mode === 'dark'
                            ? theme.palette.primary.dark
                            : theme.palette.primary.light) + '22',
                        },
                        '&:hover': {
                          backgroundColor: (theme.palette.mode === 'dark'
                            ? theme.palette.primary.dark
                            : theme.palette.primary.light) + '33',
                        }
                      }
                    })
                  }
                }}
                sx={(theme) => ({
                  borderRadius: 1.5,
                  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f9fafb',
                  '& .MuiSelect-select': {
                    py: 1.1,
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.mode === 'dark' ? theme.palette.divider : '#d1d5db',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.mode === 'dark' ? theme.palette.text.secondary : '#9ca3af',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 1.5,
                  },
                  transition: 'background-color .25s ease, border-color .25s ease'
                })}
              >
                <MenuItem value="public">Public - Anyone can see your profile</MenuItem>
                <MenuItem value="friends">Friends - Only friends can see your profile</MenuItem>
                <MenuItem value="private">Private - Only you can see your profile</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Privacy Settings */}
          {privacySettings.map((item) => (
            <PrivacyItem 
              key={item.id}
              item={item} 
              onToggle={handlePrivacyToggle}
            />
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PrivacySettings;