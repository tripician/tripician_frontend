import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const TermsPage: React.FC = () => (
  <Container maxWidth="md" sx={{ py: 6 }}>
    <Box sx={{
      background: 'linear-gradient(90deg,#FF385C 0%,#E31C5F 100%)',
      borderRadius: 3,
      p: 4,
      mb: 4,
      color: '#fff',
      boxShadow: '0 8px 32px rgba(255,56,92,0.10)'
    }}>
      <Typography variant="h3" fontWeight={800} fontFamily="'Playfair Display',serif" gutterBottom>
        Terms & Conditions
      </Typography>
      <Typography variant="subtitle1" fontWeight={500}>
        Please read these terms and conditions carefully before using Tripician.
      </Typography>
    </Box>
    <Box sx={{ background:'#fff', borderRadius:3, p:4, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
      <Typography variant="h5" fontWeight={700} mb={2}>1. Acceptance of Terms</Typography>
      <Typography mb={3}>By accessing or using Tripician, you agree to be bound by these terms. If you disagree with any part, you may not use our service.</Typography>
      <Typography variant="h5" fontWeight={700} mb={2}>2. User Responsibilities</Typography>
      <Typography mb={3}>You agree to use Tripician only for lawful purposes and not to misuse the platform in any way.</Typography>
      <Typography variant="h5" fontWeight={700} mb={2}>3. Intellectual Property</Typography>
      <Typography mb={3}>All content, trademarks, and data on this site are the property of Tripician or its licensors.</Typography>
      <Typography variant="h5" fontWeight={700} mb={2}>4. Limitation of Liability</Typography>
      <Typography mb={3}>Tripician is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.</Typography>
      <Typography variant="h5" fontWeight={700} mb={2}>5. Changes to Terms</Typography>
      <Typography mb={3}>We reserve the right to update these terms at any time. Continued use of Tripician means you accept the new terms.</Typography>
      <Typography variant="body2" color="text.secondary" mt={4}>Last updated: April 2026</Typography>
    </Box>
  </Container>
);

export default TermsPage;
