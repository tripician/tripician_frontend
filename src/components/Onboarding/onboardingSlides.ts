import credits from './onboardingCredits.json';
import landingCredits from '../../pages/LandingPage/photoCredits.json';

export interface OnboardingSlide {
  slug: string;
  image: string;
  alt: string;
  eyebrow: string;
  title: string;
  body: string;
}

/*
 * Two credited, self-hosted photo sets: onboarding's three Pexels photographs and
 * the landing page's Unsplash destinations. Both are credited in the landing
 * footer, so reusing them here adds no new photographer to name.
 */
const FILES = new Map<string, string>([
  ...credits.map((c) => [c.slug, c.file] as [string, string]),
  ...landingCredits.map((c) => [`landing:${c.slug}`, c.file] as [string, string]),
]);
const photo = (slug: string) => FILES.get(slug) ?? '';

/**
 * One feature per slide, in the order a new traveller meets them: other people's
 * trips first, then their own, then the tools around them, ending on Tripician
 * Intelligence and an Explore button into Groups & Stories.
 *
 * Copy mirrors the landing page (pages/LandingPage/landingContent.ts) so a
 * feature carries the same name everywhere. Every slide names something that
 * has shipped; nothing here describes a plan. The old third slide promised a
 * story "laid out page by page as something you keep", which went with book
 * printing in November 2026.
 */
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    slug: 'community',
    image: photo('community'),
    alt: 'A group of friends checking a map together on a city street',
    eyebrow: 'Borrow a route',
    title: 'Real trips from people who actually went',
    body: 'Every itinerary here was planned, taken and published by the traveller who went. Make one yours in a tap, then bend it to your own pace.',
  },
  {
    slug: 'itinerary',
    image: photo('itinerary'),
    alt: 'A traveller sitting at a table, writing up a trip',
    eyebrow: 'After the trip',
    title: 'Write it down while you still remember the small things',
    body: 'An after-story is the trip in your own words and photographs. It lives on your profile and answers the next traveller for you.',
  },
  {
    slug: 'photography',
    image: photo('landing:iceland'),
    alt: 'A waterfall in a forest',
    eyebrow: 'Photography',
    title: 'Post photos as Everyday or Photography',
    body: 'Everyday keeps the feed light. Photography keeps full quality and the original shape, and the i on the photo shows the camera, lens and when it was taken.',
  },
  {
    slug: 'questions',
    image: photo('landing:india'),
    alt: 'A narrow street lined with buildings',
    eyebrow: 'Ask the ones who went',
    title: 'Questions answered by people, not a model',
    body: 'Ask the whole community, or the traveller behind a story. Whoever asked marks the answer that actually helped.',
  },
  {
    slug: 'groups',
    image: photo('landing:vietnam'),
    alt: 'A group of boats on the water',
    eyebrow: 'Groups',
    title: 'Travel with your crew, club or community',
    body: 'Start a group, public or invite-only, then plan group trips, share group stories and talk it all through in one place.',
  },
  {
    slug: 'messages',
    image: photo('landing:thailand'),
    alt: 'A boat between rocky cliffs',
    eyebrow: 'Private messages',
    title: 'Chats only the people in them can read',
    body: 'Messages are end-to-end encrypted. Send photos, react and edit, and someone new arrives as a request you choose to accept.',
  },
  {
    slug: 'profile',
    image: photo('landing:greece'),
    alt: 'White houses on a hillside above the sea',
    eyebrow: 'Your profile',
    title: 'A profile that reads like a passport',
    body: 'Featured picks, a Photobook, a Travel Journal and stamps for everywhere you have been. An optional identity check adds the Verified badge.',
  },
  {
    slug: 'reality-check',
    image: photo('reality-check'),
    alt: 'A hiker checking a printed route map against the trail',
    eyebrow: 'Tripician Intelligence',
    title: 'Ask anything, and watch it think',
    body: 'It works out what you need, checks timing, live conditions and news when they matter, and turns an answer into a plan. Every place it suggests is checked against a live listing.',
  },
];
