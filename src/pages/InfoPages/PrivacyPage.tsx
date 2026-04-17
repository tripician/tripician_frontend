import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const PrivacyPage: React.FC = () => (
  <Container maxWidth="md" sx={{ py: 6 }}>
    <Box sx={{
      background: 'linear-gradient(90deg,#3b82f6 0%,#9333ea 100%)',
      borderRadius: 3,
      p: 4,
      mb: 4,
      color: '#fff',
      boxShadow: '0 8px 32px rgba(59,130,246,0.10)'
    }}>
      <Typography variant="h3" fontWeight={800} fontFamily="'Playfair Display',serif" gutterBottom>
        Privacy Policy
      </Typography>
      <Typography variant="subtitle1" fontWeight={500}>
        Your privacy is important to us. Learn how we protect your data.
      </Typography>
    </Box>
    <Box sx={{ background:'#fff', borderRadius:3, p:4, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
      <Typography variant="h5" fontWeight={700} mb={2}>1. Information We Collect</Typography>
      <Typography mb={3}>We collect information you provide when you use Tripician, such as your name, email, and trip details.</Typography>
      <Typography variant="h5" fontWeight={700} mb={2}>2. How We Use Information</Typography>
      <Typography mb={3}>Your information is used to provide and improve our services, personalize your experience, and communicate with you.</Typography>
      <Typography variant="h5" fontWeight={700} mb={2}>3. Data Security</Typography>
      <Typography mb={3}>We implement industry-standard security measures to protect your data from unauthorized access.</Typography>
      <Typography variant="h5" fontWeight={700} mb={2}>4. Third-Party Services</Typography>
      <Typography mb={3}>We may use third-party services for analytics and communication. These providers have their own privacy policies.</Typography>
      <Typography variant="h5" fontWeight={700} mb={2}>5. Contact</Typography>
      <Typography mb={3}>For privacy-related questions, contact us at <a href="mailto:support@tripician.com">support@tripician.com</a>.</Typography>
      <Typography variant="body2" color="text.secondary" mt={4}>Last updated: April 2026</Typography>
    </Box>
  </Container>
);

export default PrivacyPage;
