import React, { useState } from "react";
import { Avatar, Menu, MenuItem, Box, Typography, IconButton } from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";

interface TopBarProps  {
    selectedMenuItem: string; // Add this prop
}

const TopBar: React.FC<TopBarProps > = ({selectedMenuItem}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
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

      <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        <IconButton>
          <NotificationsNoneIcon sx={{ color: "text.secondary" }} fontSize="medium" />
        </IconButton>

        <Avatar
          onClick={handleClick}
          src="/assets/user.png"
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
          <MenuItem onClick={handleClose}>Logout</MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default TopBar;
