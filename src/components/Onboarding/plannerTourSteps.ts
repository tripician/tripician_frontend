/**
 * The planner tour deck.
 *
 * Every step names a `target` that must match a `data-tour="<target>"` attribute on
 * a real element in the planner. **Steps whose target is not in the DOM are skipped
 * at runtime**, so a step for something a viewer cannot see (an empty trip has no
 * stop lanes yet) simply does not occur that run.
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
    target: 'add-stop',
    title: 'Start with places you know',
    body: 'Add the towns or cities you are sure about. Drag them to reorder, and set how many nights you want at each.',
    placement: 'top',
  },
  {
    target: 'stop-lanes',
    title: 'Everything for each stop',
    body: 'Places to see, where you will stay and food to try, right on the stop. Tap Add to fill any of them.',
    placement: 'bottom',
  },
  {
    target: 'stop-note',
    title: 'Keep your thinking on the stop',
    body: 'Train times, a booking code, a rainy-day backup: anything you write here stays with that stop.',
    placement: 'top',
  },
  {
    target: 'tripicianai',
    title: 'Let TripicianAI plan it',
    body: 'TripicianAI can add stops for the nights left open and ideas for empty stops. It never changes what you added, and every place is checked against a real listing first.',
    placement: 'top',
  },
  {
    // Anchored on the desktop MAP rail tab and the phone's floating map button; only one is ever in the DOM.
    target: 'map',
    title: 'See it on a map',
    body: 'Your route, in order, with the travel between stops. Hovering a stop lifts its pin.',
    placement: 'left',
  },
  {
    target: 'reality-check',
    title: 'Check that it holds up',
    body: 'This measures your plan against real distances, opening hours and how much fits in a day. Plain arithmetic, not AI, so when it says a leg eats most of a day, it can show you why.',
    placement: 'bottom',
  },
  {
    target: 'publish',
    title: 'Share it when you are ready',
    body: 'Publishing gives your trip a public page and posts it to your wall, where other travellers can read it or make it their own. Drafts stay private until you do.',
    placement: 'bottom',
  },
  {
    target: 'save',
    title: 'Nothing to lose, even together',
    body: 'Your plan saves itself as you work. If somebody else has it open they show up here too, and when two of you save at once we stop the second one rather than quietly overwriting the first.',
    placement: 'top',
  },
];

export default PLANNER_TOUR_STEPS;
