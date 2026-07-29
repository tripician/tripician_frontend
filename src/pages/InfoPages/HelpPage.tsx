import React, { useState } from 'react';
import { Box, Typography, Container, Button, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Link } from 'react-router-dom';
import InfoPageShell from './InfoPageShell';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';

const FAQS = [
  {
    q: 'What is Tripician?',
    a: 'Tripician is a travel planning and organisation platform. It helps you create detailed trip itineraries, track expenses, build packing lists, monitor travel risks, and collaborate with fellow travellers - all in one place. Tripician is not a travel agency and does not book flights, hotels, or any travel services.',
  },
  {
    q: 'Is Tripician free to use?',
    a: 'Tripician currently offers a free tier with core planning features. If we introduce premium tiers in the future, we will communicate any changes clearly in advance.',
  },
  {
    q: 'How do I create a trip?',
    a: 'Once signed in, click the "+" button in the left sidebar to open the Create Trip panel. Enter your trip name, destination(s), and travel dates. You can add itinerary details, expenses, and packing lists at any time from within the Trip Planner.',
  },
  {
    q: 'Can I collaborate with others on my trip?',
    a: "Yes! You can invite friends or family to collaborate on a trip plan. They'll be able to view and contribute to the itinerary, notes, and travel details. Collaboration features are available within the Trip Planner.",
  },
  {
    q: 'What is the Risk Monitor?',
    a: "The Risk Monitor aggregates publicly available safety and travel advisories for destination countries. This information is for general awareness only and may not reflect current ground conditions. Always verify with your government's official travel advisory service (e.g., travel.gov, gov.uk/foreign-travel-advice, or your country's foreign affairs ministry) before travelling.",
  },
  {
    q: 'How is my data stored and protected?',
    a: 'Your account and trip data are stored securely. Authentication is handled by Auth0, an industry-leading identity provider. We do not sell your personal data to any third party. For full details, please read our Privacy Policy.',
  },
  {
    q: 'I forgot my password - how do I reset it?',
    a: "On the Sign In page, click \"Forgot password?\" and enter your registered email address. A reset link will be sent by Auth0. If you don't see it within a few minutes, check your spam or junk folder.",
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Settings → Account → Delete Account. This will permanently remove your account and associated trip data. Per our Privacy Policy, data is retained in encrypted backups for up to 90 days post-deletion before final removal.',
  },
  {
    q: 'The app is not working as expected - what should I do?',
    a: 'Try refreshing the page or clearing your browser cache. If the issue persists, email support@tripician.com with a description of the problem, your device and browser details, and any error messages you see. We typically respond within 1–2 business days.',
  },
];

const HelpPage: React.FC = () => {
  const [expanded, setExpanded] = useState<string | false>(false);

  return (
    <InfoPageShell>
      {/* Hero */}
      <Box sx={{ background: 'linear-gradient(135deg,#FFF5F6 0%,#FFFAFA 100%)', borderBottom: '1px solid rgba(0,0,0,0.06)', px: { xs: 3, md: 8 }, py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg,#FF385C,#D91A50)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(255,56,92,0.3)' }}>
              <HelpOutlineRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF385C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Help Centre</Typography>
          </Box>
          <Typography variant="h2" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.8rem' }, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.15, mb: 2 }}>
            How can we help you?
          </Typography>
          <Typography sx={{ fontSize: '1.05rem', color: '#666', lineHeight: 1.75 }}>
            Browse common questions below. Can't find your answer? Reach out directly - we're here for you.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        <Typography sx={{ fontWeight: 700, color: '#111', mb: 2.5, fontSize: '1.1rem' }}>Frequently Asked Questions</Typography>
        <Box sx={{ mb: 5 }}>
          {FAQS.map((faq, i) => (
            <Accordion
              key={i}
              expanded={expanded === `faq-${i}`}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? `faq-${i}` : false)}
              disableGutters
              elevation={0}
              sx={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.07)',
                borderRadius: '12px !important',
                mb: 1.5,
                '&:before': { display: 'none' },
                '&.Mui-expanded': { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreRoundedIcon sx={{ color: '#FF385C' }} />}
                sx={{ px: 3, py: 1.5, '& .MuiAccordionSummary-content': { my: 1 } }}
              >
                <Typography sx={{ fontWeight: 600, color: '#111', fontSize: '0.93rem' }}>{faq.q}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 2.5, pt: 0 }}>
                <Typography sx={{ color: '#555', fontSize: '0.9rem', lineHeight: 1.8 }}>{faq.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        {/* Contact Support CTA */}
        <Box sx={{ background: 'linear-gradient(135deg,#FF385C,#D91A50)', borderRadius: '16px', p: { xs: 3, md: 5 }, color: '#fff', textAlign: 'center' }}>
          <EmailRoundedIcon sx={{ fontSize: 40, mb: 2, opacity: 0.9 }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', mb: 1 }}>Still need help?</Typography>
          <Typography sx={{ opacity: 0.85, mb: 3, fontSize: '0.92rem', lineHeight: 1.7 }}>
            Our support team is ready to help. Email us and we'll respond within 1–2 business days.
          </Typography>
          <Button
            variant="contained"
            href="mailto:support@tripician.com?subject=Tripician Support Request"
            startIcon={<EmailRoundedIcon />}
            sx={{
              background: '#fff', color: '#FF385C', fontWeight: 700, borderRadius: '50px',
              textTransform: 'none', px: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              '&:hover': { background: 'rgba(255,255,255,0.92)' },
            }}
          >
            Email support@tripician.com
          </Button>
          <Typography sx={{ mt: 2.5, opacity: 0.7, fontSize: '0.8rem' }}>
            Or go to our{' '}
            <Box component={Link} to="/contact-us" sx={{ color: '#fff', fontWeight: 600, textDecoration: 'underline' }}>
              Contact page
            </Box>{' '}
            to send a message directly.
          </Typography>
        </Box>

        <Typography sx={{ textAlign: 'center', color: '#bbb', fontSize: '0.77rem', mt: 5 }}>
          Tripician © {new Date().getFullYear()} ·{' '}
          <Box component={Link} to="/privacy-policy" sx={{ color: '#bbb', textDecoration: 'none', '&:hover': { color: '#FF385C' } }}>Privacy</Box>{' '}·{' '}
          <Box component={Link} to="/terms-and-conditions" sx={{ color: '#bbb', textDecoration: 'none', '&:hover': { color: '#FF385C' } }}>Terms</Box>
        </Typography>
      </Container>
    </InfoPageShell>
  );
};

export default HelpPage;
