import { Fragment, useLayoutEffect, useState, useEffect, useRef, useCallback, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  IconArrowRight,
  IconCamera,
  IconCheck,
  IconChevronDown,
  IconId,
  IconLock,
  IconMessageCircleQuestion,
  IconNotebook,
  IconPlane,
  IconRosetteDiscountCheckFilled,
  IconRoute,
  IconUsersGroup,
} from '@tabler/icons-react';
import '../../assets/css/LandingPage.css';
import Seo from '../../components/Seo';
import TripicianAIOrb from '../../tripicianai/TripicianAIOrb';
import TripicianAIWordmark from '../../tripicianai/TripicianAIWordmark';
import HeroChat from './HeroChat';
import { HERO_IMAGE, HERO_VIDEO, HERO_VIDEO_CREDIT, OG_IMAGE, TICKER, PHOTO_CREDITS } from './landingImages';
import {
  AI,
  ASKS,
  BUSINESS,
  CTA,
  FAQ_HEAD,
  FAQS,
  FOOTER,
  HERO,
  LANDING_DESCRIPTION,
  LANDING_TITLE,
  LENS,
  NAV_LINKS,
  PILLARS,
  PILLARS_HEAD,
  PLANS,
  STEPS,
  STEPS_HEAD,
  STORIES,
  TRIPS,
  TRUST,
  landingJsonLd,
} from './landingContent';
import { apiServices } from '../../services/APIs/apiServices';
import { afterStoryService } from '../../afterstory/afterStoryService';
import { storyPath } from '../../afterstory/storySlug';
import { resolveStoryCover } from '../../afterstory/storyFormat';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import { postsService } from '../../posts/postsService';
import type { TravelerPost } from '../../posts/types';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { fitWidth } from '../../utils/imageThumb';
import { tripPath } from '../../utils/tripSlug';
import { tripCoverPhoto, resolveTripCover, type TripCoverSource } from '../../utils/tripCover';
// The three step photographs. Sharing onboarding's credited set rather than
// adding a parallel one, so a photographer is named in exactly one place.
import stepCredits from '../../components/Onboarding/onboardingCredits.json';

gsap.registerPlugin(ScrollTrigger);

/* ────────────────────────────────────────────────────────────────────────────
 * The front door of a travel community, so the community is the hero.
 *
 * Every word comes from landingContent.ts, which the build also writes into
 * index.html as plain HTML for crawlers that do not run JavaScript (see
 * landingStatic.ts). Change copy there, never inline here.
 *
 * Everything that claims real work is built from real data: the photographs,
 * itineraries, stories and questions are the community's own, fetched live, and
 * each of those sections renders nothing at all when there is nothing to show.
 * Anything that explains a mechanism is a small diagram made of divs, which is
 * honest because it is visibly a diagram. Nothing on this page invents a number,
 * a name or a review.
 * ──────────────────────────────────────────────────────────────────────────── */

const PILLAR_ICONS: Record<string, ReactNode> = {
  itineraries: <IconRoute size={22} stroke={1.75} />,
  stories: <IconNotebook size={22} stroke={1.75} />,
  photography: <IconCamera size={22} stroke={1.75} />,
  questions: <IconMessageCircleQuestion size={22} stroke={1.75} />,
  groups: <IconUsersGroup size={22} stroke={1.75} />,
  messages: <IconLock size={22} stroke={1.75} />,
  profile: <IconId size={22} stroke={1.75} />,
  verified: <IconRosetteDiscountCheckFilled size={22} />,
};

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

/** A community photograph: the first picture of a post, sized for a tile. */
interface LensPhoto {
  postId: string;
  url: string;
  author: string;
  place: string | null;
}

const toLensPhoto = (post: TravelerPost): LensPhoto | null => {
  const first = post.media?.[0]?.url;
  // 480px wide serves a sharp tile at two columns on a phone and four on a desktop.
  const url = fitWidth(first, 480) ?? first;
  if (!url) return null;
  return { postId: post.id, url, author: post.authorName, place: post.placeName?.trim() || null };
};

