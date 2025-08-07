import React, { useState } from "react";
import { Avatar, Menu, MenuItem, Box, Typography, IconButton } from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SearchBar from "../PageLayout/Common/SearchBar";
import { useNavigate } from 'react-router-dom';
import { useAuthToken } from '../../../hooks/useAuth0Token';

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
        top: 0,
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

        <Avatar
          onClick={handleClick}
          src={import.meta.env.VITE_NO_PROFILE_PIC_URL}
          sx={{ width: 36, height: 36, cursor: "pointer" }}
        />
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem onClick={handleClose}>Account</MenuItem>
          <MenuItem onClick={handleLogout} 
                    disabled={isLoggingOut}
                    className="logout-btn"
          >
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default TopBar;
function setIsLoggingOut(arg0: boolean) {
  throw new Error("Function not implemented.");
}

