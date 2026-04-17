import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';

const AboutPage: React.FC = () => (
  <Container maxWidth="md" sx={{ py: 6 }}>
    <Box sx={{
      background: 'linear-gradient(90deg,#6366f1 0%,#14b8a6 100%)',
      borderRadius: 3,
      p: 4,
      mb: 4,
      color: '#fff',
      boxShadow: '0 8px 32px rgba(99,102,241,0.10)'
    }}>
      <Box sx={{ display:'flex', alignItems:'center', gap:2 }}>
        <ExploreIcon sx={{ fontSize: 40, color: '#fff' }} />
        <Typography variant="h3" fontWeight={800} fontFamily="'Playfair Display',serif" gutterBottom>
          About Tripician
        </Typography>
      </Box>
      <Typography variant="subtitle1" fontWeight={500}>
        Your journey, reimagined. Discover, plan, and experience travel like never before.
      </Typography>
    </Box>
    <Box sx={{ background:'#fff', borderRadius:3, p:4, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
      <Typography variant="h5" fontWeight={700} mb={2}>Our Mission</Typography>
      <Typography mb={3}>
        At Tripician, we believe travel should be seamless, inspiring, and deeply personal. Our platform empowers you to plan, organize, and share your adventures with ease and elegance.
      </Typography>
      <Typography variant="h5" fontWeight={700} mb={2}>Why Tripician?</Typography>
      <Typography mb={3}>
        We blend cutting-edge technology with a passion for exploration, delivering a premium experience for every traveler. Whether solo or with friends, Tripician is your trusted companion.
      </Typography>
      <Typography variant="h5" fontWeight={700} mb={2}>Contact</Typography>
      <Typography mb={3}>
        Questions? Suggestions? <a href="mailto:support@tripician.com">Contact us</a> — we love hearing from our community!
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={4}>Tripician &copy; 2026</Typography>
    </Box>
  </Container>
);

export default AboutPage;
