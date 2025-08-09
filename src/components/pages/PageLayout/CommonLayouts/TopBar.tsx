import React from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SearchBar from "../CommonComponents/SearchBar";
import {Add as AddIcon} from '@mui/icons-material';


interface TopBarProps  {
    selectedMenuItem: string; // Add this prop
}

const TopBar: React.FC<TopBarProps > = ({selectedMenuItem}) => {

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        position: "sticky",
        top: 0,
        zIndex: 1100,
        backgroundColor: "#f5f5f5",
        padding: "16px 24px",
        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Left Section - Title (Fixed width to prevent shifting) */}
      <Box
        sx={{
          minWidth: { xs: "120px", md: "200px" }, // Responsive minimum width
          flexShrink: 0, // Prevent shrinking
        }}
      >
        <Typography 
          variant="h5" 
          fontWeight={600} 
          color="text.primary"
          sx={{
            whiteSpace: "nowrap", // Prevent text wrapping
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: { xs: "1.25rem", md: "1.5rem" }, // Responsive font size
          }}
        >
          {selectedMenuItem}
        </Typography>
      </Box>

      {/* Center Section - Search Bar (Flexible width) */}
      <Box
        sx={{
          flexGrow: 1, // Take up remaining space
          display: "flex",
          justifyContent: "center",
          px: { xs: 1, md: 3 }, // Less padding on mobile
        }}
      >
        <Box sx={{ maxWidth: "500px", width: "100%" }}>
          <SearchBar />
        </Box>
      </Box>

      {/* Right Section - Actions (Fixed width to prevent shifting) */}
      <Box 
        sx={{ 
          display: "flex", 
          alignItems: "center", 
          gap: { xs: 1, md: 2 }, // Less gap on mobile
          minWidth: { xs: "120px", md: "180px" }, // Responsive minimum width
          justifyContent: "flex-end",
          flexShrink: 0, // Prevent shrinking
        }}
      >
        <IconButton
          sx={{
            width: 44, // Fixed width
            height: 44, // Fixed height
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            }
          }}
        >
          <NotificationsNoneIcon sx={{ color: "text.secondary" }} fontSize="medium" />
        </IconButton>

        {/* Create Trip Button */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            minWidth: "120px", // Fixed minimum width
            height: "36px", // Fixed height
            backgroundColor: '#008bbdff',
            color: '#f0f0f0ff',
            fontWeight: 'bold',
            boxShadow: 'none',
            border: '1px solid transparent', // Invisible border to prevent size change
            '&:hover': {
              backgroundColor: '#ffffff',
              color: '#008bbdff',
              border: '1px solid #008bbdff',
              boxShadow: 'none', // Ensure no shadow changes
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

