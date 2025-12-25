import React from 'react';
import { Box, Typography, Link, Container } from '@mui/material';

interface FooterProps {
  fixed?: boolean; // when true, footer is fixed to viewport bottom
}

const Footer: React.FC<FooterProps> = ({ fixed = false }) => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        py: 3,
        mt: fixed ? 0 : 'auto',
        borderTop: 1,
        borderColor: 'divider',
        width: '100%',
        position: fixed ? 'fixed' : 'static',
        left: fixed ? 0 : undefined,
        bottom: fixed ? 0 : undefined,
        zIndex: fixed ? (theme) => theme.zIndex.appBar - 1 : undefined,
        boxShadow: fixed ? '0 -2px 6px rgba(0,0,0,0.08)' : 'none',
        backdropFilter: fixed ? 'blur(6px)' : 'none'
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