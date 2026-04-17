import React from 'react';
import { Box, Typography, Container, Button } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';

const HelpPage: React.FC = () => (
  <Container maxWidth="sm" sx={{ py: 6 }}>
    <Box sx={{
      background: 'linear-gradient(90deg,#10b981 0%,#3b82f6 100%)',
      borderRadius: 3,
      p: 4,
      mb: 4,
      color: '#fff',
      boxShadow: '0 8px 32px rgba(16,185,129,0.10)'
    }}>
      <Typography variant="h3" fontWeight={800} fontFamily="'Playfair Display',serif" gutterBottom>
        Get Help
      </Typography>
      <Typography variant="subtitle1" fontWeight={500}>
        Need assistance? We're here for you.
      </Typography>
    </Box>
    <Box sx={{ background:'#fff', borderRadius:3, p:4, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
      <Typography variant="h5" fontWeight={700} mb={2}>How can we help?</Typography>
      <Typography mb={3}>Check our FAQ, or reach out to our support team for personalized assistance.</Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<EmailIcon />}
        href="mailto:support@tripician.com"
        sx={{ mt: 2, borderRadius: 2, fontWeight: 700, px: 3 }}
      >
        Email Support
      </Button>
    </Box>
  </Container>
);

export default HelpPage;
