import { useLayoutEffect, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { fetchUnsplashImage } from '../../services/unsplashService';
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
  IconDownload,
} from '@tabler/icons-react';
import '../../assets/css/LandingPage.css';
import Seo, { SITE_URL } from '../../components/Seo';
import NaviaOrb from '../../navia/NaviaOrb';

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
    title: 'Group Chat + AI Co-Planning',
    desc: 'Every trip gets a shared chat where friends, family, and Navia plan together. Type @navia to propose changes, discuss them, and apply updates to the itinerary.',
  },
  {
    icon: <NaviaOrb size={24} />,
    title: "World's First Agentic Travel AI",
    desc: 'Give Navia a destination and it drafts the whole trip - route, stops, spots, and local food. Then it stays in the room: reading context, proposing edits, and applying what your group approves.',
  },
  {
    icon: <IconShield size={24} stroke={1.75} />,
    title: 'Live Risk Monitor',
    desc: 'Real-time travel advisories, severe weather, currency shifts and breaking news auto-mapped to every destination in your active plan.',
  },
  {
    icon: <IconBrain size={24} stroke={1.75} />,
    title: 'AI Plan Review',
    desc: 'Before you fly, Navia reviews your plan like a seasoned tour designer - a readiness score, overpacked days, routing detours, and the quick wins that fix them.',
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

const STEPS = [
  {
    num: '01',
    title: 'Set your travel vibe',
    desc: 'Define your travel personality - culture seeker, adventure junkie, spiritual explorer, luxury traveler. Your vibe shapes every trip and person you discover.',
    tag: 'Your identity',
  },
  {
    num: '02',
    title: 'Let Navia draft the plan',
    desc: 'Name a destination and the world\'s first Agentic Travel AI drafts the rest - a day-by-day route, must-see spots, local food, and notes - ready for you to make your own.',
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
    desc: "Run Navia's plan review for a final readiness score, then hit the road with your itinerary, shared budget, packing list, and live risk monitoring in your pocket.",
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
      'I always traveled alone because nobody I knew shared my travel style. Tripician matched me with three people planning the exact same Japan trip. We went together last spring - best decision I ever made.',
    name: 'Priya K.',
    place: 'Found her tribe · Japan',
  },
  {
    quote:
      'Five people across three countries, zero confusion, no duplicate bookings. The vibe matching meant we all had the same expectations before we even arrived. This is what group travel should feel like.',
    name: 'James L.',
    place: 'Group trip · Southeast Asia',
  },
  {
    quote:
      'Matched with a culture-seeker group for Istanbul. Same vibe, same pace, same priorities. Never once felt like I was compromising. Best trip I have ever taken.',
    name: 'Sofia R.',
    place: 'Culture trip · Istanbul',
  },
];

const TICKER_ITEMS = [
  'Paris', 'Bali', 'Patagonia', 'Maldives', 'Rome',
  'Santorini', 'Phuket', 'Tokyo', 'Barcelona', 'Iceland',
  'Sahara', 'Kenya', 'Hawaii', 'Kyoto', 'Amazon',
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
        <span className="lp-agent-window__title"><NaviaOrb size={12} /> Navia - Agentic Travel AI</span>
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
    a: "Tripician is a global community for travellers, built around Navia, the world's first agentic travel AI. Find your travel tribe, plan with your crew in a shared trip chat, build detailed itineraries - or let Navia draft and review them - track group expenses, manage packing lists, monitor travel risks, and connect with travellers who share your travel vibe. We are not a travel agency - we don't book flights or accommodation.",
  },
  {
    q: 'Is Tripician free?',
    a: 'Yes - planning, community, and collaboration are free. Navia AI runs on included credits: every traveler starts with 300 personal credits and each trip gets its own shared 300-credit wallet, enough for roughly a month of regular AI use. Top-up options are on the way, but the core planner will always stay free.',
  },
  {
    q: 'What can Navia AI actually do?',
    a: 'Navia is an agentic travel AI, not a chatbot. It drafts complete itineraries from a single destination, plans individual stops with spots and local food, joins your trip group chat where @navia turns requests into proposals your crew can accept or dismiss, writes your trip description, and reviews your finished plan with a readiness score, issues, and quick wins.',
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
  const heroImageUrl = import.meta.env.VITE_LANDING_HERO_IMAGE_URL as string | undefined;

  // Redirect authenticated users - no spinner, page renders immediately for Googlebot
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const logoFullWhiteUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_WHITE_2_URL as string | undefined;
  const logoFullBlackUrl = import.meta.env.VITE_TRIPICIAN_LOGO_FULL_BLACK_2_URL as string | undefined;

  const [showcaseImages, setShowcaseImages] = useState<Record<number, string>>({});
  const [isScrolled, setIsScrolled] = useState(false);
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

  // Nav goes solid once the hero photo scrolls behind it
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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

      /*  2. STATS COUNTERS  */
      document.querySelectorAll<HTMLElement>('.lp-stat__number').forEach((el) => {
        const target = parseFloat(el.dataset.target ?? '0');
        const suffix = el.dataset.suffix ?? '+';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            const proxy = { val: 0 };
            gsap.to(proxy, {
              val: target,
              duration: 1.8,
              ease: 'power2.out',
              onUpdate: () => { el.textContent = Math.round(proxy.val).toLocaleString() + suffix; },
            });
          },
        });
      });

      /*  3. PROBLEM  */
      gsap.from('.lp-problem__header', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-problem', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-problem-card', {
        y: 46, opacity: 0, duration: 0.65, stagger: 0.12,
        scrollTrigger: { trigger: '.lp-problem__grid', start: 'top 80%', toggleActions: 'play none none reverse' },
      });

      /*  4. FEATURES  */
      gsap.from('.lp-features__header', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-features', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-feature-card', {
        y: 58, opacity: 0, duration: 0.72, stagger: 0.09,
        scrollTrigger: { trigger: '.lp-features__grid', start: 'top 78%', toggleActions: 'play none none reverse' },
      });

      /*  5. STEPS  */
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

      /*  6. SHOWCASE  */
      gsap.from('.lp-showcase__header', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-showcase', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-showcase__card', {
        y: 52, opacity: 0, scale: 0.96, duration: 0.72, stagger: 0.14,
        scrollTrigger: { trigger: '.lp-showcase__grid', start: 'top 82%', toggleActions: 'play none none reverse' },
      });

      /*  7. SOCIAL PROOF  */
      gsap.from('.lp-social-proof .lp-section-title', {
        y: 42, opacity: 0, duration: 0.8,
        scrollTrigger: { trigger: '.lp-social-proof', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-review-card', {
        y: 42, opacity: 0, duration: 0.65, stagger: 0.16,
        scrollTrigger: { trigger: '.lp-reviews__grid', start: 'top 82%', toggleActions: 'play none none reverse' },
      });

      /*  8. CTA  */
      gsap.from('.lp-cta__content', {
        y: 62, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: '.lp-cta', start: 'top 78%', toggleActions: 'play none none reverse' },
      });

      /*  9. AI agent + bento + risk preview  */
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
        y: 50, opacity: 0, scale: 0.97, duration: 0.68, stagger: 0.09,
        scrollTrigger: { trigger: '.lp-bento__grid', start: 'top 80%', toggleActions: 'play none none reverse' },
      });
      gsap.from('.lp-risk-preview__card', {
        y: 60, opacity: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: '.lp-risk-preview', start: 'top 80%', toggleActions: 'play none none reverse' },
      });
    });

    return () => ctx.revert();
  }, []);

  /*  JSX  */
  return (
    <div className="lp-root">
      <Seo
        title="Tripician, A Global Travel Community & AI Trip Planner"
        description="Join a global community of travellers and plan trips together with Navia, the world's first agentic travel AI. Vibe matching, group trip chat, split expenses, and live risk monitoring - free forever."
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
        <div
          className={`lp-hero__bg${!heroImageUrl ? ' lp-hero__bg--fallback' : ''}`}
          style={heroImageUrl ? ({ '--lp-hero-photo': `url(${heroImageUrl})` } as React.CSSProperties) : undefined}
        />

        <div className="lp-hero__content">
          <span className="lp-hero__eyebrow">            
            <NaviaOrb size={13} /> WORLD'S FIRST AGENTIC TRAVEL AI
          </span>

          <h1 className="lp-hero__title">
            {['Every','Journey','Expands'].map((word, i) => (
              <span key={i} className="word">{word}</span>
            ))}
            <span className="word lp-hero__em">Your World.</span>
          </h1>

          <p className="lp-hero__subtitle">
            Tripician is where tomorrow's adventures are written today.
          </p>

          <div className="lp-hero__cta-group">
            <button className="lp-btn lp-btn--hero-primary" onClick={() => navigate('/signup')} aria-label="Start free - create an account">
              Join Tripician <IconArrowRight size={17} aria-hidden="true" />
            </button>
            <button className="lp-btn lp-btn--hero-link lp-btn--hide-mobile" onClick={() => navigate('/discover')} aria-label="Explore real trips from the community">
              Get Inspired <IconArrowRight size={16} aria-hidden="true" />
            </button>
            {showInstallBtn && (
              <button className="lp-btn lp-btn--hero-install" onClick={handleInstallApp} aria-label="Add Tripician to Home Screen">
                <IconDownload size={15} aria-hidden="true" /> Add to Home Screen
              </button>
            )}
          </div>
        </div>

        <div className="lp-hero__scroll-indicator" role="presentation">
          <IconChevronDown size={26} aria-hidden="true" />
        </div>
      </section>

      {/*  DESTINATION TICKER  */}
      <div className="lp-ticker" aria-hidden="true">
        <div className="lp-ticker__track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((dest, i) => (
            <span key={i} className="lp-ticker__item">{dest}</span>
          ))}
        </div>
      </div>

      {/*  TRUST STRIP  */}
      <section className="lp-trust-bar" aria-label="Why travelers choose Tripician">
        <div className="lp-trust-bar__inner">
          <span className="lp-trust-bar__item"><IconCheck size={16} stroke={2} /> <strong>Free forever</strong> - no credit card required</span>
          <span className="lp-trust-bar__item"><IconUsers size={16} stroke={2} /> Real itineraries from real travelers</span>
          <span className="lp-trust-bar__item"><IconMap size={16} stroke={2} /> <strong>50+ countries</strong> planned so far</span>
        </div>
      </section>

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
          Tripician replaces all of it in <strong>one shared plan</strong>, an AI co-planner that actually drafts it, and a community that already travels your way.
        </p>
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
              <li><NaviaOrb size={15} /> Summon @navia directly in trip group chat</li>
              <li><IconUsers size={15} /> Turns crew preferences into shared trip proposals</li>
              <li><IconBolt size={15} /> Applies accepted changes to the live itinerary</li>
              <li><IconBrain size={15} /> Reviews your finished plan - score, issues &amp; quick wins</li>
              <li><IconShield size={15} /> Integrated live risk &amp; weather monitoring</li>
            </ul>
            <button className="lp-btn lp-btn--hero-primary" onClick={() => navigate('/signup')}>
              Try Navia for Free <IconArrowRight size={16} />
            </button>
          </div>
          <div className="lp-ai-agent__widget">
            <AgentDemoWidget />
          </div>
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

      {/*  WHY DIFFERENT  */}
      <section className="lp-bento" id="why-different">
        <div className="lp-bento__header">
          <span className="lp-section-eyebrow">What makes us different</span>
          <h2 className="lp-section-title">Features no other<br />travel platform has</h2>
          <p className="lp-section-sub">We built the capabilities that were missing from every tool we tried.</p>
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
            <span className="lp-bento-card__tag">World First</span>
            <h3>Agentic AI + Group Chat</h3>
            <p>Navia joins the trip conversation, understands each traveler, proposes itinerary edits, and applies approved changes to the shared plan.</p>
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
                  View Trip <IconArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
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
          <div className="lp-risk-preview__rows">
            {[
              { flag: '🇯🇵', name: 'Japan', status: 'Low Risk', statusColor: '#4ade80', detail: 'Clear skies · ¥ stable · 0 advisories' },
              { flag: '🇫🇷', name: 'France', status: 'Watch', statusColor: '#fbbf24', detail: 'Transport strike · EUR −0.3% today' },
              { flag: '🇹🇭', name: 'Thailand', status: 'Advisory', statusColor: '#f87171', detail: 'Monsoon season · Active travel advisory' },
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
            See the Risk Monitor <IconArrowRight size={16} />
          </button>
        </div>
      </section>

      {/*  SOCIAL PROOF  */}
      <section className="lp-social-proof">
        <div className="lp-social-proof__inner">
          <h2 className="lp-section-title">What travelers are saying</h2>
          <div className="lp-reviews__grid">
            {REVIEWS.map((r, i) => (
              <div key={i} className="lp-review-card">
                <p className="lp-review-card__quote">&quot;{r.quote}&quot;</p>
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
