/**
 * Every word on the landing page, in one place.
 *
 * Three readers use this file and must never disagree:
 *   1. LandingPage.tsx, which people see.
 *   2. landingStatic.ts, which vite.config.ts uses at build time to write the same
 *      words as plain HTML into index.html. Crawlers that never run JavaScript
 *      (most AI crawlers: GPTBot, ClaudeBot, PerplexityBot) read that, and an
 *      empty <div id="root"> taught them nothing about Tripician.
 *   3. The JSON-LD on the page (FAQPage, Organization, WebSite, the app).
 *
 * So it stays plain data: strings only, no JSX, no import.meta, nothing that
 * needs a browser. vite.config.ts imports it directly.
 *
 * The honesty rules still hold. Every sentence describes something that has
 * shipped and can be checked in the product. No invented numbers, names or
 * reviews, and nothing that ranks us against anyone. Copy also lives in
 * public/llms.txt: change both together.
 */

export const SITE_URL = 'https://tripician.com';

/** Leads with what people search for. Under 60 characters, so Google shows it whole. */
export const LANDING_TITLE = 'Tripician: Travel Community for Real Trips & Stories';

/** About 155 characters: the snippet under the title in search results and share cards. */
export const LANDING_DESCRIPTION =
  'Real itineraries, trip stories and travel photos from people who actually went. Ask them anything, join travel groups and plan with AI. Free to join.';

/** One line that says what Tripician is, for the Organization record and the footer. */
export const ORG_DESCRIPTION =
  'Tripician is a social network for travellers: a travel community where people publish the trips they actually took as itineraries, after-stories and photographs, answer each other’s questions, travel in groups and plan with Tripician Intelligence.';

export const HERO = {
  eyebrow: 'A social network for travellers',
  /** The headline as words, so the page can stagger them. `accent: true` is set in brand colour. */
  title: [
    { text: 'Real' },
    { text: 'trips,' },
    { text: 'told' },
    { text: 'first-hand.', accent: true },
  ],
  subtitle:
    'Itineraries, after-stories and photographs from people who actually went, and the people themselves a question away. Borrow a route, ask what the guidebooks gloss over, and find your crew.',
  primaryCta: 'Wander the stories',
  secondaryCta: 'Join free',
};

/** Three facts a stranger can check in a minute. */
export const TRUST = [
  'Free to join, no card needed',
  'Written by the people who went, nobody paid to post',
  'Every suggested place checked against a live listing',
];

export const LENS = {
  kicker: 'Fresh from the road',
  title: 'Postcards, minus the brochure',
  lede: 'Recent photographs from Tripician travellers, posted from wherever they happened to be standing.',
  more: 'See every post',
};

export const TRIPS = {
  kicker: 'Itineraries',
  title: 'Routes with the dust still on them',
  lede: 'Planned, taken and published by the traveller who went. Borrow one whole, or steal a single day.',
  more: 'Browse every itinerary',
};

export const STORIES = {
  kicker: 'After-stories',
  title: 'The part the photos leave out',
  lede: 'Written back home, once people knew which moments were worth the trip.',
  more: 'Read more stories',
};

export const ASKS = {
  kicker: 'Asked and answered',
  title: 'Ask the person who was just there',
  lede: 'Real questions from travellers, answered by people who have stood in the same queue.',
  more: 'Browse travel questions',
};

/**
 * What lives here. Eight, because the grid runs four, two and one across and
 * eight fills each of them exactly (the hairline gaps show through a short row).
 * `key` picks the icon in LandingPage.tsx.
 */
export const PILLARS: Array<{ key: string; title: string; desc: string }> = [
  {
    key: 'itineraries',
    title: 'Itineraries you can borrow',
    desc: 'Day-by-day plans published by the people who travelled them. Make one yours in a tap, then bend it to your own pace.',
  },
  {
    key: 'stories',
    title: 'After-stories',
    desc: 'The trip in your own words and photographs, written once you are home. It lives on your profile and answers the next traveller for you.',
  },
  {
    key: 'photography',
    title: 'Photographs with their paperwork',
    desc: 'Post as Everyday or Photography. Photography keeps full quality and the original shape, and a small i shows the camera, lens and capture date the file records, including when it says it was made with AI.',
  },
  {
    key: 'questions',
    title: 'Questions with first-hand answers',
    desc: 'Ask the whole community, or the traveller behind a story. People answer, not a model, and whoever asked marks the reply that helped.',
  },
  {
    key: 'groups',
    title: 'Groups that actually go somewhere',
    desc: 'Crews, clubs and travel communities, public or invite-only, with group plans, group stories and one place to talk it all through.',
  },
  {
    key: 'messages',
    title: 'Messages under lock and key',
    desc: 'Private chats are end-to-end encrypted, so only the people in them can read them. Someone new arrives as a request you choose to accept.',
  },
  {
    key: 'profile',
    title: 'A profile that reads like a passport',
    desc: 'Featured picks, a Photobook, a Travel Journal and stamps for everywhere you have been: the travel portfolio you never had to build.',
  },
  {
    key: 'verified',
    title: 'Real people, visibly',
    desc: 'An optional identity check puts a Verified badge on a profile, and itineraries our team has read end to end carry the Tripician Verified mark.',
  },
];

