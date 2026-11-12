import React from 'react';
import { Box, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import { IconX } from '@tabler/icons-react';
import PostComposer from '../../../posts/PostComposer';
import type { TravelerPost } from '../../../posts/types';
import type { AfterStorySummaryDto } from '../../../afterstory/types';
import type { TripVM } from '../tripViewModel';
import FeaturedEditor from './FeaturedEditor';
import { FeaturedShelf } from './FeaturedShelf';
import { PhotobookSection } from './PhotobookSection';
import { SectionRule } from './PortfolioSection';
import { TravelJournal } from './TravelJournal';
import { useFeatured, usePhotobook, useTravelJournal } from './usePortfolio';

/** Each section rises in once as it scrolls into view; never again on a re-render. */
const Reveal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
};

/**
 * Everything under a profile's header, for your own profile and everyone
 * else's alike, as the app lays it out: Featured, Photobook, Travel Journal,
 * in that order, each under a quiet heading with a hairline between them. All
 * three are always there; an empty one shows a quote (owner rule).
 */
const ProfilePortfolio: React.FC<{
  userId: number | null;
  isOwner: boolean;
  /** Theirs, for "Asha's latest …" and the Photobook's title. */
  name: string | null;
  /** The journal's plans: yours (drafts and crew trips included) or their published ones. */
  trips: readonly TripVM[];
  /** Published stories only. */
  stories: readonly AfterStorySummaryDto[];
  sourcesLoading: boolean;
  onCreatePlan?: () => void;
  onWriteStory?: () => void;
}> = ({ userId, isOwner, name, trips, stories, sourcesLoading, onCreatePlan, onWriteStory }) => {
  const featured = useFeatured(userId);
  const book = usePhotobook(userId);
  const journal = useTravelJournal({ userId, isOwner, trips, stories, sourcesLoading });
  const [editing, setEditing] = React.useState(false);
  const [composing, setComposing] = React.useState(false);

  // What can be featured: your own published plans (never a crew trip of someone else's).
  const featurablePlans = React.useMemo(
    () => trips.filter((t) => t.isPublished && (!t.ownerId || t.ownerId === String(userId))),
    [trips, userId],
  );

  const onPosted = (post: TravelerPost) => {
    setComposing(false);
    journal.prepend(post);
    if (post.media?.length) book.reload();
  };

  return (
    <Box>
      <Reveal>
        <FeaturedShelf state={featured} isOwner={isOwner} onEdit={isOwner ? () => setEditing(true) : undefined} />
      </Reveal>
      <SectionRule />
      <Reveal>
        <PhotobookSection state={book} isOwner={isOwner} name={name} onAddPhoto={isOwner ? () => setComposing(true) : undefined} />
      </Reveal>
      <SectionRule />
      <Reveal>
        <TravelJournal state={journal} isOwner={isOwner} name={name} onCreatePlan={onCreatePlan} onWriteStory={onWriteStory} />
      </Reveal>

      {isOwner ? (
        <>
          <FeaturedEditor
            open={editing}
            onClose={() => setEditing(false)}
            current={featured.items}
            plans={featurablePlans}
            stories={stories}
            photos={book}
            onSaved={featured.replace}
          />
          <Dialog open={composing} onClose={() => setComposing(false)} fullWidth maxWidth="sm" aria-labelledby="share-memory-title">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 2, pb: 1 }}>
              <Typography id="share-memory-title" sx={(theme) => ({ fontFamily: theme.custom.fontDisplay, fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.015em' })}>
                Share a memory
              </Typography>
              <IconButton aria-label="Close" onClick={() => setComposing(false)} size="small"><IconX size={18} /></IconButton>
            </Box>
            <DialogContent sx={{ px: 2.5, pb: 2.5 }}>
              <PostComposer onPosted={onPosted} placeholder="Where was this? Add a photo and a line about it." />
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </Box>
  );
};

export default ProfilePortfolio;
