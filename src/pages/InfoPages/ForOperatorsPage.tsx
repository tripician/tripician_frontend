import React from 'react';
import { BRAND } from '../../theme';
import { Box, Typography, Container, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import InfoPageShell from './InfoPageShell';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import CreditCardOffRoundedIcon from '@mui/icons-material/CreditCardOffRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import Seo from '../../components/Seo';

/**
 * The front door for travel businesses.
 *
 * The operator portal has existed since Stage 3 and had **no inbound link
 * anywhere in the product** - not in nav, not in the footer, not here. The only
 * way to reach /operator was to be sent the URL personally, which is why it felt
 * like the feature was missing a business login. It was not: it was missing a
 * door.
 *
 * Deliberately not a separate account system. An operator is a role on a real,
 * named person (`OperatorProfile.UserId`), which is what lets the same human be
 * a traveller and a business without keeping two logins.
 */

const STEPS = [
  {
    Icon: StorefrontRoundedIcon,
    title: 'Apply, and a person reads it',
    desc: 'Company name, website and a contact address. Approvals are granted by hand from the admin desk, not by a script, so expect a real conversation rather than an instant yes.',
  },
  {
    Icon: HandshakeRoundedIcon,
    title: 'Your trips say who runs them',
    desc: 'Once approved, trips you run carry your company name, and the traveller’s button changes from "Ask to join" to "Enquire". Nobody is left guessing whether they are joining a group of peers or booking with a business.',
  },
  {
    Icon: MarkEmailReadRoundedIcon,
    title: 'Enquiries arrive with consent attached',
    desc: 'The traveller ticks a box that names exactly what is shared and with whom, and it starts unticked. You receive their name, email, destination, dates, party size and their message.',
  },
  {
    Icon: FilterAltRoundedIcon,
    title: 'One enquiry per traveller, per trip',
    desc: 'A second tap on the same trip is the same interest, so it is not a second enquiry. You will not be handed the same person twice.',
  },
  {
    Icon: CreditCardOffRoundedIcon,
    title: 'You close it on your own site',
    desc: 'The enquiry ends by sending the traveller to you. Tripician takes no payment at any point in this flow and is not a party to what you agree.',
  },
];

const ForOperatorsPage: React.FC = () => (
  <InfoPageShell>
    <Seo
      title="For Travel Operators - Tripician"
      description="Tripician passes enquiries from travellers to independent travel businesses. You receive the traveller's details with their explicit consent, and close the booking on your own site. Tripician takes no payment."
      path="/for-operators"
    />

    {/* Hero */}
    <Box sx={{ background: 'linear-gradient(135deg,#FFF5F6 0%,#FFFAFA 100%)', borderBottom: '1px solid rgba(0,0,0,0.06)', px: { xs: 3, md: 8 }, py: { xs: 6, md: 8 } }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: `linear-gradient(135deg,${BRAND.coral},${BRAND.coralDeep})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StorefrontRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'primary.main', letterSpacing: '0.1em', textTransform: 'uppercase' }}>For Operators</Typography>
        </Box>
        <Typography variant="h2" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.8rem' }, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.15, mb: 2 }}>
          Travellers who already know{' '}
          <Box component="span" sx={{ color: 'primary.main' }}>where they want to go</Box>.
        </Typography>
        <Typography sx={{ fontSize: '1.05rem', color: '#666', lineHeight: 1.75, maxWidth: 640 }}>
          People plan real itineraries here. When one of them wants a trip run properly rather than
          organised between friends, we hand the enquiry to a business that can run it. You take it
          from there, on your own terms and your own site.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, mt: 4, flexWrap: 'wrap' }}>
          <Button component={Link} to="/organizations" variant="contained" size="large" sx={{ fontWeight: 700 }}>
            Apply to list your trips
          </Button>
          <Button component={Link} to="/contact-us" variant="outlined" size="large" sx={{ fontWeight: 600 }}>
            Talk to us first
          </Button>
        </Box>
        <Typography sx={{ fontSize: '0.82rem', color: '#8a8a8a', mt: 2 }}>
          Applying uses your normal Tripician account. There is no separate business login to keep track of.
        </Typography>
      </Container>
    </Box>

    {/* How it works */}
    <Box sx={{ px: { xs: 3, md: 8 }, py: { xs: 6, md: 8 } }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '1.9rem' }, color: '#111', letterSpacing: '-0.02em', mb: 1 }}>
          How it actually works
        </Typography>
        <Typography sx={{ fontSize: '0.98rem', color: '#666', mb: 5, maxWidth: 620 }}>
          No auction, no ranking you can pay to climb, and nothing sent to you that the traveller did not
          agree to send.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          {STEPS.map(({ Icon, title, desc }, i) => (
            <Box key={title} sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
              <Box sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: '12px', background: 'rgba(0,0,0,0.04)', display: 'grid', placeItems: 'center', color: 'primary.main' }}>
                <Icon sx={{ fontSize: 21 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111', mb: 0.5 }}>
                  {i + 1}. {title}
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', color: '#666', lineHeight: 1.7 }}>{desc}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>

    {/* The honest part */}
    <Box sx={{ px: { xs: 3, md: 8 }, py: { xs: 5, md: 7 }, background: '#F7F7F5', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', md: '1.6rem' }, color: '#111', letterSpacing: '-0.02em', mb: 2.5 }}>
          What we are not
        </Typography>
        {/* Said here rather than buried in Terms. A business needs to know the
            shape of the relationship before it applies, not after. */}
        <Typography sx={{ fontSize: '0.98rem', color: '#555', lineHeight: 1.8, mb: 2 }}>
          Tripician is a software platform. We are not a travel agency, a tour operator or a reseller,
          and we do not package or sell travel. We pass an interested traveller to you, with their
          permission, and the contract that follows is between you and them.
        </Typography>
        <Typography sx={{ fontSize: '0.98rem', color: '#555', lineHeight: 1.8, mb: 2 }}>
          That also means we cannot answer for your trips. You are responsible for your own licensing,
          insurance and consumer obligations wherever you operate.
        </Typography>
        <Typography sx={{ fontSize: '0.98rem', color: '#555', lineHeight: 1.8 }}>
          We are onboarding the first operators personally, so there is nothing to pay today. If that
          ever changes you will be told before it does, not discovered afterwards.
        </Typography>
      </Container>
    </Box>

    {/* Close */}
    <Box sx={{ px: { xs: 3, md: 8 }, py: { xs: 6, md: 8 }, textAlign: 'center' }}>
      <Container maxWidth="sm">
        <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '1.9rem' }, color: '#111', letterSpacing: '-0.02em', mb: 1.5 }}>
          Run trips for a living?
        </Typography>
        <Typography sx={{ fontSize: '0.98rem', color: '#666', lineHeight: 1.7, mb: 3.5 }}>
          Tell us what you run and where. We read every application.
        </Typography>
        <Button component={Link} to="/organizations" variant="contained" size="large" sx={{ fontWeight: 700 }}>
          Apply to list your trips
        </Button>
      </Container>
    </Box>
  </InfoPageShell>
);

export default ForOperatorsPage;
