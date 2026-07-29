import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { Link } from 'react-router-dom';
import InfoPageShell from './InfoPageShell';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';

const P = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ color: '#444', fontSize: '0.93rem', lineHeight: 1.85, mb: 1.5 }}>{children}</Typography>
);

const Ul = ({ items }: { items: React.ReactNode[] }) => (
  <Box component="ul" sx={{ pl: 2.5, mb: 2, '& li': { color: '#444', fontSize: '0.92rem', lineHeight: 1.8, mb: 0.75 } }}>
    {items.map((item, i) => <Box key={i} component="li">{item}</Box>)}
  </Box>
);

const Warn = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ background: '#FFFBF0', borderRadius: '10px', p: 2.5, border: '1px solid rgba(202,138,4,0.2)', mb: 2 }}>
    <Typography sx={{ fontSize: '0.88rem', color: '#78350F', lineHeight: 1.75 }}>{children}</Typography>
  </Box>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontWeight: 700, color: '#111', mb: 2, pb: 1.5, borderBottom: '1px solid rgba(0,0,0,0.07)', fontSize: '1.02rem' }}>
    {children}
  </Typography>
);

const TermsPage: React.FC = () => {
  const sections: { id: string; title: string; content: React.ReactNode }[] = [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      content: (
        <>
          <P>By accessing or using the Tripician platform ("the Service"), you agree to be legally bound by these Terms and Conditions ("Terms"). If you do not agree with any part of these Terms, you must not use the Service.</P>
          <P>These Terms apply to all users, visitors, and others who access or use the Service. They form a legally binding agreement between you and Tripician.</P>
        </>
      ),
    },
    {
      id: 'about',
      title: '2. About Tripician - Planning Tool, Not a Travel Agency',
      content: (
        <>
          <Warn>
            <strong>IMPORTANT:</strong> Tripician is a travel planning and organisation software platform only. We are NOT a travel agency, tour operator, airline, hotel provider, transport company, or any form of travel service provider under any applicable law, including the UK Package Travel Regulations 2018, EU Package Travel Directive (2015/2302), or any equivalent consumer protection legislation.
          </Warn>
          <P>Tripician does <strong>not</strong>:</P>
          <Ul items={[
            'Book, sell, or arrange flights, accommodation, tours, activities, or any travel service',
            'Provide professional travel advice',
            'Act as your representative or agent for any travel transaction',
            'Hold any ATOL, ABTA, IATA, or equivalent travel industry licence or accreditation',
            'Guarantee the accuracy, current validity, or legality of any destination information displayed',
          ]} />
          <P>All actual travel arrangements - including but not limited to flights, accommodation, visas, travel insurance, and health requirements - are entirely your own responsibility. You must independently verify all travel information with official government sources, embassies, consulates, and relevant authorities before travelling.</P>
        </>
      ),
    },
    {
      id: 'eligibility',
      title: '3. Eligibility & Account Registration',
      content: (
        <>
          <P>You must be at least <strong>13 years of age</strong> to use the Service (or at least <strong>16 years of age</strong> if you reside in the European Union or United Kingdom). By using the Service, you confirm you meet this requirement.</P>
          <P>When creating an account, you agree to:</P>
          <Ul items={[
            'Provide accurate, current, and complete registration information',
            'Maintain the security and confidentiality of your account credentials',
            'Notify us immediately of any suspected unauthorised access to your account at support@tripician.com',
            'Accept responsibility for all activities that occur under your account',
          ]} />
          <P>We reserve the right to suspend or terminate accounts where we have reason to believe registration information is false, misleading, or fraudulent.</P>
        </>
      ),
    },
    {
      id: 'acceptable-use',
      title: '4. Acceptable Use Policy',
      content: (
        <>
          <P>You may use the Service only for lawful, personal, non-commercial trip planning purposes. You agree <strong>not</strong> to:</P>
          <Ul items={[
            'Upload, transmit, or share content that is unlawful, defamatory, obscene, fraudulent, threatening, or infringes any third-party rights',
            'Attempt to gain unauthorised access to the Service, its systems, or other users\' data',
            'Use automated means (bots, scrapers, crawlers, or similar tools) to extract data from the Service',
            'Impersonate any person or entity, or falsely represent your affiliation with any person or entity',
            'Use the Service for commercial resale, redistribution, or any commercial purpose without our express written consent',
            'Introduce malware, viruses, ransomware, or any malicious code into the Service',
            'Conduct any activity that disrupts, degrades, or interferes with the Service or its infrastructure',
            'Circumvent, disable, or otherwise interfere with security-related features of the Service',
          ]} />
          <P>We reserve the right to suspend or terminate accounts that violate this policy, immediately and without prior notice.</P>
        </>
      ),
    },
    {
      id: 'content',
      title: '5. User-Generated Content',
      content: (
        <>
          <P>You retain ownership of all content you create on Tripician (trip plans, notes, itineraries, uploaded files). By creating or uploading content, you grant Tripician a limited, non-exclusive, royalty-free, worldwide licence to store, process, and display that content solely for the purpose of providing the Service to you and any collaborators you explicitly invite.</P>
          <P>You are solely responsible for the content you create or upload. You warrant and represent that:</P>
          <Ul items={[
            'You hold all necessary rights to any content you create or upload',
            'Your content does not violate any applicable law or any third-party rights (including intellectual property, privacy, or defamation laws)',
            'Your content does not include personal data about third parties without their knowledge and consent',
          ]} />
          <P>We reserve the right to remove any content that violates these Terms or applicable law, without prior notice.</P>
        </>
      ),
    },
    {
      id: 'ip',
      title: '6. Intellectual Property Rights',
      content: (
        <>
          <P>The Tripician brand, logo, platform design, software code, and all original content created by us are owned by or licensed to Tripician and are protected by applicable intellectual property laws.</P>
          <P>You are granted a limited, personal, non-exclusive, non-transferable, non-sublicensable licence to access and use the Service for personal trip planning purposes only.</P>
          <P>You must not copy, modify, distribute, sell, sublicense, reverse-engineer, or create derivative works from any part of the Service without our express prior written permission.</P>
        </>
      ),
    },
    {
      id: 'third-party',
      title: '7. Third-Party Services & External Links',
      content: (
        <>
          <P>The Service integrates with or links to third-party services, including Auth0 (authentication), Unsplash (destination images), and mapping providers. These services are governed by their own terms and privacy policies.</P>
          <P>Any links to external websites or services within the Service are provided for convenience only. We do not endorse, control, or take responsibility for the content, availability, accuracy, or practices of any external website or third-party service.</P>
        </>
      ),
    },
    {
      id: 'disclaimers',
      title: '8. Disclaimers & No Warranties',
      content: (
        <>
          <P>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW. WE DISCLAIM ALL WARRANTIES INCLUDING WARRANTIES OF FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, AND NON-INFRINGEMENT.</P>
          <Warn>
            <strong>Travel Information Disclaimer:</strong> All destination information, safety ratings, risk assessments, visa guidance, and AI-generated itinerary suggestions displayed within the Service are sourced from publicly available data and are provided for general informational purposes only. This information may be inaccurate, incomplete, out of date, or not applicable to your specific circumstances. You must independently verify all travel requirements - including entry requirements, visa regulations, health requirements, and safety conditions - with official government sources and relevant embassies before making any travel decisions. Tripician accepts no liability for decisions made based on information displayed in the Service.
          </Warn>
          <P>We do not warrant that the Service will be uninterrupted, error-free, or free from security vulnerabilities. We are not responsible for any data loss resulting from technical failures.</P>
        </>
      ),
    },
    {
      id: 'liability',
      title: '9. Limitation of Liability',
      content: (
        <>
          <P>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TRIPICIAN AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:</P>
          <Ul items={[
            'Any indirect, incidental, special, exemplary, or consequential damages',
            'Loss of profits, revenue, data, goodwill, or other intangible losses',
            'Any travel-related losses, costs, cancellations, disruptions, injuries, or any harm arising from actual travel',
            'Damages resulting from your reliance on information provided through the Service',
            'Unauthorised access to or alteration of your transmissions or data',
          ]} />
          <P>WHERE LIMITATION OF LIABILITY IS NOT PERMITTED BY APPLICABLE LAW, OUR TOTAL LIABILITY TO YOU SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT YOU PAID TO TRIPICIAN IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) £10 GBP (OR LOCAL EQUIVALENT).</P>
          <P>Nothing in these Terms limits or excludes liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be lawfully excluded or limited.</P>
        </>
      ),
    },
    {
      id: 'indemnification',
      title: '10. Indemnification',
      content: (
        <>
          <P>You agree to defend, indemnify, and hold harmless Tripician and its affiliates, officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and reasonable legal fees arising from: (i) your use of the Service; (ii) content you submit or create; (iii) your violation of these Terms; or (iv) your violation of any applicable law or third-party rights.</P>
        </>
      ),
    },
    {
      id: 'termination',
      title: '11. Account Suspension & Termination',
      content: (
        <>
          <P>We reserve the right to suspend or permanently terminate your account at our sole discretion, with or without notice, for conduct that violates these Terms, is harmful to other users, or is otherwise objectionable.</P>
          <P>You may delete your account at any time through Settings → Account → Delete Account. Upon termination, your right to use the Service ceases immediately. We will handle your data in accordance with our Privacy Policy.</P>
        </>
      ),
    },
    {
      id: 'governing-law',
      title: '12. Governing Law & Jurisdiction',
      content: (
        <>
          <P>These Terms shall be governed by and construed in accordance with applicable laws. Any dispute arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the competent courts in the applicable jurisdiction.</P>
          <P>If you are a consumer in the EU or UK, you may also benefit from any mandatory consumer protection provisions of the laws of your country of residence, which cannot be overridden by this clause.</P>
        </>
      ),
    },
    {
      id: 'disputes',
      title: '13. Dispute Resolution',
      content: (
        <>
          <P>Before initiating any formal legal proceeding, you agree to attempt to resolve any dispute informally by contacting us at <Box component="a" href="mailto:support@tripician.com" sx={{ color: '#FF385C', textDecoration: 'none', fontWeight: 500 }}>support@tripician.com</Box>. We will attempt to resolve disputes through good-faith negotiation within 30 days of receiving notice.</P>
          <P>If you are located in the EU, you may also refer the dispute to the EU Online Dispute Resolution platform: <Box component="a" href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" sx={{ color: '#FF385C', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>ec.europa.eu/consumers/odr</Box>.</P>
        </>
      ),
    },
    {
      id: 'general',
      title: '14. General Provisions',
      content: (
        <>
          <P><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and Tripician regarding the Service and supersede all prior understandings.</P>
          <P><strong>Severability:</strong> If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will continue in full force and effect.</P>
          <P><strong>No Waiver:</strong> Our failure to enforce any right or provision of these Terms will not constitute a waiver of that right or provision.</P>
          <P><strong>Assignment:</strong> You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We may assign our rights without restriction.</P>
          <P><strong>Changes to Terms:</strong> We may modify these Terms at any time. We will notify you of material changes via email or prominent in-Service notice. Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms.</P>
          <P><strong>Contact:</strong> For questions about these Terms, email <Box component="a" href="mailto:support@tripician.com" sx={{ color: '#FF385C', textDecoration: 'none', fontWeight: 500 }}>support@tripician.com</Box>.</P>
        </>
      ),
    },
  ];

  return (
    <InfoPageShell>
      {/* Hero */}
      <Box sx={{ background: 'linear-gradient(135deg,#FFF5F6 0%,#FFFAFA 100%)', borderBottom: '1px solid rgba(0,0,0,0.06)', px: { xs: 3, md: 8 }, py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg,#FF385C,#D91A50)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(255,56,92,0.3)' }}>
              <GavelRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF385C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Terms & Conditions</Typography>
          </Box>
          <Typography variant="h2" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.8rem' }, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.15, mb: 2 }}>
            Clear terms you can{' '}
            <Box component="span" sx={{ color: '#FF385C' }}>actually understand.</Box>
          </Typography>
          <Typography sx={{ fontSize: '1.05rem', color: '#666', lineHeight: 1.75, maxWidth: 600 }}>
            Please read these terms carefully before using Tripician. Key points: we are a planning tool only, not a travel agency, and these terms form a legally binding agreement.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
            <Box sx={{ background: 'rgba(255,56,92,0.08)', borderRadius: '20px', px: 2, py: 0.75, border: '1px solid rgba(255,56,92,0.15)' }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#FF385C', fontWeight: 600 }}>Last updated: May 1, 2026</Typography>
            </Box>
            <Box sx={{ background: 'rgba(0,0,0,0.04)', borderRadius: '20px', px: 2, py: 0.75, border: '1px solid rgba(0,0,0,0.08)' }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#555', fontWeight: 500 }}>Version 1.0</Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Box sx={{ display: 'flex', gap: { xs: 0, md: 5 }, alignItems: 'flex-start' }}>
          {/* TOC - desktop only */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, width: 210, flexShrink: 0, position: 'sticky', top: 72 }}>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 2 }}>Contents</Typography>
            {sections.map((s) => (
              <Box
                key={s.id}
                component="a"
                href={`#${s.id}`}
                sx={{ display: 'block', py: 0.65, px: 1.5, borderLeft: '2px solid transparent', color: '#777', textDecoration: 'none', fontSize: '0.77rem', lineHeight: 1.5, mb: 0.5, borderRadius: '0 6px 6px 0', transition: 'all 0.2s', '&:hover': { color: '#FF385C', borderLeftColor: '#FF385C', background: 'rgba(255,56,92,0.04)' } }}
              >
                {s.title}
              </Box>
            ))}
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ background: '#fff', borderRadius: '16px', p: { xs: 3, md: 5 }, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 20px rgba(0,0,0,0.05)', mb: 3 }}>
              {sections.map((section, i) => (
                <Box key={section.id} id={section.id} sx={{ mb: i < sections.length - 1 ? 5 : 0, scrollMarginTop: 80 }}>
                  <SectionTitle>{section.title}</SectionTitle>
                  {section.content}
                </Box>
              ))}
            </Box>
            <Typography sx={{ textAlign: 'center', color: '#bbb', fontSize: '0.77rem', mt: 2 }}>
              Questions?{' '}
              <Box component="a" href="mailto:support@tripician.com" sx={{ color: '#FF385C', textDecoration: 'none', fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}>support@tripician.com</Box>
              {' '}·{' '}
              <Box component={Link} to="/privacy-policy" sx={{ color: '#bbb', textDecoration: 'none', '&:hover': { color: '#FF385C' } }}>Privacy Policy</Box>
            </Typography>
          </Box>
        </Box>
      </Container>
    </InfoPageShell>
  );
};

export default TermsPage;
