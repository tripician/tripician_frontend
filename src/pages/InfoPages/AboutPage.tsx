import React from 'react';
import { Box, Typography, Container, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import InfoPageShell from './InfoPageShell';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import Seo from '../../components/Seo';

const VALUES = [
  {
    Icon: AutoAwesomeRoundedIcon,
    title: 'Made for Explorers',
    desc: 'Every feature is designed around real travellers - from spontaneous adventurers to meticulous planners.',
  },
  {
    Icon: GroupsRoundedIcon,
    title: 'Built for Community',
    desc: 'Travel is better together. Collaborate on trips, share itineraries, and inspire each other.',
  },
  {
    Icon: SecurityRoundedIcon,
    title: 'Privacy First',
    desc: 'Your trip data is yours. We never sell your information and we give you full control over your data.',
  },
  {
    Icon: MapRoundedIcon,
    title: 'Thoughtfully Designed',
    desc: 'We obsess over the details - because planning a trip should feel as exciting as the trip itself.',
  },
];

const AboutPage: React.FC = () => (
  <InfoPageShell>
    <Seo
      title="About Tripician - A Global Travel Community"
      description="Tripician is a global community for travellers and a planner your whole group can edit, where every place is checked against a live listing. Meet our story, mission, and what we stand for."
      path="/about-us"
    />
    {/* Hero */}
    <Box sx={{ background: 'linear-gradient(135deg,#FFF5F6 0%,#FFFAFA 100%)', borderBottom: '1px solid rgba(0,0,0,0.06)', px: { xs: 3, md: 8 }, py: { xs: 6, md: 8 } }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg,#FF385C,#D91A50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ExploreRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF385C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>About Us</Typography>
        </Box>
        <Typography variant="h2" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.8rem' }, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.15, mb: 2 }}>
          We believe great trips are built{' '}
          <Box component="span" sx={{ color: '#FF385C' }}>together</Box>.
        </Typography>
        <Typography sx={{ fontSize: '1.05rem', color: '#666', lineHeight: 1.75, maxWidth: 600 }}>
          Tripician is a global community for travellers - the people who find their travel tribe here, plan as a crew, and let Navia handle the busywork in between.
        </Typography>
      </Container>
    </Box>

    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      {/* Story */}
      <Box sx={{ background: '#fff', borderRadius: '16px', p: { xs: 3, md: 5 }, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 20px rgba(0,0,0,0.05)', mb: 3 }}>
        <Typography sx={{ fontWeight: 700, color: '#111', mb: 2.5, fontSize: '1.1rem' }}>Our Story</Typography>
        <Typography sx={{ color: '#444', lineHeight: 1.85, mb: 2, fontSize: '0.95rem' }}>
          Planning a group trip to Southeast Asia, our founders found themselves bouncing between spreadsheets, messaging threads, documents, and booking sites - losing context, losing time, and nearly losing their minds.
        </Typography>
        <Typography sx={{ color: '#444', lineHeight: 1.85, mb: 2, fontSize: '0.95rem' }}>
          They asked: why doesn't a single tool exist that handles everything - itineraries, day-by-day plans, expense tracking, packing lists, safety alerts, and real collaboration - without feeling like enterprise software?
        </Typography>
        <Typography sx={{ color: '#444', lineHeight: 1.85, fontSize: '0.95rem' }}>
          Tripician is that place: a global community built entirely around the traveller, with a co-planner that works alongside your crew instead of handing you a list and leaving.
        </Typography>
        <Typography sx={{ color: '#444', lineHeight: 1.85, mt: 2, fontSize: '0.95rem' }}>
          One thing we decided early: a plan is only worth having if the places in it are real. So every place Navia drafts is matched against a live listing before it reaches you. Anything permanently closed is dropped, and anything we cannot confirm is labelled as such rather than quietly presented as fact.
        </Typography>
      </Box>

      {/* Mission */}
      <Box sx={{ background: 'linear-gradient(135deg,#FF385C,#D91A50)', borderRadius: '16px', p: { xs: 3, md: 5 }, mb: 3, color: '#fff' }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.75, mb: 1.5 }}>Our Mission</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.35rem' }, lineHeight: 1.5 }}>
          "To build the global community where every traveller finds their tribe - and a plan they can trust enough to book."
        </Typography>
      </Box>

      {/* Values */}
      <Typography sx={{ fontWeight: 700, color: '#111', mb: 2.5, fontSize: '1.1rem' }}>What We Stand For</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 4 }}>
        {VALUES.map(({ Icon, title, desc }) => (
          <Box key={title} sx={{ background: '#fff', borderRadius: '14px', p: 3, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <Icon sx={{ color: '#FF385C', fontSize: 28, mb: 1.5 }} />
            <Typography sx={{ fontWeight: 700, color: '#111', mb: 0.75, fontSize: '0.95rem' }}>{title}</Typography>
            <Typography sx={{ color: '#555', fontSize: '0.87rem', lineHeight: 1.7 }}>{desc}</Typography>
          </Box>
        ))}
      </Box>

      {/* Important disclaimer */}
      <Box sx={{ background: '#FFFBF0', borderRadius: '12px', p: 2.5, border: '1px solid rgba(202,138,4,0.2)', mb: 4 }}>
        <Typography sx={{ fontSize: '0.82rem', color: '#78350F', lineHeight: 1.7 }}>
          <strong>Disclaimer:</strong> Tripician is a trip planning and organisation software platform. We are not a travel agency, tour operator, or travel service provider of any kind. We do not book travel or take responsibility for actual travel arrangements, visas, insurance, or safety at any destination.
        </Typography>
      </Box>

      {/* CTA */}
      <Box sx={{ background: '#fff', borderRadius: '16px', p: { xs: 3, md: 5 }, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 20px rgba(0,0,0,0.05)', textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 700, color: '#111', mb: 1.5, fontSize: '1.15rem' }}>Ready to plan your next adventure?</Typography>
        <Typography sx={{ color: '#666', mb: 3, fontSize: '0.92rem' }}>Join travellers already using Tripician to plan smarter.</Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* `t-invert`: marketing surface, so this takes the white-ground hover
              from the theme rather than the in-app darken. Fill, radius and
              hover all come from `MuiButton` now. */}
          <Button component={Link} to="/signup" variant="contained" className="t-invert"
            sx={{ fontWeight: 700, px: 4 }}>
            Start for free
          </Button>
          <Button component={Link} to="/contact-us" variant="outlined"
            sx={{ borderRadius: '50px', fontWeight: 600, textTransform: 'none', px: 3, borderColor: 'rgba(0,0,0,0.2)', color: '#444', '&:hover': { borderColor: '#FF385C', color: '#FF385C' } }}>
            Get in touch
          </Button>
        </Box>
      </Box>

      <Typography sx={{ textAlign: 'center', color: '#bbb', fontSize: '0.77rem', mt: 5 }}>
        Tripician © {new Date().getFullYear()} ·{' '}
        <Box component={Link} to="/privacy-policy" sx={{ color: '#bbb', textDecoration: 'none', '&:hover': { color: '#FF385C' } }}>Privacy</Box>{' '}·{' '}
        <Box component={Link} to="/terms-and-conditions" sx={{ color: '#bbb', textDecoration: 'none', '&:hover': { color: '#FF385C' } }}>Terms</Box>{' '}·{' '}
        <Box component={Link} to="/contact-us" sx={{ color: '#bbb', textDecoration: 'none', '&:hover': { color: '#FF385C' } }}>Contact</Box>
      </Typography>
    </Container>
  </InfoPageShell>
);

export default AboutPage;
