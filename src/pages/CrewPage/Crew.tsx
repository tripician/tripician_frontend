/**
 * /crew , the traveller directory.
 *
 * Was a tab on Community. It moved out because finding a person is a different
 * job from browsing trips: you arrive knowing who or where you want, and a
 * discovery scroll is the wrong shape for a lookup. Being a real route also
 * means a crew search can be linked to and returned to.
 *
 * It is no longer top-level navigation. Looking for people is something you do
 * deliberately and occasionally, where posting from the road is something you do
 * in the moment, so the bar slot went to the one with the shorter fuse. The
 * directory itself now lives in CrewDirectory and appears as the Travellers
 * segment on Browse; this route is kept because it is linkable, indexed, and in
 * people's history.
 */

import React from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import Seo, { SITE_URL } from '../../components/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { CONTENT_MAX } from '../CommunityPage/communityConstants';
import { staggerContainer, staggerItem } from '../../utils/animations';
import CrewDirectory from './CrewDirectory';

const Crew: React.FC = () => (
  <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <Seo
      title="Find Crew, Travellers Going Where You Are Going"
      description="Find travellers who publish real itineraries, follow the ones who travel like you, and plan your next trip together."
      path="/crew"
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Find crew',
        description: 'Travellers on Tripician who publish real itineraries.',
        url: `${SITE_URL}/crew`,
      }}
    />

    <Box
      sx={{
        maxWidth: CONTENT_MAX,
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
        pt: { xs: 3, md: 5 },
        pb: 10,
      }}
    >
      <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08, 0.05)}>
        <motion.div variants={staggerItem}>
          <PageHeader
            title="Find crew"
            subtitle="Travellers who publish real itineraries. Follow the ones who travel like you."
          />
        </motion.div>

        <Box sx={{ mt: 3.5 }}>
          <CrewDirectory />
        </Box>
      </motion.div>
    </Box>
  </Box>
);

export default Crew;
