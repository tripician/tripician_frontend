import { Fragment, useLayoutEffect, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  IconArrowRight,
  IconChevronDown,
  IconPlane,
  IconCheck,
  IconShieldHalf,
  IconRosetteDiscountCheckFilled,
  IconUserCheck,
  IconWallet,
  IconRoute,
} from '@tabler/icons-react';
import '../../assets/css/LandingPage.css';
import Seo, { SITE_URL } from '../../components/Seo';
import NaviaOrb from '../../navia/NaviaOrb';
import { HERO_IMAGE, HERO_VIDEO, HERO_VIDEO_CREDIT, OG_IMAGE, TICKER, PHOTO_CREDITS } from './landingImages';
import { apiServices } from '../../services/APIs/apiServices';
import { afterStoryService } from '../../afterstory/afterStoryService';
import { storyPath } from '../../afterstory/storySlug';
import { resolveStoryCover } from '../../afterstory/storyFormat';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import { describeSpots } from '../../seats/types';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { tripPath } from '../../utils/tripSlug';
import { tripCoverPhoto, resolveTripCover, type TripCoverSource } from '../../utils/tripCover';
// The three step photographs. Sharing onboarding's credited set rather than
// adding a parallel one, so a photographer is named in exactly one place.
import stepCredits from '../../components/Onboarding/onboardingCredits.json';

gsap.registerPlugin(ScrollTrigger);

/* ────────────────────────────────────────────────────────────────────────────
 * The page is set like a book, because the product now makes one.
 *
 * Sections are numbered like a contents page, prose sits at a reading measure,
 * headings carry the display face at sizes where it can actually read as display
 * type, and the dividing device is a hairline rather than a card border. That is
 * a deliberate argument, not decoration: a page that looks like a well-set book
 * makes the case for after stories and the printed edition better than another
 * grid of feature tiles does.
 *
 * Everything that claims real work is built from real data. Anything that
 * explains a mechanism is a small diagram made of divs, which is honest because
 * it is visibly a diagram. Nothing on this page invents a number, a name or a
 * review; see the honesty rules in the design memory before adding anything.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Three steps, with photographs.
 *
 * This was five text-heavy beats with small div diagrams, and it was too much
 * for a first impression: the section carried more words than the rest of the
 * page put together and asked a stranger to read five paragraphs before they had
 * seen anything.
 *
 * The photographs are the self-hosted Pexels set already licensed and credited
 * for onboarding, and each one illustrates its step rather than decorating it: a
 * group reading a map, one person planning a route, somebody writing it down.
 */
const STEPS = [
  {
    n: '01',
    title: 'Get inspired',
    desc: 'Real itineraries, travelled and published by the people who went. The best of them carry a verified mark.',
    img: '/img/onboarding/community.jpg',
    alt: 'Travellers reading a map together on a city street',
  },
  {
    n: '02',
    title: 'Take your turn',
    desc: 'Say where and how long, and Navia drafts it. Every plan is then checked against real distances and opening hours, so it holds up when you are standing there.',
    img: '/img/onboarding/reality-check.jpg',
    alt: 'A traveller checking a route against a printed map',
  },
  {
    n: '03',
    title: 'Write your story',
    desc: 'Come home and say what it was actually like. Keep it as a book, and send the next traveller somewhere worth going.',
    img: '/img/onboarding/itinerary.jpg',
    alt: 'A traveller sitting at a table with a book',
  },
];

/**
 * What earns trust, cut to what is checkable.
 *
 * Nothing here is aspirational and nothing ranks us against anyone. The Risk
 * Monitor is one card among five, which is its actual weight in the product: it
 * left the top-level navigation for the account menu, and it used to hold a
 * bento card plus an entire section of this page.
 */
const FEATURES = [
  {
    icon: <IconRosetteDiscountCheckFilled size={22} />,
    title: 'Tripician Verified',
    desc: 'Some itineraries carry a verified mark. It means a person on our team read the whole plan and put our name on it, not a score an algorithm handed out.',
  },
  {
    icon: <NaviaOrb size={22} />,
    title: 'Every place checked before you see it',
    desc: 'Navia drafts the route and the stops, then each place is matched against a live listing. Anything permanently closed is dropped, and anything unconfirmed says so.',
  },
  {
    icon: <IconRoute size={22} stroke={1.75} />,
    title: 'We catch what breaks the trip',
    desc: 'Real distances and opening hours, measured rather than guessed: the hours you lose between stops, the days you have overloaded, anything shut for your whole stay.',
  },
  {
    icon: <IconUserCheck size={22} stroke={1.75} />,
    title: 'Planned around how you travel',
    desc: 'Your pace, who is coming, what pulls you in and what you do not eat. Those answers travel with every request, so what comes back is shaped by them.',
  },
  {
    icon: <IconWallet size={22} stroke={1.75} />,
    title: 'Nobody chases anybody for money',
    desc: 'Set a budget, log shared costs as they happen, and settle up in the fewest transfers possible. Packing lists live inside the trip too.',
  },
  {
    icon: <IconShieldHalf size={22} stroke={1.75} />,
    title: 'Know before you go',
    desc: 'Government travel advisories, severe weather and disruption for every country in your plan. General awareness, not advice: always check your own government first.',
  },
];

/**
 * A published trip, reduced to what this page needs.
 *
 * Fields are read in both casings because the API's serializer is not consistent
 * across endpoints. Returns null for a row that cannot be linked or labelled,
 * which therefore must not render.
 */
