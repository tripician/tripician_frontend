import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileSettings from './ProfileSettings';
import SettingsTopNav from './SettingsTopNav';
import NotificationsSettings from './NotificationsSettings';
import PrivacySettings from './PrivacySettings';
import PreferencesSettings from './PreferencesSettings';
import { staggerContainer, staggerItem, tabContent } from '../../utils/animations';

const Settings: React.FC = () => {
  const [selectedSettingsMenuItem, setSelectedSettingsMenuItem] = useState('Profile');

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
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
      </motion.div>
    </Box>
  );
};

export default Settings;
