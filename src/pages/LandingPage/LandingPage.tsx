import { useLayoutEffect, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  IconMap,
  IconCompass,
  IconBrain,
  IconArrowRight,
  IconChevronDown,
  IconPlane,
  IconUsers,
  IconUsersGroup,
  IconMessages,
  IconLayoutGrid,
  IconCheck,
  IconShield,
  IconBolt,
  IconSparkles,
} from '@tabler/icons-react';
import '../../assets/css/LandingPage.css';
import Seo, { SITE_URL } from '../../components/Seo';
import NaviaOrb from '../../navia/NaviaOrb';
import LpPhoto from './LpPhoto';
import { HERO_IMAGE, HERO_VIDEO, HERO_VIDEO_CREDIT, OG_IMAGE, DESTINATION_TILES, TICKER, PHOTO_CREDITS } from './landingImages';
import { apiServices } from '../../services/APIs/apiServices';
import { tripPath } from '../../utils/tripSlug';
import { tripCoverPhoto, resolveTripCover, type TripCoverSource } from '../../utils/tripCover';

gsap.registerPlugin(ScrollTrigger);

/*  STATIC DATA  */
const FEATURES = [
  {
    icon: <IconSparkles size={24} stroke={1.75} />,
    title: 'Vibe Matching',
    desc: 'Every trip, group, and profile is tagged with a travel personality. Culture seekers find culture seekers. Spiritual explorers find monastery routes. You never settle.',
  },
  {
    icon: <IconUsers size={24} stroke={1.75} />,
    title: 'One chat, one plan',
    desc: 'Every trip gets a shared chat where friends, family, and Navia plan together. Type @navia to propose changes, discuss them, and apply updates to the itinerary.',
  },
  {
    icon: <NaviaOrb size={24} />,
    title: 'Every place checked before you see it',
    desc: 'Navia drafts the route, stops, spots and local food - then each place is matched against a live listing. Anything permanently closed is dropped, and anything we could not confirm says so.',
  },
  {
    icon: <IconShield size={24} stroke={1.75} />,
    title: 'Live Risk Monitor',
    desc: 'Real-time travel advisories, severe weather, currency shifts and breaking news auto-mapped to every destination in your active plan.',
  },
  {
    icon: <IconBrain size={24} stroke={1.75} />,
    title: 'Reality check',
    desc: 'Before you fly, we measure the plan: how many hours you actually lose getting between stops, which days are overloaded, and anything closed for the whole time you are in town.',
  },
  {
    icon: <IconMap size={24} stroke={1.75} />,
    title: 'Interactive Maps',
    desc: 'Visualise your entire journey on a live map. Pin destinations, draw routes, and explore at a glance - solo or with your group.',
  },
  {
    icon: <IconCompass size={24} stroke={1.75} />,
    title: 'Day-by-Day Planner',
    desc: 'Organise every day with destinations, stays, activities, and notes. Optimise your route with one click - then publish your trip so others can discover it.',
  },
  {
    icon: <IconBolt size={24} stroke={1.75} />,
    title: 'Budgets, Split Expenses & Packing',
    desc: 'Set a trip budget, log shared costs, and settle up with the fewest transfers possible. Packing lists live right inside the trip, so nothing gets left behind.',
  },
];

const PROBLEMS = [
  {
    icon: <IconLayoutGrid size={22} stroke={1.75} />,
    title: 'Your trip lives in six different apps',
    desc: "WhatsApp for the debate, a spreadsheet for the budget, a doc for the itinerary, screenshots for everything else. By day three, nobody knows what's actually the plan.",
  },
  {
    icon: <IconMessages size={22} stroke={1.75} />,
    title: "Group chats don't make decisions",
    desc: 'Everyone has an opinion on where to go. Nobody has the bandwidth to turn fifty messages into an actual itinerary.',
  },
  {
    icon: <IconUsersGroup size={22} stroke={1.75} />,
    title: 'You never know who else travels like you',
    desc: "The friend who'd love your exact trip is out there. Most planning tools have no way to help you find them before you go.",
  },
];

/**
 * Each step carries a `visual`: a small mock of the real screen, built from divs
 * rather than a screenshot so it stays sharp, themeable and needs no asset
 * pipeline. Users told us the page read as "more words than an easy to understand
 * process" - four numbered paragraphs with nothing to look at was the reason.
 */
