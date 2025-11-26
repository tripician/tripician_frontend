import React, { useState } from "react";
import {
  Box,
  Card,
  Container,
  Typography,
} from "@mui/material";
import ProfileLayoutNav from "./ProfileLayoutNav";
import RecentPosts from "../../../components/ProfileComponents/RecentPosts";

// const tabs = ["RecentPosts", "TravelMap", "Statistics"] as const;
const tabs = ["TravelMap", "Statistics"] as const;

// TabPanel
type TabPanelProps = { children: React.ReactNode; value: number; index: number };

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  const isActive = value === index;
  return (
    <div
      role="tabpanel"
      hidden={!isActive}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
    >
      {isActive && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

// Main Component
const ProfileDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      {/* Top navigation */}
      <ProfileLayoutNav
        selectedSettingsMenuItem={tabs[activeTab] ?? ""}
        onChange={(value: string | number) => {
          const index =
            typeof value === "number"
              ? value
              : Math.max(0, tabs.findIndex((t) => t === value));
          setActiveTab(index);
        }}
      />

      <Card
        sx={{
          height: "100%",
          borderRadius: "8px",
        }}
      >
        <Box sx={{ minHeight: "100vh" }}>
          <Container maxWidth="lg" sx={{ py: 4, display: "flex" }}>
            {/* Panels */}
            {tabs.map((tab, index) => (
              <TabPanel key={index} value={activeTab} index={index}>
                {/* {tab === "RecentPosts" && <RecentPosts />} */}
                {tab === "TravelMap" && (
                  <Typography>Travel Map feature coming soon...</Typography>
                )}
                {tab === "Statistics" && (
                  <Typography>Statistics will be shown here...</Typography>
                )}
              </TabPanel>
            ))}
          </Container>
        </Box>
      </Card>
    </>
  );
};

export default ProfileDashboard;
