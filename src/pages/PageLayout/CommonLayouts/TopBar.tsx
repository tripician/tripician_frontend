import React, { useState } from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SearchBar from "../../../components/CommonComponents/SearchBar";
import { Add as AddIcon } from '@mui/icons-material';
import TripCreationModal from '../../../components/CreateTripComponents/TripCreationModal'; // Import the modal component

interface TopBarProps {
  selectedMenuItem: string;
}

const TopBar: React.FC<TopBarProps> = ({ selectedMenuItem }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateTripClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          position: "sticky",
          top: 0,
          zIndex: 1100,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
          padding: "20px 24px",
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Left Section - Title (Fixed width to prevent shifting) */}
        <Box
          sx={{
            minWidth: { xs: "120px", md: "200px" },
            flexShrink: 0,
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <Typography 
              variant="h4" 
              fontWeight={700} 
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: { xs: "1.5rem", md: "1.75rem" },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                letterSpacing: '-0.02em',
                position: 'relative',
                transition: 'all 0.3s ease-in-out',
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
                  transition: 'width 0.3s ease-in-out',
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
            flexGrow: 1,
            display: "flex",
            justifyContent: "center",
            px: { xs: 1, md: 3 },
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
            gap: { xs: 1, md: 2 },
            minWidth: { xs: "120px", md: "180px" },
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <IconButton
            sx={{
              width: 44,
              height: 44,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              }
            }}
          >
            <NotificationsNoneIcon sx={{ color: "text.secondary" }} fontSize="medium" />
          </IconButton>

          {/* Create Trip Button - Now opens the modal */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateTripClick}
            sx={{
              minWidth: "120px",
              height: "36px",
              backgroundColor: '#1976d2', // Changed to blue theme
              color: '#ffffffff',
              fontWeight: 'bold',
              boxShadow: 'none',
              border: '1px solid transparent',
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: '#ffffffff',
                color: '#1976d2',
                border: '1px solid #1976d2',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Create trip
          </Button>
        </Box>
      </Box>

      {/* Trip Creation Modal */}
      <TripCreationModal 
        open={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </>
  );
};

export default TopBar;