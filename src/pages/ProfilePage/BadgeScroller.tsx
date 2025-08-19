import React, { useRef, useState } from "react";
import { Box } from "@mui/material";
import CountryBadge from "./CountryBadge";

const countries = [
  { name: "France", url: "/badges/france.png" },
  { name: "USA", url: "/badges/usa.png" },
  { name: "Italy", url: "/badges/italy.png" },
  { name: "Japan", url: "/badges/japan.png" },
  { name: "Australia", url: "/badges/australia.png" },
  { name: "Spain", url: "/badges/spain.png" },
  { name: "Germany", url: "/badges/germany.png" },
  { name: "India", url: "/badges/india.png" },
];

const BadgeScroller: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDown(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const onMouseLeave = () => setIsDown(false);
  const onMouseUp = () => setIsDown(false);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 1.5;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  return (
    <Box
      ref={scrollRef}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      sx={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        gap: 2,
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        "&::-webkit-scrollbar": { display: "none" },
        cursor: isDown ? "grabbing" : "grab",
        userSelect: "none",
        padding: 1,
      }}
    >
      {countries.map((c) => (
        <CountryBadge key={c.name} country={c.name} flagUrl={c.url} />
      ))}
    </Box>
  );
};

export default BadgeScroller;
