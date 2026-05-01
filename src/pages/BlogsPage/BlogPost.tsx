import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Chip } from '@mui/material';
import { useSelector } from 'react-redux';
import blogsData from '../../assets/blogs/blogs.json';
import { fetchUnsplashImage } from '../../services/unsplashService';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import NavigationPannel from '../PageLayout/CommonLayouts/NavigationPanel';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';

type BlogEntry = typeof blogsData[0];

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  Romantic:   { bg: '#FEE2E2', color: '#DC2626' },
  Culture:    { bg: '#EDE9FE', color: '#7C3AED' },
  Adventure:  { bg: '#D1FAE5', color: '#059669' },
  Spiritual:  { bg: '#FEF9C3', color: '#CA8A04' },
  Urban:      { bg: '#DBEAFE', color: '#1D4ED8' },
  Luxury:     { bg: '#FDF4FF', color: '#9333EA' },
  Scenic:     { bg: '#ECFDF5', color: '#10B981' },
};

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const profile = useSelector((state: any) => state.user?.profile);
  const isAuthenticated = !!profile;

  const blog = blogsData.find((b) => b.slug === slug) as BlogEntry | undefined;

  const [heroImage, setHeroImage] = useState<string>('');
  const [readProgress, setReadProgress] = useState(0);
  const [relatedImages, setRelatedImages] = useState<Record<number, string>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const winH = window.innerHeight;
      const scrolled = Math.max(0, winH - top);
      const pct = Math.min(100, (scrolled / (height + winH)) * 100);
      setReadProgress(pct);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch hero image from Unsplash
  useEffect(() => {
    if (!blog) return;
    setHeroImage('');
    fetchUnsplashImage(`${blog.city} ${blog.country} travel landscape`).then((url) => {
      if (url) setHeroImage(url);
    });
  }, [blog?.city, blog?.country]);

  // Fetch related posts images
  const related = blog
    ? blogsData.filter((b) => b.id !== blog.id).slice(0, 3) as BlogEntry[]
    : [];

  useEffect(() => {
    if (!related.length) return;
    related.forEach((r) => {
      fetchUnsplashImage(`${r.city} ${r.country} travel`).then((url) => {
        if (url) setRelatedImages((prev) => ({ ...prev, [r.id]: url }));
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blog?.id]);

  if (!blog) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>Blog post not found</Typography>
        <Button onClick={() => navigate('/blog')} variant="outlined">← Back to Travel Blog</Button>
      </Box>
    );
  }

  const tagStyle = TAG_COLORS[blog.tag] || { bg: '#F3F4F6', color: '#374151' };

  const pageContent = (
    <Box sx={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'Inter', sans-serif" }}>
      {/* Reading progress bar */}
      <Box sx={{
        position: 'fixed', top: 0, left: 0, zIndex: 9999,
        height: 3,
        width: `${readProgress}%`,
        background: 'linear-gradient(90deg, #FF385C, #D91A50)',
        transition: 'width 0.1s linear',
        boxShadow: '0 0 12px rgba(255,56,92,0.5)',
      }} />

      {/* Nav — TopBar for logged-in, public nav for guests */}
      {isAuthenticated ? (
        <TopBar showSearch={false} logo={
          <Box
            component={Link} to="/blog"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#555', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500, '&:hover': { color: '#FF385C' }, transition: 'color 0.2s' }}
          >
            <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />
            Blog
          </Box>
        } />
      ) : (
        <Box sx={{
          position: 'sticky', top: 0, zIndex: 1100,
          backdropFilter: 'blur(20px)',
          background: 'rgba(250,250,250,0.9)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          px: { xs: 2, md: 5 }, height: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component={Link} to="/blog"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#555', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500, '&:hover': { color: '#FF385C' }, transition: 'color 0.2s' }}
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />
              Blog
            </Box>
            <Typography sx={{ color: '#ccc', mx: 0.5 }}>/</Typography>
            <Typography sx={{ fontSize: '0.82rem', color: '#999', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {blog.title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" component={Link} to="/signin" variant="outlined"
              sx={{ fontSize: '0.78rem', fontWeight: 600, borderRadius: '50px', textTransform: 'none', borderColor: 'rgba(0,0,0,0.2)', color: '#333', '&:hover': { borderColor: '#FF385C', color: '#FF385C' } }}>
              Sign in
            </Button>
            <Button size="small" component={Link} to="/signup" variant="contained"
              sx={{ fontSize: '0.78rem', fontWeight: 700, borderRadius: '50px', textTransform: 'none', background: 'linear-gradient(135deg,#FF385C,#D91A50)', boxShadow: '0 3px 12px rgba(255,56,92,0.3)', '&:hover': { boxShadow: '0 6px 20px rgba(255,56,92,0.45)' } }}>
              Join free
            </Button>
          </Box>
        </Box>
      )}

      {/* HERO */}
      <Box
        ref={heroRef}
        sx={{
          position: 'relative',
          height: { xs: '55vw', sm: '480px', md: '580px' },
          maxHeight: 680,
          overflow: 'hidden',
          background: '#111',
        }}
      >
        {heroImage ? (
          <Box
            component="img"
            src={heroImage}
            alt={`${blog.city}, ${blog.country}`}
            sx={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 40%',
              animation: 'heroZoom 12s ease-in-out infinite alternate',
              '@keyframes heroZoom': {
                '0%': { transform: 'scale(1.04)' },
                '100%': { transform: 'scale(1)' },
              },
            }}
          />
        ) : (
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(145deg, #0D0D14 0%, #1A0A22 50%, #0D1420 100%)',
            animation: 'shimmer 2s infinite',
            '@keyframes shimmer': {
              '0%': { opacity: 1 }, '50%': { opacity: 0.7 }, '100%': { opacity: 1 },
            },
          }} />
        )}

        {/* Gradient overlays */}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.15) 100%)' }} />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 50%)' }} />

        {/* Hero content */}
        <Box sx={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          px: { xs: 3, md: 8 }, pb: { xs: 4, md: 6 },
          maxWidth: 900,
        }}>
          {/* Tag + location row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={blog.tag}
              size="small"
              sx={{ background: tagStyle.bg, color: tagStyle.color, fontWeight: 700, fontSize: '0.7rem', border: 'none', height: 24 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <PlaceRoundedIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
              <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                {blog.city}, {blog.country}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <AccessTimeRoundedIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
              <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                {blog.readTime}
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="h1"
            sx={{
              fontFamily: "'Playfair Display', serif",
              fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3rem' },
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              mb: 1.5,
              textShadow: '0 2px 20px rgba(0,0,0,0.4)',
            }}
          >
            {blog.title}
          </Typography>

          <Typography sx={{
            fontSize: { xs: '0.9rem', md: '1.05rem' },
            color: 'rgba(255,255,255,0.75)',
            fontWeight: 400,
            lineHeight: 1.65,
            maxWidth: 620,
          }}>
            {blog.description}
          </Typography>
        </Box>
      </Box>

      {/* MAIN CONTENT */}
      <Box
        ref={contentRef}
        sx={{
          display: 'flex',
          gap: { xs: 0, lg: 6 },
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, sm: 4, md: 6, lg: 8 },
          py: { xs: 5, md: 7 },
          alignItems: 'flex-start',
        }}
      >
        {/* Article body */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {blog.body.map((block: any, i: number) => {
            if (block.type === 'intro') {
              return (
                <Typography key={i} sx={{
                  fontSize: { xs: '1.05rem', md: '1.2rem' },
                  fontWeight: 500,
                  color: '#111',
                  lineHeight: 1.8,
                  mb: 4,
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: 'italic',
                  borderLeft: '3px solid #FF385C',
                  pl: 3,
                }}>
                  {block.text}
                </Typography>
              );
            }
            if (block.type === 'heading') {
              return (
                <Typography key={i} variant="h3" sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 800,
                  fontSize: { xs: '1.25rem', md: '1.55rem' },
                  color: '#111',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.25,
                  mt: i > 0 ? 5 : 0,
                  mb: 2,
                }}>
                  {block.text}
                </Typography>
              );
            }
            if (block.type === 'paragraph') {
              return (
                <Typography key={i} sx={{
                  fontSize: { xs: '0.97rem', md: '1.05rem' },
                  color: '#333',
                  lineHeight: 1.85,
                  mb: 2.5,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {block.text}
                </Typography>
              );
            }
            if (block.type === 'tip') {
              return (
                <Box key={i} sx={{
                  my: 4,
                  p: '20px 24px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(255,56,92,0.06) 0%, rgba(255,56,92,0.02) 100%)',
                  border: '1px solid rgba(255,56,92,0.18)',
                  display: 'flex', gap: 1.5, alignItems: 'flex-start',
                }}>
                  <AutoAwesomeRoundedIcon sx={{ color: '#FF385C', fontSize: 20, mt: 0.3, flexShrink: 0 }} />
                  <Typography sx={{
                    fontSize: '0.95rem',
                    color: '#333',
                    lineHeight: 1.75,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                  }}>
                    {block.text}
                  </Typography>
                </Box>
              );
            }
            if (block.type === 'cta') {
              // Only show for unauthenticated
              return null; // handled separately below
            }
            return null;
          })}

          {/* CTA section (always shown) */}
          <Box sx={{
            mt: 6,
            p: { xs: '28px 24px', md: '40px 48px' },
            borderRadius: '20px',
            background: 'linear-gradient(145deg, #0D0D14 0%, #1A0812 50%, #0D0D14 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Glow */}
            <Box sx={{ position: 'absolute', top: '-30%', left: '-10%', width: '60%', height: '200%', background: 'radial-gradient(ellipse, rgba(255,56,92,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonAddAltRoundedIcon sx={{ color: '#FF385C', fontSize: 22 }} />
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,56,92,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Inter',sans-serif" }}>
                  Travel with people like you
                </Typography>
              </Box>
              <Typography sx={{
                fontFamily: "'Playfair Display', serif",
                fontSize: { xs: '1.5rem', md: '2rem' },
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                mb: 1.5,
              }}>
                {blog.body.find((b: any) => b.type === 'cta')?.text || `Ready to explore ${blog.city}?`}
              </Typography>
              {!isAuthenticated ? (
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 3 }}>
                  <Button
                    component={Link}
                    to="/signup"
                    variant="contained"
                    sx={{
                      fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '0.9rem',
                      px: 3.5, py: 1.3, borderRadius: '50px', textTransform: 'none',
                      background: 'linear-gradient(135deg,#FF385C,#D91A50)',
                      boxShadow: '0 6px 24px rgba(255,56,92,0.45)',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 32px rgba(255,56,92,0.6)' },
                      transition: 'all 0.2s',
                    }}
                  >
                    Create free account →
                  </Button>
                  <Button
                    component={Link}
                    to="/signin"
                    variant="outlined"
                    sx={{
                      fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: '0.9rem',
                      px: 3, py: 1.3, borderRadius: '50px', textTransform: 'none',
                      borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)',
                      '&:hover': { borderColor: 'rgba(255,255,255,0.5)', color: '#fff', background: 'rgba(255,255,255,0.06)' },
                    }}
                  >
                    Sign in
                  </Button>
                </Box>
              ) : (
                <Button
                  component={Link}
                  to="/dashboard"
                  variant="contained"
                  sx={{
                    fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '0.9rem',
                    mt: 2.5, px: 3.5, py: 1.3, borderRadius: '50px', textTransform: 'none',
                    background: 'linear-gradient(135deg,#FF385C,#D91A50)',
                    boxShadow: '0 6px 24px rgba(255,56,92,0.4)',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 32px rgba(255,56,92,0.55)' },
                    transition: 'all 0.2s',
                  }}
                >
                  Start planning your trip →
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        {/* Sticky sidebar — desktop only */}
        <Box sx={{
          display: { xs: 'none', lg: 'block' },
          width: 280,
          flexShrink: 0,
          position: 'sticky',
          top: 80,
        }}>
          {/* About this destination */}
          <Box sx={{
            p: '22px 20px',
            borderRadius: '16px',
            border: '1px solid rgba(0,0,0,0.08)',
            background: '#fff',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            mb: 2.5,
          }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1.5, fontFamily: "'Inter',sans-serif" }}>
              Quick facts
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {[
                { label: 'City', value: blog.city },
                { label: 'Country', value: blog.country },
                { label: 'Vibe', value: blog.tag },
                { label: 'Read time', value: blog.readTime },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.78rem', color: '#888', fontFamily: "'Inter',sans-serif" }}>{label}</Typography>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#222', fontFamily: "'Inter',sans-serif" }}>{value}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Unauthenticated CTA sidebar widget */}
          {!isAuthenticated && (
            <Box sx={{
              p: '22px 20px',
              borderRadius: '16px',
              background: 'linear-gradient(145deg, #0D0D14, #1A0812)',
              overflow: 'hidden', position: 'relative',
            }}>
              <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,56,92,0.18)', filter: 'blur(20px)' }} />
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#fff', fontFamily: "'Inter',sans-serif", mb: 0.8, position: 'relative', zIndex: 1, lineHeight: 1.3 }}>
                Plan {blog.city} with your tribe
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter',sans-serif", mb: 2.5, position: 'relative', zIndex: 1, lineHeight: 1.6 }}>
                Match your vibe. Build your itinerary. Travel better together.
              </Typography>
              <Button
                fullWidth
                component={Link}
                to="/signup"
                variant="contained"
                size="small"
                sx={{
                  fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '0.82rem',
                  py: 1.1, borderRadius: '50px', textTransform: 'none',
                  background: 'linear-gradient(135deg,#FF385C,#D91A50)',
                  boxShadow: '0 4px 16px rgba(255,56,92,0.4)',
                  position: 'relative', zIndex: 1,
                  '&:hover': { boxShadow: '0 8px 24px rgba(255,56,92,0.55)' },
                }}
              >
                Join for free →
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* RELATED POSTS */}
      {related.length > 0 && (
        <Box sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, sm: 4, md: 6, lg: 8 },
          pb: 10,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5 }}>
            <Box sx={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg, #FF385C, #D91A50)' }} />
            <Typography fontWeight={800} sx={{ fontFamily: "'Inter',sans-serif", fontSize: '1.3rem', letterSpacing: '-0.03em' }}>
              Continue Exploring
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3,1fr)' }, gap: 2.5 }}>
            {related.map((r) => {
              const img = relatedImages[r.id] || '';
              const tagS = TAG_COLORS[r.tag] || { bg: '#F3F4F6', color: '#374151' };
              return (
                <Box
                  key={r.id}
                  component={Link}
                  to={`/blog/${r.slug}`}
                  sx={{
                    textDecoration: 'none',
                    display: 'block',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    aspectRatio: '16/10',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                    transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
                    '&:hover': { transform: 'translateY(-5px) scale(1.01)', boxShadow: '0 16px 40px rgba(0,0,0,0.18)' },
                    '&:hover .rel-img': { transform: 'scale(1.06)' },
                  }}
                >
                  {img ? (
                    <Box
                      className="rel-img"
                      component="img"
                      src={img}
                      alt={r.city}
                      sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                    />
                  ) : (
                    <Box className="rel-img" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,#1c1c2e,#2d1b3d)', transition: 'transform 0.5s ease' }} />
                  )}
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }} />
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: '16px 18px' }}>
                    <Chip label={r.tag} size="small" sx={{ background: tagS.bg, color: tagS.color, fontWeight: 700, fontSize: '0.65rem', mb: 0.8, height: 20 }} />
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', lineHeight: 1.3, fontFamily: "'Inter',sans-serif", display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.title}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* BOTTOM CTA BANNER for unauthenticated */}
      {!isAuthenticated && (
        <Box sx={{
          background: 'linear-gradient(135deg, #FF385C 0%, #D91A50 50%, #A8003A 100%)',
          py: { xs: 6, md: 8 },
          px: { xs: 3, md: 6 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <Box sx={{ position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <Typography sx={{
            fontFamily: "'Playfair Display', serif",
            fontSize: { xs: '1.8rem', md: '2.6rem' },
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            mb: 1.5,
            position: 'relative',
            zIndex: 1,
          }}>
            Your next trip starts here.
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.95rem', md: '1.05rem' }, color: 'rgba(255,255,255,0.8)', mb: 4, position: 'relative', zIndex: 1 }}>
            Join thousands of travelers on Tripician. Free forever.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <Button
              component={Link}
              to="/signup"
              variant="contained"
              size="large"
              sx={{
                fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: '1rem',
                px: 4, py: 1.5, borderRadius: '50px', textTransform: 'none',
                background: '#fff', color: '#D91A50',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                '&:hover': { background: 'rgba(255,255,255,0.93)', transform: 'translateY(-2px)', boxShadow: '0 14px 40px rgba(0,0,0,0.3)' },
                transition: 'all 0.2s',
              }}
            >
              Create free account
            </Button>
            <Button
              component={Link}
              to="/signin"
              variant="outlined"
              size="large"
              sx={{
                fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: '1rem',
                px: 4, py: 1.5, borderRadius: '50px', textTransform: 'none',
                borderColor: 'rgba(255,255,255,0.45)', color: '#fff',
                '&:hover': { borderColor: '#fff', background: 'rgba(255,255,255,0.1)' },
              }}
            >
              Sign in
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );

  return isAuthenticated ? (
    <NavigationPannel>{pageContent}</NavigationPannel>
  ) : pageContent;
};

export default BlogPost;
