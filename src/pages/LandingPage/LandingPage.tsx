import { useLayoutEffect, useState, useEffect, useRef } from 'react';
import { KalaGeometric, KalaLotus } from '../../components/DecorativeComponents/KalaDecor';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { fetchUnsplashImage } from '../../services/unsplashService';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Map,
  Compass,
  Brain,
  ArrowRight,
  ChevronDown,
  Plane,
  Users,
  Star,
  Check,
  Bot,
  Shield,
  Zap,
  Sparkles,
  Download,
} from 'lucide-react';
import '../../assets/css/LandingPage.css';
import Seo, { SITE_URL } from '../../components/Seo';

gsap.registerPlugin(ScrollTrigger);

/*  STATIC DATA  */
const FEATURES = [
  {
    icon: <Sparkles size={26} />,
    title: 'Vibe Matching',
    desc: 'Every trip, group, and profile is tagged with a travel personality. Culture seekers find culture seekers. Spiritual explorers find monastery routes. You never settle.',
    accent: '#FF385C',
  },
  {
    icon: <Users size={26} />,
    title: 'Group Chat + AI Co-Planning',
    desc: 'Every trip gets a shared chat where friends, family, and Navia plan together. Type @navia to propose changes, discuss them, and apply updates to the itinerary.',
    accent: '#FF385C',
  },
  {
    icon: <Bot size={26} />,
    title: "World's First Agentic Travel AI",
    desc: 'Navia does more than answer questions. It reads your trip context, suggests edits, creates proposals, and helps your group turn chat into a living travel plan.',
    accent: '#FF385C',
  },
  {
    icon: <Shield size={26} />,
    title: 'Live Risk Monitor',
    desc: 'Real-time travel advisories, severe weather, currency shifts and breaking news auto-mapped to every destination in your active plan.',
    accent: '#e53935',
  },
  {
    icon: <Brain size={26} />,
    title: 'Context-Aware Trip Intelligence',
    desc: 'Get personalised suggestions tailored to your travel vibe, budget, dates, destinations, and group decisions.',
    accent: '#007ddc',
  },
  {
    icon: <Map size={26} />,
    title: 'Interactive Maps',
    desc: 'Visualise your entire journey on a live map. Pin destinations, draw routes, and explore at a glance ,solo or with your group.',
    accent: '#008bbd',
  },
  {
    icon: <Compass size={26} />,
    title: 'Day-by-Day Planner',
    desc: 'Organise every day with destinations, stays, activities, and notes. Optimise your route with one click ,then publish your trip so others can discover it.',
    accent: '#29587a',
  },
  {
    icon: <Zap size={26} />,
    title: 'Packing Lists',
    desc: 'Build smart packing lists directly inside your trip. Check items off as you pack, customise by destination, and never forget essentials again.',
    accent: '#7c3aed',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Set your travel vibe',
    desc: 'Define your travel personality ,culture seeker, adventure junkie, spiritual explorer, luxury traveler. Your vibe shapes every trip and person you discover.',
    tag: 'Your identity',
  },
  {
    num: '02',
    title: 'Let Navia draft the plan',
    desc: "Use the world's first Agentic Travel AI to turn one prompt into a day-by-day itinerary, route ideas, budget-aware suggestions, and editable trip proposals.",
    tag: 'Agentic AI',
  },
  {
    num: '03',
    title: 'Plan in group chat',
    desc: 'Invite your crew, message in one shared trip chat, and summon @navia whenever the group needs alternate routes, destination ideas, or changes applied to the plan.',
    tag: 'Group chat',
  },
  {
    num: '04',
    title: 'Travel with confidence',
    desc: 'Hit the road with your itinerary, packing list, and live risk monitoring at your fingertips. Solo, duo, or full crew ,everything in one place, exactly how you planned it.',
    tag: 'Real trips',
  },
];

const SHOWCASE = [
  {
    title: 'Mediterranean Coast',
    days: '10 days',
    places: 8,
    query: 'Mediterranean coast Greece',
    gradient: 'linear-gradient(145deg, #005f8a 0%, #00aad4 100%)',
  },
  {
    title: 'Southeast Asia Loop',
    days: '21 days',
    places: 12,
    query: 'Southeast Asia Bali temple',
    gradient: 'linear-gradient(145deg, #0d5c38 0%, #1ea865 100%)',
  },
  {
    title: 'Patagonia Expedition',
    days: '14 days',
    places: 6,
    query: 'Patagonia mountains landscape',
    gradient: 'linear-gradient(145deg, #1e2e5c 0%, #4a6bb5 100%)',
  },
  {
    title: 'Japan in Autumn',
    days: '12 days',
    places: 9,
    query: 'Japan autumn Kyoto',
    gradient: 'linear-gradient(145deg, #6e1428 0%, #d44460 100%)',
  },
];

