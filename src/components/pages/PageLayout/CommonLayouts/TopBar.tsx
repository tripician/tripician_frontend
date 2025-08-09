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
              backgroundColor: '#008bbdff',
              color: '#f0f0f0ff',
              fontWeight: 'bold',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#ffffff',
                color: '#008bbdff',
                border: '1px solid #008bbdff',
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