export const PILLARS_HEAD = {
  kicker: 'What lives here',
  title: 'A home for everything a trip leaves behind',
  lede: 'Not reviews, not adverts, not listicles. The routes, the stories, the photographs and the people, all in one place.',
};

export const AI = {
  title: 'A travel brain that shows its working',
  paragraphs: [
    'Ask Tripician Intelligence anything about a trip. It works out what you are really asking, then checks timing, live weather, travel advice and the latest news only when they matter, and shows you each step as it goes. Like the answer? Turn it into a trip plan in one tap.',
    'Planning with friends? Mention @tripician in the trip chat and it joins the conversation. Hand it screenshots of the group chat or a booking page and it reads them into a structured plan; the screenshots are never stored.',
  ],
  caveat:
    'Every place it suggests is matched against a live listing before you see it: anything permanently closed is dropped and anything unconfirmed says so. It will proof-read your story if you ask, and it never writes one, because a story is only worth reading when a person wrote it.',
  cta: 'Ask it something, no account needed',
  /** The demo figure. These are the real step labels the server sends. */
  demo: {
    prompt: 'Nine slow days in Oaxaca, mostly food',
    steps: [
      'Reading between the lines',
      'Finding the best time for Oaxaca',
      'Checking live weather and travel advice for Mexico',
      'Catching up on the latest from Oaxaca',
    ],
    routeLabel: 'Draft route',
    route: ['Oaxaca de Juárez · 4 nights', 'Hierve el Agua · day trip', 'Puerto Escondido · 5 nights'],
  },
};

export const STEPS_HEAD = {
  kicker: 'How it works',
  title: 'Borrow, wander, give back',
  lede: 'Somebody has already taken the trip you are dreaming about. Start where they finished, then leave a trail for whoever comes next.',
};

export const STEPS = [
  {
    n: '01',
    title: 'Borrow a route',
    desc: 'Find a trip someone has already taken, read how it really went, and make it yours. Ask them the thing no search result will tell you.',
    img: '/img/onboarding/community.jpg',
    alt: 'Travellers reading a map together on a city street',
  },
  {
    n: '02',
    title: 'Make it your own',
    desc: 'Bring your crew in on one link, or let Tripician Intelligence draft the rest. Every stop is checked against real distances and opening hours, so the plan holds up on the ground.',
    img: '/img/onboarding/reality-check.jpg',
    alt: 'A traveller checking a route against a printed map',
  },
  {
    n: '03',
    title: 'Leave a trail',
    desc: 'Back home, post the photographs and write the after-story. It goes on your profile and becomes someone else’s starting point.',
    img: '/img/onboarding/itinerary.jpg',
    alt: 'A traveller sitting at a table with a book',
  },
];

/**
 * Plans, by name and purpose only. Prices live on /pricing, read from the API, so they can never drift here.
 * Club is left off on purpose (owner, 2026-11-12): a third paid choice made the front page harder to read.
 * Business is shown as coming soon until it launches; `soon` sets the card quieter.
 */
export const PLANS = {
  kicker: 'Plans',
  title: 'Free for travellers. More when you need it.',
  items: [
    { name: 'Basic', tag: 'Free', desc: 'Read, post, plan, join groups, message and write after-stories, with Tripician Intelligence credits every month.' },
    { name: 'Pro', tag: 'For frequent travellers', desc: 'For people who travel often, plan with others and lean on Tripician Intelligence more.' },
    { name: 'Business', tag: 'Coming soon', desc: 'For agencies, trekking outfits and anyone running trips for other people.', soon: true },
  ],
  more: 'Compare plans and prices',
};

/** Tripician Business is coming soon, so everything here is said in the future tense. */
export const BUSINESS = {
  kicker: 'For travel businesses · Coming soon',
  title: 'Fill departures with travellers who read before they ask',
  lede: 'Soon, agencies and trip organisers will list their departures here and take requests to join, each with a note from the traveller, approving every one by hand. No money will pass through Tripician.',
  cta: 'See what is coming',
};

