/**
 * The planner tour deck.
 *
 * Every step names a `target` that must match a `data-tour="<target>"` attribute on
 * a real element in the planner. **Steps whose target is not in the DOM are skipped
 * at runtime**, which is what makes this deck mode-aware without any branching:
 * Simple mode renders no Publish button and no Reality-check pill, so those steps
 * simply do not occur that run.
 *
 * Keep the copy in the same register as the rest of the product: say what the thing
 * does, not how excited we are about it. No exclamation marks, no "Awesome!".
 */
export interface PlannerTourStep {
  /** Matches `data-tour` on the element to highlight. */
  target: string;
  title: string;
  body: string;
  /** Where the bubble sits relative to the target. */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const PLANNER_TOUR_STEPS: PlannerTourStep[] = [
  {
    target: 'planner-mode',
    title: 'Two ways to plan',
    body: 'Simple keeps it to stops, nights and notes. Advanced adds stays, places, budget and publishing. Switch whenever you like. Nothing is lost either way.',
    placement: 'bottom',
  },
  {
    target: 'add-stop',
    title: 'Start with places you know',
    body: 'Add the towns or cities you are sure about. Drag them to reorder, and set how many nights you want at each.',
    placement: 'top',
  },
  {
    target: 'stop-note',
    title: 'Keep your thinking on the stop',
    body: 'Train times, a booking code, a rainy-day backup: anything you write here stays with that stop.',
    placement: 'left',
  },
  {
    target: 'navia',
    title: 'Let Navia draft it',
    body: 'Navia can fill the nights you have not placed and write notes for each stop. Every place it suggests is checked against a real listing first.',
    placement: 'top',
  },
  {
    // Anchored on the desktop MAP rail tab and the phone's floating map button;
    // only one of the two is ever in the DOM, so the step resolves either way.
    target: 'map',
    title: 'See it on a map',
    body: 'Your route, in order, with the travel between stops. Hovering a stop lifts its pin.',
    placement: 'left',
  },
  {
    // Advanced only - auto-skipped in Simple, which has no Reality check.
    target: 'reality-check',
    title: 'Check that it holds up',
    body: 'This measures your plan against real distances, opening hours and how much fits in a day. Plain arithmetic, not AI, so when it says a leg eats most of a day, it can show you why.',
    placement: 'bottom',
  },
  {
    // Advanced only.
    target: 'publish',
    title: 'Share it when you are ready',
    body: 'Publishing puts your trip in the community, where other travellers can read it or make it their own. Drafts stay private until you do.',
    placement: 'bottom',
  },
  {
    target: 'save',
    title: 'Nothing to lose',
    body: 'Your plan saves itself as you work. The Save button is only there for when you want to be certain.',
    placement: 'top',
  },
];

export default PLANNER_TOUR_STEPS;
