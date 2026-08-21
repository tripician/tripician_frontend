import covers from '../../assets/covers.json';
import { FEATURE_FLAGS } from '../../config/featureFlags';

/**
 * The promotional slides in the Community hero.
 *
 * The hero used to be stories only. It now alternates real work from the
 * community with a short pitch for each thing you can do here, because the
 * features that took longest to build were the ones nobody could find: someone
 * who has never written an after story has no reason to guess it exists.
 *
 * Rules these have to keep:
 *  - every claim describes something that actually ships. No counts, no ratings,
 *    no "join thousands". The book slide changes its own wording rather than
 *    promising an order button that is not open yet.
 *  - photography is the Pexels set already licensed and used elsewhere in the
 *    app - the country covers and the onboarding trio - so nothing new has to be
 *    sourced, credited or kept alive.
 *  - a slide is only shown when its action is real. The crew slide is hidden
 *    when no trip is actually looking for people, because a pitch for something
 *    that then shows nothing is worse than no pitch.
 */

export type HeroPromoId = 'plan' | 'story' | 'book' | 'crew';

export interface HeroPromo {
  id: HeroPromoId;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  image: string;
}

const cover = (key: string): string =>
  (covers as Record<string, string>)[key] ?? (covers as Record<string, string>).default ?? '';

export const HERO_PROMOS: Record<HeroPromoId, HeroPromo> = {
  plan: {
    id: 'plan',
    eyebrow: 'Start something',
    title: 'Your next trip is one sentence away',
    body: 'Say where and how long. Navia drafts the route, the stops and the notes, and every place is checked against a live listing before it reaches you.',
    cta: 'Plan it now',
    image: cover('japan'),
  },

  story: {
    id: 'story',
    eyebrow: 'Your turn',
    title: 'Somebody is about to go where you have been',
    body: 'Write what it was actually like, in your own words and your own photographs. It sits on your profile, and it is what people read before they decide to travel with you.',
    cta: 'Share your story',
    // The onboarding trio: a traveller at a table with a book. Already credited.
    image: '/img/onboarding/itinerary.jpg',
  },

  book: {
    id: 'book',
    eyebrow: 'Keep it',
    title: 'A trip you can hold in your hands',
    // Flag-gated for the same reason the landing page is: ordering is not open
    // until payment ships, and the page must not get there first.
    body: FEATURE_FLAGS.bookOrdering
      ? 'Every story lays out as an A5 hardcover. Your photographs at full resolution, your words set in print, and a copy produced close to your door.'
      : 'Every story lays out as an A5 hardcover. Your photographs at full resolution, your words set in print, and every page there to look through before you decide.',
    cta: 'Write your book today',
    image: cover('peru'),
  },

  crew: {
    id: 'crew',
    eyebrow: 'Do not go alone',
    title: 'Some of these trips have a spare seat',
    body: 'Open one on yours, or ask to join somebody else’s. The organiser reads every request and approves each person by hand, and no money passes through us.',
    cta: 'Find your crew',
    // The onboarding trio: travellers reading a map together. Already credited.
    image: '/img/onboarding/community.jpg',
  },
};
