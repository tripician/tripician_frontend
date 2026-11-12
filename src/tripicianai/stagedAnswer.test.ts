import { describe, expect, it, vi } from 'vitest';

import { createStagePacer, MIN_STEP_MS, type StagePacerClock } from './stagePacer';
import { parseRichAnswer, splitLeadingEmoji } from './richAnswer';
import { localDateString } from './tripicianAIService';

vi.mock('../services/APIs/apiServices', () => ({ apiServices: {} }));
vi.mock('../utils/feedbackPrompt', () => ({ scheduleFeedbackPrompt: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

const { tripBasicsFromExtract } = await import('./useCreateTripFromChat');

/** A clock the test moves by hand. */
function fakeClock() {
  let now = 0;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let nextId = 1;
  const clock: StagePacerClock = {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = nextId++;
      timers.push({ at: now + ms, fn, id });
      return id;
    },
    clearTimeout: (handle) => {
      timers = timers.filter((t) => t.id !== handle);
    },
  };
  const advance = (ms: number) => {
    const until = now + ms;
    for (;;) {
      const due = timers.filter((t) => t.at <= until).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      timers = timers.filter((t) => t !== due);
      now = due.at;
      due.fn();
    }
    now = until;
  };
  return { clock, advance };
}

describe('the stage pacer', () => {
  it('shows each step for at least the minimum, then lets the answer through', () => {
    const { clock, advance } = fakeClock();
    const shown: string[][] = [];
    let text = '';
    const pacer = createStagePacer(
      { onSteps: (steps) => shown.push(steps.map((s) => s.id)), onText: (chunk) => { text += chunk; } },
      clock,
    );
    pacer.pushStep({ id: 'understand', label: 'Reading between the lines…' });
    pacer.pushStep({ id: 'compose', label: 'Sketching your day-by-day…' });
    pacer.pushText('Hello');
    expect(shown).toEqual([['understand']]);
    expect(text).toBe('');
    advance(MIN_STEP_MS);
    expect(shown[1]).toEqual(['understand', 'compose']);
    expect(text).toBe('');
    advance(MIN_STEP_MS);
    expect(text).toBe('Hello');
  });

  it('never holds an answer that has no steps', () => {
    const { clock } = fakeClock();
    let text = '';
    const pacer = createStagePacer({ onSteps: () => undefined, onText: (chunk) => { text += chunk; } }, clock);
    pacer.pushText('Plain');
    expect(text).toBe('Plain');
  });
});

describe('reading a decorated answer', () => {
  it('finds the glance, days, callouts and the closing line', () => {
    const blocks = parseRichAnswer(
      [
        'Here we go.',
        '**At a glance:** 5 days · Lisbon → Porto',
        '## Day 1 · Lisbon',
        '- 🏛️ Walk the **Baixa**',
        '',
        '## Days 2–3 · Porto',
        '- 🍷 Port tasting',
        '',
        '> 💡 Buy a Viva Viagem card',
        '> ⚠️ Metro strike on 14 Nov',
        '',
        'Want a budget too?',
      ].join('\n'),
    );
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'glance', 'day', 'day', 'callout', 'callout', 'paragraph']);
    expect(blocks[2]).toMatchObject({ label: 'Day 1', title: 'Lisbon', items: [{ emoji: '🏛️', text: 'Walk the **Baixa**' }] });
    expect(blocks[3]).toMatchObject({ label: 'Days 2–3', title: 'Porto' });
    expect(blocks[4]).toMatchObject({ tone: 'tip' });
    expect(blocks[5]).toMatchObject({ tone: 'warning' });
  });

  it('splits emoji with variation selectors and joiners', () => {
    expect(splitLeadingEmoji('👨‍👩‍👧 Family')).toEqual({ emoji: '👨‍👩‍👧', rest: 'Family' });
    expect(splitLeadingEmoji('Plain')).toEqual({ emoji: null, rest: 'Plain' });
  });
});

describe('a trip from a chat plan', () => {
  it('names it from the plan, then the offer, then the country', () => {
    const extract = { name: '', countries: ['portugal', 'Portugal'], vibe: 'foodie', stops: [] };
    expect(tripBasicsFromExtract(extract, '5 days in Portugal')).toEqual({
      name: '5 days in Portugal',
      countries: ['Portugal'],
      vibe: 'foodie',
    });
    expect(tripBasicsFromExtract({ ...extract, name: 'Lisbon & Porto' }).name).toBe('Lisbon & Porto');
    expect(tripBasicsFromExtract(extract).name).toBe('Trip to Portugal');
  });
});

describe('the local date sent with a question', () => {
  it('is the browser date as yyyy-MM-dd', () => {
    expect(localDateString(new Date(2026, 10, 11, 23, 30))).toBe('2026-11-11');
  });
});
