/**
 * The story editor.
 *
 * Mounted in two places with the same props: inside the planner as a section
 * (?tab=story) and at /story/:storyId/edit for a standalone story. Keeping it
 * one component is what stops the two surfaces drifting, which is the usual fate
 * of an "embedded version" of an editor.
 *
 * Layout is edit-in-place rather than form-beside-preview. A story is a visual
 * object, so the nearer the writing surface is to the finished page the fewer
 * surprises there are at publish. The inspector on the right holds everything
 * that is not the story itself.
 */

import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { IconSettings, IconArrowBackUp, IconEye, IconWand, IconRefresh } from '@tabler/icons-react';
import SaveIndicator from '../../components/ui/SaveIndicator';
import BlockCanvas from './BlockCanvas';
import CoverPicker from './CoverPicker';
import StoryMetaBar from './StoryMetaBar';
import PublishBar from './PublishBar';
import ContributorsPanel from './ContributorsPanel';
import ImportFromPlanDialog from './ImportFromPlanDialog';
import AfterStoryReader from '../render/AfterStoryReader';
import { useAfterStory } from '../useAfterStory';
import { afterStoryService } from '../afterStoryService';
import { missingScaffold, templateStyle } from '../render/templates';
import { formatTravelWindow } from '../storyFormat';
import { countPhotos, readingMinutes, isBlockEmpty, parseBlocks } from '../blockSchema';
import { STORY_LIMITS } from '../types';
import type { AfterStoryDto, StoryBlock, StoryTemplate } from '../types';

interface AfterStoryEditorProps {
  storyId: string;
  /** Shown when the editor is a planner section rather than its own page. */
  embedded?: boolean;
  onBack?: () => void;
}

const INSPECTOR_WIDTH = 320;