interface LandingTrip {
  id: string;
  name: string;
  href: string;
  photo?: string;
  countries?: string;
  owner?: string;
  /** Recruitment state, so the "looking for people" rail needs no second request. */
  joinPolicy?: string;
  spotsLeft: number | null;
  /** Kept so the async cover pass can re-resolve without re-reading the raw row. */
  cover: TripCoverSource;
}

const toLandingTrip = (raw: any): LandingTrip | null => {
  const id = raw?.id || raw?.Id;
  if (!id) return null;

  const name = String(raw?.name || raw?.Name || '').trim();
  if (!name) return null;

  const rawCountries = raw?.countries || raw?.Countries;
  const countryList: string[] = Array.isArray(rawCountries)
    ? rawCountries.filter((c: unknown) => typeof c === 'string' && c.trim())
    : [];
  const ownerName = raw?.owner?.name || raw?.Owner?.Name || raw?.ownerName || raw?.OwnerName;

  /*
   * Going through tripCover gives these the same saved-banner -> curated country
   * cover -> Unsplash chain as the community grid and the trip's own hero, so one
   * trip looks the same in all three places. Reading the banner straight off the
   * row is what once rendered this section as four blank grey tiles.
   */
  const cover: TripCoverSource = {
    bannerPhotoUrl: raw?.bannerPhoto?.url || raw?.BannerPhoto?.Url || raw?.photoUrl || raw?.PhotoUrl || null,
    countries: countryList,
    name,
  };

  const spots = raw?.spotsLeft ?? raw?.SpotsLeft;

  return {
    id: String(id),
    name,
    href: tripPath({ id: String(id), name }),
    photo: tripCoverPhoto(cover) ?? undefined,
    countries: countryList.slice(0, 2).join(' · ') || undefined,
    owner: typeof ownerName === 'string' && ownerName.trim() ? ownerName.trim() : undefined,
    joinPolicy: raw?.joinPolicy || raw?.JoinPolicy || undefined,
    spotsLeft: typeof spots === 'number' ? spots : null,
    cover,
  };
};

/*  FAQ  */
const LP_FAQS = [
  {
    q: 'What exactly is Tripician?',
    a: "Tripician is a travel community built around the whole arc of a trip. Browse itineraries published by the people who travelled them, plan your own with your crew or with Navia, open it so other travellers can ask to join, and afterwards write up what it was actually like and keep it as a printed book. We are not a travel agency and we do not book flights or accommodation.",
  },
  {
    q: 'What is an after story?',
    a: "An after story is the trip in your own words and your own photographs, written once you are home. Publishing one puts it on your profile, where people deciding whether to travel with you will read it, and readers can ask you questions underneath. It is the part of the product that keeps working long after the plan is done.",
  },
  {
    q: 'Can I really get a book of it?',
    a: FEATURE_FLAGS.bookOrdering
      ? 'Yes. Any story you wrote lays out as an A5 hardcover: your photographs at full resolution, your words set in print. You look through every page exactly as it would arrive, then order a copy. Books are produced close to the delivery address rather than shipped across the world.'
      : 'Any story you wrote lays out as an A5 hardcover, and you can look through every page exactly as it would print, then download the print-ready PDF. Ordering a physical copy is not open yet, so the PDF is the finished book for now.',
  },
  {
    q: 'How do I find people to travel with?',
    a: 'Open one of your trips to join requests and say how many seats there are. It then appears in the community for travellers to find, and each request arrives with a note about who they are. Nothing is automatic: you approve every person by hand, and no money routes through Tripician - the group settles up directly.',
  },
  {
    q: 'Is Tripician free?',
    a: 'Yes - planning, community, stories and collaboration are free. Drafting with Navia runs on included credits: every traveller starts with 300 personal credits and each trip gets its own shared 300-credit wallet, enough for roughly a month of regular use. The reality check costs nothing, because it is plain arithmetic rather than a model call.',
  },
  {
    q: 'Does Tripician use AI, and can I trust what it suggests?',
    a: "Yes, and here is exactly how. Navia drafts routes, stops, local food and notes using a language model - so on its own it would occasionally suggest somewhere that has closed or never existed. That is why nothing it produces reaches you unchecked: every place is matched against a live listing first. Anything permanently closed is dropped before you see it, and anything without a listing is labelled \"unchecked\" rather than presented as fact. Navia never writes your story for you; it will proof-read one if you ask.",
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. Authentication is handled by Auth0, an industry-leading identity provider. We never sell your personal data to any third party. Read our Privacy Policy for full details.',
  },
  {
    q: 'How do I get support?',
    a: 'Email us at support@tripician.com or visit our Help page for FAQs and answers to common questions.',
  },
];

/**
 * One published story.
 *
 * Its own component because it needs its own `failed` state: a story cover is an
 * author's upload and can 404, and without this the card rendered an empty white
 * frame. `resolveStoryCover` already takes the flag and answers null, and a
 * coverless story then falls back to type alone - which the story cards inside
 * the app treat as a deliberate jacket rather than a broken card.
 */
