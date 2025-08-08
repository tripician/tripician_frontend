import { Box, Typography } from "@mui/material";
import UserProfileBanner from "./UserProfileBanner";
import NavigationPannel from "../PageLayout/CommonLayouts/NavigationPannel";
import { useState } from "react";
import TopBar from "../PageLayout/CommonLayouts/TopBar";

const Profile: React.FC = () => {
  const [selectedMenuItem, setSelectedMenuItem] = useState('Profile');
    const handleMenuItemChange = (itemName: string) => {
    setSelectedMenuItem(itemName);
  };
  return (
    <NavigationPannel onMenuItemChange={handleMenuItemChange}>
      <Box sx={{ width: "100%", backgroundColor: "#e1e0e0ff" }}>
        <TopBar selectedMenuItem = {selectedMenuItem}/>
        <UserProfileBanner />
        <Box sx={{ p: 2 }}>
          <Typography variant="h4">About Me</Typography>
          <Typography variant="body1">
            This is a brief description about the user.
          </Typography>
        </Box>        
      </Box>
    </NavigationPannel>
  );
};

export default Profile;

