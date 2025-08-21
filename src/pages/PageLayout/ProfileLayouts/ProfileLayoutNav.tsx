import React from "react";
import { Tabs, Tab, Box } from "@mui/material";
import { FileText, Map, BarChart3 } from "lucide-react";

interface SettingsTopNavProps {
  selectedSettingsMenuItem: string;
  onChange: (value: string) => void;
}

const ProfileLayoutNav: React.FC<SettingsTopNavProps> = ({
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
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
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
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            },
          },
        }}
      >
        <Tab
          value="recentposts"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileText size={16} />
              Recent Post
            </Box>
          }
        />
        <Tab
          value="travelmap"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Map size={16} />
              Travel Map
            </Box>
          }
        />
        <Tab
          value="statistics"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChart3 size={16} />
              Statistics
            </Box>
          }
        />
      </Tabs>
    </Box>
  );
};

export default ProfileLayoutNav;