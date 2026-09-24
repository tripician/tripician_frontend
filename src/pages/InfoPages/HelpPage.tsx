import React, { useState } from 'react';
import { BRAND } from '../../theme';
import { Box, Typography, Container, Button, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Link } from 'react-router-dom';
import InfoPageShell from './InfoPageShell';
import Seo from '../../components/Seo';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';

const FAQS = [
  {
    q: 'What is Tripician?',
    a: 'Tripician is a social network for travellers, built around the whole arc of a trip: plan an itinerary, find people to go with, then write up what it was actually like afterwards and keep it as a printed book. TripicianAI can plan the days for you, and every plan is checked against real travel times and opening hours. Tripician is not a travel agency and does not book flights, hotels, or any travel services.',
  },
  {
    q: 'Is Tripician free to use?',
    a: 'Planning trips, inviting your crew, writing stories, starting a group and asking TripicianAI for help are all free, and a free account is given 300 TripicianAI credits every month. Tripician Pro raises that to 1,500 a month. Tripician Business is for travel businesses that run trips for other people: it adds a public page with posts, lets you put your own staff onto a trip, and is the only plan that can list a trip publicly and take join requests from travellers you have never met. Credits can also be bought on their own, without a subscription. Current prices are on the pricing page.',
  },
  {
    q: 'How do I create a trip?',
    a: 'Once signed in, use "Create plan" at the top of your wall, or open Studio (top right, or the middle of the bottom bar on a phone) and choose "Plan a trip". It asks a few quick questions, one at a time: where you are starting from, where you want to go, and roughly when. Trip type and food needs are optional. Then choose "Plan it for me" and TripicianAI fills in each stop, or "I\'ll plan it myself". Want a blank trip? Pick "I\'ll plan everything myself" and give just the dates.',
  },
  {
        q: 'How do I find people to come on my trip?',
    a: 'Two ways. For friends, open the trip and share its invite link: anyone with the link joins straight away, on any trip. Taking requests from travellers you do not know is part of Tripician Business: a business group on the Business plan opens its trip in the planner with "Find people", next to Publish, and it then shows up in Groups & Stories under "Join a trip". Nothing is automatic there either. Every request arrives with a message, and nobody joins until the organiser approves them.',
  },
  {
    q: 'Where do the requests to join my trip appear?',
    a: 'Requests for trips you own are listed at the top of your Profile page. For a trip that belongs to a group, they are on the group\'s Trips tab, where every admin and manager can see them rather than only the person who happens to own the trip. You also get a notification for each one. Approving is a single tap, and the seat count updates for everyone straight away.',
  },
  {
    q: 'Does Tripician take the money for a shared trip?',
    a: 'No. Any price on a trip listing is indicative only, so travellers know roughly what they are committing to. The group settles up directly between themselves, and no payment ever routes through Tripician.',
  },
  {
    q: 'What is a group?',
    a: "A group is a set of travellers who plan together: a few friends, a club, or a travel business. A public group can be found in Groups & Stories and anyone can ask to join, with an admin deciding. A private group is invite only. Inside, the group talks in Discussion, reads Announcements from its admins, follows the trips it is planning and keeps the stories of the ones it has taken. Belonging to a group does not put you on its trips. You say you are interested in the ones you want, and an organiser adds you.",
  },
  {
    q: 'What is the wall for?',
    a: 'The wall is what travellers are saying right now: short notes from the road, questions about places, and the plans and stories people have just published. Ask a question about somewhere you are going and anyone who has been there can answer it. You can switch the wall between everyone and only the people you follow.',
  },
  {
    q: 'Can I message another traveller?',
    a: 'Messages are tied to a trip, so you can write to somebody about a trip you are both on, or one you have asked to join. Keeping a conversation attached to the trip it is about is also what lets us act on it if it is ever reported. You can turn direct messages off completely in Settings.',
  },
  {
    q: 'What is an after story?',
    a: 'An after story is what a trip was actually like, written afterwards in your own words with your own photographs. Publish one and it sits on your profile, where people deciding whether to travel with you will read it. Readers can ask the author questions underneath. Read everyone else\'s in Groups & Stories, under Stories.',
  },
  {
    q: 'Can I get a story printed as a book?',
    a: 'Any story you wrote lays out as an A5 hardcover. Open the story and choose "See it as a book" to look through every page exactly as it would print, then download the print-ready PDF. Ordering a physical copy is not open yet, so the PDF is the finished book for now.',
  },
  {
    q: 'Can I collaborate with others on my trip?',
    a: "Yes, and on any plan. Share the trip's invite link and whoever opens it is on the trip straight away. Everyone on a trip can follow the plan as it takes shape, comment on it and help write the story afterwards. Trip admins change the plan itself, so you decide who runs it and who comes along.",
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
    a: 'Try refreshing the page or clearing your browser cache. If the issue persists, email support@tripician.com with a description of the problem, your device and browser details, and any error messages you see. We typically respond within 1-2 business days.',
  },
];

const HelpPage: React.FC = () => {
  const [expanded, setExpanded] = useState<string | false>(false);

  return (
    <InfoPageShell>
      <Seo
        title="Tripician Help Centre"
        description="How Tripician works: planning a trip, inviting your crew, groups, stories, messages and your account. Answers to the questions travellers ask most."
        path="/get-help"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      {/* Hero */}
      <Box sx={{ background: 'linear-gradient(135deg,#FFF5F6 0%,#FFFAFA 100%)', borderBottom: '1px solid rgba(0,0,0,0.06)', px: { xs: 3, md: 8 }, py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: `linear-gradient(135deg,${BRAND.coral},${BRAND.coralDeep})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HelpOutlineRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'primary.main', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Help Centre</Typography>
          </Box>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.8rem' }, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.15, mb: 2 }}>
            How can we help you?
          </Typography>
          <Typography sx={{ fontSize: '1.05rem', color: '#666', lineHeight: 1.75 }}>
            Browse common questions below. Can't find your answer? Reach out directly - we're here for you.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        <Typography variant="h4" component="h2" sx={{ mb: 2.5 }}>Frequently Asked Questions</Typography>
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
                expandIcon={<ExpandMoreRoundedIcon sx={{ color: 'primary.main' }} />}
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
        <Box sx={{ background: `linear-gradient(135deg,${BRAND.coral},${BRAND.coralDeep})`, borderRadius: '16px', p: { xs: 3, md: 5 }, color: '#fff', textAlign: 'center' }}>
          <EmailRoundedIcon sx={{ fontSize: 40, mb: 2, opacity: 0.9 }} />
          <Typography variant="h4" component="h2" sx={{ mb: 1 }}>Still need help?</Typography>
          <Typography sx={{ opacity: 0.85, mb: 3, fontSize: '0.92rem', lineHeight: 1.7 }}>
            Our support team is ready to help. Email us and we'll respond within 1-2 business days.
          </Typography>
          <Button
            variant="contained"
            href="mailto:support@tripician.com?subject=Tripician Support Request"
            startIcon={<EmailRoundedIcon />}
            sx={{
              background: '#fff', color: 'primary.main', fontWeight: 700, borderRadius: '50px',
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
          <Box component={Link} to="/privacy-policy" sx={{ color: '#bbb', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>Privacy</Box>{' '}·{' '}
          <Box component={Link} to="/terms-and-conditions" sx={{ color: '#bbb', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>Terms</Box>
        </Typography>
      </Container>
    </InfoPageShell>
  );
};

export default HelpPage;
