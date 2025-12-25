import React from "react";
import { Tabs, Tab, Box, useTheme } from "@mui/material";
import { Map, BarChart3 } from "lucide-react";

interface SettingsTopNavProps {
  selectedSettingsMenuItem: string;
  onChange: (value: string) => void;
}

const ProfileLayoutNav: React.FC<SettingsTopNavProps> = ({
  selectedSettingsMenuItem,
  onChange,
}) => {
  const theme = useTheme();
  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    onChange(newValue); // already matches the tabs array exactly
  };

  return (
    <Box sx={{ width: "100%", pb: "3%" }}>
      <Tabs
        value={selectedSettingsMenuItem}
        onChange={handleChange}
        variant="fullWidth"
        TabIndicatorProps={{ style: { display: "none" } }}
        sx={{
          '& .MuiTabs-flexContainer': {
            backgroundColor: theme.palette.action.hover,
            borderRadius: '8px',
            padding: '4px',
          },
          '& .MuiTab-root': {
            minHeight: '40px',
            borderRadius: '6px',
            margin: '0 2px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: theme.palette.text.secondary,
            transition: 'all .25s ease',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.08)',
              color: theme.palette.text.primary
            },
            '&.Mui-selected': {
              backgroundColor: theme.palette.background.paper,
              boxShadow: theme.palette.mode === 'light' ? 1 : '0 1px 4px rgba(0,0,0,0.6)',
              color: theme.palette.primary.main,
            },
          },
          '& .MuiTabs-indicator': { display: 'none' },
        }}
      >
        {/* <Tab
          value="RecentPosts"
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
              <FileText size={16} />
              Recent Posts
            </Box>
          }
        /> */}
        <Tab
          value="TravelMap"
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
              <Map size={16} />
              Travel Map
            </Box>
          }
        />
        <Tab
          value="Statistics"
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
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
