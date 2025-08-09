import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import NavigationPannel from '../PageLayout/CommonLayouts/NavigationPannel';
import TopBar from '../PageLayout/CommonLayouts/TopBar';

const Settings: React.FC = () => {
  const [selectedMenuItem, setSelectedMenuItem] = useState('Settings');

  const handleMenuItemChange = (itemName: string) => {
    setSelectedMenuItem(itemName);
  };

  return (
    <NavigationPannel onMenuItemChange={handleMenuItemChange}>
      <Box sx={{ width: "100%", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
        <TopBar selectedMenuItem={selectedMenuItem} />
        
        <Box sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your account preferences and application settings. This feature is coming soon!
          </Typography>
        </Box>
      </Box>
    </NavigationPannel>
  );
};

export default Settings;
