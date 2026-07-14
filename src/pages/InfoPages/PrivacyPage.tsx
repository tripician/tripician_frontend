import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { Link } from 'react-router-dom';
import InfoPageShell from './InfoPageShell';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';

const P = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ color: '#444', fontSize: '0.93rem', lineHeight: 1.85, mb: 1.5 }}>{children}</Typography>
);

const Ul = ({ items }: { items: React.ReactNode[] }) => (
  <Box component="ul" sx={{ pl: 2.5, mb: 2, '& li': { color: '#444', fontSize: '0.92rem', lineHeight: 1.8, mb: 0.75 } }}>
    {items.map((item, i) => <Box key={i} component="li">{item}</Box>)}
  </Box>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontWeight: 700, color: '#111', mb: 2, pb: 1.5, borderBottom: '1px solid rgba(0,0,0,0.07)', fontSize: '1.02rem' }}>
    {children}
  </Typography>
);

const PrivacyPage: React.FC = () => {
  const sections: { id: string; title: string; content: React.ReactNode }[] = [
    {
      id: 'intro',
      title: '1. Introduction & Data Controller',
      content: (
        <>
          <P>Tripician ("we," "us," or "our") is committed to protecting your personal data. This Privacy Policy explains what information we collect, why we collect it, and how we use, share, and protect it when you access or use the Tripician platform ("the Service").</P>
          <P>By creating an account or using the Service, you acknowledge that you have read and understood this Privacy Policy. If you disagree with any part of this policy, please do not use the Service.</P>
          <P><strong>Data Controller:</strong> Tripician and its operators are the data controller responsible for personal data collected through the Service.</P>
          <P><strong>Privacy enquiries:</strong> Email <Box component="a" href="mailto:support@tripician.com" sx={{ color: '#FF385C', textDecoration: 'none', fontWeight: 500 }}>support@tripician.com</Box> with the subject line "Privacy Request ,[Your Name]".</P>
        </>
      ),
    },
    {
      id: 'collect',
      title: '2. Information We Collect',
      content: (
        <>
          <P><strong>Account Information:</strong> When you register, we collect your first name, last name, and email address. You may optionally provide a profile picture.</P>
          <P><strong>Trip Data:</strong> All content you create within the Service ,including trip names, destination details, travel dates, day-by-day itineraries, expense records, packing lists, notes, and any files you choose to upload.</P>
          <P><strong>Usage Data:</strong> Information about how you interact with the Service, such as features used, pages visited, session timestamps, and error events.</P>
          <P><strong>Technical Data:</strong> Your IP address, browser type and version, operating system, device type, and referring URL, collected automatically when you access the Service.</P>
          <P><strong>Authentication Data:</strong> Login sessions and authentication tokens managed by Auth0, Inc. We do not store your raw password at any point.</P>
        </>
      ),
    },
    {
      id: 'legal-basis',
      title: '3. Legal Basis for Processing (GDPR / UK GDPR)',
      content: (
        <>
          <P>For users in the European Economic Area (EEA) and United Kingdom, we rely on the following legal bases:</P>
          <Ul items={[
            <><strong>Performance of Contract (Art. 6(1)(b)):</strong> Processing necessary to provide the Service you requested, including account management and trip storage.</>,
            <><strong>Legitimate Interests (Art. 6(1)(f)):</strong> Improving and securing the Service, fraud prevention, and understanding feature engagement. We always balance these interests against your rights.</>,
            <><strong>Consent (Art. 6(1)(a)):</strong> Where you have given explicit consent, such as for marketing communications. You may withdraw consent at any time by contacting us.</>,
            <><strong>Legal Obligation (Art. 6(1)(c)):</strong> Where we are required to process data to comply with applicable law.</>,
          ]} />
        </>
      ),
    },
    {
      id: 'use',
      title: '4. How We Use Your Information',
      content: (
        <>
          <P>We use the information we collect to:</P>
          <Ul items={[
            'Create, maintain, and manage your account',
            'Store, process, and deliver your trip plans and itineraries',
            'Authenticate you securely via Auth0',
            'Detect and prevent fraud, abuse, and security incidents',
            'Monitor and improve Service performance and reliability',
            'Respond to your support and data requests',
            'Send service-related communications (account alerts, security notices)',
            'Comply with legal and regulatory obligations',
          ]} />
          <P>We do not use your data for solely automated decision-making that produces legal or similarly significant effects (as defined under GDPR Article 22) without your explicit consent.</P>
        </>
      ),
    },
    {
      id: 'sharing',
      title: '5. Data Sharing & Third-Party Processors',
      content: (
        <>
          <P><strong>We do not sell, trade, or rent your personal information to any third party.</strong></P>
          <P>We share data with trusted third-party processors solely to operate the Service:</P>
          <Ul items={[
            <><strong>Auth0, Inc.</strong> ,manages user authentication. Your email and authentication credentials are processed under Auth0's Privacy Policy and a Data Processing Agreement.</>,
            <><strong>Unsplash Inc.</strong> ,provides destination photographs via its API. No personal data is shared with Unsplash. Image URLs are cached in your browser's local storage for performance only.</>,
            <><strong>Infrastructure & Hosting Providers</strong> ,our servers are hosted on third-party cloud infrastructure. Providers process data on our behalf under Data Processing Agreements and are contractually required to protect your data.</>,
          ]} />
          <P><strong>Legal Disclosure:</strong> We may disclose your information if required by law, court order, or government authority. Where legally permitted, we will notify you before doing so.</P>
        </>
      ),
    },
    {
      id: 'retention',
      title: '6. Data Retention',
      content: (
        <>
          <Ul items={[
            'Active accounts: We retain your personal data for as long as your account remains active.',
            'Deletion requests: Upon a verified account deletion request, we will permanently delete your personal data within 30 days, except where retention is required by law.',
            'Encrypted backups: Residual copies in encrypted backups are purged within 90 days of the deletion date.',
            'Usage logs: Anonymised and aggregated usage statistics may be retained for up to 24 months for security and service improvement.',
          ]} />
        </>
      ),
    },
    {
      id: 'rights',
      title: '7. Your Privacy Rights',
      content: (
        <>
          <P><strong>Under GDPR / UK GDPR (EEA & UK users):</strong></P>
          <Ul items={[
            'Right of Access (Art. 15): Request a copy of the personal data we hold about you.',
            'Right to Rectification (Art. 16): Request correction of inaccurate or incomplete data.',
            'Right to Erasure / "Right to be Forgotten" (Art. 17): Request deletion of your personal data.',
            'Right to Restriction of Processing (Art. 18): Ask us to limit how we use your data.',
            'Right to Data Portability (Art. 20): Receive your data in a structured, machine-readable format.',
            'Right to Object (Art. 21): Object to processing based on legitimate interests.',
            'Right to Lodge a Complaint: With your national supervisory authority (e.g., ICO in the UK, or your local EU Data Protection Authority).',
          ]} />
          <P><strong>Under CCPA / CPRA (California residents):</strong></P>
          <Ul items={[
            'Right to Know: What personal information we collect, use, and share.',
            'Right to Delete: Request deletion of your personal information.',
            'Right to Correct: Request correction of inaccurate personal information.',
            'Right to Opt-Out of Sale or Sharing: We do not sell or share personal information for cross-context behavioural advertising.',
            'Right to Limit Use of Sensitive Personal Information: We do not collect sensitive personal information as defined by CCPA/CPRA.',
            'Right to Non-Discrimination: We will not discriminate against you for exercising any CCPA rights.',
          ]} />
          <P>To exercise any of these rights, email <Box component="a" href="mailto:support@tripician.com" sx={{ color: '#FF385C', textDecoration: 'none', fontWeight: 500 }}>support@tripician.com</Box> with the subject "Privacy Request ,[Your Name]". We will respond within 30 days (GDPR/UK GDPR) or 45 days (CCPA/CPRA).</P>
        </>
      ),
    },
    {
      id: 'transfers',
      title: '8. International Data Transfers',
      content: (
        <>
          <P>If you are located in the EEA or UK and your data is transferred to countries outside those regions (for example, to our infrastructure or authentication providers), we ensure that appropriate safeguards are in place ,such as Standard Contractual Clauses (SCCs) approved by the European Commission, or equivalent mechanisms compliant with applicable transfer rules.</P>
        </>
      ),
    },
    {
      id: 'cookies',
      title: '9. Cookies & Local Storage',
      content: (
        <>
          <P>We use browser <strong>local storage</strong> (not cookies) to cache non-personal data, such as destination image URLs from Unsplash, to improve loading performance. This data contains no personal information and can be cleared at any time through your browser settings.</P>
          <P>Authentication session tokens managed by Auth0 may be stored in browser storage as necessary for login persistence, and are used solely for authentication purposes.</P>
          <P>If we introduce analytics cookies or tracking technologies in the future, we will update this policy and seek your consent where required by applicable law (e.g., EU ePrivacy Directive, UK PECR).</P>
        </>
      ),
    },
    {
      id: 'children',
      title: "10. Children's Privacy",
      content: (
        <>
          <P>The Service is not directed at children under 13 years of age (or under 16 years of age for users in the European Union and United Kingdom, per the GDPR minimum age for consent). We do not knowingly collect personal information from children.</P>
          <P>If you believe a child under the applicable minimum age has provided us with personal data, please contact us immediately at <Box component="a" href="mailto:support@tripician.com" sx={{ color: '#FF385C', textDecoration: 'none', fontWeight: 500 }}>support@tripician.com</Box>. We will take prompt steps to delete such information.</P>
        </>
      ),
    },
    {
      id: 'changes',
      title: '11. Changes to This Policy',
      content: (
        <>
          <P>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. When we do, we will update the "Last updated" date at the top of this page.</P>
          <P>For significant changes, we will notify you by email or via a prominent notice within the Service. Your continued use of the Service after changes take effect constitutes your acknowledgement of the updated policy.</P>
        </>
      ),
    },
    {
      id: 'contact',
      title: '12. Contact & Data Requests',
      content: (
        <>
          <P>For any privacy-related questions, data access or deletion requests, or complaints, please contact us:</P>
          <P><strong>Email:</strong> <Box component="a" href="mailto:support@tripician.com" sx={{ color: '#FF385C', textDecoration: 'none', fontWeight: 500 }}>support@tripician.com</Box></P>
          <P><strong>Subject line format:</strong> "Privacy Request ,[Your Name]"</P>
          <P>We are committed to resolving concerns promptly and transparently. If you are not satisfied with our response, you have the right to lodge a complaint with your applicable data protection authority.</P>
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
              <ShieldRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF385C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Privacy Policy</Typography>
          </Box>
          <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '2.8rem' }, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.15, mb: 2 }}>
            Your privacy matters.{' '}
            <Box component="span" sx={{ color: '#FF385C' }}>Always.</Box>
          </Typography>
          <Typography sx={{ fontSize: '1.05rem', color: '#666', lineHeight: 1.75, maxWidth: 600 }}>
            We are transparent about what data we collect and why. We never sell your personal information to anyone.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
            <Box sx={{ background: 'rgba(255,56,92,0.08)', borderRadius: '20px', px: 2, py: 0.75, border: '1px solid rgba(255,56,92,0.15)' }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#FF385C', fontWeight: 600 }}>Last updated: May 1, 2026</Typography>
            </Box>
            <Box sx={{ background: 'rgba(0,0,0,0.04)', borderRadius: '20px', px: 2, py: 0.75, border: '1px solid rgba(0,0,0,0.08)' }}>
              <Typography sx={{ fontSize: '0.78rem', color: '#555', fontWeight: 500 }}>GDPR · UK GDPR · CCPA/CPRA</Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Box sx={{ display: 'flex', gap: { xs: 0, md: 5 }, alignItems: 'flex-start' }}>
          {/* TOC ,desktop only */}
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
              <Box component={Link} to="/terms-and-conditions" sx={{ color: '#bbb', textDecoration: 'none', '&:hover': { color: '#FF385C' } }}>Terms & Conditions</Box>
            </Typography>
          </Box>
        </Box>
      </Container>
    </InfoPageShell>
  );
};

export default PrivacyPage;
