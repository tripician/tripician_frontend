import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileSettings from './ProfileSettings';
import SettingsTopNav from './SettingsTopNav';
import NotificationsSettings from './NotificationsSettings';
import PrivacySettings from './PrivacySettings';
import PreferencesSettings from './PreferencesSettings';
import CreditsSettings from './CreditsSettings';
import { staggerContainer, staggerItem, tabContent } from '../../utils/animations';

// Deep-linkable tabs, e.g. /settings?tab=credits from the credit usage balloon.
const TAB_FROM_PARAM: Record<string, string> = {
  profile: 'Profile',
  notifications: 'Notifications',
  privacy: 'Privacy',
  preferences: 'Preferences',
  credits: 'Credits',
};

const Settings: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = TAB_FROM_PARAM[(searchParams.get('tab') || '').toLowerCase()] || 'Profile';
  const [selectedSettingsMenuItem, setSelectedSettingsMenuItem] = useState(initialTab);

  return (
    <Box sx={{ width: '100%', backgroundColor: 'background.default', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.1, 0.1)}
      >
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
        <motion.div variants={staggerItem}>
        <Box sx={{ width: { xs: '100%', md: 210 }, flexShrink: 0, position: { md: 'sticky' }, top: 88 }}>
          <Typography sx={{
            fontWeight: 700,
            fontSize: '1.6rem',
            letterSpacing: '-0.03em',
            color: 'text.primary',
            mb: 0.5,
          }}>
            Settings
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.disabled', mb: { xs: 2, md: 3.5 },}}>
            Make Tripician yours
          </Typography>
          <SettingsTopNav
            selectedSettingsMenuItem={selectedSettingsMenuItem}
            onChange={setSelectedSettingsMenuItem}
          />
        </Box>
        </motion.div>

        {/* Content area with animated tab transitions */}
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedSettingsMenuItem}
              variants={tabContent}
              initial="initial"
              animate="animate"
              exit="exit"
              inherit={false}
            >
              {selectedSettingsMenuItem === 'Profile'       && <ProfileSettings />}
              {selectedSettingsMenuItem === 'Notifications' && <NotificationsSettings />}
              {selectedSettingsMenuItem === 'Privacy'       && <PrivacySettings />}
              {selectedSettingsMenuItem === 'Preferences'   && <PreferencesSettings />}
              {selectedSettingsMenuItem === 'Credits'       && <CreditsSettings />}
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
      </motion.div>
    </Box>
  );
};

export default Settings;
