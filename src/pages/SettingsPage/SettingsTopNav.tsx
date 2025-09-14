import React from "react";
import { Tabs, Tab, Box } from "@mui/material";
import { User, Bell, Shield, Globe } from "lucide-react";

interface SettingsTopNavProps {
  selectedSettingsMenuItem: string;
  onChange: (value: string) => void;
}

const SettingsTopNav: React.FC<SettingsTopNavProps> = ({
  selectedSettingsMenuItem,
  onChange,
}) => {
  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    onChange(newValue.charAt(0).toUpperCase() + newValue.slice(1));
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs
        value={selectedSettingsMenuItem.toLowerCase()}
        onChange={handleChange}
        variant="fullWidth"
        TabIndicatorProps={{ style: { display: "none" } }} 
        sx={{
          '& .MuiTabs-flexContainer': {
            backgroundColor: 'action.hover',
            borderRadius: '8px',
            padding: '4px',            
          },
          '& .MuiTab-root': {
            minHeight: '40px',
            borderRadius: '6px',
            margin: '0 2px',
            textTransform: 'none',
            fontWeight: 500,
            '&.Mui-selected': {
              backgroundColor: 'background.paper',
              boxShadow: 1,
            },
          },
        }}
      >
        <Tab
          value="profile"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700}}>
              <User size={16} />
              Profile
            </Box>
          }
        />
        <Tab
          value="notifications"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
              <Bell size={16} />
              Notifications
            </Box>
          }
        />
        <Tab
          value="privacy"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
              <Shield size={16} />
              Privacy
            </Box>
          }
        />
        <Tab
          value="preferences"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
              <Globe size={16} />
              Preferences
            </Box>
          }
        />
      </Tabs>
    </Box>
  );
};

export default SettingsTopNav;