const STEPS: {
  num: string; title: string; desc: string; tag: string; visual: React.ReactNode;
}[] = [
  {
    num: '01',
    title: 'Set your travel vibe',
    desc: 'Define your travel personality - culture seeker, adventure junkie, spiritual explorer, luxury traveler. Your vibe shapes every trip and person you discover.',
    tag: 'Your identity',
    visual: (
      <div className="lp-step-mock">
        <div className="lp-step-mock__label">Pick your vibe</div>
        <div className="lp-step-mock__chips">
          <span className="is-on">Culture</span><span>Adventure</span>
          <span>Slow travel</span><span className="is-on">Scenic</span><span>Urban</span>
        </div>
      </div>
    ),
  },
  {
    num: '02',
    title: 'Name a place, get a real plan',
    desc: 'Navia drafts the route, the places worth your time, local food and notes. Every place is then matched against a live listing - anything closed for good is dropped before you ever see it.',
    tag: 'Checked, not guessed',
    visual: (
      <div className="lp-step-mock">
        <div className="lp-step-mock__label">Bangkok · 3 nights</div>
        <div className="lp-step-mock__row"><span>Wat Arun</span><em className="ok">Verified</em></div>
        <div className="lp-step-mock__row"><span>Grand Palace</span><em className="ok">Verified</em></div>
        <div className="lp-step-mock__row"><span>Som Tam stall, Soi 38</span><em>Unchecked</em></div>
        <div className="lp-step-mock__row is-cut"><span>Tickets Bar</span><em className="cut">Closed - removed</em></div>
      </div>
    ),
  },
  {
    num: '03',
    title: 'Decide it together',
    desc: 'Invite your crew into one shared trip chat. Everyone suggests, everyone sees the same plan, and @navia turns the discussion into changes the group accepts or dismisses.',
    tag: 'One shared plan',
    visual: (
      <div className="lp-step-mock">
        <div className="lp-step-mock__msg">Maya: can we slow day 4 down?</div>
        <div className="lp-step-mock__msg is-me">@navia swap the Fuji day</div>
        <div className="lp-step-mock__proposal">
          <strong>Suggestion</strong>
          <span>− Fuji day trip</span><span>+ Hakone, 1 night</span>
          <div className="lp-step-mock__actions"><b>Apply</b><i>Dismiss</i></div>
        </div>
      </div>
    ),
  },
  {
    num: '04',
    title: 'Check it before you book',
    desc: 'The reality check measures your plan with real distances and opening hours - the hours you lose between stops, the days you have overloaded, anything shut for your whole stay.',
    tag: 'Measured, not guessed',
    visual: (
      <div className="lp-step-mock">
        <div className="lp-step-mock__score"><b>78</b><span>/ 100</span></div>
        <div className="lp-step-mock__row is-warn"><span>Bangkok → Sukhothai</span><em>≈6.4h travel</em></div>
        <div className="lp-step-mock__row is-warn"><span>Day 2 is overloaded</span><em>11.5h</em></div>
        <div className="lp-step-mock__row"><span>Every place confirmed</span><em className="ok">Good</em></div>
      </div>
    ),
  },
];

/**
 * A published trip, reduced to what the community strip needs.
 *
 * Replaces both the invented SHOWCASE destinations and the three fabricated
 * REVIEWS that used to live here - named people with invented trips, hardcoded
 * as constants. The community section is now built from the community.
 *
 * Fields are read in both casings because the API's serializer is not
 * consistent across endpoints; this mirrors DiscoveryPage's defensive shape.
 * Returns null for a row that cannot be linked or labelled, which therefore
 * must not render.
 */
interface LandingTrip {
  id: string;
  name: string;
  href: string;
  photo?: string;
  countries?: string;
  owner?: string;
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
   * This page used to read the banner straight off the row and stop there, which
   * is why the showcase rendered as four blank tiles: a published trip with no
   * uploaded banner got `undefined` and no fallback, so every card was the empty
   * grey box with unreadable white text over it. Going through tripCover gives it
   * the same saved-banner -> curated-country-cover -> Unsplash chain as the
   * community grid and the trip's own hero, so the same trip looks the same in
   * all three places.
   *
   * `bannerPhoto.url` is this endpoint's shape; tripCover reads the flat
   * `bannerPhotoUrl` variants, so hand it a normalised source.
   */
  const cover: TripCoverSource = {
    bannerPhotoUrl: raw?.bannerPhoto?.url || raw?.BannerPhoto?.Url || raw?.photoUrl || raw?.PhotoUrl || null,
    countries: countryList,
    name,
  };

  return {
    id: String(id),
    name,
    href: tripPath({ id: String(id), name }),
    photo: tripCoverPhoto(cover) ?? undefined,
    countries: countryList.slice(0, 2).join(' · ') || undefined,
    owner: typeof ownerName === 'string' && ownerName.trim() ? ownerName.trim() : undefined,
    cover,
  };
};


type AgentStepType = 'user' | 'think' | 'proposal' | 'system' | 'done';
interface AgentStep { type: AgentStepType; text?: string; operations?: string[]; }

const AGENT_STEPS: AgentStep[] = [
  { type: 'user', text: '@navia should we add Paris to this Europe trip?' },
  { type: 'think', text: 'Navia is analysing your route, dates, budget, and group preferences...' },
  {
    type: 'proposal',
    text: 'Paris fits your current itinerary between Amsterdam and Rome. Should I add "Paris" as a destination?',
    operations: ['+ Paris'],
  },
  { type: 'system', text: 'Paris added to trip' },
  { type: 'done', text: 'Destination added. Your itinerary is now updated for the whole group.' },
];

