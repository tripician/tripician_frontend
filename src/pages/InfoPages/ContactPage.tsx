import React from 'react';
import { Box, Typography, Container, Button } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';

const ContactPage: React.FC = () => (
  <Container maxWidth="sm" sx={{ py: 6 }}>
    <Box sx={{
      background: 'linear-gradient(90deg,#f59e42 0%,#ef4444 100%)',
      borderRadius: 3,
      p: 4,
      mb: 4,
      color: '#fff',
      boxShadow: '0 8px 32px rgba(239,68,68,0.10)'
    }}>
      <Typography variant="h3" fontWeight={800} fontFamily="'Playfair Display',serif" gutterBottom>
        Contact Us
      </Typography>
      <Typography variant="subtitle1" fontWeight={500}>
        We're happy to help. Reach out anytime.
      </Typography>
    </Box>
    <Box sx={{ background:'#fff', borderRadius:3, p:4, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
      <Typography variant="h5" fontWeight={700} mb={2}>Support Email</Typography>
      <Typography mb={3}>
        For any questions, suggestions, or support, email us at <a href="mailto:support@tripician.com">support@tripician.com</a>.
      </Typography>
      <Button
        variant="contained"
        color="secondary"
        startIcon={<EmailIcon />}
        href="mailto:support@tripician.com"
        sx={{ mt: 2, borderRadius: 2, fontWeight: 700, px: 3 }}
      >
        Email Us
      </Button>
    </Box>
  </Container>
);

export default ContactPage;
