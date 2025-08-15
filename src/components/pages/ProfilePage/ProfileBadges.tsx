import React, { useRef, useEffect, useState } from "react";
import { Box } from "@mui/material";
import CountryBadge from "./CountryBadge";

export default function ProfileBadges() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Touch/drag state for mobile
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Desktop wheel scrolling
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Mouse events for hover state (desktop)
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Touch events for mobile drag scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    setStartX(touch.clientX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return;
    
    e.preventDefault(); // Prevent vertical scrolling while dragging
    const touch = e.touches[0];
    const x = touch.clientX - (scrollRef.current.offsetLeft || 0);
    const walk = (x - startX) * 2; // Adjust scroll speed
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse drag events for desktop (optional - you can remove if you only want wheel)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current.offsetLeft || 0);
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Block page scrolling when hovering over badges (desktop)
  useEffect(() => {
    const preventScroll = (e: WheelEvent) => {
      if (isHovered) {
        e.preventDefault();
      }
    };

    // Block vertical scrolling on touch move when dragging (mobile)
    const preventTouchScroll = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    if (isHovered) {
      document.addEventListener('wheel', preventScroll, { passive: false });
    }

    if (isDragging) {
      document.addEventListener('touchmove', preventTouchScroll, { passive: false });
    }

    return () => {
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [isHovered, isDragging]);


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
    <Box 
      ref={scrollRef}
      // Desktop events
      onWheel={handleWheel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      
      // Mobile touch events
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      
      sx={{ 
        display: "flex", 
        gap: "0vw", 
        flexWrap: "nowrap",
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        "&::-webkit-scrollbar": { 
          display: "none"
        },
        scrollBehavior: "smooth",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none", // Prevent text selection while dragging
        py: 1,
        px: 1,
        // Improve touch scrolling on mobile
        WebkitOverflowScrolling: "touch",
      }}
    >
      {
      badges.map((badge, index) =>
      (
        <CountryBadge
          key={index}
          country = {badge.country}
          flagUrl = {badge.flagUrl}
        />
      ))
      }
    </Box>
  );
}
