import React, { useState } from 'react';
import { Box } from '@mui/material';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import ProfileSettings from './ProfileSettings';
import SettingsTopNav from './SettingsTopNav';
import NotificationsSettings from './NotificationsSettings';
import PrivacySettings from './PrivacySettings';
import PreferencesSettings from './PreferencesSettings';

const Settings: React.FC = () => {
  // 👉 for top nav (Profile, Notifications, Privacy, Preferences)
  const [selectedSettingsMenuItem, setSelectedSettingsMenuItem] = useState('Profile');
  // (removed selectedMenuItem state which is no longer needed by TopBar)

  return (
    <Box sx={{ width: "100%", backgroundColor: "background.default", minHeight: "calc(100vh - 100px)" }}>
  <TopBar />

      {/* background full width */}
      <Box
        sx={{
          width: "100%",
          backgroundColor: "background.default",
          minHeight: "100vh",
          py: 4,
        }}
      >
        {/* content container (same width as forms/cards) */}
        <Box
          sx={{
            maxWidth: "100%", // keeps consistent width
            mx: "auto", // centers horizontally
            display: "flex",
            flexDirection: "column",
            gap: 3,
            px: { xs: 2, md: 4 },
          }}
        >
          {/* Top nav bar */}
          <SettingsTopNav
            selectedSettingsMenuItem={selectedSettingsMenuItem}
            onChange={setSelectedSettingsMenuItem}
          />

          {/* Conditional rendering */}
          {selectedSettingsMenuItem === "Profile" && <ProfileSettings />}
          {selectedSettingsMenuItem === "Notifications" && <NotificationsSettings/>}
          {selectedSettingsMenuItem === "Privacy" && <PrivacySettings/>}
          {selectedSettingsMenuItem === "Preferences" && <PreferencesSettings/>}
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;
