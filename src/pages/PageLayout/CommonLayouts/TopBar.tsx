import React from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SearchBar from "../../../components/CommonComponents/SearchBar";
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
        background: 'rgba(255, 255, 255, 0.95)', // Semi-transparent white
        backdropFilter: 'blur(10px)', // Modern glass morphism effect
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        padding: "20px 24px", // Increased padding for more breathing room
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', // Subtle shadow
      }}
    >
      {/* Left Section - Title (Fixed width to prevent shifting) */}
      <Box
        sx={{
          minWidth: { xs: "120px", md: "200px" }, // Responsive minimum width
          flexShrink: 0, // Prevent shrinking
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <Typography 
            variant="h4" 
            fontWeight={700} 
            sx={{
              whiteSpace: "nowrap", // Prevent text wrapping
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: { xs: "1.5rem", md: "1.75rem" }, // Larger, more modern sizing
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              letterSpacing: '-0.02em', // Tighter letter spacing for modern look
              position: 'relative',
              transition: 'all 0.3s ease-in-out', // Smooth transition
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -4,
                left: 0,
                width: '60px',
                height: '3px',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '2px',
                opacity: 0.8,
                transition: 'width 0.3s ease-in-out', // Animate the underline
              }
            }}
          >
            {selectedMenuItem}
          </Typography>
        </Box>
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
            color: '#ffffffff',
            fontWeight: 'bold',
            boxShadow: 'none',
            border: '1px solid transparent', // Invisible border to prevent size change
            '&:hover': {
              backgroundColor: '#ffffffff',
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

