/**
 * /templates , itineraries published as reusable starting points.
 *
 * Was a tab on Community, and the weakest of the four: templates are useful at
 * one specific moment, when someone is about to start planning and would rather
 * not begin from nothing. As a tab it sat behind a click nobody had a reason to
 * make. It now appears as a rail on the community scroll, where that moment
 * actually happens, with this page behind it for browsing.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IconTemplate } from '@tabler/icons-react';
import Seo, { SITE_URL } from '../../components/Seo';
import PageHeader from '../../components/ui/PageHeader';
import FilterChip from '../../components/ui/FilterChip';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import ChipRail from '../../components/ui/ChipRail';
import CommunityTripCard from '../CommunityPage/CommunityTripCard';
import { CATEGORIES, CONTENT_MAX, gridSx } from '../CommunityPage/communityConstants';
import { apiServices } from '../../services/APIs/apiServices';
import { tripPath } from '../../utils/tripSlug';
import { staggerContainer, staggerItem } from '../../utils/animations';

const Templates: React.FC = () => {
  const navigate = useNavigate();

  const [templates, setTemplates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [category, setCategory] = React.useState('all');

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiServices
      .getTemplates()
      .then((r) => {
        if (active) setTemplates(r.data || []);
      })
      .catch(() => {
        if (active) setError('We could not load the templates just now.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filtered = React.useMemo(() => {
    if (category === 'all') return templates;
    return templates.filter((t) => (t.vibe || '').toLowerCase() === category);
  }, [templates, category]);

  const handleClick = (trip: any) => {
    const id = trip.id || trip.Id;
    if (id) navigate(tripPath({ id, name: trip.name }), { state: { trip } });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title="Trip Templates, Start From An Itinerary That Worked"
        description="Reusable itineraries published by travellers. Take a copy, change the dates and the stops, and make it your own."
        path="/templates"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Trip templates',
          description: 'Reusable itineraries published by travellers on Tripician.',
          url: `${SITE_URL}/templates`,
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
              title="Start from a template"
              subtitle="Itineraries other travellers published for anyone to copy. Take one, change the dates, make it yours."
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <ChipRail sx={{ mt: { xs: 2.5, md: 3.5 } }}>
              {CATEGORIES.map((c) => (
                <FilterChip
                  key={c.id}
                  label={c.label}
                  Icon={c.Icon}
                  active={category === c.id}
                  onClick={() => setCategory(c.id)}
                />
              ))}
            </ChipRail>
          </motion.div>

          <Box sx={{ mt: 4 }}>
            {loading ? (
              <CardGridSkeleton count={6} minWidth={300} />
            ) : error ? (
              <ErrorState
                title="Couldn't load templates"
                description={error}
                onRetry={() => setReloadKey((k) => k + 1)}
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={IconTemplate}
                title={category === 'all' ? 'No templates yet' : 'Nothing with that vibe yet'}
                description={
                  category === 'all'
                    ? 'When travellers publish a trip as a template, it will show up here ready to copy.'
                    : 'Try another vibe, or browse everything.'
                }
                {...(category === 'all'
                  ? { actionLabel: 'Browse the community', onAction: () => navigate('/community') }
                  : { actionLabel: 'Show all templates', onAction: () => setCategory('all') })}
              />
            ) : (
              <>
                <Typography sx={{ mb: 2.5, fontSize: 13, color: 'text.secondary' }}>
                  {filtered.length} {filtered.length === 1 ? 'template' : 'templates'}
                </Typography>
                <Box sx={gridSx}>
                  {filtered.map((t: any) => (
                    <CommunityTripCard key={t.id || t.Id} trip={t} typeTag="template" onClick={() => handleClick(t)} />
                  ))}
                </Box>
              </>
            )}
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default Templates;
