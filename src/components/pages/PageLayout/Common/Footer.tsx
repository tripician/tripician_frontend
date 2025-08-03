import React from 'react';
import { Box, Typography, Link, Container, Divider } from '@mui/material';

interface FooterProps {
  sidebarWidth?: number;
  isCollapsed?: boolean;
}

const Footer: React.FC<FooterProps> = ({ 
  sidebarWidth = 240, 
  isCollapsed = false 
}) => {
  const currentYear = new Date().getFullYear();
  const currentSidebarWidth = isCollapsed ? 64 : sidebarWidth;

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#1a1a1a',
        color: 'white',
        py: 3,
        mt: 'auto',
        ml: { xs: 0, md: `${currentSidebarWidth}px` },
        transition: 'margin-left 0.3s ease',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {/* Links Section */}
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
            }}
          >
            <Link
              href="/terms-and-conditions"
              sx={{
                color: 'white',
                textDecoration: 'none',
                fontSize: '0.9rem',
                '&:hover': {
                  textDecoration: 'underline',
                  color: '#66a6ff',
                },
                transition: 'color 0.2s ease',
              }}
            >
              Terms & Conditions
            </Link>
            
            <Link
              href="/about-us"
              sx={{
                color: 'white',
                textDecoration: 'none',
                fontSize: '0.9rem',
                '&:hover': {
                  textDecoration: 'underline',
                  color: '#66a6ff',
                },
                transition: 'color 0.2s ease',
              }}
            >
              About Us
            </Link>
          </Box>

          {/* Copyright Section */}
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.85rem',
              textAlign: { xs: 'center', md: 'right' },
            }}
          >
            © {currentYear} Tripician. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;