function LpStoryCard({ story }: { story: AfterStorySummaryDto }) {
  const [failed, setFailed] = useState(false);
  const cover = resolveStoryCover(story, failed);

  return (
    <a className="lp-storycard" href={storyPath(story)}>
      {cover && (
        <span className="lp-storycard__frame">
          <img src={cover} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        </span>
      )}
      <h3>{story.title}</h3>
      {story.summary && <p>{story.summary}</p>}
      {story.author?.displayName && <span className="lp-storycard__by">{story.author.displayName}</span>}
    </a>
  );
}

function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="lp-faq" id="faq">
      <div className="lp-shell">
        <div className="lp-sec-head">
          <span className="lp-kicker">Questions</span>
          <h2 className="lp-h2">Before you sign up</h2>
        </div>
        <div className="lp-faq__list">
          {LP_FAQS.map((faq, i) => (
            <div key={i} className={`lp-faq-item${open === i ? ' is-open' : ''}`}>
              <button
                type="button"
                className="lp-faq-item__q"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span>{faq.q}</span>
                <IconChevronDown size={17} aria-hidden="true" />
              </button>
              <div className="lp-faq-item__a"><p>{faq.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/*  COMPONENT  */
export default function LandingPage() {
  const navigate = useNavigate();
  // Was reading VITE_LANDING_HERO_IMAGE_URL directly, which is set in no env file -
  // so the hero always fell through to the bare gradient. HERO_IMAGE keeps the env
  // override and adds a curated fallback, so a photo actually renders.
  const heroImageUrl = HERO_IMAGE;

  /*
   * There used to be a redirect here: `useAuth0().isAuthenticated` -> navigate
   * '/home' with replace. It was the cause of the production back-button loop,
   * and it was prod-only for a reason worth writing down.
   *
   * This page asked the Auth0 SDK whether the user was signed in, while every
   * route guard asks localStorage (`useAuthToken`). Those two disagree whenever
   * the Auth0 session cookie outlives the local token, which is every in-app
   * sign-out. In production the app and Auth0 share a registrable domain so the
   * SDK's silent-auth iframe succeeds and the SDK says "signed in"; in dev it is
   * cross-site, silent auth fails, and this effect never fired. Hence a bug
   * nobody could reproduce locally.
   *
   * RootRedirect (App.tsx) already decides what "/" shows, from the same source
   * the guards use. Do not reintroduce an auth redirect here: one source of
   * truth, and it is not the SDK.
   */

  const logoFullWhiteUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_2_URL as string | undefined;
  const logoFullBlackUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_BLACK_2_URL as string | undefined;

  const [isScrolled, setIsScrolled] = useState(false);
  const [trips, setTrips] = useState<LandingTrip[]>([]);
  const [stories, setStories] = useState<AfterStorySummaryDto[]>([]);

  /**
   * The community strip and the recruitment rail, from ONE request.
   *
   * Open trips are a subset of published ones, so filtering here is what avoids a
   * second fetch. Anonymous-safe: `/api/trips/published` is [AllowAnonymous], and
   * a failure must never break the marketing page - the sections simply do not
   * render, which is why the catch is silent and the initial state is empty
   * rather than a spinner.
   */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiServices.getPublishedTrips();
        if (!active) return;
        const rows = Array.isArray(response?.data) ? response.data : [];
        const parsed = rows.map(toLandingTrip).filter((t): t is LandingTrip => t !== null).slice(0, 12);
        setTrips(parsed);

        /*
         * Second pass for the cards tripCoverPhoto could not resolve synchronously -
         * a country with no curated cover yet. Only those hit the network, and only
         * after the section has already painted with the covers we did have, so the
         * grid fills in rather than popping wholesale.
         */
        const missing = parsed.filter((t) => !t.photo);
        if (!missing.length) return;
        const resolved = await Promise.all(
          missing.map(async (t) => [t.id, await resolveTripCover(t.cover)] as const),
        );
        if (!active) return;
        const byId = new Map(resolved.filter(([, url]) => !!url));
        if (!byId.size) return;
        setTrips((prev) => prev.map((t) => (byId.has(t.id) ? { ...t, photo: byId.get(t.id)! } : t)));
      } catch {
        /* no trips shown; the sections unmount themselves */
      }
    })();
    return () => { active = false; };
  }, []);

  /**
   * Published after stories. `/api/stories/published` is [AllowAnonymous], so
   * this works signed out.
   *
   * The shape is guarded rather than trusted: a 200 whose body is not the paged
   * shape would otherwise set this to undefined, and the same unguarded pattern
   * took the Community page down to its error boundary. A malformed body is a
   * resolved promise, so the catch does not cover it.
   */
  useEffect(() => {
    if (!FEATURE_FLAGS.afterStory) return;
    let active = true;
    afterStoryService
      .listPublished({ page: 1, pageSize: 6 })
      .then((r) => { if (active) setStories(Array.isArray(r?.items) ? r.items : []); })
      .catch(() => { if (active) setStories([]); });
    return () => { active = false; };
  }, []);

  const showcaseTrips = trips.slice(0, 4);
  // Full ones stay listed: "Full" is useful information, and a trip may free up.
  const openTrips = trips.filter((t) => t.joinPolicy === 'OpenToRequests').slice(0, 3);

  /**
   * The hero loop. Deliberately *not* rendered on first paint.
   *
   * `heroVideoSrc` stays null until after the window load event, so the poster
   * photo is what paints and what LCP measures - attaching a multi-megabyte video
   * to the DOM up front would make the headline wait behind it. `heroVideoReady`
   * then gates the fade, so a video that stalls or 404s leaves the poster in
   * place rather than a black rectangle.
   *
   * Four conditions have to hold before it loads at all: reduced motion is not
   * requested, the viewport is wide (a landscape drone shot cropped to a phone
   * shows almost nothing and costs megabytes), Save-Data is off, and the
   * connection is not 2g/3g.
   */
  const [heroVideoSrc, setHeroVideoSrc] = useState<string | null>(null);
  const [heroVideoReady, setHeroVideoReady] = useState(false);

  useEffect(() => {
    if (!HERO_VIDEO) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 768px)').matches) return;

    // navigator.connection is not in every browser's lib.dom, hence the cast.
    const conn = (navigator as unknown as {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && /2g|3g/.test(conn.effectiveType)) return;

    const attach = () => setHeroVideoSrc(HERO_VIDEO);
    if (document.readyState === 'complete') {
      attach();
      return;
    }
    window.addEventListener('load', attach, { once: true });
    return () => window.removeEventListener('load', attach);
  }, []);

  /**
   * A cover URL that 404s. The banner saved on a trip can be a dead link, and a
   * broken image on the front page is worse than no image, so drop the banner and
   * re-resolve from the country.
   *
   * The ref is the loop guard: if the replacement is dead too, `onError` fires
   * again, and without it we would keep resolving to the same URL forever. One
   * retry per card, then it settles on the empty state.
   */
  const retriedCoversRef = useRef<Set<string>>(new Set());
  const retryCover = useCallback((trip: LandingTrip) => {
    setTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, photo: undefined } : t)));
    if (retriedCoversRef.current.has(trip.id)) return;
    retriedCoversRef.current.add(trip.id);

    const withoutBanner: TripCoverSource = { ...trip.cover, bannerPhotoUrl: null };
    resolveTripCover(withoutBanner).then((url) => {
      if (!url || url === trip.photo) return;
      setTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, photo: url } : t)));
    });
  }, []);

  // Nav goes solid once the hero photo scrolls behind it
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    /*
     * Motion is opt-out at the OS level. Anyone who has asked their system to
     * reduce motion gets the page fully composed and completely still - not a
     * faster version of the same animation.
     *
     * Must SET the resting values, not clearProps them. `.lp-nav` and the hero
     * pieces carry `opacity: 0` in the stylesheet while they wait for GSAP;
     * clearing GSAP's inline styles just hands them back to that rule, and the
     * hero renders blank. Inline values win, so state them.
     */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set([
        '.lp-nav', '.lp-hero__eyebrow', '.lp-hero__title .word',
        '.lp-hero__subtitle', '.lp-hero__cta-group > *', '.lp-hero__scroll-indicator',
      ], { opacity: 1, x: 0, y: 0, scale: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      /*  HERO ENTRANCE  */
      gsap.set('.lp-nav', { y: -65, opacity: 0 });
      gsap.set('.lp-hero__eyebrow', { y: 35, opacity: 0 });
      gsap.set('.lp-hero__title .word', { y: 90, opacity: 0 });
      gsap.set('.lp-hero__subtitle', { y: 28, opacity: 0 });
      gsap.set('.lp-hero__cta-group > *', { y: 28, opacity: 0, scale: 0.93 });
      gsap.set('.lp-hero__scroll-indicator', { y: -14, opacity: 0 });

      const heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
      heroTL
        .to('.lp-nav', { y: 0, opacity: 1, duration: 0.85 })
        .to('.lp-hero__eyebrow', { y: 0, opacity: 1, duration: 0.65 }, '-=0.35')
        .to('.lp-hero__title .word', { y: 0, opacity: 1, duration: 0.85, stagger: 0.13 }, '-=0.25')
        .to('.lp-hero__subtitle', { y: 0, opacity: 1, duration: 0.7 }, '-=0.55')
        .to('.lp-hero__cta-group > *', { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.12 }, '-=0.45')
        .to('.lp-hero__scroll-indicator', { opacity: 1, y: 0, duration: 0.5 }, '-=0.2');

      gsap.to('.lp-hero__scroll-indicator', {
        y: 10, repeat: -1, yoyo: true, duration: 1.5, ease: 'power1.inOut', delay: 2.5,
      });

      /* ── Hero depth ──────────────────────────────────────────────────────
       * The photo drifts at roughly two-thirds scroll speed while the copy rises
       * past it and dims. `.lp-hero__bg` carries `inset: -8%` precisely so it can
       * move without exposing an edge. Scrubbed, so it is tied to the scroll
       * position rather than played at it; `invalidateOnRefresh` keeps the
       * distances right after a resize.
       */
      gsap.to('.lp-hero__bg', {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      });
      gsap.to('.lp-hero__content', {
        y: 64,
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom 30%', scrub: true, invalidateOnRefresh: true },
      });

      /* ── Section motion ──────────────────────────────────────────────────
       * Entrances play ONCE rather than reversing on scroll-up, which was both
       * busy and the cause of the frozen-mid-tween screenshot artefact.
       *
       * Selectors are matched with `gsap.utils.toArray` and skipped when empty:
       * three sections on this page render nothing when their data is absent, and
       * a ScrollTrigger built on a missing element throws on refresh.
       */
      const has = (sel: string) => gsap.utils.toArray(sel).length > 0;

      /** Type reveals from behind its own baseline, rather than fading. */
      const revealTitle = (target: string, trigger: string) => {
        if (!has(target) || !has(trigger)) return;
        gsap.from(target, {
          clipPath: 'inset(0 0 100% 0)',
          y: 18,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger, start: 'top 84%', once: true },
        });
      };

      /** Cards settle in with depth, not just position. */
      const revealCards = (target: string, trigger: string, each = 0.08) => {
        if (!has(target) || !has(trigger)) return;
        gsap.from(target, {
          y: 34,
          scale: 0.965,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: { each, from: 'start' },
          scrollTrigger: { trigger, start: 'top 80%', once: true },
        });
      };

      if (has('.lp-trust')) {
        gsap.from('.lp-trust__item', {
          x: -14, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1,
          scrollTrigger: { trigger: '.lp-trust', start: 'top 92%', once: true },
        });
      }

      revealTitle('.lp-steps__head > *', '.lp-steps');
      revealCards('.lp-step', '.lp-steps__grid', 0.12);

      revealTitle('.lp-trips__head > *', '.lp-trips');
      revealCards('.lp-tripcard', '.lp-trips__grid', 0.09);

      revealTitle('.lp-open__head > *', '.lp-open');
      revealCards('.lp-opencard', '.lp-open__grid', 0.09);

      revealTitle('.lp-stories__head > *', '.lp-stories');
      revealCards('.lp-storycard', '.lp-stories__grid', 0.09);

      if (has('.lp-book__inner')) {
        gsap.from('.lp-book__inner > *', {
          y: 30, opacity: 0, duration: 0.85, ease: 'power3.out', stagger: 0.1,
          scrollTrigger: { trigger: '.lp-book', start: 'top 80%', once: true },
        });
      }

      if (has('.lp-navia__text')) {
        gsap.from('.lp-navia__text > *', {
          y: 26, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1,
          scrollTrigger: { trigger: '.lp-navia__text', start: 'top 80%', once: true },
        });
      }

      revealTitle('.lp-features__head > *', '.lp-features');
      revealCards('.lp-feature', '.lp-features__grid', 0.055);

      if (has('.lp-cta__content')) {
        gsap.from('.lp-cta__content', {
          y: 44, scale: 0.98, opacity: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: '.lp-cta', start: 'top 80%', once: true },
        });
      }
    });

    return () => ctx.revert();
    // Re-runs when the data-driven sections appear, so their triggers bind to
    // elements that actually exist by then.
  }, [showcaseTrips.length, openTrips.length, stories.length]);

  /*  JSX  */
  return (
    <div className="lp-root">
      <Seo
        /*
         * Leads with what people search for, not with the brand. `Seo` appends
         * " | Tripician", so this stays inside the ~60 characters Google shows
         * before truncating.
         */
        title="Plan Your Trip, Write Your Story"
        description="Browse trip itineraries published by the travellers who took them, plan your own, find people to come along, then write up how it went and keep it as a printed book. Free to join."
        path="/"
        image={OG_IMAGE || undefined}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Tripician',
            url: SITE_URL,
            // Was ${SITE_URL}/og-cover.jpg, a file that does not exist in public/.
            logo: import.meta.env.VITE_TRIPICIAN_LOGO_ICON_URL || OG_IMAGE,
            description: 'A travel community where people publish the trips they actually took, find others to travel with, and keep the story afterwards.',
            // `sameAs: []` was emitted as an empty array, which asserts "this
            // organisation has no other web presence". Omitted until there are
            // real profile URLs to list.
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Tripician',
            url: SITE_URL,
            potentialAction: {
              '@type': 'SearchAction',
              target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/community?q={search_term_string}` },
              'query-input': 'required name=search_term_string',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: LP_FAQS.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
          /*
           * The product itself. This is the block that lets a travel-planner query
           * match the app rather than only the marketing copy, and `price: 0` is
           * what makes "free" a machine-readable fact instead of a claim.
           */
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Tripician',
            url: SITE_URL,
            applicationCategory: 'TravelApplication',
            operatingSystem: 'Web',
            description: 'Browse itineraries published by other travellers, plan a trip with your group, open it for others to join, and publish an after story of how it went.',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          },
        ]}
      />

      {/*  SKIP TO CONTENT  */}
      <a href="#lp-main-content" className="lp-skip-to-content">Skip to main content</a>

      {/*  NAVBAR  */}
      <nav className={`lp-nav${isScrolled ? ' lp-nav--scrolled' : ''}`} aria-label="Main navigation">
        <div className="lp-nav__logo" onClick={() => navigate('/')}>
          {logoFullWhiteUrl && logoFullBlackUrl ? (
            <>
              <img src={logoFullWhiteUrl} alt="Tripician" className="lp-logo-img lp-logo-img--nav lp-nav__logo-light" />
              <img src={logoFullBlackUrl} alt="Tripician" className="lp-logo-img lp-logo-img--nav lp-nav__logo-dark" />
            </>
          ) : (
            <><IconPlane size={20} className="lp-nav__logo-icon" /><span>Tripician</span></>
          )}
        </div>
        {/* Community leads the nav. Stories is the second destination in the app
            itself now, so it is the second link here. */}
        <div className="lp-nav__links">
          <a href="/community">Community</a>
          <a href="/stories">Stories</a>
          <a href="#how-it-works">How it works</a>
        </div>
        <div className="lp-nav__actions">
          <button className="lp-btn lp-btn--ghost" onClick={() => navigate('/signin')}>Sign in</button>
          <button className="lp-btn lp-btn--primary" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </nav>

      {/*  HERO  */}
      <section className="lp-hero" id="lp-main-content">
        {/* The poster is a real <img> rather than a CSS background.
            It is the LCP element on this page, and a background-image behind a
            custom property cannot be found by the preload scanner or prioritised:
            the browser only learns about it once the CSSOM is built and styles
            resolve. An <img> with fetchpriority="high" is requested as soon as
            React commits. The parallax still transforms this container, not the
            image, so nothing about the motion changes. */}
        <div className={`lp-hero__bg${!heroImageUrl ? ' lp-hero__bg--fallback' : ''}`}>
          {heroImageUrl && (
            <img
              className="lp-hero__poster"
              src={heroImageUrl}
              alt=""
              fetchPriority="high"
              decoding="async"
              aria-hidden="true"
            />
          )}
          {/* Purely decorative, so aria-hidden and no track: it carries no
              information the headline below does not already state. muted +
              playsInline are what make autoplay legal on iOS and in Chrome. */}
          {heroVideoSrc && (
            <video
              className={`lp-hero__video${heroVideoReady ? ' lp-hero__video--ready' : ''}`}
              src={heroVideoSrc}
              poster={heroImageUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              tabIndex={-1}
              onCanPlay={() => setHeroVideoReady(true)}
              onError={() => setHeroVideoSrc(null)}
            />
          )}
        </div>

        {/* The hero says what this is, in one line, with no cleverness. The
            subline is what changed in the rebuild: it now carries the whole arc
            rather than stopping at "copy one into your own plan". */}
        <div className="lp-hero__content">
          <span className="lp-hero__eyebrow">A travel community</span>

          {/* The words are separate spans so GSAP can stagger them, and each is
              followed by a REAL space rather than a CSS margin. With margins
              alone the h1's textContent came out as "Planyourtravel,write your
              storyor join with others" - which is what a screen reader announces,
              what a crawler indexes, and what you get if you copy the headline. */}
          <h1 className="lp-hero__title">
            {['Plan', 'your', 'travel,', null, 'or join with others.'].map((word, i) =>
              word === null ? (
                <Fragment key={i}>
                  <span className="word lp-hero__em">write your story</span>{' '}
                </Fragment>
              ) : (
                <Fragment key={i}>
                  <span className="word">{word}</span>{' '}
                </Fragment>
              ),
            )}
          </h1>

          <p className="lp-hero__subtitle">
            Don&apos;t think too much. It&apos;s easy to take a step towards your dream,
            It&apos;s never too late!
          </p>

          <div className="lp-hero__cta-group">
            {/* An anchor, not a button. This is the hero's route to /community -
                the most important indexable page on the site - and a click handler
                is not a link: crawlers do not run it, and neither does middle-click
                or ctrl+click. The modifier check preserves open-in-new-tab; a plain
                left click still navigates through the router without a reload. */}
            <a
              className="lp-btn lp-btn--hero-primary"
              href="/community"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                navigate('/community');
              }}
              aria-label="Explore real trips from the community"
            >
              Explore trips <IconArrowRight size={17} aria-hidden="true" />
            </a>
            <button className="lp-btn lp-btn--hero-link" onClick={() => navigate('/signup')} aria-label="Create an account and start planning">
              Start planning <IconArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="lp-hero__scroll-indicator" role="presentation">
          <IconChevronDown size={26} aria-hidden="true" />
        </div>
      </section>

      {/*  DESTINATION INDEX - a quiet strip of places, set between hairlines like
           an index rather than a marquee. Names alone read as a word list; the
           thumbnails make it scan as places.  */}
      <div className="lp-index" aria-hidden="true">
        <div className="lp-index__track">
          {[...TICKER, ...TICKER].map((dest, i) => (
            <span key={i} className="lp-index__item">
              <img src={dest.url} alt="" loading="lazy" decoding="async" className="lp-index__thumb" />
              {dest.name}
            </span>
          ))}
        </div>
      </div>

      {/*  TRUST STRIP - every claim here is checkable. A "50+ countries planned"
           counter used to sit in this row with no data source behind it.  */}
      <section className="lp-trust" aria-label="What Tripician is">
        <div className="lp-shell lp-trust__inner">
          <span className="lp-trust__item"><IconCheck size={15} stroke={2} /> Free to join, no card required</span>
          <span className="lp-trust__item"><IconCheck size={15} stroke={2} /> Itineraries published by the people who travelled them</span>
          <span className="lp-trust__item"><IconCheck size={15} stroke={2} /> Every place checked against a live listing</span>
        </div>
      </section>

      {/*  HOW IT WORKS - short, and carried by photographs rather than prose.  */}
      <section className="lp-steps" id="how-it-works">
        <div className="lp-shell">
          <div className="lp-sec-head lp-steps__head">
            <span className="lp-kicker">How it works</span>
            <h2 className="lp-h2">Take your turn</h2>
            <p className="lp-lede">
              Get inspired by plans that already worked, make one your own with a real
              check against the world, then write the story that sends somebody else
              somewhere worth going.
            </p>
          </div>
          {/* An ordered list, because it is one: the numbering is meaning, not
              decoration, and a screen reader should hear it. */}
          <ol className="lp-steps__grid">
            {STEPS.map((step) => (
              <li className="lp-step" key={step.n}>
                <span className="lp-step__frame">
                  <img src={step.img} alt={step.alt} loading="lazy" decoding="async" />
                  <span className="lp-step__num" aria-hidden="true">{step.n}</span>
                </span>
                <h3 className="lp-h3">{step.title}</h3>
                <p>{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/*  REAL TRIPS - the proof that this is a community is the community's own
           work. Renders nothing at all rather than a placeholder when empty.  */}
      {showcaseTrips.length > 0 && (
        <section className="lp-trips" id="trips">
          <div className="lp-shell">
            <div className="lp-sec-head lp-trips__head">
              <span className="lp-kicker">From the community</span>
              <h2 className="lp-h2">Trips people have already taken</h2>
              <p className="lp-lede">Published by the traveller who planned them, and yours to copy.</p>
            </div>
            <div className="lp-trips__grid">
              {showcaseTrips.map((trip) => (
                <a className="lp-tripcard" key={trip.id} href={trip.href}>
                  <span className="lp-tripcard__frame">
                    {trip.photo
                      ? <img src={trip.photo} alt="" loading="lazy" decoding="async" onError={() => retryCover(trip)} />
                      : <span className="lp-tripcard__blank" aria-hidden="true" />}
                  </span>
                  <span className="lp-tripcard__meta">
                    {trip.countries && <em>{trip.countries}</em>}
                    <strong>{trip.name}</strong>
                    {trip.owner && <span>by {trip.owner}</span>}
                  </span>
                </a>
              ))}
            </div>
            <div className="lp-trips__more">
              <a href="/community">Browse every trip <IconArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      )}

      {/*  LOOKING FOR PEOPLE - the same rows as above, filtered. No second
           request, and no section at all when nobody is recruiting.  */}
      {openTrips.length > 0 && (
        <section className="lp-open">
          <div className="lp-shell">
            <div className="lp-sec-head lp-open__head">
              <span className="lp-kicker">Going soon</span>
              <h2 className="lp-h2">Trips looking for people</h2>
              <p className="lp-lede">
                Ask to join one of these and the organiser reads your note before deciding.
                Nobody is added automatically, and no money passes through us.
              </p>
            </div>
            <div className="lp-open__grid">
              {openTrips.map((trip) => {
                const spots = describeSpots({ spotsLeft: trip.spotsLeft });
                return (
                  <a className="lp-opencard" key={trip.id} href={trip.href}>
                    <span className="lp-opencard__frame">
                      {trip.photo
                        ? <img src={trip.photo} alt="" loading="lazy" decoding="async" onError={() => retryCover(trip)} />
                        : <span className="lp-tripcard__blank" aria-hidden="true" />}
                    </span>
                    <span className="lp-opencard__body">
                      <strong>{trip.name}</strong>
                      <span className="lp-opencard__line">
                        {trip.countries}{trip.countries && spots ? ' · ' : ''}{spots}
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/*  AFTER STORIES - real published stories, or nothing.  */}
      {stories.length > 0 && (
        <section className="lp-stories">
          <div className="lp-shell">
            <div className="lp-sec-head lp-stories__head">
              <span className="lp-kicker">After stories</span>
              <h2 className="lp-h2">What the trips were actually like</h2>
              <p className="lp-lede">
                Written once people were home and knew which parts mattered.
              </p>
            </div>
            <div className="lp-stories__grid">
              {stories.slice(0, 3).map((story) => (
                <LpStoryCard key={story.id} story={story} />
              ))}
            </div>
            <div className="lp-trips__more">
              <a href="/stories">Read more stories <IconArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      )}

      {/*  THE BOOK - the one dark band on the page, because a printed object
           deserves a different ground than the rest of the scroll.

           The ordering language is gated: with `bookOrdering` off this says the
           PDF is the finished book, which is what BookPreviewDialog says inside
           the app. The two must not disagree.  */}
      <section className="lp-book">
        <div className="lp-shell lp-book__inner">
          <span className="lp-kicker lp-kicker--light">The book</span>
          <h2 className="lp-h2 lp-h2--light">A story you can hold</h2>
          <p className="lp-lede lp-lede--light">
            Any after story lays out as an A5 hardcover: your photographs at full
            resolution, your words set in print. Look through every page exactly as it
            would arrive, and nothing is produced until you have.
          </p>
          <div className="lp-book__spread" aria-hidden="true">
            <span className="lp-book__page" />
            <span className="lp-book__page lp-book__page--mid" />
            <span className="lp-book__page" />
          </div>
          <p className="lp-book__note">
            {FEATURE_FLAGS.bookOrdering
              ? 'Printed close to the delivery address rather than shipped across the world.'
              : 'Printed copies are not on sale yet. The PDF is the finished book, at print resolution.'}
          </p>
        </div>
      </section>

      {/*  NAVIA  */}
      <section className="lp-navia" id="navia">
        <div className="lp-shell lp-navia__inner">
          <div className="lp-navia__text">
            <span className="lp-kicker">Navia</span>
            <h2 className="lp-h2">Say it in a sentence</h2>
            <p className="lp-lede">
              Tell Navia where you are going and how long for, and it drafts the route, the
              stops, the local food and the notes. Then every place is matched against a
              live listing before you see it.
            </p>
            <p className="lp-navia__caveat">
              Navia proof-reads an after story if you ask it to. It never writes one for
              you: the whole value of a story is that a person wrote it.
            </p>
            <button className="lp-btn lp-btn--outline" onClick={() => navigate('/signup')}>
              Try Navia free <IconArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="lp-navia__demo" aria-hidden="true">
            <div className="lp-navia__prompt">
              <NaviaOrb size={20} />
              <span>Nine days in Oaxaca, slow, lots of food</span>
            </div>
            <div className="lp-fig">
              <div className="lp-fig__label">Draft route</div>
              <div className="lp-fig__line"><span>Oaxaca de Ju&aacute;rez &middot; 4 nights</span><em className="ok">Verified</em></div>
              <div className="lp-fig__line"><span>Hierve el Agua &middot; day trip</span><em className="ok">Verified</em></div>
              <div className="lp-fig__line"><span>Puerto Escondido &middot; 5 nights</span><em className="ok">Verified</em></div>
            </div>
          </div>
        </div>
      </section>

      {/*  FEATURES  */}
      <section className="lp-features" id="features">
        <div className="lp-shell">
          <div className="lp-sec-head lp-features__head">
            <span className="lp-kicker">Details</span>
            <h2 className="lp-h2">The parts that took longest to get right</h2>
          </div>
          <div className="lp-features__grid">
            {FEATURES.map((f) => (
              <article className="lp-feature" key={f.title}>
                <span className="lp-feature__icon">{f.icon}</span>
                <h3 className="lp-h4">{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/*  FAQ  */}
      <LandingFAQ />

      {/*  CTA  */}
      <section className="lp-cta">
        <div className="lp-cta__content">
          <h2 className="lp-cta__title">Go somewhere worth writing about.</h2>
          <p className="lp-cta__sub">
            Free to join. Browse what other people have done, plan your own, and keep it
            when you get back.
          </p>
          <div className="lp-cta__actions">
            <button className="lp-btn lp-btn--cta-primary" onClick={() => navigate('/signup')}>
              Create your account <IconArrowRight size={17} aria-hidden="true" />
            </button>
            <a className="lp-cta__alt" href="/community">or browse the community first</a>
          </div>
        </div>
      </section>

      {/*  FOOTER  */}
      <footer className="lp-footer">
        <div className="lp-shell lp-footer__inner">
          <div className="lp-footer__brand">
            <div className="lp-footer__logo">
              {logoFullBlackUrl
                ? <img src={logoFullBlackUrl} alt="Tripician" className="lp-logo-img lp-logo-img--footer" />
                : (<><IconPlane size={18} /><span>Tripician</span></>)}
            </div>
            <p>A travel community.<br />Real trips, published by the people who took them.</p>
          </div>
          <div className="lp-footer__links">
            <div className="lp-footer__col">
              <h4>Product</h4>
              <a href="/community">Community</a>
              <a href="/stories">Stories</a>
              <a href="#how-it-works">How it works</a>
              <a href="#features">Features</a>
              {/* `/docs` used to sit here. There is no /docs route in App.tsx, so
                  it resolved to the catch-all 404 - a dead internal link on the
                  highest-authority page on the site, which is both a crawl-budget
                  leak and a quality signal. Restore it when the route exists. */}
            </div>
            <div className="lp-footer__col">
              <h4>Company</h4>
              <a href="/about-us">About Us</a>
              {/* The blog is in sitemap.xml and allowed in robots.txt but had no
                  link from the homepage, which is the page with the most authority
                  to pass to it. */}
              <a href="/blog">Blog</a>
              {/* The operator portal had no inbound link anywhere on the site, so
                  a travel business could only reach it by being sent the URL. This
                  footer is the one a signed-out visitor actually sees: the shared
                  Footer component renders only inside the authenticated shell. */}
              <a href="/for-operators">For Operators</a>
              <a href="/get-help">Get Help</a>
              <a href="/contact-us">Contact Us</a>
            </div>
            <div className="lp-footer__col">
              <h4>Legal</h4>
              <a href="/privacy-policy">Privacy Policy</a>
              <a href="/terms-and-conditions">Terms &amp; Conditions</a>
            </div>
          </div>
        </div>
        {/* Photographer attribution. Unsplash's API terms require crediting the
            photographer with a link to their profile and to Unsplash. */}
        {PHOTO_CREDITS.length > 0 && (
          <div className="lp-shell lp-footer__credits">
            Destination photography by{' '}
            {PHOTO_CREDITS.map((c, i) => (
              <span key={c.slug}>
                {i > 0 && ', '}
                <a href={c.photographerUrl} target="_blank" rel="noopener noreferrer">{c.photographer}</a>
              </span>
            ))}
            {' '}on <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a>.
            {' '}Hero video by{' '}
            <a href={HERO_VIDEO_CREDIT.photographerUrl} target="_blank" rel="noopener noreferrer">
              {HERO_VIDEO_CREDIT.photographer}
            </a>
            {stepCredits.map((c) => (
              <span key={c.slug}>
                {', '}
                <a href={c.photographerUrl} target="_blank" rel="noopener noreferrer">{c.photographer}</a>
              </span>
            ))}
            {' '}on <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>.
          </div>
        )}
        <div className="lp-shell lp-footer__bottom">
          <span>&copy; 2026 Tripician. All rights reserved.</span>
          <span>Not a travel agency. We do not book flights or accommodation.</span>
        </div>
      </footer>
    </div>
  );
}
