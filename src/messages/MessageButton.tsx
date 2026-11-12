/**
 * "Message" beside a person: opens your chat with them, or a new one (a
 * message request when they don't know you), docked on a computer and on the
 * Messages page on a phone.
 *
 * Renders nothing when they can't be messaged at all (blocked, or not taking
 * messages): a button that fails on click teaches people the feature is
 * broken. Used on join request rows, where an organiser deciding who to spend
 * two weeks with can ask a question first, and on profiles.
 */

import React from 'react';
import { Button } from '@mui/material';
import { IconMessage } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from './chatApi';
import { messagesHref, useChatDock } from './chatDockContext';

interface Props {
  userId: number;
  /** The trip the chat starts from, if any: the chat shows it, and a join request is decided in place. */
  tripId?: string;
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'contained' | 'text';
  fullWidth?: boolean;
  sx?: object;
}

const MessageButton: React.FC<Props> = ({ userId, tripId, name, avatarUrl, size = 'small', variant = 'outlined', fullWidth, sx }) => {
  const dock = useChatDock();
  const navigate = useNavigate();
  const [shown, setShown] = React.useState(false);
  const [target, setTarget] = React.useState<{ conversationId: string | null; name: string | null; avatarUrl: string | null } | null>(null);

  React.useEffect(() => {
    if (!Number.isFinite(userId)) return undefined;
    let live = true;
    void chatApi.with(userId)
      .then(({ data }) => {
        if (!live) return;
        const closed = data.blocker === 'unavailable' || data.blocker === 'not-accepting';
        setShown(!closed);
        setTarget({ conversationId: data.id, name: data.other.name, avatarUrl: data.other.avatarUrl });
      })
      .catch(() => { /* no button is the right answer when we cannot tell */ });
    return () => { live = false; };
  }, [userId]);

  if (!shown) return null;

  const open = () => {
    const t = {
      conversationId: target?.conversationId ?? null,
      userId,
      name: target?.name ?? name ?? null,
      avatarUrl: target?.avatarUrl ?? avatarUrl ?? null,
      tripId: tripId ?? null,
    };
    if (dock) dock.openChat(t);
    else navigate(messagesHref(t));
  };

  return (
    <Button size={size} variant={variant} startIcon={<IconMessage size={size === 'small' ? 15 : 18} />} onClick={open} fullWidth={fullWidth} sx={sx}>
      Message
    </Button>
  );
};

export default MessageButton;
