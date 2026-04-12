import { useLayoutEffect } from 'react';
import { KalaGeometric, KalaLotus } from '../../components/DecorativeComponents/KalaDecor';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Map,
  Compass,
  DollarSign,
  Brain,
  ArrowRight,
  ChevronDown,
  MapPin,
  Globe,
  Plane,
  Users,
  Star,
  Check,
} from 'lucide-react';
import '../../assets/css/LandingPage.css';

gsap.registerPlugin(ScrollTrigger);

/* ─── STATIC DATA ────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Brain size={26} />,
    title: 'AI Trip Assistant',
    desc: 'Get personalised suggestions powered by AI. Discover hidden gems and build smarter routes automatically.',
    accent: '#007ddc',
  },
  {
    icon: <Map size={26} />,
    title: 'Interactive Maps',
    desc: 'Visualise your entire journey on a live map. Pin destinations, draw routes, and explore at a glance.',
    accent: '#008bbd',
  },
  {
    icon: <DollarSign size={26} />,
    title: 'Budget Tracker',
    desc: 'Track expenses across categories and currencies. Stay on budget without sacrificing the experience.',
    accent: '#00a8d4',
  },
  {
    icon: <Compass size={26} />,
    title: 'Day-by-Day Planner',
    desc: 'Organise every day with timed activities, notes, and flexible drag-and-drop reordering.',
    accent: '#29587a',
  },
  {
    icon: <Globe size={26} />,
    title: 'Destination Discovery',
    desc: 'Browse curated destination cards with landmark guides and up-to-date local insights.',
    accent: '#007ddc',
  },
  {
    icon: <Users size={26} />,
    title: 'Community & Sharing',
    desc: 'Share itineraries with your travel crew and let others discover your best trips.',
    accent: '#008bbd',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Create your trip',
    desc: 'Give your adventure a name, pick your destination, and set your dates. Tripician scaffolds everything instantly.',
    tag: 'Free forever',
  },
  {
    num: '02',
    title: 'Build your itinerary',
    desc: 'Add day-by-day activities, stops, and notes. Let our AI fill gaps and surface the best local experiences.',
    tag: 'AI-powered',
  },
  {
    num: '03',
    title: 'Travel & track',
    desc: 'Access your plan on any device. Log expenses, capture moments, and share your journey with the world.',
    tag: 'Cross-device',
  },
];

const SHOWCASE = [
  {
    title: 'Mediterranean Coast',
    days: '10 days',
    places: 8,
    gradient: 'linear-gradient(145deg, #005f8a 0%, #00aad4 100%)',
  },
  {
    title: 'Southeast Asia Loop',
    days: '21 days',
    places: 12,
    gradient: 'linear-gradient(145deg, #0d5c38 0%, #1ea865 100%)',
  },
  {
    title: 'Patagonia Expedition',
    days: '14 days',
    places: 6,
    gradient: 'linear-gradient(145deg, #1e2e5c 0%, #4a6bb5 100%)',
  },
  {
    title: 'Japan in Autumn',
    days: '12 days',
    places: 9,
    gradient: 'linear-gradient(145deg, #6e1428 0%, #d44460 100%)',
  },
];

const REVIEWS = [
  {
    quote:
      'Tripician made planning our honeymoon to Italy effortless. The day-by-day planner is absolutely gorgeous.',
    name: 'Sarah M.',
    place: 'Traveled to Italy',
    rating: 5,
  },
  {
    quote:
      'Finally a travel tool that gets how spontaneous trips work. The AI suggestions are consistently spot-on.',
    name: 'James L.',
    place: 'Backpacked SE Asia',
    rating: 5,
  },
  {
    quote:
      'The expense tracker saved us on our 3-week road trip. We always knew exactly where we stood financially.',
    name: 'Emma & Tom',
    place: 'Road-tripped across USA',
    rating: 5,
  },
];

const TICKER_ITEMS = [
  '✈ Paris', '🗺 Bali', '🏔 Patagonia', '🌊 Maldives', '🏛 Rome',
  '🌅 Santorini', '🌴 Phuket', '🗼 Tokyo', '🎭 Barcelona', '🌋 Iceland',
  '🏜 Sahara', '🐘 Kenya', '🌺 Hawaii', '🏯 Kyoto', '🛶 Amazon',
];

/* ─── COMPONENT ─────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const heroImageUrl = import.meta.env.VITE_LANDING_HERO_IMAGE_URL as string | undefined;
  const logoFullWhiteUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_2_URL as string | undefined;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {

      /* ── 1. HERO ENTRANCE ───────────────────────────────────── */
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

      /* Orb gentle drift */
      gsap.to('.lp-hero__orb--1', { y: -28, x: 18, repeat: -1, yoyo: true, duration: 9, ease: 'sine.inOut' });
      gsap.to('.lp-hero__orb--2', { y: 22,  x: -14, repeat: -1, yoyo: true, duration: 11, ease: 'sine.inOut', delay: 2 });
      gsap.to('.lp-hero__orb--3', { y: -18, x:  8,  repeat: -1, yoyo: true, duration: 7.5, ease: 'sine.inOut', delay: 4 });

      /* Kala lotus — entrance transition then infinite wheel roll */
      gsap.set('.lp-hero__kala-lotus', { opacity: 0, scale: 0.4, rotation: -30, transformOrigin: '50% 50%' });
      gsap.timeline({
        onComplete: () => {
          gsap.to('.lp-hero__kala-lotus', { rotation: '+=360', repeat: -1, ease: 'none', duration: 80, transformOrigin: '50% 50%' });
        }
      }).to('.lp-hero__kala-lotus', {
        opacity: 1, scale: 1, rotation: 0,
        duration: 2.8, ease: 'power3.out', delay: 0.6,
      });

      /* ── 2. NAVBAR SHRINKS ON SCROLL ────────────────────────── */
      ScrollTrigger.create({
        start: 'top -55',
        end: 99999,
        onToggle: ({ isActive }) => {
          gsap.to('.lp-nav', {
            backgroundColor: isActive ? 'rgba(17, 17, 17, 0.96)' : 'transparent',
            backdropFilter: isActive ? 'blur(22px)' : 'none',
            boxShadow: isActive ? '0 4px 40px rgba(0,0,0,0.55)' : 'none',
            duration: 0.38,
            ease: 'power2.out',
          });
        },
      });

      /* ── 3. HERO PARALLAX ───────────────────────────────────── */
      gsap.to('.lp-hero__bg', {
        yPercent: 32,
        ease: 'none',
        scrollTrigger: {
          trigger: '.lp-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      /* ── 4. STATS COUNTERS ──────────────────────────────────── */
      document.querySelectorAll<HTMLElement>('.lp-stat__number').forEach((el) => {
        const target = parseFloat(el.dataset.target ?? '0');
        const isDecimal = el.dataset.decimal === 'true';
        const suffix = el.dataset.suffix ?? '+';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            const proxy = { val: 0 };
            gsap.to(proxy, {
              val: target,
              duration: 2.2,
              ease: 'power2.out',
              onUpdate: () => {
                el.textContent =
                  (isDecimal
                    ? proxy.val.toFixed(1)
                    : Math.round(proxy.val).toLocaleString()) + suffix;
              },
            });
          },
        });
      });

      /* ── 5. FEATURES ────────────────────────────────────────── */
      gsap.from('.lp-features__header', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-features', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-feature-card', {
        y: 58, opacity: 0, duration: 0.72, stagger: 0.09,
        scrollTrigger: { trigger: '.lp-features__grid', start: 'top 78%', toggleActions: 'play none none reverse' },
      });

      /* ── 6. STEPS ───────────────────────────────────────────── */
      gsap.from('.lp-steps__header', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-steps', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-steps__line', {
        scaleY: 0, transformOrigin: 'top center', duration: 1.6, ease: 'power2.inOut',
        scrollTrigger: { trigger: '.lp-steps__list', start: 'top 78%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-step', {
        x: -52, opacity: 0, duration: 0.8, stagger: 0.26,
        scrollTrigger: { trigger: '.lp-steps__list', start: 'top 72%', toggleActions: 'play none none reverse' },
      });

      /* ── 7. SHOWCASE ────────────────────────────────────────── */
      gsap.from('.lp-showcase__header', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-showcase', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-showcase__card', {
        y: 52, opacity: 0, scale: 0.96, duration: 0.72, stagger: 0.14,
        scrollTrigger: { trigger: '.lp-showcase__grid', start: 'top 82%', toggleActions: 'play none none reverse' },
      });

      /* ── 8. SOCIAL PROOF ────────────────────────────────────── */
      gsap.from('.lp-social-proof .lp-section-title', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-social-proof', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-review-card', {
        y: 42, opacity: 0, duration: 0.65, stagger: 0.16,
        scrollTrigger: { trigger: '.lp-reviews__grid', start: 'top 82%', toggleActions: 'play none none reverse' },
      });

      /* ── 9. CTA ─────────────────────────────────────────────── */
      gsap.from('.lp-cta__content', {
        y: 62, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: '.lp-cta', start: 'top 78%', toggleActions: 'play none none reverse' },
      });
    });

    return () => ctx.revert();
  }, []);

  /* ─── JSX ──────────────────────────────────────────────────────── */
  return (
    <div className="lp-root">

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav__logo" onClick={() => navigate('/')}>
          {logoFullWhiteUrl
            ? <img src={logoFullWhiteUrl} alt="Tripician" className="lp-logo-img lp-logo-img--nav" />
            : (<><Plane size={20} className="lp-nav__logo-icon" /><span>Tripician</span></>)
          }
        </div>
        <div className="lp-nav__links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#explore">Explore</a>
        </div>
        <div className="lp-nav__actions">
          <button className="lp-btn lp-btn--ghost" onClick={() => navigate('/signin')}>Sign in</button>
          <button className="lp-btn lp-btn--primary" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="lp-hero">
      {/* Kala lotus — top-left corner watermark, slow wheel spin */}
        <div className="lp-hero__kala-lotus" style={{ position: 'absolute', top: -320, left: -300, zIndex: 1, pointerEvents: 'none' }}>
          <KalaLotus size={920} color="#FF6B8A" opacity={0.07} />
        </div>
        <div
          className="lp-hero__bg"
          style={heroImageUrl ? { backgroundImage: `url(${heroImageUrl})` } : undefined}
        />
        <div className="lp-hero__overlay" />

        <div className="lp-hero__content">
          <span className="lp-hero__eyebrow">
            <MapPin size={13} /> AI-Powered Travel Planning
          </span>

          <h1 className="lp-hero__title">
            {['Plan', 'Smarter.', 'Travel', 'Further.'].map((word, i) => (
              <span key={i} className="word">{word}</span>
            ))}
          </h1>

          <p className="lp-hero__subtitle">
            Create beautiful trip itineraries, discover hidden destinations,<br />
            and travel with complete confidence.
          </p>

          <div className="lp-hero__cta-group">
            <button className="lp-btn lp-btn--hero-primary" onClick={() => navigate('/signup')}>
              Start Planning Free <ArrowRight size={17} />
            </button>
            <button className="lp-btn lp-btn--hero-ghost" onClick={() => navigate('/signin')}>
              Sign In
            </button>
          </div>
        </div>

        <div className="lp-hero__scroll-indicator">
          <ChevronDown size={26} />
        </div>

        {/* Ambient orbs */}
        <div className="lp-hero__orb lp-hero__orb--1" />
        <div className="lp-hero__orb lp-hero__orb--2" />
        <div className="lp-hero__orb lp-hero__orb--3" />
      </section>

      {/* ── DESTINATION TICKER ────────────────────────────────── */}
      <div className="lp-ticker">
        <div className="lp-ticker__track">
          {/* Duplicate for seamless loop */}
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((dest, i) => (
            <span key={i} className="lp-ticker__item">{dest}</span>
          ))}
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section className="lp-stats">
        <div className="lp-stats__grid">
          {[
            { label: 'Trips created',     value: 1000, suffix: '+',   decimal: false },
            { label: 'Countries covered', value: 150,  suffix: '+',   decimal: false },
            { label: 'Happy travelers',   value: 500,  suffix: '+',   decimal: false },
            { label: 'Avg. rating',       value: 4.9,  suffix: '\u2605', decimal: true  },
          ].map((s, i) => (
            <div key={i} className="lp-stat">
              <div
                className="lp-stat__number"
                data-target={s.value}
                data-suffix={s.suffix}
                data-decimal={String(s.decimal)}
              >
                {s.decimal ? `0${s.suffix}` : `0${s.suffix}`}
              </div>
              <div className="lp-stat__label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section className="lp-features" id="features">
        <div className="lp-features__header">
          <span className="lp-section-eyebrow">Everything you need</span>
          <h2 className="lp-section-title">Built for every kind of traveler</h2>
          <p className="lp-section-sub">
            From weekend escapes to round-the-world adventures — Tripician adapts to your journey.
          </p>
        </div>
        <div className="lp-features__grid">
          {FEATURES.map((feat, i) => (
            <div
              key={i}
              className="lp-feature-card"
              style={{ '--accent': feat.accent } as React.CSSProperties}
            >
              <div className="lp-feature-card__icon" style={{ color: feat.accent }}>
                {feat.icon}
              </div>
              <h3 className="lp-feature-card__title">{feat.title}</h3>
              <p className="lp-feature-card__desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="lp-steps" id="how-it-works">
        <div className="lp-steps__header">
          <span className="lp-section-eyebrow">How it works</span>
          <h2 className="lp-section-title">Start your trip in 3 steps</h2>
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
            </div>
          ))}
        </div>
      </section>

      {/* ── SHOWCASE ──────────────────────────────────────────── */}
      <section className="lp-showcase" id="explore">
        <div className="lp-showcase__header">
          <span className="lp-section-eyebrow">Popular destinations</span>
          <h2 className="lp-section-title">Where will you go next?</h2>
        </div>
        <div className="lp-showcase__grid">
          {SHOWCASE.map((card, i) => (
            <div key={i} className="lp-showcase__card">
              <div className="lp-showcase__card-bg" style={{ background: card.gradient }} />
              <div className="lp-showcase__card-overlay" />
              <div className="lp-showcase__card-content">
                <div className="lp-showcase__card-meta">
                  <span>{card.days}</span>
                  <span>{card.places} places</span>
                </div>
                <h3 className="lp-showcase__card-title">{card.title}</h3>
                <button className="lp-showcase__card-btn" onClick={() => navigate('/signup')}>
                  View Trip <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────── */}
      <section className="lp-social-proof">
        <div className="lp-social-proof__inner">
          <h2 className="lp-section-title">Loved by travelers worldwide</h2>
          <div className="lp-reviews__grid">
            {REVIEWS.map((r, i) => (
              <div key={i} className="lp-review-card">
                <div className="lp-review-card__stars">
                  {Array.from({ length: r.rating }).map((_, j) => (
                    <Star key={j} size={15} fill="currentColor" />
                  ))}
                </div>
                <p className="lp-review-card__quote">"{r.quote}"</p>
                <div className="lp-review-card__author">
                  <div className="lp-review-card__avatar">{r.name.charAt(0)}</div>
                  <div>
                    <div className="lp-review-card__name">{r.name}</div>
                    <div className="lp-review-card__place">{r.place}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-cta__content">
          <span className="lp-section-eyebrow lp-section-eyebrow--light">Ready to explore?</span>
          <h2 className="lp-cta__title">
            Your next adventure<br /><em>starts here.</em>
          </h2>
          <p className="lp-cta__sub">
            Join thousands of travelers who plan smarter with Tripician.
            Free to start, powerful to grow.
          </p>
          <div className="lp-cta__actions">
            <button className="lp-btn lp-btn--cta-primary" onClick={() => navigate('/signup')}>
              Create Free Account <ArrowRight size={17} />
            </button>
            <div className="lp-cta__checks">
              {['No credit card required', 'Unlimited trips', 'Cancel anytime'].map((item, i) => (
                <span key={i}><Check size={13} /> {item}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="lp-cta__orb lp-cta__orb--1" />
        <div className="lp-cta__orb lp-cta__orb--2" />
        {/* Indian kala geometric — bottom-left */}
        <KalaGeometric size={480} color="#FF385C" opacity={0.06} style={{ position: 'absolute', bottom: -130, right: -110 }} />
        </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand">
            <div className="lp-footer__logo">
              {logoFullWhiteUrl
                ? <img src={logoFullWhiteUrl} alt="Tripician" className="lp-logo-img lp-logo-img--footer" />
                : (<><Plane size={18} /><span>Tripician</span></>)
              }
            </div>
            <p>Plan smarter. Travel further.<br />Your AI-powered journey starts here.</p>
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
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
            </div>
            <div className="lp-footer__col">
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
        <div className="lp-footer__bottom">
          <span>© 2026 Tripician. All rights reserved.</span>
          <span>Made with ♥ for explorers</span>
        </div>
      </footer>

    </div>
  );
}
