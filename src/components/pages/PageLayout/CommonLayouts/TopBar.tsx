import React, { useState } from "react";
import { Avatar, Menu, MenuItem, Box, Typography, IconButton, Tooltip, Button } from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SearchBar from "../CommonComponents/SearchBar";
import { useNavigate } from 'react-router-dom';
import { useAuthToken } from '../../../../hooks/useAuth0Token';
import {Add as AddIcon} from '@mui/icons-material';


interface TopBarProps  {
    selectedMenuItem: string; // Add this prop
}

const TopBar: React.FC<TopBarProps > = ({selectedMenuItem}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const { logout, isAuthenticated } = useAuthToken();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        className: "mb-4",
        position: "sticky",
        zIndex: 1100,
        backgroundColor: "#f5f5f5",
        padding: "1% 0 1% 0",
      }}
    >
    
      <Typography variant="h5" fontWeight={600} color="text.primary">
        {selectedMenuItem}
      </Typography>

      <SearchBar/>

      <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        <IconButton>
          <NotificationsNoneIcon sx={{ color: "text.secondary" }} fontSize="medium" />
        </IconButton>

        {/* Create Trip Button */}
        <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              mt: 0,
              backgroundColor: '#1976d2',
              color: '#f0f0f0',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#2391ffff',
                color: '#f0f0f0',
              },
            }}
          >
            Create trip
        </Button>
      </Box>
    </Box>
  );
};

export default TopBar;

