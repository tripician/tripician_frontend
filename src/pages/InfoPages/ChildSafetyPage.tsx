import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import InfoPageShell from './InfoPageShell';
import Seo from '../../components/Seo';

const P = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ color: '#444', fontSize: '0.95rem', lineHeight: 1.8, mb: 2 }}>
    {children}
  </Typography>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box component="section" sx={{ mb: 4 }}>
    <Typography component="h2" variant="h5" sx={{ color: '#171717', fontWeight: 700, mb: 1.5 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const ChildSafetyPage: React.FC = () => (
  <InfoPageShell>
    <Seo
      title="Child Safety Standards"
      description="Tripician's standards for preventing child sexual abuse and exploitation, reporting concerns, and keeping the travel community safe."
      path="/child-safety-standards"
    />
    <Box sx={{ background: 'linear-gradient(135deg,#FFF5F6 0%,#FFFAFA 100%)', borderBottom: '1px solid rgba(0,0,0,0.06)', px: { xs: 3, md: 8 }, py: { xs: 5, md: 7 } }}>
      <Container maxWidth="md">
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'primary.main', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 2 }}>
          Tripician safety
        </Typography>
        <Typography component="h1" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.8rem' }, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.15, mb: 2 }}>
          Child Safety Standards
        </Typography>
        <Typography sx={{ fontSize: '1.05rem', color: '#666', lineHeight: 1.75, maxWidth: 720 }}>
          Tripician is committed to preventing child sexual abuse and exploitation (CSAE) across our travel community.
        </Typography>
      </Container>
    </Box>

    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{ background: '#fff', borderRadius: '16px', p: { xs: 3, md: 5 }, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 20px rgba(0,0,0,0.05)' }}>
        <P>These standards apply to Tripician, our mobile apps, website, and community features. They supplement our <Box component={Link} to="/terms-and-conditions" sx={{ color: 'primary.main' }}>Terms of Service</Box> and apply to everyone using Tripician.</P>

        <Section title="Prohibited content and conduct">
          <P>Tripician does not allow child sexual abuse material (CSAM), the sexual exploitation or grooming of minors, sexualized content involving minors, or attempts to recruit, solicit, threaten, or exploit a child. This includes sharing, requesting, creating, promoting, or directing others to such material or activity.</P>
          <P>Users must not use Tripician to arrange abusive or exploitative contact with a minor. We may remove content and restrict or terminate accounts that violate these standards.</P>
        </Section>

        <Section title="How to report a child safety concern">
          <P>In the app, use the <strong>Report</strong> option on the relevant profile, post, story, comment, trip, or message. Select the closest reason and include details that will help us find and review the concern.</P>
          <P>You can also email our child safety contact at <Box component="a" href="mailto:support@tripician.com?subject=Child%20Safety%20Report" sx={{ color: 'primary.main' }}>support@tripician.com</Box> with the subject <strong>Child Safety Report</strong>. Include links, usernames, and a description of the concern. Do not download, attach, or forward suspected CSAM.</P>
          <P>If a child is in immediate danger, contact local emergency services or law enforcement.</P>
        </Section>

        <Section title="Review and action">
          <P>Tripician reviews safety reports and takes appropriate action. Depending on the circumstances, this may include removing content, restricting or disabling accounts, preserving relevant information where appropriate, and reporting suspected CSAM or other illegal activity to the relevant authorities or child safety organizations as required by applicable law.</P>
          <P>We may also cooperate with lawful investigations and take steps to prevent reported users from continuing harmful activity on the service.</P>
        </Section>

        <Section title="Age requirements and contact">
          <P>Tripician is not directed at children. Users must meet the minimum age requirements in our Terms of Service (13 or older, or 16 or older in the EU and UK). These age requirements do not change our commitment to act on child safety concerns.</P>
          <P>For questions about these standards or to report a concern, contact our designated child safety point of contact at <Box component="a" href="mailto:support@tripician.com?subject=Child%20Safety" sx={{ color: 'primary.main' }}>support@tripician.com</Box>.</P>
        </Section>

        <Typography sx={{ color: '#888', fontSize: '0.82rem', mt: 4 }}>Last updated: October 29, 2026</Typography>
      </Box>
    </Container>
  </InfoPageShell>
);

export default ChildSafetyPage;
