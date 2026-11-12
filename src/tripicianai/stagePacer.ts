import type { TripicianAIStage as TripicianAIStep } from './tripicianAIService';

export type StagePacerSink = {
  /** The steps shown so far, in order; the last is the one in progress. */
  onSteps: (steps: TripicianAIStep[]) => void;
  /** Text released for display, to append. */
  onText: (text: string) => void;
};

export type StagePacerClock = {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const systemClock: StagePacerClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** How long each step stays the current one, at least: long enough to read. */
export const MIN_STEP_MS = 750;

export type StagePacer = {
  pushStep: (step: TripicianAIStep) => void;
  pushText: (text: string) => void;
  /** Calls `onSettled` once every step has been shown and all text released. */
  finish: (onSettled: () => void) => void;
  /** Releases anything held straight away and stops (stop, error). */
  flush: () => void;
};

/**
 * Paces the staged answer so each step can be read.
 *
 * The server announces steps as it starts them, and several can land within a
 * few milliseconds of each other (a database read is quick). Shown as they
 * arrive, they would flash past. Here each step holds the screen for at least
 * MIN_STEP_MS, and the answer's first words wait until the last step has had
 * its turn; after that, text flows straight through.
 *
 * An answer with no steps (an older server) is never held at all.
 */
export function createStagePacer(sink: StagePacerSink, clock: StagePacerClock = systemClock): StagePacer {
  const queue: TripicianAIStep[] = [];
  const shown: TripicianAIStep[] = [];
  let held = '';
  let floorUntil = 0;
  let timer: unknown = null;
  let settle: (() => void) | null = null;
  let stopped = false;

  const schedule = (ms: number) => {
    timer = clock.setTimeout(() => {
      timer = null;
      pump();
    }, ms);
  };

  function pump() {
    if (stopped || timer !== null) return;
    const now = clock.now();
    if (now < floorUntil) {
      schedule(floorUntil - now);
      return;
    }
    const next = queue.shift();
    if (next) {
      shown.push(next);
      sink.onSteps(shown.slice());
      floorUntil = clock.now() + MIN_STEP_MS;
      schedule(MIN_STEP_MS);
      return;
    }
    if (held) {
      const text = held;
      held = '';
      sink.onText(text);
    }
    if (settle) {
      const done = settle;
      settle = null;
      done();
    }
  }

  return {
    pushStep(step) {
      if (stopped) return;
      queue.push(step);
      pump();
    },
    pushText(text) {
      if (stopped || !text) return;
      held += text;
      pump();
    },
    finish(onSettled) {
      if (stopped) {
        onSettled();
        return;
      }
      settle = onSettled;
      pump();
    },
    flush() {
      if (stopped) return;
      stopped = true;
      if (timer !== null) {
        clock.clearTimeout(timer);
        timer = null;
      }
      if (queue.length) {
        shown.push(...queue.splice(0));
        sink.onSteps(shown.slice());
      }
      if (held) {
        const text = held;
        held = '';
        sink.onText(text);
      }
    },
  };
}
