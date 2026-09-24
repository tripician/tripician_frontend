import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { IconCircleCheck, IconMessageCircleQuestion } from '@tabler/icons-react';
import { postsService } from './postsService';
import { placeQuestionsHref, placeTag } from './postTags';
import type { TravelerPost } from './types';

const SHOWN = 3;

// What travellers asked about this place, beside a plan or story about it: Q&A that sits around the trip instead of next to it.
const PlaceQuestions: React.FC<{ countries: string[]; sx?: object }> = ({ countries, sx }) => {
  const theme = useTheme();
  const country = countries.find((c) => c && c.trim())?.trim() ?? null;
  const [questions, setQuestions] = React.useState<TravelerPost[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!country) return;
    let active = true;
    postsService.questions({ tags: [placeTag(country)], sort: 'top', pageSize: SHOWN })
      .then((page) => {
        if (!active) return;
        setQuestions(page.items);
        setTotal(page.total);
      })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [country]);

  if (!country || !loaded) return null;
  const href = placeQuestionsHref(country);

  return (
    <Box component="section" aria-label={`Questions about ${country}`} sx={sx}>
      <Typography variant="h4" component="h2" sx={{ color: 'text.primary' }}>
        {total > 0 ? `Travellers asked about ${country}` : `Heading to ${country}?`}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
        {total > 0
          ? 'Answered by people who have been.'
          : `Nobody has asked about ${country} yet. Ask the travellers who have been.`}
      </Typography>

      {questions.length > 0 && (
        <Box sx={{ borderRadius: '14px', border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper', overflow: 'hidden', mb: 2 }}>
          {questions.map((q, i) => (
            <Box
              key={q.id}
              component={RouterLink}
              to={`/post/${q.id}`}
              sx={{
                display: 'flex', alignItems: 'flex-start', gap: 1.25, px: 2, py: 1.5,
                color: 'inherit', textDecoration: 'none',
                borderTop: i === 0 ? 'none' : `1px solid ${theme.custom.surface.border}`,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ color: q.acceptedAnswerId ? 'success.main' : 'text.disabled', display: 'flex', pt: 0.25 }}>
                {q.acceptedAnswerId ? <IconCircleCheck size={18} /> : <IconMessageCircleQuestion size={18} />}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{q.title || q.body}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {q.replyCount} {q.replyCount === 1 ? 'answer' : 'answers'}{q.acceptedAnswerId ? ' · answered' : ''}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {total > SHOWN && (
          <Button component={RouterLink} to={href} variant="outlined" size="small" sx={{ textTransform: 'none', fontWeight: 600 }}>
            See all {total} questions
          </Button>
        )}
        <Button component={RouterLink} to={href} size="small" startIcon={<IconMessageCircleQuestion size={16} />} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Ask about {country}
        </Button>
      </Box>
    </Box>
  );
};

export default PlaceQuestions;
