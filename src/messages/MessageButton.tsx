/**
 * "Message" beside a person, opening the thread in place.
 *
 * Renders NOTHING until the server says the pair may talk. That is the whole
 * point of asking first: a button that appears and then fails on click teaches
 * people the feature is broken, and a button that appears for everyone would
 * imply a channel that does not exist.
 *
 * Used where the decision is actually being made, which is the join request row.
 * An organiser choosing who to spend two weeks with can ask a question before
 * deciding, instead of judging a stranger by a form.
 */

import React from 'react';
import { Button, Dialog, DialogContent } from '@mui/material';
import { IconMessage } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { apiServices } from '../services/APIs/apiServices';
import ConversationThread from './ConversationThread';
import type { Conversation } from './types';

interface Props {
  tripId: string;
  userId: number;
  /** Matches the button to whatever row it sits in. */
  size?: 'small' | 'medium';
}

const MessageButton: React.FC<Props> = ({ tripId, userId, size = 'small' }) => {
  const me = useSelector((state: RootState) => state.user.profile);
  const meUserId = Number(me?.id);

  const [allowed, setAllowed] = React.useState(false);
  const [reason, setReason] = React.useState<string | null>(null);
  const [conversation, setConversation] = React.useState<Conversation | null>(null);
  const [opening, setOpening] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!tripId || !Number.isFinite(userId)) return;
    let wanted = `${tripId}:${userId}`;
    void apiServices.canMessage(tripId, userId)
      .then((resp) => {
        if (wanted !== `${tripId}:${userId}`) return;
        setAllowed(!!resp.data?.allowed);
        setReason(resp.data?.reason ?? null);
      })
      .catch(() => { /* no button is the right answer when we cannot tell */ });
    return () => { wanted = ''; };
  }, [tripId, userId]);

  const start = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const resp = await apiServices.openConversation(tripId, userId);
      if (resp.data) { setConversation(resp.data); setOpen(true); }
    } catch {
      // The reason went away between rendering and clicking. Hiding the button
      // is more honest than an error nobody can act on.
      setAllowed(false);
    } finally {
      setOpening(false);
    }
  };

  if (!allowed || !Number.isFinite(meUserId)) return null;

  return (
    <>
      <Button
        size={size}
        variant="outlined"
        startIcon={<IconMessage size={15} />}
        onClick={() => void start()}
        disabled={opening}
      >
        Message
      </Button>

      <Dialog
        open={open && !!conversation}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        // A thread needs a stable height or the dialog jumps as messages load.
        PaperProps={{ sx: { height: 'min(560px, 85vh)' } }}
      >
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {conversation && (
            <ConversationThread conversation={conversation} meUserId={meUserId} reason={reason} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MessageButton;
