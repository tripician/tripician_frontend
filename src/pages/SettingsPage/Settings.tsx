import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import NavigationPannel from '../PageLayout/CommonLayouts/NavigationPanel';
import TopBar from '../PageLayout/CommonLayouts/TopBar';

const Settings: React.FC = () => {
  const [selectedMenuItem, setSelectedMenuItem] = useState('Settings');

  const handleMenuItemChange = (itemName: string) => {
    setSelectedMenuItem(itemName);
  };

  return (
    <NavigationPannel onMenuItemChange={handleMenuItemChange}>
      <Box sx={{ width: "100%", backgroundColor: "#f5f5f5", minHeight: "calc(100vh - 100px)" }}>
        <TopBar selectedMenuItem={selectedMenuItem} />
        
        <Box sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Manage your account preferences and application settings. This feature is coming soon!
          </Typography>
          
          {/* Add some placeholder content */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Settings Categories:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>• Account & Profile Settings</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>• Privacy & Security</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>• Notification Preferences</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>• Language & Region</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>• Data & Storage</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>• Help & Support</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </NavigationPannel>
  );
};

export default Settings;
