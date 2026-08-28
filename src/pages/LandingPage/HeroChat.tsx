import { useCallback, useRef, useState } from 'react';
import { IconArrowRight, IconSparkles } from '@tabler/icons-react';
import NaviaOrb from '../../navia/NaviaOrb';
import { renderMarkdown } from '../../navia/markdown';
import { useRequireAuth } from '../../auth/AuthGate';
import { COMMAND_BAR_DRAFT_KEY } from '../../navia/commandbar/useCommandBar';
import {
  streamGuestChat, draftGuestTrip, GuestQuotaSpentError,
  type GuestMessage, type GuestDraft,
} from '../../navia/guestChat';

/** Shown once, before the first message, so the first thing to type is obvious. */
const OPENERS = [
  '5 days in Vietnam, mostly food',
  'Where is warm in December?',
  'A week in Japan on a budget',
];

/**
 * Navia on the front door, for people who have not signed in.
 *
 * The landing page described the product; this shows it working. A visitor can
 * ask real questions and have one real itinerary drafted before anything is
 * asked of them, and the account is only needed to KEEP that itinerary. Value
 * first, wall second, which is the same order `useRequireAuth` already enforces
 * for a half-written post.
 *
 * Deliberately one input and one next step. There is no mode switcher, no
 * settings, no second call to action: somebody meeting the product for the first
 * time should never have to work out where to start.
 */
export default function HeroChat() {
  const requireAuth = useRequireAuth();

  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<GuestDraft | null>(null);
  const [spent, setSpent] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);

  // The transcript at send time, so the streaming updates below never read a
  // stale copy through the closure.
  const messagesRef = useRef<GuestMessage[]>([]);
  messagesRef.current = messages;

  const send = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    setInput('');
    setBusy(true);
    setMessages((prev) => [...prev, { role: 'user', content: question }, { role: 'navia', content: '' }]);

    try {
      for await (const token of streamGuestChat(question, messagesRef.current)) {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'navia') next[next.length - 1] = { ...last, content: last.content + token };
          return next;
        });
      }
    } catch (err) {
      if (err instanceof GuestQuotaSpentError) {
        setSpent(err.message);
        // Drop the empty reply bubble; the sign-in invitation replaces it.
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const buildTrip = useCallback(async () => {
    const basis = messagesRef.current.find((m) => m.role === 'user')?.content;
    if (!basis || drafting) return;

    setDrafting(true);
    try {
      setDraft(await draftGuestTrip(basis));
    } catch (err) {
      if (err instanceof GuestQuotaSpentError) setSpent(err.message);
    } finally {
      setDrafting(false);
    }
  }, [drafting]);

  /**
   * The only thing an account is required for.
   *
   * Hands off to the Navia command bar rather than inventing a channel of its
   * own. Signing in sends you to /community, where that bar is docked, and it
   * already restores a sentence parked under this key and already knows how to
   * turn one into a real trip. So the prompt is waiting in Plan mode when they
   * land, one press from the itinerary they just watched Navia draft.
   *
   * It deliberately does NOT create the trip on arrival. AuthGate's own note
   * says restoring a draft must not perform an action after a redirect that the
   * person may no longer intend, and a trip appearing unbidden is exactly that.
   */
  const saveTrip = useCallback(() => {
    requireAuth({
      reason: 'Sign in and Navia will build this trip in your account.',
      draft: {
        key: COMMAND_BAR_DRAFT_KEY,
        text: messagesRef.current.find((m) => m.role === 'user')?.content ?? '',
        meta: 'plan',
      },
    });
  }, [requireAuth]);

  const started = messages.length > 0;

  return (
    <div className="lp-herochat">
      <form
        className="lp-herochat__bar"
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
      >
        <NaviaOrb size={22} />
        <input
          className="lp-herochat__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Where do you want to go?"
          aria-label="Ask Navia about a trip"
          disabled={Boolean(spent)}
        />
        <button
          type="submit"
          className="lp-herochat__send"
          disabled={busy || !input.trim() || Boolean(spent)}
          aria-label="Ask Navia"
        >
          <IconArrowRight size={18} aria-hidden="true" />
        </button>
      </form>

      {!started && !spent && (
        /* Where the wall actually is, said before anybody meets it. The endpoint
           behind this needs no account and saveTrip is the only path that calls
           requireAuth, so this is a statement of what the code does rather than a
           promise. Clears once a conversation starts: by then they know. */
        <p className="lp-herochat__hint">
          Free to try. Sign in only when you want to keep something.
        </p>
      )}

      {!started && !spent && (
        <div className="lp-herochat__openers">
          {OPENERS.map((o) => (
            <button key={o} type="button" className="lp-herochat__opener" onClick={() => void send(o)}>
              {o}
            </button>
          ))}
        </div>
      )}

      {started && (
        <div className="lp-herochat__thread">
          {messages.map((m, i) => (
            <div key={i} className={`lp-herochat__msg lp-herochat__msg--${m.role}`}>
              {/* Same renderer the signed-in chat uses. The prompt asks for bold
                  place names and day labels, so without this the reply arrives
                  wearing its asterisks. */}
              {m.role === 'navia'
                ? (m.content ? renderMarkdown(m.content) : (busy && i === messages.length - 1 ? 'Thinking...' : ''))
                : m.content}
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div className="lp-herochat__draft">
          <div className="lp-herochat__draft-title">{draft.name ?? 'Your trip'}</div>
          <div className="lp-herochat__draft-meta">
            {[
              draft.countries?.slice(0, 3).join(', '),
              draft.nights ? `${draft.nights} ${draft.nights === 1 ? 'night' : 'nights'}` : null,
              draft.vibe,
            ].filter(Boolean).join(' · ')}
          </div>
          <button type="button" className="lp-btn lp-btn--hero-primary" onClick={saveTrip}>
            Save this trip <IconArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {started && !draft && !spent && (
        <button
          type="button"
          className="lp-herochat__build"
          onClick={() => void buildTrip()}
          disabled={drafting || busy}
        >
          <IconSparkles size={15} aria-hidden="true" />
          {drafting ? 'Drafting your trip...' : 'Turn this into a trip'}
        </button>
      )}

      {spent && (
        // Never "come back tomorrow". One address is often a whole office or a
        // mobile network, so the person who hit the limit frequently is not the
        // person who spent it, and there is always a way through.
        <p className="lp-herochat__spent">
          {spent}{' '}
          <button type="button" className="lp-herochat__signin" onClick={() => requireAuth({ reason: spent })}>
            Sign in
          </button>
        </p>
      )}
    </div>
  );
}
