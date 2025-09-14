import React, { useState } from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SearchBar from "../../../components/CommonComponents/SearchBar";
import { Add as AddIcon } from '@mui/icons-material';
import TripCreationModal from '../../../components/CreateTripComponents/TripCreationModal'; // Import the modal component
import ThemeToggle from '../../../components/CommonComponents/ThemeToggle';

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
          backgroundColor: 'background.paper',
          backdropFilter: 'blur(10px)',
          borderBottom: 1,
          borderColor: 'divider',
          padding: "20px 24px",
          boxShadow: 1,
        }}
      >        

        {/* Center Section - Search Bar (Flexible width) */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            justifyContent: "left",
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

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Create Trip Button - Now opens the modal */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateTripClick}
            sx={{
              minWidth: "120px",
              height: "36px",
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 'bold',
              boxShadow: 'none',
              border: '1px solid transparent',
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: 'background.paper',
                color: 'primary.main',
                border: '1px solid',
                borderColor: 'primary.main',
                boxShadow: 2,
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