/** Phrased the way people ask search engines and assistants, because that is how they are matched. */
export const FAQS = [
  {
    q: 'What is Tripician?',
    a: 'Tripician is a social network for travellers: a travel community where people publish the trips they actually took as day-by-day itineraries, after-stories and photographs. You can borrow a route, ask the people who went, join travel groups, message privately and plan your own trip with friends or with Tripician Intelligence, its AI travel assistant. It is free to join. Tripician is not a travel agency and does not book flights or accommodation.',
  },
  {
    q: 'Where can I find real travel itineraries from people who have been?',
    a: 'On Tripician every itinerary was planned, taken and published by the traveller who went, not written by an advertiser or generated by a model. Browse them by place on the Stories page, read the after-story to hear how it really went, and make one yours to copy it into your own plan.',
  },
  {
    q: 'How do I ask travellers about a destination?',
    a: 'Post a question to the community, or ask the traveller behind a story or an itinerary directly. Answers come from people, not from a model, and whoever asked can mark the answer that actually helped.',
  },
  {
    q: 'How do I find people or groups to travel with?',
    a: 'Join or start a group: crews, clubs and travel communities, public or invite-only, each with group plans and group stories. Invite friends to any trip with one link, and plan it together in one place.',
  },
  {
    q: 'Is Tripician free?',
    a: 'Yes. Joining, reading, posting, groups, private messages, planning and after-stories are free. Tripician Intelligence runs on credits included every month. Pro adds more people per trip and more Tripician Intelligence credits. A Business plan for travel companies is coming soon.',
  },
  {
    q: 'What is Tripician Intelligence?',
    a: 'Tripician Intelligence is the AI travel assistant built into Tripician. It shows each step of its thinking, checks timing, live weather, travel advice and news when they matter, and can turn an answer into a trip plan. Every place it suggests is matched against a live listing first. You can try it on the Tripician home page without an account.',
  },
  {
    q: 'Can I tell whether a photo on Tripician is real?',
    a: 'Photographers can post as Photography. The photo keeps its full quality and shape, and the i on it shows what the file itself records: camera, lens, capture date, author and copyright, plus a "Made with AI" label when the file declares one. These details come from the file and are not verified by Tripician. A photo’s location is never stored or shown.',
  },
  {
    q: 'Are my messages on Tripician private?',
    a: 'Yes. Private messages are end-to-end encrypted on your device, so only the people in the chat can read them, not Tripician. A passcode you choose keeps an encrypted backup of your keys, so your chats follow you to a new device.',
  },
  {
    q: 'Is my data safe?',
    a: 'Sign-in is handled by Auth0, an established identity provider, and Tripician never sells your personal data. The Privacy Policy sets out exactly what is kept and why.',
  },
  {
    q: 'How do I get support?',
    a: 'Email support@tripician.com or visit the Help page for answers to common questions.',
  },
];

export const FAQ_HEAD = { kicker: 'Questions', title: 'Before you pack' };

export const CTA = {
  title: 'Somebody has already been. Go and ask them.',
  sub: 'Free to join. Borrow a route, ask the people who went, and leave your own trail for the next traveller.',
  primary: 'Join Tripician free',
  alt: 'or wander the stories first',
};

/** The footer, which is also the page's internal-link map for crawlers. */
export const FOOTER = {
  blurb: 'The travel community where trips are told first-hand, by the people who took them.',
  columns: [
    {
      title: 'Explore',
      links: [
        { label: 'Stories & itineraries', href: '/stories' },
        { label: 'Travel questions', href: '/posts?kind=questions' },
        { label: 'Travel groups', href: '/stories?kind=groups' },
        { label: 'Join a trip', href: '/stories?kind=join' },
        { label: 'Trip templates', href: '/templates' },
        { label: 'Search', href: '/search' },
      ],
    },
    {
      title: 'Tripician',
      links: [
        { label: 'About us', href: '/about-us' },
        { label: 'Blog', href: '/blog' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'For businesses', href: '/for-operators' },
        { label: 'Get help', href: '/get-help' },
        { label: 'Contact us', href: '/contact-us' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms & Conditions', href: '/terms-and-conditions' },
        { label: 'Child Safety Standards', href: '/child-safety-standards' },
      ],
    },
  ],
  note: 'Not a travel agency. We do not book flights or accommodation.',
};

export const NAV_LINKS = [
  { label: 'Stories', href: '/stories' },
  { label: 'Questions', href: '/posts?kind=questions' },
  { label: 'Groups', href: '/stories?kind=groups' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'For businesses', href: '/for-operators' },
];

/**
 * Structured data for the home page.
 *
 * `logo` is passed in because the logo URL is an env value, which this file
 * cannot read (vite.config.ts imports it). `sameAs` is left out on purpose until
 * there are real profile URLs: an empty list asserts there are none.
 */
export function landingJsonLd(logo?: string): object[] {
  const headline = `${HERO.title.map((w) => w.text).join(' ')}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Tripician',
      url: SITE_URL,
      ...(logo ? { logo } : {}),
      description: ORG_DESCRIPTION,
      email: 'support@tripician.com',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Tripician',
      alternateName: 'Tripician travel community',
      url: SITE_URL,
      description: LANDING_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        // Search reads ?q and searches people, places, plans, stories and groups.
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Tripician',
      url: SITE_URL,
      applicationCategory: 'TravelApplication',
      applicationSubCategory: 'Social network for travellers',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires JavaScript',
      description: `${headline} ${HERO.subtitle}`,
      featureList: PILLARS.map((p) => p.title),
      // price 0 is what makes "free to join" a machine-readable fact rather than a claim.
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];
}
