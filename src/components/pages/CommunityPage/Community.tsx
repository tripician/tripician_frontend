import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import NavigationPannel from '../PageLayout/CommonLayouts/NavigationPannel';
import TopBar from '../PageLayout/CommonLayouts/TopBar';

const Community: React.FC = () => {
  const [selectedMenuItem, setSelectedMenuItem] = useState('Community');

  const handleMenuItemChange = (itemName: string) => {
    setSelectedMenuItem(itemName);
  };

  return (
    <NavigationPannel onMenuItemChange={handleMenuItemChange}>
      <Box sx={{ width: "100%", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
        <TopBar selectedMenuItem={selectedMenuItem} />
        
        <Box sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Community
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect with fellow travelers and share your experiences. This feature is coming soon!
          </Typography>
        </Box>
      </Box>
    </NavigationPannel>
  );
};

export default Community;
