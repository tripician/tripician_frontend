import React, { useState } from 'react';
import { Box } from '@mui/material';
import NavigationPannel from '../PageLayout/CommonLayouts/NavigationPanel';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import ProfileSettings from './ProfileSettings';
import SettingsTopNav from './SettingsTopNav';
import NotificationsSettings from './NotificationsSettings';
import PrivacySettings from './PrivacySettings';
import PreferencesSettings from './PreferencesSettings';

const Settings: React.FC = () => {
  const [selectedMenuItem, setSelectedMenuItem] = useState('Settings');

  // 👉 for top nav (Profile, Notifications, Privacy, Preferences)
  const [selectedSettingsMenuItem, setSelectedSettingsMenuItem] = useState('Profile');

  const handleMenuItemChange = (itemName: string) => {
    setSelectedMenuItem(itemName);
  };

  return (
    <NavigationPannel onMenuItemChange={handleMenuItemChange}>
      <Box sx={{ width: "100%", backgroundColor: "#f5f5f5", minHeight: "calc(100vh - 100px)" }}>
  <TopBar selectedMenuItem={selectedMenuItem} />

  {/* background full width */}
  <Box
    sx={{
      width: "100%",
      backgroundColor: "#e1e0e0ff",
      minHeight: "100vh",
      py: 4,
    }}
  >
    {/* content container (same width as forms/cards) */}
    <Box
      sx={{
        maxWidth: "1200px", // keeps consistent width
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

    </NavigationPannel>
  );
};

export default Settings;