function AgentDemoWidget() {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const DELAYS = [0, 900, 1900, 3600, 4700];
    const timers: ReturnType<typeof setTimeout>[] = [];
    function cycle() {
      setVisible(0);
      DELAYS.forEach((d, i) => timers.push(setTimeout(() => setVisible(i + 1), d + 300)));
      timers.push(setTimeout(cycle, 8200));
    }
    const init = setTimeout(cycle, 600);
    timers.push(init);
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="lp-agent-window">
      <div className="lp-agent-window__bar">
        <span className="lp-agent-window__dot" style={{ background: '#ff5f57' }} />
        <span className="lp-agent-window__dot" style={{ background: '#febc2e' }} />
        <span className="lp-agent-window__dot" style={{ background: '#28c840' }} />
        <span className="lp-agent-window__title"><NaviaOrb size={12} /> Navia - trip group chat</span>
      </div>
      <div className="lp-agent-window__body">
        {AGENT_STEPS.map((step, i) => (
          <div key={i} className={`lp-agent-msg lp-agent-msg--${step.type}${i < visible ? ' lp-agent-msg--in' : ''}`}>
            {step.type === 'user' && (
              <div className="lp-agent-bubble lp-agent-bubble--user">
                <span className="lp-agent-avatar lp-agent-avatar--you">You</span>
                <span>{step.text}</span>
              </div>
            )}
            {step.type === 'done' && (
              <div className="lp-agent-bubble lp-agent-bubble--ai">
                <span className="lp-agent-avatar" style={{ background: 'transparent' }}><NaviaOrb size={22} /></span>
                <span>{step.text}</span>
              </div>
            )}
            {step.type === 'think' && (
              <div className="lp-agent-bubble lp-agent-bubble--think">
                <span className="lp-agent-avatar" style={{ background: 'transparent' }}><NaviaOrb size={22} /></span>
                <span className="lp-agent-dots"><span /><span /><span /></span>
                <span style={{ opacity: .7, fontSize: 12 }}>{step.text}</span>
              </div>
            )}
            {step.type === 'proposal' && (
              <div className={`lp-agent-proposal${visible > i + 1 ? ' lp-agent-proposal--accepted' : ''}`}>
                <div className="lp-agent-proposal__row">
                  <span className="lp-agent-avatar" style={{ background: 'transparent' }}><NaviaOrb size={22} /></span>
                  <div className="lp-agent-proposal__card">
                    <div className="lp-agent-proposal__head">
                      <NaviaOrb size={14} />
                      Navia Suggestion
                    </div>
                    <p>{step.text}</p>
                    <div className="lp-agent-proposal__chips">
                      {step.operations?.map((op, j) => <span key={j}>{op}</span>)}
                    </div>
                    <div className="lp-agent-proposal__actions">
                      <button type="button" className="lp-agent-proposal__accept">
                        <IconCheck size={14} />
                        {visible > i + 1 ? 'Accepted' : 'Accept'}
                      </button>
                      <button type="button" className="lp-agent-proposal__reject">Reject</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {step.type === 'system' && (
              <div className="lp-agent-system">
                <div className="lp-agent-system__card">
                  <div className="lp-agent-system__head">
                    <IconCheck size={13} />
                    Trip Updated
                  </div>
                  <div className="lp-agent-system__result">
                    <IconCheck size={13} />
                    <span>{step.text}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/*  FAQ  */
const LP_FAQS = [
  {
    q: 'What exactly is Tripician?',
    a: "Tripician is a global community for travellers and a planner your whole group can edit. Find your travel tribe, plan with your crew in a shared trip chat, build detailed itineraries - or let Navia draft the first version - track group expenses, manage packing lists, monitor travel risks, and connect with travellers who share your travel vibe. We are not a travel agency - we don't book flights or accommodation.",
  },
  {
    q: 'Is Tripician free?',
    a: 'Yes - planning, community, and collaboration are free. Drafting with Navia runs on included credits: every traveller starts with 300 personal credits and each trip gets its own shared 300-credit wallet, enough for roughly a month of regular use. The reality check costs nothing, because it is plain arithmetic rather than a model call. Top-up options are on the way, but the core planner will always stay free.',
  },
  {
    q: 'Does Tripician use AI, and can I trust what it suggests?',
    a: "Yes, and here is exactly how. Navia drafts routes, stops, local food and notes using a language model - so on its own it would occasionally suggest somewhere that has closed or never existed. That is why nothing it produces reaches you unchecked: every place is matched against a live listing first. Anything permanently closed is dropped before you see it, and anything without a listing is labelled \"unchecked\" rather than presented as fact. Separately, the reality check measures your plan with real distances and opening hours - no model involved - so it can tell you a leg will eat most of a day, or that a museum is shut for your whole stay.",
  },
  {
    q: 'What is "vibe matching"?',
    a: 'Every traveller and trip on Tripician is tagged with a travel personality - Adventure, Culture, Luxury, Spiritual, Urban, Scenic, or Romantic. Vibe matching surfaces trips, groups, and community members whose style fits yours, so you stop scrolling and start connecting.',
  },
  {
    q: 'Can I plan a trip with friends or family?',
    a: 'Absolutely. Invite co-planners to any trip, build the itinerary together in real time, chat in the shared trip discussion, split group expenses with minimal-transfer settle-up, and let Navia mediate the "where next" debates.',
  },
  {
    q: 'How does the Risk Monitor work?',
    a: "Our Risk Monitor aggregates publicly available safety and travel advisories for destination countries. This is for general awareness only - always verify with your government's official travel advisory before making decisions.",
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

function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="lp-faq" id="faq">
      <div className="lp-faq__inner">
        <div className="lp-faq__header">
          <span className="lp-section-eyebrow">FAQ</span>
          <h2 className="lp-section-title">Questions? We&apos;ve got answers.</h2>
          <p className="lp-section-sub">
            Can&apos;t find what you&apos;re looking for?{' '}
            <a href="/get-help" style={{ color: 'var(--lp-primary)', fontWeight: 600, textDecoration: 'none' }}>Visit our Help Centre →</a>
          </p>
        </div>
        <div className="lp-faq__list">
          {LP_FAQS.map((faq, i) => (
            <div key={i} className={`lp-faq-item${open === i ? ' lp-faq-item--open' : ''}`}>
              <button type="button" className="lp-faq-item__q" onClick={() => setOpen(open === i ? null : i)}>
                <span>{faq.q}</span>
                <IconChevronDown size={18} className="lp-faq-item__chevron" />
              </button>
              {open === i && (
                <div className="lp-faq-item__a">
                  <p>{faq.a}</p>
                </div>
              )}
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
  const { isAuthenticated, isLoading } = useAuth0();
  // Was reading VITE_LANDING_HERO_IMAGE_URL directly, which is set in no env file -
  // so the hero always fell through to the bare gradient. HERO_IMAGE keeps the env
  // override and adds a curated fallback, so a photo actually renders.
  const heroImageUrl = HERO_IMAGE;

  // Redirect authenticated users - no spinner, page renders immediately for Googlebot
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const logoFullWhiteUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_2_URL as string | undefined;
  const logoFullBlackUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_BLACK_2_URL as string | undefined;

  const [isScrolled, setIsScrolled] = useState(false);
  const [recentTrips, setRecentTrips] = useState<LandingTrip[]>([]);

  /**
   * The community strip's content. Anonymous-safe: `/api/trips/published` is
   * [AllowAnonymous], and a failure here must never break the marketing page -
   * the section simply does not render, which is why the catch is silent and the
   * initial state is an empty list rather than a spinner.
   */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiServices.getPublishedTrips();
        if (!active) return;
        const rows = Array.isArray(response?.data) ? response.data : [];
        const trips = rows.map(toLandingTrip).filter((t): t is LandingTrip => t !== null).slice(0, 4);
        setRecentTrips(trips);

        /*
         * Second pass for the cards tripCoverPhoto could not resolve synchronously -
         * a country with no curated cover yet. Only those hit the network, and only
         * after the section has already painted with the covers we did have, so the
         * grid fills in rather than popping wholesale.
         */
        const missing = trips.filter((t) => !t.photo);
        if (!missing.length) return;
        const resolved = await Promise.all(
          missing.map(async (t) => [t.id, await resolveTripCover(t.cover)] as const),
        );
        if (!active) return;
        const byId = new Map(resolved.filter(([, url]) => !!url));
        if (!byId.size) return;
        setRecentTrips((prev) => prev.map((t) => (byId.has(t.id) ? { ...t, photo: byId.get(t.id)! } : t)));
      } catch {
        /* no trips shown; the section unmounts itself */
      }
    })();
    return () => { active = false; };
  }, []);

  /**
   * The hero loop. Deliberately *not* rendered on first paint.
   *
   * `heroVideoSrc` stays null until after the window load event, so the poster
   * photo is what paints and what LCP measures - attaching a 2.4 MB video to the
   * DOM up front would make the headline wait behind it. `heroVideoReady` then
   * gates the fade, so a video that stalls or 404s leaves the poster in place
   * rather than a black rectangle.
   *
   * Four conditions have to hold before it loads at all:
   *  - reduced motion is not requested. A 12-second loop is exactly the kind of
   *    ambient movement that setting exists to stop, and the rest of this page
   *    already honours it.
   *  - the viewport is wide. A landscape drone shot cropped to a phone's portrait
   *    aspect shows almost nothing, and it is several MB on a connection the
   *    visitor may well be paying for by the megabyte.
   *  - Save-Data is off.
   *  - the connection is not 2g/3g.
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
   * A cover URL that 404s. The banner saved on a trip can be a dead link - the
   * whole previous cover set was - and a broken image on the front page is worse
   * than no image, so drop the banner and re-resolve from the country.
   *
   * The ref is the loop guard: if the replacement is dead too, `onError` fires
   * again, and without it we would keep resolving to the same URL forever. One
   * retry per card, then it settles on the empty state.
   */
  const retriedCoversRef = useRef<Set<string>>(new Set());
  const retryCover = useCallback((trip: LandingTrip) => {
    setRecentTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, photo: undefined } : t)));
    if (retriedCoversRef.current.has(trip.id)) return;
    retriedCoversRef.current.add(trip.id);

    const withoutBanner: TripCoverSource = { ...trip.cover, bannerPhotoUrl: null };
    resolveTripCover(withoutBanner).then((url) => {
      if (!url || url === trip.photo) return;
      setRecentTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, photo: url } : t)));
    });
  }, []);

  // Nav goes solid once the hero photo scrolls behind it
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The PWA install prompt lived here and could never fire: the project ships no
  // web manifest, so `beforeinstallprompt` is never raised and the button it
  // gated was permanently invisible. Removed with the button rather than left as
  // machinery for a feature that does not exist.

  useLayoutEffect(() => {
    /*
     * Motion is opt-out at the OS level. Anyone who has asked their system to
     * reduce motion gets the page fully composed and completely still - not a
     * faster version of the same animation. Vestibular triggers are the reason
     * the setting exists, and a marketing page is not worth making someone ill.
     */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      /*
       * Must SET the resting values, not clearProps them. `.lp-nav`,
       * `.lp-hero__eyebrow` and `.lp-hero__title .word` carry `opacity: 0` in
       * the stylesheet while they wait for GSAP; clearing GSAP's inline styles
       * just hands them back to that rule, and the hero renders blank. Inline
       * values win, so state them.
       */
      gsap.set([
        '.lp-nav', '.lp-hero__eyebrow', '.lp-hero__title .word',
        '.lp-hero__subtitle', '.lp-hero__cta-group > *', '.lp-hero__scroll-indicator',
      ], { opacity: 1, x: 0, y: 0, scale: 1 });
      return;
    }

    const ctx = gsap.context(() => {

      /*  1. HERO ENTRANCE  */
      const heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
      heroTL
        .to('.lp-nav', { y: 0, opacity: 1, duration: 0.85 })
        .to('.lp-hero__eyebrow', { y: 0, opacity: 1, duration: 0.65 }, '-=0.35')
        .to('.lp-hero__title .word', {
          y: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.13,
        }, '-=0.25')
        .to('.lp-hero__subtitle', { y: 0, opacity: 1, duration: 0.7 }, '-=0.55')
        .to('.lp-hero__cta-group > *', {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.55,
          stagger: 0.12,
        }, '-=0.45')
        .to('.lp-hero__scroll-indicator', { opacity: 1, y: 0, duration: 0.5 }, '-=0.2');

      /* Set GSAP start states before animating */
      gsap.set('.lp-nav', { y: -65, opacity: 0 });
      gsap.set('.lp-hero__eyebrow', { y: 35, opacity: 0 });
      gsap.set('.lp-hero__title .word', { y: 90, opacity: 0 });
      gsap.set('.lp-hero__subtitle', { y: 28, opacity: 0 });
      gsap.set('.lp-hero__cta-group > *', { y: 28, opacity: 0, scale: 0.93 });
      gsap.set('.lp-hero__scroll-indicator', { y: -14, opacity: 0 });

      heroTL.restart();

      /* Floating scroll arrow */
      gsap.to('.lp-hero__scroll-indicator', {
        y: 10,
        repeat: -1,
        yoyo: true,
        duration: 1.5,
        ease: 'power1.inOut',
        delay: 2.5,
      });

      /* ── Hero depth ──────────────────────────────────────────────────────
       * The photo drifts at roughly two-thirds scroll speed while the copy
       * rises past it and dims. This is the single biggest contributor to a
       * page feeling built rather than assembled, and the CSS was already set
       * up for it - `.lp-hero__bg` carries `inset: -8%` and `will-change:
       * transform` precisely so it can move without exposing an edge - but
       * nothing had ever driven it.
       *
       * Scrubbed, so it is tied to the scroll position rather than played at
       * it; `invalidateOnRefresh` keeps the distances right after a resize.
       */
      gsap.to('.lp-hero__bg', {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: '.lp-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      gsap.to('.lp-hero__content', {
        y: 64,
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: {
          trigger: '.lp-hero',
          start: 'top top',
          end: 'bottom 30%',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      /* A ticking stats-counter animation lived here, bound to `.lp-stat__number`
         elements that were removed with the fake-numbers band. It matched nothing
         and ran on nothing - but it was a loaded gun: the next stats section to
         use that class would have started animating counters again. Deleted with
         the pattern it served. */

      /* ── Section motion ──────────────────────────────────────────────────
       * Every section previously ran the same gesture: y 40-60, opacity 0,
       * fade up. Fourteen times. A single move repeated that often stops
       * reading as motion at all - it just feels like the page is slow to
       * arrive. So each section now has a gesture that suits its content, and
       * entrances play ONCE rather than reversing on scroll-up (which was both
       * busy and the cause of the "frozen mid-tween screenshot" artefact).
       */

      /** Type reveals from behind its own baseline, rather than fading. */
      const revealTitle = (target: string, trigger: string) =>
        gsap.from(target, {
          clipPath: 'inset(0 0 100% 0)',
          y: 18,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger, start: 'top 84%', once: true },
        });

      /** Cards settle in with depth, not just position. */
      const revealCards = (target: string, trigger: string, each = 0.08) =>
        gsap.from(target, {
          y: 34,
          scale: 0.965,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: { each, from: 'start' },
          scrollTrigger: { trigger, start: 'top 80%', once: true },
        });

      /*  Trust strip - items arrive laterally, so it reads as a row rather
          than three things falling.  */
      gsap.from('.lp-trust-bar__item', {
        x: -14, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1,
        scrollTrigger: { trigger: '.lp-trust-bar', start: 'top 92%', once: true },
      });

      /*  Community trips - the proof section, so it gets the most considered
          entrance: a wave with real depth.  */
      revealTitle('.lp-showcase__header > *', '.lp-showcase');
      revealCards('.lp-showcase__card', '.lp-showcase__grid', 0.09);
      gsap.from('.lp-showcase__footer', {
        opacity: 0, y: 14, duration: 0.6, ease: 'power2.out',
        scrollTrigger: { trigger: '.lp-showcase__footer', start: 'top 94%', once: true },
      });

      /*  Problem  */
      revealTitle('.lp-problem__header > *', '.lp-problem');
      revealCards('.lp-problem-card', '.lp-problem__grid', 0.1);

      /*  Steps - the rail draws itself, then each step arrives against it.
          Kept lateral because the rail is vertical; the cross-axis motion is
          what makes the sequence legible.  */
      revealTitle('.lp-steps__header > *', '.lp-steps');
      gsap.from('.lp-steps__line', {
        scaleY: 0, transformOrigin: 'top center', duration: 1.5, ease: 'power2.inOut',
        scrollTrigger: { trigger: '.lp-steps__list', start: 'top 78%', once: true },
      });
      gsap.from('.lp-step', {
        x: -40, opacity: 0, duration: 0.85, ease: 'power3.out', stagger: 0.2,
        scrollTrigger: { trigger: '.lp-steps__list', start: 'top 74%', once: true },
      });

      /*  Features  */
      revealTitle('.lp-features__header > *', '.lp-features');
      revealCards('.lp-feature-card', '.lp-features__grid', 0.055);

      /*  Navia - the window is a screen, so it tilts up into place. This is the
          one place a 3D transform earns itself.  */
      gsap.from('.lp-ai-agent__text > *', {
        y: 26, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: '.lp-ai-agent__text', start: 'top 80%', once: true },
      });
      gsap.from('.lp-agent-window', {
        y: 44, scale: 0.96, rotateX: 7, opacity: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.lp-agent-window', start: 'top 84%', once: true },
      });

      /*  Bento + risk  */
      revealTitle('.lp-bento__header > *', '.lp-bento');
      revealCards('.lp-bento-card', '.lp-bento__grid', 0.07);
      gsap.from('.lp-risk-preview__card', {
        y: 40, scale: 0.98, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: '.lp-risk-preview', start: 'top 82%', once: true },
      });

      /*  Closing CTA  */
      gsap.from('.lp-cta__content', {
        y: 44, scale: 0.98, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: '.lp-cta', start: 'top 80%', once: true },
      });
    });

    return () => ctx.revert();
  }, []);

  /*  JSX  */
  return (
    <div className="lp-root">
      <Seo
        title="Tripician, A Travel Community & Group Trip Planner"
        description="Browse real itineraries published by travellers who took them - the route, the stays, the places worth the detour. Copy any trip into your own plan, and plan it with your crew. Every place is checked against a live listing. Free to join."
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
            sameAs: [],
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
        {/* Community leads the nav; Navia is a section further down the page, not
            a peer of the product itself. */}
        <div className="lp-nav__links">
          <a href="/community">Community</a>
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
        </div>
        <div className="lp-nav__actions">
          <button className="lp-btn lp-btn--ghost" onClick={() => navigate('/signin')}>Sign in</button>
          <button className="lp-btn lp-btn--primary" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </nav>

      {/*  HERO  */}
      <section className="lp-hero" id="lp-main-content">
        <div
          className={`lp-hero__bg${!heroImageUrl ? ' lp-hero__bg--fallback' : ''}`}
          style={heroImageUrl ? ({ '--lp-hero-photo': `url(${heroImageUrl})` } as React.CSSProperties) : undefined}
        >
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

        {/* The hero has one job: say what this is. Visitors were asking "what does
            Tripician actually do?", so the eyebrow names the category, the headline
            says who writes the trips, and the subline says what you do with one.
            Nothing here is clever, and that is the point. */}
        <div className="lp-hero__content">
          <span className="lp-hero__eyebrow">A travel community</span>

          <h1 className="lp-hero__title">
            {['Real','trips,','from','travellers'].map((word, i) => (
              <span key={i} className="word">{word}</span>
            ))}
            <span className="word lp-hero__em">who have actually been there.</span>
          </h1>

          <p className="lp-hero__subtitle">
            Browse itineraries people took and published - the route, the stays, the places
            worth the detour. Copy one into your own plan and make it yours.
          </p>

          <div className="lp-hero__cta-group">
            <button className="lp-btn lp-btn--hero-primary" onClick={() => navigate('/community')} aria-label="Explore real trips from the community">
              Explore trips <IconArrowRight size={17} aria-hidden="true" />
            </button>
            {/* Was hidden on mobile, which left phones with no route into the
                community at all - the one thing the page is now about. */}
            <button className="lp-btn lp-btn--hero-link" onClick={() => navigate('/signup')} aria-label="Create an account and start planning">
              Start planning <IconArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="lp-hero__scroll-indicator" role="presentation">
          <IconChevronDown size={26} aria-hidden="true" />
        </div>
      </section>

      {/*  DESTINATION TICKER - names alone read as a word list; the thumbnails
           make it scan as places. Every row now has one: the labels come from
           the photo set rather than a parallel array that drifted out of sync.
           Duplicated once so the marquee can loop seamlessly at -50%.  */}
      <div className="lp-ticker" aria-hidden="true">
        <div className="lp-ticker__track">
          {[...TICKER, ...TICKER].map((dest, i) => (
            <span key={i} className="lp-ticker__item">
              <img
                src={dest.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="lp-ticker__thumb"
              />
              {dest.name}
            </span>
          ))}
        </div>
      </div>

      {/*  TRUST STRIP  */}
      <section className="lp-trust-bar" aria-label="Why travelers choose Tripician">
        <div className="lp-trust-bar__inner">
          {/* "50+ countries planned so far" used to sit here. It was not counting
              anything - no data source existed behind it - so it is gone. What
              remains is checkable. */}
          <span className="lp-trust-bar__item"><IconCheck size={16} stroke={2} /> <strong>Free</strong> - no credit card required</span>
          <span className="lp-trust-bar__item"><IconUsers size={16} stroke={2} /> Itineraries published by the people who travelled them</span>
          <span className="lp-trust-bar__item"><IconMap size={16} stroke={2} /> Every place checked against a live listing</span>
        </div>
      </section>

      {/*  REAL TRIPS  ---------------------------------------------------------
           This was four invented destinations with "View Trip" buttons that went
           to /signup - a showcase of trips that did not exist. It is now the
           actual published feed, which is both the honest version and a better
           argument: the proof that this is a community is the community's work.
           Renders nothing at all rather than a placeholder if the feed is empty. */}
      {recentTrips.length > 0 && (
        <section className="lp-showcase" id="explore">
          <div className="lp-showcase__header">
            <span className="lp-section-eyebrow">From the community</span>
            <h2 className="lp-section-title">Trips people have already taken</h2>
            <p className="lp-section-sub">
              Every one of these was planned, travelled and published by a member. Open one to see
              the full route, the stops and the stays.
            </p>
          </div>
          <div className="lp-showcase__grid">
            {recentTrips.map((trip) => (
              <div
                key={trip.id}
                className="lp-showcase__card"
                role="link"
                tabIndex={0}
                onClick={() => navigate(trip.href)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(trip.href); }}
              >
                {trip.photo
                  ? <img
                      src={trip.photo}
                      alt=""
                      className="lp-showcase__card-bg"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                      onError={() => retryCover(trip)}
                    />
                  : <div className="lp-showcase__card-bg lp-showcase__card-bg--empty" />
                }
                <div className="lp-showcase__card-overlay" />
                <div className="lp-showcase__card-content">
                  <div className="lp-showcase__card-meta">
                    {trip.countries && <span>{trip.countries}</span>}
                    {trip.owner && <span>by {trip.owner}</span>}
                  </div>
                  <h3 className="lp-showcase__card-title">{trip.name}</h3>
                  <span className="lp-showcase__card-btn">
                    View itinerary <IconArrowRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="lp-showcase__footer">
            <button className="lp-btn lp-btn--ghost" onClick={() => navigate('/community')}>
              See all trips <IconArrowRight size={15} />
            </button>
          </div>
        </section>
      )}

      {/*  THE PROBLEM  */}
      <section className="lp-problem" id="problem">
        <div className="lp-problem__header">
          <span className="lp-section-eyebrow">The problem</span>
          <h2 className="lp-section-title">Trip planning wasn&apos;t built for how people actually travel</h2>
          <p className="lp-section-sub">Sound familiar? Here&apos;s what breaks down before you even leave home.</p>
        </div>
        <div className="lp-problem__grid">
          {PROBLEMS.map((p, i) => (
            <div key={i} className="lp-problem-card">
              <div className="lp-problem-card__icon">{p.icon}</div>
              <h3 className="lp-problem-card__title">{p.title}</h3>
              <p className="lp-problem-card__desc">{p.desc}</p>
            </div>
          ))}
        </div>
        <p className="lp-problem__bridge">
          Tripician replaces all of it with <strong>one shared plan</strong> your whole crew can edit, a co-planner that drafts the first version for you, and a community that already travels your way.
        </p>
      </section>

      {/*  DESTINATION BAND - breaks the long text run between the problem and
           feature sections, and shows the places rather than naming them.  */}
      {DESTINATION_TILES.length > 0 && (
        <section className="lp-destband" aria-label="Destinations travellers are planning">
          <div className="lp-destband__grid">
            {DESTINATION_TILES.slice(0, 6).map((d) => (
              <LpPhoto
                key={d.name}
                src={d.url}
                alt={d.alt}
                ratio="1 / 1"
                rounded={14}
                overlay={<span className="lp-destband__name">{d.name}</span>}
              />
            ))}
          </div>
        </section>
      )}

      {/*  HOW IT WORKS  */}
      <section className="lp-steps" id="how-it-works">
        <div className="lp-steps__header">
          <span className="lp-section-eyebrow">How it works</span>
          <h2 className="lp-section-title">From idea to adventure<br />in 4 simple steps</h2>
        </div>
        <div className="lp-steps__list">
          <div className="lp-steps__line" />
          {STEPS.map((step, i) => (
            <div key={i} className="lp-step">
              <div className="lp-step__num">{step.num}</div>
              <div className="lp-step__body">
                <span className="lp-step__tag">{step.tag}</span>
                <h3 className="lp-step__title">{step.title}</h3>
                <p className="lp-step__desc">{step.desc}</p>
              </div>
              <div className="lp-step__visual">{step.visual}</div>
            </div>
          ))}
        </div>
      </section>

      {/*  FEATURES  */}
      <section className="lp-features" id="features">
        <div className="lp-features__header">
          <span className="lp-section-eyebrow">Everything you need</span>
          <h2 className="lp-section-title">Built around your travel personality</h2>
          <p className="lp-section-sub">
            From solo explorers to group adventures. Every feature is designed around who you are as a traveler, not just where you're going.
          </p>
        </div>
        <div className="lp-features__grid">
          {FEATURES.map((feat, i) => (
            <div key={i} className="lp-feature-card">
              <div className="lp-feature-card__icon">{feat.icon}</div>
              <h3 className="lp-feature-card__title">{feat.title}</h3>
              <p className="lp-feature-card__desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/*  NAVIA DEMO  */}
      <section className="lp-ai-agent" id="ai-agent">
        <div className="lp-ai-agent__inner">
          <div className="lp-ai-agent__text">
            <span className="lp-section-eyebrow">Meet Navia</span>
            <h2 className="lp-section-title">
              A co-planner that <span className="lp-ai-agent__title-highlight">works inside</span> your group chat
            </h2>
            <p className="lp-ai-agent__desc">
              Most trip planners hand you a list and leave. Navia <em>works inside your planner</em> - joining the group chat, reading the trip so far, and proposing changes your crew accepts or dismisses together. Nothing lands in the itinerary until someone says yes.
            </p>
            <ul className="lp-ai-agent__bullets">
              <li><NaviaOrb size={15} /> Summon @navia directly in trip group chat</li>
              <li><IconUsers size={15} /> Turns crew preferences into shared trip proposals</li>
              <li><IconBolt size={15} /> Applies accepted changes to the live itinerary</li>
              <li><IconBrain size={15} /> Flags overloaded days and legs that eat a day of travel</li>
              <li><IconShield size={15} /> Integrated live risk &amp; weather monitoring</li>
            </ul>
            <button className="lp-btn lp-btn--hero-primary" onClick={() => navigate('/signup')}>
              Start planning free <IconArrowRight size={16} />
            </button>
          </div>
          <div className="lp-ai-agent__widget">
            <AgentDemoWidget />
          </div>
        </div>
      </section>

      {/*  WHY DIFFERENT  */}
      <section className="lp-bento" id="why-different">
        <div className="lp-bento__header">
          {/* Was "Features no other travel platform has" - a claim we cannot
              stand behind and nobody believes on sight. Describing the thing is
              stronger than ranking it. */}
          <span className="lp-section-eyebrow">Built for this</span>
          <h2 className="lp-section-title">Three things worth<br />knowing about</h2>
          <p className="lp-section-sub">The parts of Tripician that took the longest to get right.</p>
        </div>
        <div className="lp-bento__grid">
          {/* Risk Monitor */}
          <div className="lp-bento-card lp-bento-card--risk">
            <div className="lp-bento-risk__title-row">
              <span className="lp-bento-card__icon-wrap"><IconShield size={19} stroke={1.75} /></span>
              <h3>Live Travel Risk Monitor</h3>
            </div>
            <p>Breaking news, typhoons, travel bans, strikes &amp; currency shifts - auto-cross-referenced with every destination in your plan.</p>
            <div className="lp-bento-risk-table">
              <div className="lp-bento-risk-row-mini">
                <span className="lp-risk-flag">{String.fromCodePoint(0x1F1EF, 0x1F1F5)}</span>
                <span className="lp-risk-name">Japan</span>
                <div className="lp-risk-bar-wrap"><div className="lp-risk-bar" style={{ width: '22%', background: '#22c55e' }} /></div>
                <span className="lp-risk-badge" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}>Low Risk</span>
              </div>
              <div className="lp-bento-risk-row-mini">
                <span className="lp-risk-flag">{String.fromCodePoint(0x1F1EB, 0x1F1F7)}</span>
                <span className="lp-risk-name">France</span>
                <div className="lp-risk-bar-wrap"><div className="lp-risk-bar" style={{ width: '54%', background: '#f59e0b' }} /></div>
                <span className="lp-risk-badge" style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>Watch</span>
              </div>
              <div className="lp-bento-risk-row-mini">
                <span className="lp-risk-flag">{String.fromCodePoint(0x1F1F9, 0x1F1ED)}</span>
                <span className="lp-risk-name">Thailand</span>
                <div className="lp-risk-bar-wrap"><div className="lp-risk-bar" style={{ width: '78%', background: '#ef4444' }} /></div>
                <span className="lp-risk-badge" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>Advisory</span>
              </div>
            </div>
            <div className="lp-bento-risk__footer">
              <span>Checked automatically against public travel advisories</span>
            </div>
            <button className="lp-bento-risk__cta" onClick={() => navigate('/risk-monitor')}>
              Check Destinations {'→'}
            </button>
          </div>
          {/* Agent */}
          <div className="lp-bento-card lp-bento-card--agent">
            <span className="lp-bento-card__tag">Plans with your crew</span>
            <h3>Navia in the group chat</h3>
            <p>Navia joins the trip conversation, reads the plan so far, proposes itinerary edits, and applies only the changes your group approves.</p>
            <div className="lp-bento-agent-preview">
              <div className="lp-bento-agent-msg lp-bento-agent-msg--member">Maya: less walking on Day 4?</div>
              <div className="lp-bento-agent-msg lp-bento-agent-msg--user">@navia adjust Fuji day for the group</div>
              <div className="lp-bento-agent-msg lp-bento-agent-msg--ai">Proposal ready: safer route + slower pace</div>
            </div>
          </div>
          {/* Vibe Matching */}
          <div className="lp-bento-card lp-bento-card--collab">
            <span className="lp-bento-card__tag">Signature Feature</span>
            <h3>Vibe Matching</h3>
            <p>Every plan, group, and profile is tagged with a travel personality. Culture seekers find culture seekers - you never compromise your experience again.</p>
            <div className="lp-bento-collab-row">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Culture', 'Spiritual', 'Adventure'].map((v) => (
                  <span key={v} style={{ fontSize: 11.5, padding: '4px 12px', borderRadius: 999, border: '1px solid var(--lp-border)', background: 'var(--lp-card-alt)', color: 'var(--lp-text-muted)', fontWeight: 600 }}>{v}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*  RISK MONITOR TEASER  */}
      <section className="lp-risk-preview">
        <div className="lp-risk-preview__card">
          <div className="lp-risk-preview__live">Risk Monitor Preview</div>
          <h2 className="lp-risk-preview__title">
            Know before you go.<br /><em>Know while you&apos;re there.</em>
          </h2>
          <p className="lp-risk-preview__desc">
            Our Travel Risk Monitor watches breaking news, severe weather, border closures,
            flight strikes, and currency volatility - all automatically cross-referenced
            against every destination in your active trip.
          </p>
          {/* This was a table of hardcoded "readings" - "EUR -0.3% today",
              "Clear skies · ¥ stable · 0 advisories" - presented under a "Live"
              badge as though it were current data for those countries. Replaced
              with a plain description of what the monitor actually watches, which
              is true whether or not anything is happening today. */}
          <ul className="lp-risk-preview__list">
            <li>Government travel advisories for every country in your plan</li>
            <li>Severe weather and seasonal disruption on your dates</li>
            <li>Strikes, border closures and currency swings worth knowing about</li>
          </ul>
          <button className="lp-btn lp-btn--cta-primary" onClick={() => navigate('/signup')}>
            See the Risk Monitor <IconArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* The testimonials section stood here: three quotes attributed to named
          people, describing trips that never happened, hardcoded as constants.
          Deleted rather than restyled. The community strip above is the proof,
          and it is made of real trips. */}

      {/*  FAQ  */}
      <LandingFAQ />

      {/*  CTA  */}
      <section className="lp-cta">
        <div className="lp-cta__content">
          <span className="lp-section-eyebrow lp-section-eyebrow--light">Your next adventure starts here</span>
          <h2 className="lp-cta__title">
            Find your travel tribe.<br />Or create your own.
          </h2>
          <p className="lp-cta__sub">
            Join Tripician free. Solo explorer, duo, or full crew - plan your next trip
            exactly the way you travel, with tools built for the way you actually move.
          </p>
          <div className="lp-cta__actions">
            <button className="lp-btn lp-btn--cta-primary" onClick={() => navigate('/signup')}>
              Start your journey <IconArrowRight size={17} />
            </button>
            <div className="lp-cta__checks">
              {['No credit card required', 'Free forever', 'Built around your vibe'].map((item, i) => (
                <span key={i}><IconCheck size={13} /> {item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/*  FOOTER  */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
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
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
              <a href="/docs">Docs</a>
            </div>
            <div className="lp-footer__col">
              <h4>Company</h4>
              <a href="/about-us">About Us</a>
              <a href="/get-help">Get Help</a>
              <a href="/contact-us">Contact Us</a>
            </div>
            <div className="lp-footer__col">
              <h4>Legal</h4>
              <a href="/privacy-policy">Privacy Policy</a>
              <a href="/terms-and-conditions">Terms & Conditions</a>
            </div>
          </div>
        </div>
        {/* Photographer attribution. Unsplash's API terms require crediting the
            photographer with a link to their profile and to Unsplash. */}
        {PHOTO_CREDITS.length > 0 && (
          <div className="lp-footer__credits">
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
            {' '}on <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>.
          </div>
        )}
        <div className="lp-footer__bottom">
          <span>© 2026 Tripician. All rights reserved.</span>
          <span>Made with ♥ for explorers</span>
        </div>
      </footer>

    </div>
  );
}