const REVIEWS = [
  {
    quote:
      'I always traveled alone because nobody I knew shared my travel style. Tripician matched me with three people planning the exact same Japan trip. We went together last spring ,best decision I ever made.',
    name: 'Priya K.',
    place: 'Found her tribe · Japan 🗾',
    rating: 5,
  },
  {
    quote:
      'Five people across three countries, zero confusion, no duplicate bookings. The vibe matching meant we all had the same expectations before we even arrived. This is what group travel should feel like.',
    name: 'James L.',
    place: 'Group trip · SE Asia 🌏',
    rating: 5,
  },
  {
    quote:
      'Matched with a culture-seeker group for Istanbul. Same vibe, same pace, same priorities. Never once felt like I was compromising. Best trip I have ever taken.',
    name: 'Sofia R.',
    place: 'Culture trip · Istanbul 🕌',
    rating: 5,
  },
];

const TICKER_ITEMS = [
  '✈ Paris', '🗺 Bali', '🏔 Patagonia', '🌊 Maldives', '🏛 Rome',
  '🌅 Santorini', '🌴 Phuket', '🗼 Tokyo', '🎭 Barcelona', '🌋 Iceland',
  '🏜 Sahara', '🐘 Kenya', '🌺 Hawaii', '🏯 Kyoto', '🛶 Amazon',
];

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
        <span className="lp-agent-window__title"><Sparkles size={11} /> Navia - Agentic Travel AI</span>
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
                <span className="lp-agent-avatar lp-agent-avatar--n">N</span>
                <span>{step.text}</span>
              </div>
            )}
            {step.type === 'think' && (
              <div className="lp-agent-bubble lp-agent-bubble--think">
                <span className="lp-agent-avatar lp-agent-avatar--n">N</span>
                <span className="lp-agent-dots"><span /><span /><span /></span>
                <span style={{ opacity: .7, fontSize: 12 }}>{step.text}</span>
              </div>
            )}
            {step.type === 'proposal' && (
              <div className={`lp-agent-proposal${visible > i + 1 ? ' lp-agent-proposal--accepted' : ''}`}>
                <div className="lp-agent-proposal__row">
                  <span className="lp-agent-avatar lp-agent-avatar--n">N</span>
                  <div className="lp-agent-proposal__card">
                    <div className="lp-agent-proposal__head">
                      <Sparkles size={14} />
                      Navia Suggestion
                    </div>
                    <p>{step.text}</p>
                    <div className="lp-agent-proposal__chips">
                      {step.operations?.map((op, j) => <span key={j}>{op}</span>)}
                    </div>
                    <div className="lp-agent-proposal__actions">
                      <button type="button" className="lp-agent-proposal__accept">
                        <Check size={14} />
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
                    <Check size={13} />
                    Trip Updated
                  </div>
                  <div className="lp-agent-system__result">
                    <Check size={13} />
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
    a: "Tripician is a travel planning and community platform. You can build detailed trip itineraries, track expenses, manage packing lists, monitor travel risks, and connect with travellers who share your travel vibe. We are not a travel agency ,we don't book flights or accommodation.",
  },
  {
    q: 'Is Tripician free?',
    a: 'Yes. Tripician is completely free to use. We may introduce optional premium features in the future, but core trip planning and community features will always remain free.',
  },
  {
    q: 'What is "vibe matching"?',
    a: 'Every traveller and trip on Tripician is tagged with a travel personality ,Adventure, Culture, Luxury, Spiritual, Urban, Scenic, or Romantic. Vibe matching surfaces trips, groups, and community members whose style fits yours, so you stop scrolling and start connecting.',
  },
  {
    q: 'Can I plan a trip with friends or family?',
    a: 'Absolutely. You can collaborate on any trip ,invite co-planners, build the itinerary together, split expenses, and share notes in real time.',
  },
  {
    q: 'How does the Risk Monitor work?',
    a: "Our Risk Monitor aggregates publicly available safety and travel advisories for destination countries. This is for general awareness only ,always verify with your government's official travel advisory before making decisions.",
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
    <section style={{ background: 'var(--lp-dark)', padding: '80px 0' }}>
      <div style={{ maxWidth: 'var(--lp-max-w)', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,56,92,0.08)', border: '1px solid rgba(255,56,92,0.18)', borderRadius: 999, padding: '5px 14px', marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lp-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>FAQ</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800, color: 'var(--lp-text)', letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 14px' }}>
            Questions? We've got answers.
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--lp-text-muted)', maxWidth: 500, margin: '0 auto' }}>
            Can&apos;t find what you&apos;re looking for?{' '}
            <a href="/get-help" style={{ color: 'var(--lp-primary)', fontWeight: 600, textDecoration: 'none' }}>Visit our Help Centre →</a>
          </p>
        </div>

        {/* Accordion */}
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LP_FAQS.map((faq, i) => (
            <div
              key={i}
              style={{
                background: 'var(--lp-dark-card)',
                border: `1px solid ${open === i ? 'rgba(255,56,92,0.25)' : 'var(--lp-border)'}`,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: open === i ? '0 4px 24px rgba(255,56,92,0.08)' : '0 1px 6px rgba(0,0,0,0.04)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 22px', background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left', gap: 12,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.97rem', color: 'var(--lp-text)', lineHeight: 1.4 }}>{faq.q}</span>
                <ChevronDown
                  size={18}
                  style={{
                    flexShrink: 0, color: 'var(--lp-primary)',
                    transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s ease',
                  }}
                />
              </button>
              {open === i && (
                <div style={{ padding: '0 22px 18px', borderTop: '1px solid var(--lp-border)' }}>
                  <p style={{ margin: '14px 0 0', fontSize: '0.92rem', color: 'var(--lp-text-muted)', lineHeight: 1.8 }}>
                    {faq.a}
                  </p>
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
  const heroImageUrl = import.meta.env.VITE_LANDING_HERO_IMAGE_URL as string | undefined;

  // Redirect authenticated users ,no spinner, page renders immediately for Googlebot
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);
  const logoFullWhiteUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_2_URL as string | undefined;

  const [onlineCount, setOnlineCount] = useState(50);
  const [showcaseImages, setShowcaseImages] = useState<Record<number, string>>({});
  const deferredInstallPrompt = useRef<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  useEffect(() => {
    Promise.all(
      SHOWCASE.map(async (card, i) => ({ i, url: await fetchUnsplashImage(card.query) }))
    ).then(results => {
      const imgs: Record<number, string> = {};
      results.forEach(({ i, url }) => { if (url) imgs[i] = url; });
      setShowcaseImages(imgs);
    });
  }, []);

  // Capture PWA install prompt
  useEffect(() => {
    // Fluctuate online count between 280–490 every 4–8s
    const tick = () => {
      setOnlineCount(prev => {
        const delta = Math.floor(Math.random() * 15) - 7;
        const next = prev + delta;
        return Math.min(490, Math.max(280, next));
      });
    };
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { timer = setTimeout(() => { tick(); schedule(); }, 4000 + Math.random() * 4000); };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredInstallPrompt.current = e as Event & { prompt: () => Promise<void> };
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt.current) return;
    await deferredInstallPrompt.current.prompt();
    deferredInstallPrompt.current = null;
    setShowInstallBtn(false);
  };

  useLayoutEffect(() => {
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

      /* Orb gentle drift */
      gsap.to('.lp-hero__orb--1', { y: -28, x: 18, repeat: -1, yoyo: true, duration: 9, ease: 'sine.inOut' });
      gsap.to('.lp-hero__orb--2', { y: 22,  x: -14, repeat: -1, yoyo: true, duration: 11, ease: 'sine.inOut', delay: 2 });
      gsap.to('.lp-hero__orb--3', { y: -18, x:  8,  repeat: -1, yoyo: true, duration: 7.5, ease: 'sine.inOut', delay: 4 });

      /* Kala lotus ,entrance transition then infinite wheel roll */
      gsap.set('.lp-hero__kala-lotus', { opacity: 0, scale: 0.4, rotation: -30, transformOrigin: '50% 50%' });
      gsap.timeline({
        onComplete: () => {
          gsap.to('.lp-hero__kala-lotus', { rotation: '+=360', repeat: -1, ease: 'none', duration: 80, transformOrigin: '50% 50%' });
        }
      }).to('.lp-hero__kala-lotus', {
        opacity: 1, scale: 1, rotation: 0,
        duration: 2.8, ease: 'power3.out', delay: 0.6,
      });

      /*  2. NAVBAR SHRINKS ON SCROLL  */
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

      /*  3. HERO PARALLAX  */
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

      /*  4. STATS COUNTERS  */
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

      /*  5. FEATURES  */
      gsap.from('.lp-features__header', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-features', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-feature-card', {
        y: 58, opacity: 0, duration: 0.72, stagger: 0.09,
        scrollTrigger: { trigger: '.lp-features__grid', start: 'top 78%', toggleActions: 'play none none reverse' },
      });

      /*  6. STEPS  */
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

      /*  7. SHOWCASE  */
      gsap.from('.lp-showcase__header', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-showcase', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-showcase__card', {
        y: 52, opacity: 0, scale: 0.96, duration: 0.72, stagger: 0.14,
        scrollTrigger: { trigger: '.lp-showcase__grid', start: 'top 82%', toggleActions: 'play none none reverse' },
      });

      /*  8. SOCIAL PROOF  */
      gsap.from('.lp-social-proof .lp-section-title', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-social-proof', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-review-card', {
        y: 42, opacity: 0, duration: 0.65, stagger: 0.16,
        scrollTrigger: { trigger: '.lp-reviews__grid', start: 'top 82%', toggleActions: 'play none none reverse' },
      });

      /*  9. CTA  */
      gsap.from('.lp-cta__content', {
        y: 62, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: '.lp-cta', start: 'top 78%', toggleActions: 'play none none reverse' },
      });

      /*  New section animations  */
      gsap.from('.lp-ai-agent__text > *', {
        y: 40, opacity: 0, duration: 0.75, stagger: 0.12,
        scrollTrigger: { trigger: '.lp-ai-agent__text', start: 'top 80%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-agent-window', {
        y: 55, opacity: 0, scale: 0.97, duration: 0.85, ease: 'power3.out',
        scrollTrigger: { trigger: '.lp-agent-window', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-bento__header', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-bento', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-bento-card', {
        y: 50, opacity: 0, scale: 0.95, duration: 0.68, stagger: 0.09,
        scrollTrigger: { trigger: '.lp-bento__grid', start: 'top 80%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-risk-preview__card', {
        y: 60, opacity: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: '.lp-risk-preview', start: 'top 80%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-risk-preview__kala', {
        scale: 0.85, opacity: 0, rotation: -15, duration: 1.4, ease: 'power2.out',
        scrollTrigger: { trigger: '.lp-risk-preview', start: 'top 80%', toggleActions: 'play none none reverse' },
      });
    });

    return () => ctx.revert();
  }, []);

  /*  JSX  */
  return (
    <div className="lp-root">
      <Seo
        title="Tripician ,AI-Powered Travel Planner & Trip Builder"
        description="Plan your perfect trip with Tripician. AI itineraries, collaborative planning, group budgets, travel risk monitoring, and a global community of travelers."
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Tripician',
            url: SITE_URL,
            logo: `${SITE_URL}/og-cover.jpg`,
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
      <nav className="lp-nav" aria-label="Main navigation">
        <div className="lp-nav__logo" onClick={() => navigate('/')}>
          {logoFullWhiteUrl
            ? <img src={logoFullWhiteUrl} alt="Tripician" className="lp-logo-img lp-logo-img--nav" />
            : (<><Plane size={20} className="lp-nav__logo-icon" /><span>Tripician</span></>)
          }
        </div>
        <div className="lp-nav__links">
          <a href="#features">Features</a>
          <a href="#ai-agent">AI Agent</a>
          <a href="/discover">Discover</a>
          <a href="#how-it-works">How it works</a>
        </div>
        <div className="lp-nav__actions">
          <button className="lp-btn lp-btn--ghost" onClick={() => navigate('/signin')}>Sign in</button>
          <button className="lp-btn lp-btn--primary" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </nav>

      {/*  HERO  */}
      <section className="lp-hero" id="lp-main-content">
      {/* Kala lotus ,top-left corner watermark, slow wheel spin */}
        <div className="lp-hero__kala-lotus" style={{ position: 'absolute', top: -320, left: -300, zIndex: 1, pointerEvents: 'none' }}>
          <KalaLotus size={920} color="#FF6B8A" opacity={0.07} />
        </div>
        <div
          className="lp-hero__bg"
          style={heroImageUrl ? { backgroundImage: `url(${heroImageUrl})` } : undefined}
        />
        <div className="lp-hero__overlay" />

        <div className="lp-hero__content lp-hero__content--split">
          {/*  LEFT: copy + vibe tags + CTAs  */}
          <div className="lp-hero__left">
            <span className="lp-hero__eyebrow">
              <span className="lp-hero__eyebrow-dot" aria-hidden="true" />
              <Bot size={13} aria-hidden="true" /> WORLD'S FIRST AGENTIC TRAVEL AI
            </span>

            <h1 className="lp-hero__title">
              {['Great trips', 'are planned', 'together.'].map((word, i) => (
                <span key={i} className="word">{word}</span>
              ))}
              <em className="word lp-hero__em">Not in 100 chats.</em>
            </h1>

            <p className="lp-hero__subtitle">
              Collaborate with your crew and Navia AI in one place.
            </p>

            

            <div className="lp-hero__cta-group">
              <button className="lp-btn lp-btn--hero-primary" onClick={() => navigate('/signup')} aria-label="Start your journey ,create an account">
                Start Your Journey <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button className="lp-btn lp-btn--hero-ghost lp-btn--hide-mobile" onClick={() => navigate('/signin')} aria-label="Welcome back ,sign in">
                Welcome back
              </button>
              {showInstallBtn && (
                <button className="lp-btn lp-btn--hero-install" onClick={handleInstallApp} aria-label="Add Tripician to Home Screen">
                  <Download size={15} aria-hidden="true" /> Add to Home Screen
                </button>
              )}
            </div>
          </div>

          {/*  RIGHT: live stats card  */}
          <div className="lp-hero__right" aria-hidden="true">
            <div className="lp-hero__stats-card">
              {/* Live badge */}
              <div className="lp-hero__stats-header">
                <span className="lp-hero__stats-live-dot" />
                <span className="lp-hero__stats-live-label">Live activity</span>
              </div>

              {/* Three metric tiles */}
              <div className="lp-hero__stats-grid">
                <div className="lp-hero__stats-metric">
                  <span className="lp-hero__stats-num">{onlineCount}</span>
                  <span className="lp-hero__stats-lbl">online now</span>
                </div>
                <div className="lp-hero__stats-metric">
                  <span className="lp-hero__stats-num">100+</span>
                  <span className="lp-hero__stats-lbl">trips this week</span>
                </div>
                <div className="lp-hero__stats-metric">
                  <span className="lp-hero__stats-num">50+</span>
                  <span className="lp-hero__stats-lbl">countries</span>
                </div>
              </div>

              {/* Top destination */}
              <div className="lp-hero__stats-item" style={{ marginBottom: 12 }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: '0.04em' }}>Top destination</span>
                <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600, marginLeft: 'auto' }}>Bali, Indonesia</span>
              </div>

              <div className="lp-hero__stats-divider" />
              <div className="lp-hero__avatar-row">
                <div className="lp-hero__avatar-stack">
                  {['M', 'A', 'S', 'J', 'P', 'R', 'K', 'L'].map((initial, i) => (
                    <div key={i} className={`lp-hero__avatar lp-hero__avatar--${i + 1}`}>{initial}</div>
                  ))}
                </div>
                <span className="lp-hero__avatar-caption">Maya, Arjun + 8 others joined this week</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-hero__scroll-indicator" role="presentation">
          <ChevronDown size={26} aria-hidden="true" />
        </div>

        {/* Ambient orbs */}
        <div className="lp-hero__orb lp-hero__orb--1" aria-hidden="true" />
        <div className="lp-hero__orb lp-hero__orb--2" aria-hidden="true" />
        <div className="lp-hero__orb lp-hero__orb--3" aria-hidden="true" />
      </section>

      {/*  DESTINATION TICKER  */}
      <div className="lp-ticker" aria-hidden="true">
        <div className="lp-ticker__track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((dest, i) => (
            <span key={i} className="lp-ticker__item">{dest}</span>
          ))}
        </div>
      </div>

      {/*  SOCIAL PROOF TRUST BAR  */}
      <section className="lp-trust-bar" aria-label="Community trust signals">
        <div className="lp-trust-bar__inner">
          <div className="lp-trust-bar__item">
            <div className="lp-trust-bar__avatars" aria-hidden="true">
              {['P', 'J', 'S', 'M', 'R', 'L', 'K', 'D'].map((initial, i) => (
                <div key={i} className="lp-trust-bar__avatar">{initial}</div>
              ))}
            </div>
            <span>Joined by <strong>500+</strong> travelers from 50+ countries</span>
          </div>
          <div className="lp-trust-bar__item">
            <div className="lp-trust-bar__stars" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="currentColor" aria-hidden="true" />)}
            </div>
            <span>"Best travel community I've found" ,rated <strong>4.9/5</strong></span>
          </div>
          <div className="lp-trust-bar__item">
            <Shield size={18} className="lp-trust-bar__shield" aria-hidden="true" />
            <span>Verified profiles · Safe messaging · <strong>24/7 support</strong></span>
          </div>
        </div>
      </section>

      {/*  AGENTIC AI DEMO  */}
      <section className="lp-ai-agent" id="ai-agent">
        <div className="lp-ai-agent__inner">
          <div className="lp-ai-agent__text">
            <span className="lp-section-eyebrow">World's first Agentic Travel AI</span>
            <h2 className="lp-section-title">
              Meet Navia,<br />your <span className="lp-ai-agent__title-highlight">AI trip agent</span> in group chat
            </h2>
            <p className="lp-ai-agent__desc">
              Most travel AI gives you a list of suggestions. Navia <em>acts inside your planner</em> - joining the group chat, reading trip context, proposing itinerary changes, and helping your crew make decisions together.
            </p>
            <ul className="lp-ai-agent__bullets">
              <li><Bot size={15} /> Summon @navia directly in trip group chat</li>
              <li><Users size={15} /> Turns crew preferences into shared trip proposals</li>
              <li><Shield size={15} /> Integrated live risk &amp; weather monitoring</li>
              <li><Zap size={15} /> Applies accepted changes to the live itinerary</li>
            </ul>
            <button className="lp-btn lp-btn--hero-primary" onClick={() => navigate('/signup')}>
              Try Navia for Free <ArrowRight size={16} />
            </button>
          </div>
          <div className="lp-ai-agent__widget">
            <AgentDemoWidget />
          </div>
        </div>
      </section>

      {/*  STATS  */}
      <section className="lp-stats">
        <div className="lp-stats__grid">
          {[
            { label: 'Trips created',     value: 200,  suffix: '+',   decimal: false },
            { label: 'Countries covered', value: 50,   suffix: '+',   decimal: false },
            { label: 'Happy travelers',   value: 300, suffix: '+',   decimal: false },
            { label: 'Avg. rating',       value: 4.8,  suffix: '\u2605', decimal: true  },
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

      {/*  FEATURES  */}
      <section className="lp-features" id="features">
        <div className="lp-features__header">
          <span className="lp-section-eyebrow">Everything you need</span>
          <h2 className="lp-section-title">Built around your travel personality</h2>
          <p className="lp-section-sub">
            From solo explorers to group adventures ,every feature is designed around who you are as a traveler, not just where you're going.
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

      {/*  WHY DIFFERENT BENTO  */}
      <section className="lp-bento" id="why-different">
        <div className="lp-bento__header">
          <span className="lp-section-eyebrow">What makes us different</span>
          <h2 className="lp-section-title">Features no other<br />travel platform has</h2>
          <p className="lp-section-sub">We built the capabilities that were missing from every tool we tried.</p>
        </div>
        <div className="lp-bento__grid">
          {/* Risk - dark navy, span 6 */}
          <div className="lp-bento-card lp-bento-card--risk">
            {/* Corner glow blob */}
            <span className="lp-bento-risk__glow" aria-hidden="true" />
            {/* Header row */}
            <div className="lp-bento-risk__header">
              <span className="lp-bento-card__tag">
                <span className="lp-bento-risk__pulse" />
                Exclusive
              </span>
              <span className="lp-bento-risk__live">
                <span className="lp-bento-risk__live-dot" />
                LIVE
              </span>
            </div>
            {/* Icon + Title */}
            <div className="lp-bento-risk__title-row">
              <span className="lp-bento-risk__icon-wrap">
                <Shield size={20} />
              </span>
              <h3>Live Travel Risk Monitor</h3>
            </div>
            <p>Breaking news, typhoons, travel bans, strikes &amp; currency shifts {"\u2014"} auto-cross-referenced with every destination in your plan.</p>
            {/* Country rows */}
            <div className="lp-bento-risk-table">
              <div className="lp-bento-risk-row-mini">
                <span className="lp-risk-flag">{String.fromCodePoint(0x1F1EF,0x1F1F5)}</span>
                <span className="lp-risk-name">Japan</span>
                <div className="lp-risk-bar-wrap"><div className="lp-risk-bar" style={{ width: "22%", background: "#22c55e" }} /></div>
                <span className="lp-risk-badge" style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.3)" }}>Low Risk</span>
              </div>
              <div className="lp-bento-risk-row-mini">
                <span className="lp-risk-flag">{String.fromCodePoint(0x1F1EB,0x1F1F7)}</span>
                <span className="lp-risk-name">France</span>
                <div className="lp-risk-bar-wrap"><div className="lp-risk-bar" style={{ width: "54%", background: "#f59e0b" }} /></div>
                <span className="lp-risk-badge" style={{ color: "#f59e0b", borderColor: "rgba(245,158,11,0.3)" }}>Watch</span>
              </div>
              <div className="lp-bento-risk-row-mini">
                <span className="lp-risk-flag">{String.fromCodePoint(0x1F1F9,0x1F1ED)}</span>
                <span className="lp-risk-name">Thailand</span>
                <div className="lp-risk-bar-wrap"><div className="lp-risk-bar" style={{ width: "78%", background: "#ef4444" }} /></div>
                <span className="lp-risk-badge" style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>Advisory</span>
              </div>
            </div>
            {/* Footer */}
            <div className="lp-bento-risk__footer">
              <span>35 destinations monitored</span>
              <span>Updated just now</span>
            </div>
            <button className="lp-bento-risk__cta" onClick={() => navigate('/risk-monitor')}>
              Check Destinations {"\u2192"}
            </button>
          </div>
          {/* Agent - violet, span 3 */}
          <div className="lp-bento-card lp-bento-card--agent">
            <span className="lp-bento-card__tag">World First</span>
            <h3>Agentic AI + Group Chat</h3>
            <p>Navia joins the trip conversation, understands each traveler, proposes itinerary edits, and applies approved changes to the shared plan.</p>
            <div className="lp-bento-agent-preview">
              <div className="lp-bento-agent-msg lp-bento-agent-msg--member">Maya: less walking on Day 4?</div>
              <div className="lp-bento-agent-msg lp-bento-agent-msg--user">@navia adjust Fuji day for the group</div>
              <div className="lp-bento-agent-msg lp-bento-agent-msg--ai">Proposal ready: safer route + slower pace</div>
            </div>
            <span className="lp-bento-card__deco-icon" aria-hidden="true"><Bot size={100} /></span>
          </div>
          {/* Vibe Matching - blue/accent, span 3 */}
          <div className="lp-bento-card lp-bento-card--collab">
            <span className="lp-bento-card__tag" style={{ background: 'rgba(255,56,92,0.18)', color: '#FF385C', borderColor: 'rgba(255,56,92,0.35)' }}>Signature Feature</span>
            <h3>Vibe Matching</h3>
            <p>Every plan, group, and profile is tagged with a travel personality. Culture seekers find culture seekers ,you never compromise your experience again.</p>
            <div className="lp-bento-collab-row">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, padding: '4px 11px', borderRadius: 20, background: '#FF385C', color: '#fff', fontWeight: 700 }}>🎭 Culture</span>
                <span style={{ fontSize: 11, padding: '4px 11px', borderRadius: 20, background: '#8B5CF6', color: '#fff', fontWeight: 700 }}>🧘 Spiritual</span>
                <span style={{ fontSize: 11, padding: '4px 11px', borderRadius: 20, background: '#10B981', color: '#fff', fontWeight: 700 }}>🏔️ Adventure</span>
              </div>
            </div>
            <span className="lp-bento-card__deco-icon" aria-hidden="true"><Sparkles size={100} /></span>
          </div>
          {/** Removed: Draw on Live Maps & Visual Trip Passport (feature retired) */}
        </div>
      </section>

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
            </div>
          ))}
        </div>
      </section>

      {/*  SHOWCASE  */}
      <section className="lp-showcase" id="explore">
        <div className="lp-showcase__header">
          <span className="lp-section-eyebrow">Popular destinations</span>
          <h2 className="lp-section-title">Where will you go next?</h2>
        </div>
        <div className="lp-showcase__grid">
          {SHOWCASE.map((card, i) => (
            <div key={i} className="lp-showcase__card">
              {showcaseImages[i]
                ? <img src={showcaseImages[i]} alt={card.title} className="lp-showcase__card-bg" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                : <div className="lp-showcase__card-bg" style={{ background: card.gradient }} />
              }
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
      {/*  RISK MONITOR TEASER  */}
      <section className="lp-risk-preview">
        <div className="lp-risk-preview__card">
          <div className="lp-risk-preview__live">
            <span className="lp-live-pulse" />
            LIVE INTELLIGENCE
          </div>
          <h2 className="lp-risk-preview__title">
            Know before you go.<br /><em>Know while you’re there.</em>
          </h2>
          <p className="lp-risk-preview__desc">
            Our Travel Risk Monitor watches breaking news, severe weather, border closures,
            flight strikes, and currency volatility ,all automatically cross-referenced
            against every destination in your active trip.
          </p>
          <div className="lp-risk-preview__rows">
            {[
              { flag: '🇯🇵', name: 'Japan',    status: 'Low Risk',  statusColor: '#22c55e', detail: '☀️ Clear skies · ¥ stable · 0 advisories' },
              { flag: '🇫🇷', name: 'France',   status: 'Watch',     statusColor: '#f59e0b', detail: '🚇 Transport strike · EUR −0.3% today' },
              { flag: '🇹🇭', name: 'Thailand', status: 'Advisory',  statusColor: '#ef4444', detail: '🌧️ Monsoon season · Active travel advisory' },
            ].map((r, i) => (
              <div key={i} className="lp-risk-row">
                <span className="lp-risk-row__flag">{r.flag}</span>
                <span className="lp-risk-row__name">{r.name}</span>
                <span className="lp-risk-row__status" style={{ color: r.statusColor }}>{r.status}</span>
                <span className="lp-risk-row__detail">{r.detail}</span>
              </div>
            ))}
          </div>
          <button className="lp-btn lp-btn--cta-primary" onClick={() => navigate('/signup')}>
            Start Risk-Free Planning <ArrowRight size={16} />
          </button>
        </div>
        <div className="lp-risk-preview__kala" aria-hidden="true">
          <KalaGeometric size={560} color="#FF385C" opacity={0.07} />
        </div>
      </section>
      {/*  SOCIAL PROOF  */}
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

      {/*  CTA  */}
      <section className="lp-cta">
        <div className="lp-cta__content">
          <span className="lp-section-eyebrow lp-section-eyebrow--light">Your next adventure starts here</span>
          <h2 className="lp-cta__title">
            Find your travel tribe.<br /><em>Or create your own.</em>
          </h2>
          <p className="lp-cta__sub">
            Join Tripician free. Solo explorer, duo, or full crew ,plan your next trip
            exactly the way you travel, with tools built for the way you actually move.
          </p>
          <div className="lp-cta__actions">
            <button className="lp-btn lp-btn--cta-primary" onClick={() => navigate('/signup')}>
              Start your journey <ArrowRight size={17} />
            </button>
            <div className="lp-cta__checks">
              {['No credit card required', 'Free forever', 'Built around your vibe'].map((item, i) => (
                <span key={i}><Check size={13} /> {item}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="lp-cta__orb lp-cta__orb--1" />
        <div className="lp-cta__orb lp-cta__orb--2" />
        {/* Indian kala geometric ,bottom-left */}
        <KalaGeometric size={480} color="#FF385C" opacity={0.06} style={{ position: 'absolute', bottom: -130, right: -110 }} />
        </section>

      {/*  FAQ  */}
      <LandingFAQ />

      {/*  FOOTER  */}

      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand">
            <div className="lp-footer__logo">
              {logoFullWhiteUrl
                ? <img src={logoFullWhiteUrl} alt="Tripician" className="lp-logo-img lp-logo-img--footer" />
                : (<><Plane size={18} /><span>Tripician</span></>)}
            </div>
            <p>Find your tribe. Travel your way.<br />The community no other platform can build.</p>
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
        <div className="lp-footer__bottom">
          <span>© 2026 Tripician. All rights reserved.</span>
          <span>Made with ♥ for explorers</span>
        </div>
      </footer>

    </div>
  );
}
