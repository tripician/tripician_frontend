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
          "& .MuiTabs-flexContainer": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
            borderRadius: "8px",
            padding: "4px",
          },
          "& .MuiTab-root": {
            minHeight: "40px",
            borderRadius: "6px",
            margin: "0 2px",
            textTransform: "none",
            fontWeight: 500,
            "&.Mui-selected": {
              backgroundColor: "white",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            },
          },
        }}
      >
        <Tab
          value="RecentPosts"
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
              <FileText size={16} />
              Recent Posts
            </Box>
          }
        />
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
