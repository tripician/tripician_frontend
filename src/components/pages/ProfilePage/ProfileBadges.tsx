
import React, { useRef, useEffect, useState } from "react";
import { Box, IconButton } from "@mui/material";
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CountryBadge from "./CountryBadge";


export default function ProfileBadges() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  // Check if arrows should be shown
  const checkArrows = () => {
    const el = rowRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 0);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkArrows();
    const handleResize = () => checkArrows();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Re-check arrows on scroll
  const handleScroll = () => checkArrows();

  // Arrow click handlers
  const scrollBy = (amount: number) => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };


  var badges = [
    {
      country : "France",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240288/France_d1aozi.png"
    },
    {
      country : "USA",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755277295/USA_zmulzh.png"
    },
    {
      country : "Italy",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755238948/Italy_jxwtxx.png"
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    }
];

  return (
    <Box sx={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', py: 1, px: 1 }}>
      {showLeft && (
        <IconButton size="small" onClick={() => scrollBy(-120)} sx={{ position: 'absolute', left: 0, zIndex: 2, background: '#fff', boxShadow: 1 }}>
          <ChevronLeftIcon />
        </IconButton>
      )}
      <Box
        ref={rowRef}
        onScroll={handleScroll}
        sx={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollBehavior: 'smooth',
          width: '100%',
          pl: showLeft ? 4 : 0,
          pr: showRight ? 4 : 0,
        }}
      >
        {badges.map((badge, index) => (
          <CountryBadge
            key={index}
            country={badge.country}
            flagUrl={badge.flagUrl}
          />
        ))}
      </Box>
      {showRight && (
        <IconButton size="small" onClick={() => scrollBy(120)} sx={{ position: 'absolute', right: 0, zIndex: 2, background: '#fff', boxShadow: 1 }}>
          <ChevronRightIcon />
        </IconButton>
      )}
    </Box>
  );
}
