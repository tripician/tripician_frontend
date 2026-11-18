import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import InfoPageShell from './InfoPageShell';
import Seo from '../../components/Seo';
import {
  CHILD_SAFETY_DESCRIPTION,
  CHILD_SAFETY_INTRO,
  CHILD_SAFETY_PATH,
  CHILD_SAFETY_SECTIONS,
  CHILD_SAFETY_TITLE,
  CHILD_SAFETY_UPDATED,
  type Block,
  type Inline,
} from './childSafetyContent';

// The words live in childSafetyContent.ts, which also feeds the plain-HTML copy
// that Play review and crawlers without JavaScript read. Edit them there.

const textSx = { color: '#444', fontSize: '0.95rem', lineHeight: 1.8 } as const;

const Run: React.FC<{ part: Inline }> = ({ part }) => {
  if (typeof part === 'string') return <>{part}</>;
  if ('strong' in part) return <strong>{part.strong}</strong>;
  const sx = { color: 'primary.main' };
  if (part.href.startsWith('/')) return <Box component={Link} to={part.href} sx={sx}>{part.text}</Box>;
  const external = part.href.startsWith('http');
  return (
    <Box component="a" href={part.href} sx={sx} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {part.text}
    </Box>
  );
};

const Runs: React.FC<{ parts: Inline[] }> = ({ parts }) => (
  <>{parts.map((part, i) => <Run key={i} part={part} />)}</>
);

const BlockView: React.FC<{ block: Block }> = ({ block }) =>
  'p' in block ? (
    <Typography sx={{ ...textSx, mb: 2 }}><Runs parts={block.p} /></Typography>
  ) : (
    <Box component="ul" sx={{ ...textSx, pl: 3, mt: 0, mb: 2 }}>
      {block.ul.map((item, i) => (
        <Box component="li" key={i} sx={{ mb: 0.75 }}><Runs parts={item} /></Box>
      ))}
    </Box>
  );

const ChildSafetyPage: React.FC = () => (
  <InfoPageShell>
    <Seo title={CHILD_SAFETY_TITLE} description={CHILD_SAFETY_DESCRIPTION} path={CHILD_SAFETY_PATH} />
    <Box sx={{ background: 'linear-gradient(135deg,#FFF5F6 0%,#FFFAFA 100%)', borderBottom: '1px solid rgba(0,0,0,0.06)', px: { xs: 3, md: 8 }, py: { xs: 5, md: 7 } }}>
      <Container maxWidth="md">
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'primary.main', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 2 }}>
          Tripician safety
        </Typography>
        <Typography component="h1" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.8rem' }, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.15, mb: 2 }}>
          {CHILD_SAFETY_TITLE}
        </Typography>
        <Typography sx={{ fontSize: '1.05rem', color: '#666', lineHeight: 1.75, maxWidth: 720 }}>
          {CHILD_SAFETY_INTRO}
        </Typography>
      </Container>
    </Box>

    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{ background: '#fff', borderRadius: '16px', p: { xs: 3, md: 5 }, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 20px rgba(0,0,0,0.05)' }}>
        {CHILD_SAFETY_SECTIONS.map((section) => (
          <Box component="section" key={section.title} sx={{ mb: 4 }}>
            <Typography component="h2" variant="h5" sx={{ color: '#171717', fontWeight: 700, mb: 1.5 }}>
              {section.title}
            </Typography>
            {section.blocks.map((block, i) => <BlockView key={i} block={block} />)}
          </Box>
        ))}

        <Typography sx={{ color: '#888', fontSize: '0.82rem', mt: 4 }}>Last updated: {CHILD_SAFETY_UPDATED}</Typography>
      </Box>
    </Container>
  </InfoPageShell>
);

export default ChildSafetyPage;
