/**
 * Ask the author.
 *
 * This is the Q&A play, and the reason it sits on a story rather than on a
 * board. A question posted to a forum hopes someone qualified wanders past. A
 * question posted here is aimed at a specific person who demonstrably went to
 * the place, in the month they went, and wrote about it. That pairing is the one
 * thing a general travel forum cannot manufacture.
 *
 * It is deliberately not a comment thread. There is no "nice photos", no reply
 * to a reply, and the composer says "Ask" rather than "Comment". Threads drift
 * into chat; this stays a question with an answer, which is the part that is
 * still useful to the next reader a year later.
 */

import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useRequireAuth } from '../auth/AuthGate';
import { takeDraft } from '../utils/pendingDraft';
import { IconTrash, IconMessageCircleQuestion } from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { afterStoryService } from './afterStoryService';
import { STORY_FIELD_SX } from './storyFormat';
import type { StoryQuestion } from './types';

dayjs.extend(relativeTime);

interface StoryQuestionsProps {
  storyId: string;
  /** Shown in the prompt so it reads as a person, not a form. */
  authorName?: string;
  /** True when the viewer can answer as the author. */
  isAuthor: boolean;
}

const MAX = 1200;

const StoryQuestions: React.FC<StoryQuestionsProps> = ({ storyId, authorName, isAuthor }) => {
  const theme = useTheme();
  const requireAuth = useRequireAuth();

  // Scoped to the story, so a draft cannot reappear on a different one.
  const draftKey = `story-question:${storyId}`;

  const [questions, setQuestions] = React.useState<StoryQuestion[]>([]);
  const [draft, setDraft] = React.useState(() => takeDraft(draftKey) ?? '');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [answering, setAnswering] = React.useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    void afterStoryService.getQuestions(storyId).then((rows) => {
      if (!cancelled) setQuestions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  const post = async (content: string, parentId?: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    if (!requireAuth({
      reason: parentId
        ? 'Your answer is saved. Sign in and it posts where you left it.'
        : 'Your question is saved. Sign in and it posts where you left it.',
      draft: { key: draftKey, text: trimmed },
    })) return;

    setBusy(true);
    setError(null);
    try {
      const created = await afterStoryService.ask(storyId, trimmed, parentId);
      setQuestions((prev) =>
        parentId
          ? prev.map((q) => (q.id === parentId ? { ...q, answers: [...q.answers, created] } : q))
          : [...prev, created],
      );
      if (parentId) {
        setAnswering(null);
        setAnswerDraft('');
      } else {
        setDraft('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post that.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (questionId: string, parentId?: string) => {
    try {
      await afterStoryService.deleteQuestion(storyId, questionId);
      setQuestions((prev) =>
        parentId
          ? prev.map((q) =>
              q.id === parentId ? { ...q, answers: q.answers.filter((a) => a.id !== questionId) } : q,
            )
          : prev.filter((q) => q.id !== questionId),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that.');
    }
  };

  const who = authorName?.split(' ')[0] ?? 'them';

  return (
    <Box sx={{ mt: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <IconMessageCircleQuestion size={19} style={{ color: theme.palette.primary.main }} />
        <Typography variant="h4" component="h2" sx={{ color: 'text.primary' }}>
          Ask {who}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        They actually went. Ask the thing a guidebook will not tell you.
      </Typography>

      {!isAuthor && (
        <Box sx={{ display: 'grid', gap: 1, mb: 4, maxWidth: 680 }}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="Was it worth the early start? Would you stay there again?"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
            sx={STORY_FIELD_SX}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              disabled={busy || draft.trim().length === 0}
              onClick={() => void post(draft)}
            >
              {busy ? 'Posting...' : 'Ask'}
            </Button>
            {draft.length > MAX * 0.8 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {draft.length}/{MAX}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {error && (
        <Typography variant="body2" sx={{ color: 'error.main', mb: 2 }}>
          {error}
        </Typography>
      )}

      {questions.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {isAuthor
            ? 'No questions yet. When readers ask, they will show up here.'
            : 'No questions yet. Be the first.'}
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 3, maxWidth: 720 }}>
          {questions.map((question) => (
            <Box key={question.id}>
              <Entry entry={question} onDelete={() => void remove(question.id)} />

              {question.answers.length > 0 && (
                <Box
                  sx={{
                    mt: 1.5,
                    ml: { xs: 2, sm: 4.5 },
                    pl: 2,
                    borderLeft: `2px solid ${theme.custom.surface.border}`,
                    display: 'grid',
                    gap: 1.5,
                  }}
                >
                  {question.answers.map((answer) => (
                    <Entry
                      key={answer.id}
                      entry={answer}
                      onDelete={() => void remove(answer.id, question.id)}
                    />
                  ))}
                </Box>
              )}

              {/* Only the people who went can answer. A stranger guessing on
                  someone else's behalf is exactly what this is meant to replace. */}
              {isAuthor && (
                <Box sx={{ mt: 1.5, ml: { xs: 2, sm: 4.5 } }}>
                  {answering === question.id ? (
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        autoFocus
                        placeholder="Answer this"
                        value={answerDraft}
                        onChange={(e) => setAnswerDraft(e.target.value.slice(0, MAX))}
                        sx={STORY_FIELD_SX}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={busy || answerDraft.trim().length === 0}
                          onClick={() => void post(answerDraft, question.id)}
                        >
                          Answer
                        </Button>
                        <Button size="small" color="inherit" onClick={() => setAnswering(null)}>
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Button
                      size="small"
                      onClick={() => {
                        setAnswering(question.id);
                        setAnswerDraft('');
                      }}
                    >
                      Answer
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

const Entry: React.FC<{ entry: StoryQuestion; onDelete: () => void }> = ({ entry, onDelete }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Avatar
        src={entry.profilePicture ?? undefined}
        onClick={() => navigate(`/traveler/${entry.userId}`)}
        sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main', cursor: 'pointer', flexShrink: 0 }}
      >
        {entry.displayName?.[0] ?? 'T'}
      </Avatar>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
            {entry.displayName ?? 'Traveller'}
          </Typography>

          {/* The badge is the whole point: it says this answer came from the
              person who was there, not from someone with an opinion. */}
          {entry.fromAuthor && (
            <Chip
              size="small"
              label="Went there"
              sx={{
                height: 19,
                fontSize: 10.5,
                fontWeight: 600,
                bgcolor: theme.custom.surface.brandTint,
                color: 'primary.main',
              }}
            />
          )}

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {dayjs(entry.createdAt).fromNow()}
          </Typography>

          <Box sx={{ flex: 1 }} />

          {entry.canDelete && (
            <Tooltip title="Delete">
              <IconButton size="small" onClick={onDelete} aria-label="Delete" sx={{ color: 'text.disabled' }}>
                <IconTrash size={14} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {entry.content}
        </Typography>
      </Box>
    </Box>
  );
};

export default StoryQuestions;
