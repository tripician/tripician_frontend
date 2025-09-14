import React from 'react';
import { Box, Typography, Link, Container } from '@mui/material';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        py: 3,
        mt: 'auto', // Push footer to bottom of content
        borderTop: 1,
        borderColor: 'divider',
        // Removed sidebar margin since footer is now inside main content area
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
                color: 'text.primary',
                textDecoration: 'none',
                fontSize: '0.9rem',
                '&:hover': {
                  textDecoration: 'underline',
                  color: 'primary.main',
                },
                transition: 'color 0.2s ease',
              }}
            >
              Terms & Conditions
            </Link>
            
            <Link
              href="/about-us"
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                fontSize: '0.9rem',
                '&:hover': {
                  textDecoration: 'underline',
                  color: 'primary.main',
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
              color: 'text.secondary',
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