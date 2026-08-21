import credits from './onboardingCredits.json';

export interface OnboardingSlide {
  slug: string;
  image: string;
  alt: string;
  eyebrow: string;
  title: string;
  body: string;
}

const BY_SLUG = new Map(credits.map((c) => [c.slug, c]));
const photo = (slug: string) => BY_SLUG.get(slug)?.file ?? '';

/**
 * Feature copy mirrors the wording already used in SupportWidget's "What's new"
 * list so a returning user recognises the same feature under the same name
 * rather than a re-invented pitch for it.
 *
 * The deck used to end on Reality check, which described a product that was
 * only a planner. It now runs the arc the product actually claims: find a trip,
 * plan yours, then tell it afterwards and keep it. Reality check did not
 * disappear, it moved into the planning slide, which is where it happens.
 *
 * Recruitment is deliberately NOT here. A first-run user has no trip and
 * therefore nobody to recruit; teaching it now would be teaching something they
 * cannot do. It is taught in context instead, on Community and in the planner,
 * and to returning users through the changelog.
 *
 * The photograph order changed with the copy: the reading-a-book picture belongs
 * to the story slide and the map picture to the planning slide, which is the
 * opposite of how they were paired before.
 */
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    slug: 'community',
    image: photo('community'),
    alt: 'A group of friends checking a map together on a city street',
    eyebrow: 'A travel community',
    title: 'Real trips, from travellers who have actually been there',
    body: 'Browse itineraries people planned, took and published: the route, the stays, the places worth the detour. Copy one into your own plan and make it yours.',
  },
  {
    slug: 'reality-check',
    image: photo('reality-check'),
    alt: 'A hiker checking a printed route map against the trail',
    eyebrow: 'Plan with Navia',
    title: 'A full itinerary, with far less typing',
    body: 'Tell Navia where you’re headed and what you’re into, and it drafts the route, the stops and the pacing. Then every plan gets checked: travel time between stops, overloaded days, places that have closed, measured against real data rather than guessed.',
  },
  {
    slug: 'itinerary',
    image: photo('itinerary'),
    alt: 'A traveller sitting at a table, reading a book',
    eyebrow: 'After the trip',
    title: 'Write it down while you still remember the small things',
    body: 'An after story is what the trip was actually like, in your words and your photographs. It becomes the thing people read before they decide to travel with you, and it lays out as a printed book you can hold.',
  },
];