const AfterStoryEditor: React.FC<AfterStoryEditorProps> = ({ storyId, embedded, onBack }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const {
    story,
    draft,
    loading,
    loadError,
    saveState,
    saveError,
    lastSavedAt,
    update,
    setBlocks,
    applyStory,
    saveNow,
    setStatus,
    attachTrip,
    reload,
  } = useAfterStory(storyId);

  const [inspectorOpen, setInspectorOpen] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const upload = React.useCallback((file: File) => afterStoryService.uploadPhoto(storyId, file), [storyId]);

  const applyScaffold = React.useCallback(
    (template: StoryTemplate) => {
      setBlocks((prev) => [...prev, ...missingScaffold(template, prev)]);
    },
    [setBlocks],
  );

  const handleImport = React.useCallback(
    (imported: StoryBlock[]) => {
      setBlocks((prev) => [...prev, ...imported].slice(0, STORY_LIMITS.maxBlocks));
      setToast(`Added ${imported.length} block${imported.length === 1 ? '' : 's'} from your plan.`);
    },
    [setBlocks],
  );

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (loadError || !draft || !story) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={() => void reload()} startIcon={<IconRefresh size={14} />}>
              Try again
            </Button>
          }
        >
          {loadError ?? 'That story could not be loaded.'}
        </Alert>
      </Box>
    );
  }

  // An invited admin can read the draft but not edit it yet, which is what
  // makes accepting an informed choice rather than agreeing to put your name on
  // writing you have not seen.
  if (story.pendingInvite) {
    return (
      <InvitePrompt
        story={story}
        onResponded={(next) => {
          applyStory(next);
          // Accepting turns canEdit on, so the editor below takes over on the
          // next render with no reload and nothing lost.
          if (!next.canEdit) onBack?.();
        }}
      />
    );
  }

  if (!story.canEdit) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">This story belongs to someone else, so it is read only for you.</Alert>
      </Box>
    );
  }

  const style = templateStyle(draft.template);
  const photosUsed = countPhotos(draft.blocks);
  const written = draft.blocks.filter((b) => !isBlockEmpty(b)).length;

  const inspector = (
    <Box sx={{ display: 'grid', gap: 2.5, p: { xs: 2, lg: 0 } }}>
      {/* Sharing leads the inspector. It is the decision an author comes back
          to make, and burying it under the cover picker made it feel like a
          setting rather than the point. */}
      {/* Publishing is the lead author's call: their name leads the byline and
          they carry the consequence, so an admin edits but does not ship. */}
      {story.isAuthor && (
        <PublishBar story={story} blocks={draft.blocks} onStatusChange={setStatus} onAttachTrip={attachTrip} />
      )}
      <ContributorsPanel story={story} onChanged={applyStory} />
      <CoverPicker draft={draft} onChange={update} onUpload={upload} />
      <StoryMetaBar draft={draft} onChange={update} onApplyScaffold={applyScaffold} />
    </Box>
  );

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Sticky, because knowing whether work is saved matters most while
          scrolled deep into a long story, which is exactly where a status line
          pinned to the top would be invisible. */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1.25,
          px: { xs: 1.5, md: 2 },
          bgcolor: 'background.default',
          borderBottom: `1px solid ${theme.custom.surface.border}`,
        }}
      >
        {onBack && (
          <Tooltip title="Back">
            <IconButton size="small" onClick={onBack} aria-label="Back">
              <IconArrowBackUp size={17} />
            </IconButton>
          </Tooltip>
        )}

        <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} error={saveError} onRetry={() => void saveNow()} />

        <Box sx={{ flex: 1 }} />

        {story.tripId && (
          <Button
            size="small"
            startIcon={<IconWand size={15} />}
            onClick={() => setImportOpen(true)}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Bring in from your plan
          </Button>
        )}

        <Button
          size="small"
          startIcon={<IconEye size={15} />}
          onClick={() => setPreviewing((p) => !p)}
          color={previewing ? 'primary' : 'inherit'}
        >
          {previewing ? 'Keep writing' : 'Preview'}
        </Button>

        {!isDesktop && (
          <Tooltip title="Story settings">
            <IconButton size="small" onClick={() => setInspectorOpen(true)} aria-label="Story settings">
              <IconSettings size={17} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: `minmax(0, 1fr) ${INSPECTOR_WIDTH}px` },
          gap: { xs: 0, lg: 4 },
          maxWidth: embedded ? '100%' : 1280,
          mx: 'auto',
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="Give this story a title"
            value={draft.title}
            onChange={(e) => update({ title: e.target.value.slice(0, STORY_LIMITS.maxTitleChars) })}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {
                  fontFamily: theme.custom.fontDisplay,
                  fontWeight: 700,
                  fontSize: { xs: '1.9rem', md: '2.5rem' },
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                },
              },
            }}
            sx={{ mb: 1 }}
          />

          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            {[
              draft.destination || null,
              formatTravelWindow(draft.travelStartDate, draft.travelEndDate),
              written > 0 ? `${written} block${written === 1 ? '' : 's'}` : null,
              photosUsed > 0 ? `${photosUsed} photo${photosUsed === 1 ? '' : 's'}` : null,
              written > 0 ? `about ${readingMinutes(draft.blocks)} min to read` : null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </Typography>

          {previewing ? (
            <Box sx={{ maxWidth: `${style.measure + 16}ch` }}>
              <AfterStoryReader blocks={draft.blocks} template={draft.template} />
              {draft.blocks.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  There is nothing to preview yet.
                </Typography>
              )}
            </Box>
          ) : (
            <BlockCanvas
              blocks={draft.blocks}
              template={draft.template}
              onChange={setBlocks}
              onUpload={upload}
            />
          )}

          {story.tripId && (
            <Button
              size="small"
              startIcon={<IconWand size={15} />}
              onClick={() => setImportOpen(true)}
              sx={{ mt: 2, display: { xs: 'inline-flex', sm: 'none' } }}
            >
              Bring in from your plan
            </Button>
          )}
        </Box>

        {isDesktop && <Box sx={{ position: 'sticky', top: 76, alignSelf: 'start' }}>{inspector}</Box>}
      </Box>

      {!isDesktop && (
        <Drawer
          anchor="right"
          open={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
          slotProps={{ paper: { sx: { width: { xs: '100%', sm: 400 } } } }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 2 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Story settings
            </Typography>
            <Button size="small" onClick={() => setInspectorOpen(false)}>
              Done
            </Button>
          </Box>
          {inspector}
        </Drawer>
      )}

      {story.tripId && (
        <ImportFromPlanDialog
          open={importOpen}
          tripId={story.tripId}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

/**
 * What somebody invited as a story admin sees before they accept.
 *
 * Shows the story they are being asked to put their name on, because a byline is
 * not a small thing to hand someone: agreeing sight-unseen is how people end up
 * publicly attached to writing they disagree with.
 */
const InvitePrompt: React.FC<{
  story: AfterStoryDto;
  onResponded: (next: AfterStoryDto) => void;
}> = ({ story, onResponded }) => {
  const theme = useTheme();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const respond = async (accept: boolean) => {
    setBusy(true);
    setError(null);
    try {
      onResponded(await afterStoryService.respondToInvite(story.id, accept));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not answer that invitation.');
    } finally {
      setBusy(false);
    }
  };

  const blocks = parseBlocks(story.bodyJson);

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2.5, md: 3 }, py: { xs: 4, md: 6 } }}>
      <Typography variant="overline" sx={{ color: 'primary.main' }}>
        {story.author?.displayName ?? 'A traveller'} asked you to help write this
      </Typography>

      <Typography
        variant="h4"
        sx={{ fontFamily: theme.custom.fontDisplay, fontWeight: 700, mt: 0.5, mb: 1 }}
      >
        {story.title}
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        If you accept, you can edit it and your name goes on it alongside theirs. They stay in charge of
        publishing.
      </Typography>

      {/* A read-only look at what exists so far. Nothing to decide on otherwise. */}
      <Box
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          maxHeight: 420,
          overflowY: 'auto',
          borderRadius: '16px',
          border: `1px solid ${theme.custom.surface.border}`,
          bgcolor: 'background.paper',
        }}
      >
        {blocks.length > 0 ? (
          <AfterStoryReader blocks={blocks} template={story.template} />
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Nothing written yet. You would be starting it together.
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button variant="contained" disabled={busy} onClick={() => void respond(true)}>
          {busy ? 'Working...' : 'Join as a story admin'}
        </Button>
        <Button color="inherit" disabled={busy} onClick={() => void respond(false)}>
          No thanks
        </Button>
      </Box>

      {error && (
        <Typography variant="body2" sx={{ color: 'error.main', mt: 2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default AfterStoryEditor;
