import React from "react";
import { Box } from "@mui/material";

interface CountryBadgeProps {
  country: string;
  flagUrl: string;
}

const CountryBadge: React.FC<CountryBadgeProps> = ({ country, flagUrl }) => {
  return (
    <Box
      sx={{
        textAlign: "center",
        cursor: "pointer",
        transition: "transform 0.2s ease",
        "&:hover": {
          transform: "translateY(-3px)",
        },
        width: { xs: "80px", sm: "100px", md: "120px" },
        flexShrink: 0,
        minWidth: { xs: "80px", sm: "100px", md: "120px" },
      }}
    >
      <Box
        component="img"
        src={flagUrl}
        alt={country}
        draggable={false} // Prevent image dragging
        sx={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: "8px",
          userSelect: "none", // Prevent text/image selection
          pointerEvents: "none", // Prevent any pointer events on the image itself
        }}
      />
    </Box>
  );
};

export default CountryBadge;
