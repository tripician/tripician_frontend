import React from 'react';
import { Box, Typography } from '@mui/material';
import NavigationPannel from '../PageLayout/CommonLayouts/NavigationPanel';
import TopBar from '../PageLayout/CommonLayouts/TopBar';

const Community: React.FC = () => {
  const handleMenuItemChange = (_itemName: string) => {
    // Navigation panel can still report changes; currently unused here.
  };

  return (
    <NavigationPannel onMenuItemChange={handleMenuItemChange}>
      <Box sx={{ width: "100%", backgroundColor: "#f5f5f5", minHeight: "calc(100vh - 100px)" }}>
  <TopBar />
        
        <Box sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Community
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Connect with fellow travelers and share your experiences. This feature is coming soon!
          </Typography>
          
          {/* Add some placeholder content to demonstrate scrolling */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Coming Soon Features:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>• Share your travel stories and photos</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>• Connect with local guides and travelers</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>• Join group trips and adventures</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>• Get travel tips and recommendations</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>• Rate and review destinations</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>• Create travel buddy connections</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </NavigationPannel>
  );
};

export default Community;
