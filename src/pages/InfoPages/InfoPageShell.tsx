import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import NavigationPannel from '../PageLayout/CommonLayouts/NavigationPanel';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

interface Props { children: React.ReactNode }

const InfoPageShell: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const profile = useSelector((state: any) => state.user?.profile);
  const isAuthenticated = !!profile;
  const logoFullBlackUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_BLACK_2_URL as string | undefined;

  const pageContent = (
    <Box sx={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'Inter', sans-serif" }}>
      {isAuthenticated ? (
        null
      ) : (
        <Box sx={{
          position: 'sticky', top: 0, zIndex: 1100,
          backdropFilter: 'blur(20px)',
          background: 'rgba(250,250,250,0.9)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          px: { xs: 2, md: 5 }, height: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none' }}>
            {logoFullBlackUrl
              ? <Box component="img" src={logoFullBlackUrl} alt="Tripician" sx={{ height: 28, width: 'auto', display: 'block' }} />
              : <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#111', fontFamily: "'Inter',sans-serif", letterSpacing: '-0.02em' }}>Tripician</Typography>
            }
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" component={Link} to="/signin" variant="outlined"
              sx={{ fontSize: '0.78rem', fontWeight: 600, borderRadius: '50px', textTransform: 'none', borderColor: 'rgba(0,0,0,0.2)', color: '#333', '&:hover': { borderColor: '#FF385C', color: '#FF385C' } }}>
              Sign in
            </Button>
            <Button size="small" component={Link} to="/signup" variant="contained"
              sx={{ fontSize: '0.78rem', fontWeight: 700, borderRadius: '50px', textTransform: 'none', background: 'linear-gradient(135deg,#FF385C,#D91A50)', boxShadow: '0 3px 12px rgba(255,56,92,0.3)' }}>
              Join free
            </Button>
          </Box>
        </Box>
      )}
      {children}
    </Box>
  );

  return isAuthenticated ? <NavigationPannel>{pageContent}</NavigationPannel> : pageContent;
};

export default InfoPageShell;
