import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import ProfileSettings from './ProfileSettings';
import SettingsTopNav from './SettingsTopNav';
import NotificationsSettings from './NotificationsSettings';
import PrivacySettings from './PrivacySettings';
import PreferencesSettings from './PreferencesSettings';

const Settings: React.FC = () => {
  const [selectedSettingsMenuItem, setSelectedSettingsMenuItem] = useState('Profile');

  return (
    <Box sx={{ width: '100%', backgroundColor: 'background.default', minHeight: '100vh' }}>
      <TopBar />
      <Box
        sx={{
          maxWidth: 1100,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 5 },
          display: 'flex',
          gap: { xs: 0, md: 5 },
          alignItems: 'flex-start',
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {/* Sidebar */}
        <Box sx={{ width: { xs: '100%', md: 210 }, flexShrink: 0, position: { md: 'sticky' }, top: 88 }}>
          <Typography sx={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 800,
            fontSize: '1.6rem',
            letterSpacing: '-0.03em',
            color: 'text.primary',
            mb: 0.5,
          }}>
            Settings
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.disabled', mb: { xs: 2, md: 3.5 }, fontFamily: "'Inter', sans-serif" }}>
            Manage your account
          </Typography>
          <SettingsTopNav
            selectedSettingsMenuItem={selectedSettingsMenuItem}
            onChange={setSelectedSettingsMenuItem}
          />
        </Box>

        {/* Content area */}
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {selectedSettingsMenuItem === 'Profile'       && <ProfileSettings />}
          {selectedSettingsMenuItem === 'Notifications' && <NotificationsSettings />}
          {selectedSettingsMenuItem === 'Privacy'       && <PrivacySettings />}
          {selectedSettingsMenuItem === 'Preferences'   && <PreferencesSettings />}
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;