/**
 * One published story.
 *
 * Its own component because it needs its own `failed` state: a story cover is an
 * author's upload and can 404, and without this the card rendered an empty white
 * frame. `resolveStoryCover` already takes the flag and answers null, and a
 * coverless story then falls back to type alone.
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

/** A photograph that 404s takes its tile with it, rather than leaving a grey hole in the wall. */
function LensTile({ photo, onOpen }: { photo: LensPhoto; onOpen: (e: MouseEvent<HTMLAnchorElement>, href: string) => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const href = `/post/${photo.postId}`;
  const label = photo.place ? `${photo.place}, by ${photo.author}` : `By ${photo.author}`;
  return (
    <a className="lp-lens__tile" href={href} onClick={(e) => onOpen(e, href)} aria-label={`Photograph. ${label}`}>
      <img src={photo.url} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      <span className="lp-lens__cap">
        {photo.place && <em>{photo.place}</em>}
        <span>{photo.author}</span>
      </span>
    </a>
  );
}

function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="lp-faq" id="faq">
      <div className="lp-shell">
        <div className="lp-sec-head lp-faq__head">
          <span className="lp-kicker">{FAQ_HEAD.kicker}</span>
          <h2 className="lp-h2">{FAQ_HEAD.title}</h2>
        </div>
        <div className="lp-faq__list">
          {FAQS.map((faq, i) => (
            <div key={faq.q} className={`lp-faq-item${open === i ? ' is-open' : ''}`}>
              <button
                type="button"
                className="lp-faq-item__q"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
              >
                {/* An h3 inside the button would be invalid; the question is the button's text. */}
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
  const heroImageUrl = HERO_IMAGE;

  /*
   * No auth redirect here, ever. RootRedirect (App.tsx) decides what "/" shows,
   * from the same source the route guards use. A redirect from the Auth0 SDK's
   * `isAuthenticated` once caused the production back-button loop.
   */

  // One lockup for every ground: it reads on the hero photo and on the solid nav alike.
  const logoUrl = import.meta.env.VITE_TRIPICIAN as string | undefined;

  /**
   * Plain left clicks go through the router; every other click (new tab, middle
   * click) keeps the real href. Links stay <a href> so crawlers can follow them.
   */
  const go = useCallback((e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (href.startsWith('#')) return;
    e.preventDefault();
    navigate(href);
  }, [navigate]);

  const [isScrolled, setIsScrolled] = useState(false);
  const [trips, setTrips] = useState<LandingTrip[]>([]);
  const [stories, setStories] = useState<AfterStorySummaryDto[]>([]);
  const [photos, setPhotos] = useState<LensPhoto[]>([]);
  const [questions, setQuestions] = useState<TravelerPost[]>([]);

  /**
   * Published itineraries. Anonymous-safe: `/api/trips/published` is
   * [AllowAnonymous], and a failure must never break the marketing page - the
   * section simply does not render, which is why the catch is silent and the
   * initial state is empty rather than a spinner.
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

        // Second pass only for covers tripCoverPhoto could not resolve synchronously.
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
        /* no trips shown; the section unmounts itself */
      }
    })();
    return () => { active = false; };
  }, []);

  /** Published after-stories. The shape is guarded rather than trusted. */
  useEffect(() => {
    if (!FEATURE_FLAGS.afterStory) return;
    let active = true;
    afterStoryService
      .listPublished({ page: 1, pageSize: 6 })
      .then((r) => { if (active) setStories(Array.isArray(r?.items) ? r.items : []); })
      .catch(() => { if (active) setStories([]); });
    return () => { active = false; };
  }, []);

  /**
   * The community's own photographs and questions. Both reads are public (the
   * posts pages are browsable without an account) and both services answer an
   * empty list on failure, so a quiet community or a bad network simply leaves
   * the section out.
   */
  useEffect(() => {
    let active = true;
    postsService
      .feed(16, null, undefined, true)
      .then((posts) => {
        if (!active) return;
        setPhotos(posts.map(toLensPhoto).filter((p): p is LensPhoto => p !== null).slice(0, 8));
      })
      .catch(() => {});
    postsService
      .questions({ sort: 'latest', pageSize: 4 })
      .then((page) => { if (active) setQuestions(page.items.filter((q) => (q.title || q.body)?.trim())); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const showcaseTrips = trips.slice(0, 4);

  /**
   * The hero loop. Deliberately *not* rendered on first paint: the poster photo is
   * what paints and what LCP measures. It loads only when motion is welcome, the
   * viewport is wide, Save-Data is off and the connection is not 2g/3g.
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
   * A trip cover URL that 404s: drop the banner and re-resolve from the country.
   * The ref is the loop guard, one retry per card, then it settles on the blank.
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
     * Motion is opt-out at the OS level. Must SET the resting values, not
     * clearProps them: the hero pieces carry `opacity: 0` in the stylesheet while
     * they wait for GSAP, so clearing would hand them back to that rule and the
     * hero would render blank.
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

      /* Hero depth: the photo drifts slower than the scroll while the copy rises
         past it and dims. Scrubbed, so it is tied to the scroll position. */
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

      /*
       * Section entrances play ONCE. Selectors are skipped when empty: four
       * sections render nothing without data, and a ScrollTrigger built on a
       * missing element throws on refresh.
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

      revealTitle('.lp-lens__head > *', '.lp-lens');
      revealCards('.lp-lens__tile', '.lp-lens__grid', 0.06);

      revealTitle('.lp-trips__head > *', '.lp-trips');
      revealCards('.lp-tripcard', '.lp-trips__grid', 0.09);

      revealTitle('.lp-stories__head > *', '.lp-stories');
      revealCards('.lp-storycard', '.lp-stories__grid', 0.09);

      revealTitle('.lp-asks__head > *', '.lp-asks');
      revealCards('.lp-ask', '.lp-asks__list', 0.07);

      revealTitle('.lp-features__head > *', '.lp-features');
      revealCards('.lp-feature', '.lp-features__grid', 0.05);

      if (has('.lp-tripicianai__text')) {
        gsap.from('.lp-tripicianai__text > *', {
          y: 26, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1,
          scrollTrigger: { trigger: '.lp-tripicianai__text', start: 'top 80%', once: true },
        });
      }
      if (has('.lp-fig__step')) {
        // The demo "thinks": each step ticks in, in order, the way the real one does.
        gsap.from('.lp-fig__step', {
          x: -10, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.35,
          scrollTrigger: { trigger: '.lp-tripicianai__demo', start: 'top 78%', once: true },
        });
      }

      revealTitle('.lp-steps__head > *', '.lp-steps');
      revealCards('.lp-step', '.lp-steps__grid', 0.12);

      revealTitle('.lp-planstrip__head > *', '.lp-planstrip');
      revealCards('.lp-planstrip__item', '.lp-planstrip__grid', 0.07);

      if (has('.lp-biz__inner')) {
        gsap.from('.lp-biz__inner > *', {
          y: 30, opacity: 0, duration: 0.85, ease: 'power3.out', stagger: 0.1,
          scrollTrigger: { trigger: '.lp-biz', start: 'top 80%', once: true },
        });
      }

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
  }, [showcaseTrips.length, stories.length, photos.length, questions.length]);

  /*  JSX  */
  return (
    <div className="lp-root">
      <Seo
        title={LANDING_TITLE}
        description={LANDING_DESCRIPTION}
        path="/"
        image={OG_IMAGE || undefined}
        jsonLd={landingJsonLd(import.meta.env.VITE_TRIPICIAN_LOGO || OG_IMAGE || undefined)}
      />

      {/*  SKIP TO CONTENT  */}
      <a href="#lp-main-content" className="lp-skip-to-content">Skip to main content</a>

      {/*  NAVBAR  */}
      <nav className={`lp-nav${isScrolled ? ' lp-nav--scrolled' : ''}`} aria-label="Main navigation">
        <a className="lp-nav__logo" href="/" onClick={(e) => go(e, '/')} aria-label="Tripician home">
          {logoUrl ? (
            <img src={logoUrl} alt="Tripician" className="lp-logo-img lp-logo-img--nav" />
          ) : (
            <><IconPlane size={20} className="lp-nav__logo-icon" /><span>Tripician</span></>
          )}
        </a>
        <div className="lp-nav__links">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)}>{l.label}</a>
          ))}
        </div>
        <div className="lp-nav__actions">
          <a className="lp-btn lp-btn--ghost" href="/signin" onClick={(e) => go(e, '/signin')}>Sign in</a>
          <a className="lp-btn lp-btn--primary" href="/signup" onClick={(e) => go(e, '/signup')}>{HERO.secondaryCta}</a>
        </div>
      </nav>

      {/*  HERO  */}
      <section className="lp-hero" id="lp-main-content">
        {/* The poster is a real <img> rather than a CSS background: it is the LCP
            element, and only an <img> can be found early and prioritised. */}
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

        <div className="lp-hero__content">
          <span className="lp-hero__eyebrow">{HERO.eyebrow}</span>

          {/* Separate spans so GSAP can stagger them, each followed by a REAL space
              so the h1's text reads correctly to screen readers and crawlers. */}
          <h1 className="lp-hero__title">
            {HERO.title.map((word, i) => (
              <Fragment key={i}>
                <span className={`word${word.accent ? ' lp-hero__em' : ''}`}>{word.text}</span>{' '}
              </Fragment>
            ))}
          </h1>

          <p className="lp-hero__subtitle">{HERO.subtitle}</p>

          <div className="lp-hero__cta-group">
            <a className="lp-btn lp-btn--hero-primary" href="/stories" onClick={(e) => go(e, '/stories')}>
              {HERO.primaryCta} <IconArrowRight size={17} aria-hidden="true" />
            </a>
            <a className="lp-btn lp-btn--hero-link" href="/signup" onClick={(e) => go(e, '/signup')}>
              {HERO.secondaryCta} <IconArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="lp-hero__scroll-indicator" role="presentation">
          <IconChevronDown size={26} aria-hidden="true" />
        </div>
      </section>

      {/*  DESTINATION INDEX  */}
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

      {/*  TRUST STRIP - every claim here is checkable.  */}
      <section className="lp-trust" aria-label="What Tripician is">
        <div className="lp-shell lp-trust__inner">
          {TRUST.map((t) => (
            <span className="lp-trust__item" key={t}><IconCheck size={15} stroke={2} /> {t}</span>
          ))}
        </div>
      </section>

      {/*  THE LENS - the community's own photographs, or nothing.  */}
      {photos.length >= 4 && (
        <section className="lp-lens" id="photos">
          <div className="lp-shell">
            <div className="lp-sec-head lp-lens__head">
              <span className="lp-kicker">{LENS.kicker}</span>
              <h2 className="lp-h2">{LENS.title}</h2>
              <p className="lp-lede">{LENS.lede}</p>
            </div>
            <div className="lp-lens__grid">
              {photos.map((p) => <LensTile key={p.postId} photo={p} onOpen={go} />)}
            </div>
            <div className="lp-trips__more">
              <a href="/posts" onClick={(e) => go(e, '/posts')}>{LENS.more} <IconArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      )}

      {/*  ITINERARIES - real published trips, or nothing.  */}
      {showcaseTrips.length > 0 && (
        <section className="lp-trips" id="trips">
          <div className="lp-shell">
            <div className="lp-sec-head lp-trips__head">
              <span className="lp-kicker">{TRIPS.kicker}</span>
              <h2 className="lp-h2">{TRIPS.title}</h2>
              <p className="lp-lede">{TRIPS.lede}</p>
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
              <a href="/stories?kind=plans" onClick={(e) => go(e, '/stories?kind=plans')}>{TRIPS.more} <IconArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      )}

      {/*  AFTER-STORIES - real published stories, or nothing.  */}
      {stories.length > 0 && (
        <section className="lp-stories" id="stories">
          <div className="lp-shell">
            <div className="lp-sec-head lp-stories__head">
              <span className="lp-kicker">{STORIES.kicker}</span>
              <h2 className="lp-h2">{STORIES.title}</h2>
              <p className="lp-lede">{STORIES.lede}</p>
            </div>
            <div className="lp-stories__grid">
              {stories.slice(0, 3).map((story) => (
                <LpStoryCard key={story.id} story={story} />
              ))}
            </div>
            <div className="lp-trips__more">
              <a href="/stories?kind=stories" onClick={(e) => go(e, '/stories?kind=stories')}>{STORIES.more} <IconArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      )}

      {/*  ASKED AND ANSWERED - real questions, or nothing.  */}
      {questions.length > 0 && (
        <section className="lp-asks" id="questions">
          <div className="lp-shell">
            <div className="lp-sec-head lp-asks__head">
              <span className="lp-kicker">{ASKS.kicker}</span>
              <h2 className="lp-h2">{ASKS.title}</h2>
              <p className="lp-lede">{ASKS.lede}</p>
            </div>
            <ul className="lp-asks__list">
              {questions.map((q) => {
                const href = `/post/${q.id}`;
                const answers = q.replyCount === 1 ? '1 answer' : `${q.replyCount} answers`;
                return (
                  <li className="lp-ask" key={q.id}>
                    <a href={href} onClick={(e) => go(e, href)}>
                      <span className="lp-ask__q">{q.title?.trim() || q.body}</span>
                      <span className="lp-ask__meta">
                        {q.placeName && <em>{q.placeName}</em>}
                        <span>{q.replyCount > 0 ? answers : 'Waiting for its first answer'}</span>
                        {q.acceptedAnswerId ? <span className="lp-ask__ok">Answer accepted</span> : null}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
            <div className="lp-trips__more">
              <a href="/posts?kind=questions" onClick={(e) => go(e, '/posts?kind=questions')}>{ASKS.more} <IconArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      )}

      {/*  WHAT LIVES HERE  */}
      <section className="lp-features" id="features">
        <div className="lp-shell">
          <div className="lp-sec-head lp-features__head">
            <span className="lp-kicker">{PILLARS_HEAD.kicker}</span>
            <h2 className="lp-h2">{PILLARS_HEAD.title}</h2>
            <p className="lp-lede">{PILLARS_HEAD.lede}</p>
          </div>
          <div className="lp-features__grid">
            {PILLARS.map((f) => (
              <article className="lp-feature" key={f.key}>
                <span className="lp-feature__icon">{PILLAR_ICONS[f.key]}</span>
                <h3 className="lp-h4">{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/*  TRIPICIAN INTELLIGENCE  */}
      <section className="lp-tripicianai" id="tripicianai">
        <div className="lp-shell lp-tripicianai__inner">
          <div className="lp-tripicianai__text">
            {/* The lockup in place of the written kicker. */}
            <TripicianAIWordmark height={28} />
            <h2 className="lp-h2">{AI.title}</h2>
            {AI.paragraphs.map((p) => <p className="lp-lede" key={p}>{p}</p>)}
            <p className="lp-tripicianai__caveat">{AI.caveat}</p>
            {/* The guest chat is docked at the foot of this page: this hands focus to it. */}
            <button
              className="lp-btn lp-btn--outline"
              onClick={() => document.querySelector<HTMLInputElement>('.lp-herochat__input')?.focus()}
            >
              {AI.cta} <IconArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="lp-tripicianai__demo" aria-hidden="true">
            <div className="lp-tripicianai__prompt">
              <TripicianAIOrb size={20} />
              <span>{AI.demo.prompt}</span>
            </div>
            <div className="lp-fig">
              {AI.demo.steps.map((s) => (
                <div className="lp-fig__step" key={s}><IconCheck size={14} stroke={2.2} /><span>{s}</span></div>
              ))}
            </div>
            <div className="lp-fig">
              <div className="lp-fig__label">{AI.demo.routeLabel}</div>
              {AI.demo.route.map((r) => (
                <div className="lp-fig__line" key={r}><span>{r}</span><em className="ok">Checked</em></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/*  HOW IT WORKS  */}
      <section className="lp-steps" id="how-it-works">
        <div className="lp-shell">
          <div className="lp-sec-head lp-steps__head">
            <span className="lp-kicker">{STEPS_HEAD.kicker}</span>
            <h2 className="lp-h2">{STEPS_HEAD.title}</h2>
            <p className="lp-lede">{STEPS_HEAD.lede}</p>
          </div>
          {/* An ordered list, because it is one: the numbering is meaning. */}
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

      {/*  PLANS - names and purposes only. Prices live on /pricing, from the API.  */}
      <section className="lp-planstrip" id="pricing">
        <div className="lp-shell">
          <div className="lp-sec-head lp-planstrip__head">
            <span className="lp-kicker">{PLANS.kicker}</span>
            <h2 className="lp-h2">{PLANS.title}</h2>
          </div>
          <div className="lp-planstrip__grid">
            {PLANS.items.map((p) => (
              <div className={`lp-planstrip__item${p.soon ? ' lp-planstrip__item--soon' : ''}`} key={p.name}>
                <span className="lp-planstrip__tag">{p.tag}</span>
                <h3 className="lp-h4">{p.name}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-trips__more">
            <a href="/pricing" onClick={(e) => go(e, '/pricing')}>{PLANS.more} <IconArrowRight size={15} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      {/*  FOR BUSINESSES - the one dark band on the page.  */}
      <section className="lp-biz" id="businesses">
        <div className="lp-shell lp-biz__inner">
          <span className="lp-kicker lp-kicker--light">{BUSINESS.kicker}</span>
          <h2 className="lp-h2 lp-h2--light">{BUSINESS.title}</h2>
          <p className="lp-lede lp-lede--light">{BUSINESS.lede}</p>
          <a className="lp-btn lp-btn--on-dark" href="/for-operators" onClick={(e) => go(e, '/for-operators')}>
            {BUSINESS.cta} <IconArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      {/*  FAQ  */}
      <LandingFAQ />

      {/*  CTA  */}
      <section className="lp-cta">
        <div className="lp-cta__content">
          <h2 className="lp-cta__title">{CTA.title}</h2>
          <p className="lp-cta__sub">{CTA.sub}</p>
          <div className="lp-cta__actions">
            <a className="lp-btn lp-btn--cta-primary" href="/signup" onClick={(e) => go(e, '/signup')}>
              {CTA.primary} <IconArrowRight size={17} aria-hidden="true" />
            </a>
            <a className="lp-cta__alt" href="/stories" onClick={(e) => go(e, '/stories')}>{CTA.alt}</a>
          </div>
        </div>
      </section>

      {/*  FOOTER - also the page's internal-link map, so every public door is here.  */}
      <footer className="lp-footer">
        <div className="lp-shell lp-footer__inner">
          <div className="lp-footer__brand">
            <div className="lp-footer__logo">
              {logoUrl
                ? <img src={logoUrl} alt="Tripician" className="lp-logo-img lp-logo-img--footer" />
                : (<><IconPlane size={18} /><span>Tripician</span></>)}
            </div>
            <p>{FOOTER.blurb}</p>
          </div>
          <div className="lp-footer__links">
            {FOOTER.columns.map((col) => (
              <nav className="lp-footer__col" key={col.title} aria-label={col.title}>
                <h4>{col.title}</h4>
                {col.links.map((l) => (
                  <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)}>{l.label}</a>
                ))}
              </nav>
            ))}
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
          <span>&copy; {new Date().getFullYear()} Tripician. All rights reserved.</span>
          <span>{FOOTER.note}</span>
        </div>
      </footer>

      {/*
        Outside the hero, and that is load-bearing: position: fixed resolves
        against the nearest transformed ancestor, and the hero is parallaxed.
        Signed-in visitors never see it: RootRedirect shows them the board.
      */}
      <HeroChat />
    </div>
  );
}
