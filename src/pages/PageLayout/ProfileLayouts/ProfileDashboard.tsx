import React, { useState } from "react";
import {
  Box,
  Card,
  Container,
} from "@mui/material";
import ProfileLayoutNav from "./ProfileLayoutNav";
import Statistics from "../../../components/ProfileComponents/Statistics";

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
      {isActive && <Box sx={{ p: 0 }}>{children}</Box>}
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
          p: 0,
        }}
      >
        <Box sx={{ minHeight: "100vh", m: 0,p: 0 }}>
          <Container maxWidth={false} sx={{ p: 0, m: 0, width: '100%' }}>
            {/* Panels */}
            {tabs.map((tab, index) => (
              <TabPanel key={index} value={activeTab} index={index}>
                {tab === "TravelMap" && (
                  <Statistics />
                )}
                {tab === "Statistics" && (
                  <Statistics />
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
