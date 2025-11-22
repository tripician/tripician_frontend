import React from 'react';
import { Box } from '@mui/material';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import Footer from '../PageLayout/CommonLayouts/Footer';

interface ErrorPageLayoutProps {
  children: React.ReactNode;
}

const ErrorPageLayout: React.FC<ErrorPageLayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <TopBar showSearch={false} />
      <Box component='main' sx={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', p:4 }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default ErrorPageLayout;
