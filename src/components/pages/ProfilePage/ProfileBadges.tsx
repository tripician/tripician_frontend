
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
    setShowRight(el.scrollLeft + el.offsetWidth < el.scrollWidth - 1);
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
      rowRef.current.scrollTo({ left: rowRef.current.scrollLeft + amount, behavior: 'smooth' });
      setTimeout(checkArrows, 350); // update arrows after scroll
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
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    },
    {
      country : "Vietnam",
      flagUrl : "https://res.cloudinary.com/ddt3rcyhv/image/upload/v1755240289/Vietnam_cagk5x.png"
    }
];

  return (
    <Box
      sx={{
        position: 'relative',
        minWidth: 0,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        py: 1,
        px: { xs: 0, md: 1 },
        boxSizing: 'border-box',
      }}
    >
      <IconButton
        size="small"
        onClick={() => scrollBy(-120)}
        sx={{
          background: '#fff',
          boxShadow: 1,
          mr: 1,
          zIndex: 2,
          opacity: showLeft ? 1 : 0.3,
        }}
        tabIndex={0}
        aria-label="Scroll left"
        disabled={!showLeft}
      >
        <ChevronLeftIcon />
      </IconButton>
      <Box
        ref={rowRef}
        onScroll={handleScroll}
        sx={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'hidden',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollBehavior: 'smooth',
          minWidth: 0,
          width: 'auto',
          flexShrink: 1,
          flexGrow: 0,
          whiteSpace: 'nowrap',
          pl: 0,
          pr: 0,
          gap: { xs: 1, md: 2 },
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
      <IconButton
        size="small"
        onClick={() => scrollBy(120)}
        sx={{
          background: '#fff',
          boxShadow: 1,
          ml: 1,
          zIndex: 2,
          opacity: showRight ? 1 : 0.3,
        }}
        tabIndex={0}
        aria-label="Scroll right"
        disabled={!showRight}
      >
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );
}
