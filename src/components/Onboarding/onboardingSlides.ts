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
 * list (e.g. "Reality check - travel time between stops, overloaded days &
 * closures, measured not guessed") so a returning user recognises the same
 * feature under the same name rather than a re-invented pitch for it.
 */
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    slug: 'community',
    image: photo('community'),
    alt: 'A group of friends checking a map together on a city street',
    eyebrow: 'A travel community',
    title: 'Real trips, from travellers who have actually been there',
    body: 'Browse itineraries people planned, took and published — the route, the stays, the places worth the detour. Copy one into your own plan and make it yours.',
  },
  {
    slug: 'itinerary',
    image: photo('itinerary'),
    alt: 'A traveller planning a trip with a phone and notebook at a café table',
    eyebrow: 'Plan with Navia',
    title: 'A full itinerary, with far less typing',
    body: 'Tell Navia where you’re headed and what you’re into. It drafts the route, the stops and the pacing — you shape it from there instead of starting from a blank page.',
  },
  {
    slug: 'reality-check',
    image: photo('reality-check'),
    alt: 'A hiker checking a printed route map against the trail',
    eyebrow: 'Reality check',
    title: 'Every plan gets checked before you go',
    body: 'Travel time between stops, overloaded days, places that have closed — measured against real data, not guessed. You find out before you’re standing outside a shuttered door.',
  },
];
