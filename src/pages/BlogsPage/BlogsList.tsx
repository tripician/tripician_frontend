import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Chip } from '@mui/material';
import { useSelector } from 'react-redux';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import NavigationPannel from '../PageLayout/CommonLayouts/NavigationPanel';
import blogsData from '../../assets/blogs/blogs.json';
import { fetchUnsplashImage } from '../../services/unsplashService';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

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

const ALL_TAGS = ['All', ...Array.from(new Set(blogsData.map((b) => b.tag)))];

const BlogsList: React.FC = () => {
  const navigate = useNavigate();
  const profile = useSelector((state: any) => state.user?.profile);
  const isAuthenticated = !!profile;

  const [images, setImages] = useState<Record<number, string>>({});
  const [activeTag, setActiveTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Unsplash images for all blogs in parallel
  useEffect(() => {
    blogsData.forEach((b) => {
      fetchUnsplashImage(`${b.city} ${b.country} travel`).then((url) => {
        if (url) setImages((prev) => ({ ...prev, [b.id]: url }));
      });
    });
  }, []);

  const filtered = (blogsData as BlogEntry[]).filter((b) => {
    const matchTag = activeTag === 'All' || b.tag === activeTag;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || b.city.toLowerCase().includes(q) || b.country.toLowerCase().includes(q) || b.title.toLowerCase().includes(q) || b.tag.toLowerCase().includes(q);
    return matchTag && matchSearch;
  });

  const hero = blogsData[0] as BlogEntry;
  const heroImg = images[hero.id] || '';
  const heroTag = TAG_COLORS[hero.tag] || { bg: '#F3F4F6', color: '#374151' };

  const pageContent = (
    <Box sx={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'Inter', sans-serif" }}>
      {/* Nav — TopBar for logged-in, public nav for guests */}
      {isAuthenticated ? (
        <TopBar showSearch={false} logo={
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#111', fontFamily: "'Inter',sans-serif", letterSpacing: '-0.02em' }}>
            Tripician <Box component="span" sx={{ fontWeight: 400, color: '#888' }}>/ Blog</Box>
          </Typography>
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
          <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none' }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg,#FF385C,#D91A50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: '#fff' }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#111', fontFamily: "'Inter',sans-serif", letterSpacing: '-0.02em' }}>
              Tripician <Box component="span" sx={{ fontWeight: 400, color: '#888' }}>/ Blog</Box>
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

      {/* PAGE HERO */}
      <Box sx={{
        position: 'relative',
        height: { xs: 320, md: 480 },
        overflow: 'hidden',
        background: '#111',
        cursor: 'pointer',
      }}
        onClick={() => navigate(`/blog/${hero.slug}`)}
      >
        {heroImg ? (
          <Box component="img" src={heroImg} alt={hero.city}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', transition: 'transform 0.5s ease', '&:hover': { transform: 'scale(1.03)' } }} />
        ) : (
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,#0D0D14,#1A0822)' }} />
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)' }} />
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: { xs: 3, md: 8 }, pb: { xs: 4, md: 6 }, maxWidth: 780 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.4, borderRadius: '50px', background: 'rgba(255,56,92,0.85)', mb: 1.5 }}>
            <AutoAwesomeRoundedIcon sx={{ fontSize: 12, color: '#fff' }} />
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Inter',sans-serif" }}>
              Featured
            </Typography>
          </Box>
          <Chip label={hero.tag} size="small" sx={{ background: heroTag.bg, color: heroTag.color, fontWeight: 700, fontSize: '0.7rem', mb: 1.5, display: 'flex', width: 'fit-content' }} />
          <Typography sx={{
            fontFamily: "'Playfair Display', serif",
            fontSize: { xs: '1.6rem', md: '2.4rem' },
            fontWeight: 800, color: '#fff',
            lineHeight: 1.15, letterSpacing: '-0.02em', mb: 1,
          }}>
            {hero.title}
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.9rem', md: '1rem' }, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, maxWidth: 560 }}>
            {hero.description}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PlaceRoundedIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }} />
              <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{hero.city}, {hero.country}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTimeRoundedIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }} />
              <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{hero.readTime}</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* MAIN CONTENT */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 4, md: 6, lg: 8 }, py: { xs: 5, md: 7 } }}>
        {/* Header */}
        <Box sx={{ mb: 5 }}>
          <Typography sx={{
            fontFamily: "'Playfair Display', serif",
            fontSize: { xs: '1.8rem', md: '2.6rem' },
            fontWeight: 800, color: '#111',
            letterSpacing: '-0.03em', mb: 0.75, lineHeight: 1.1,
          }}>
            Travel Stories & Guides
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.95rem', md: '1.05rem' }, color: '#888', fontFamily: "'Inter',sans-serif" }}>
            Real destinations. Real vibes. Curated by the Tripician community.
          </Typography>
        </Box>

        {/* Search + Filter row */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 5, alignItems: { sm: 'center' } }}>
          {/* Search input */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 2, py: 1.2,
            borderRadius: '50px',
            border: '1.5px solid rgba(0,0,0,0.12)',
            background: '#fff',
            flex: 1, maxWidth: 360,
            '&:focus-within': { borderColor: '#FF385C', boxShadow: '0 0 0 3px rgba(255,56,92,0.1)' },
            transition: 'all 0.2s',
          }}>
            <SearchRoundedIcon sx={{ fontSize: 18, color: '#aaa' }} />
            <Box
              component="input"
              placeholder="Search by city, country or vibe..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              sx={{
                border: 'none', outline: 'none', background: 'transparent',
                fontFamily: "'Inter',sans-serif", fontSize: '0.87rem', color: '#333',
                flex: 1, minWidth: 0,
                '&::placeholder': { color: '#bbb' },
              }}
            />
          </Box>

          {/* Tag filter pills */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {ALL_TAGS.map((tag) => {
              const active = activeTag === tag;
              const ts = TAG_COLORS[tag];
              return (
                <Box
                  key={tag}
                  component="button"
                  onClick={() => setActiveTag(tag)}
                  sx={{
                    px: 1.8, py: 0.6, borderRadius: '50px', cursor: 'pointer',
                    fontFamily: "'Inter',sans-serif", fontSize: '0.8rem', fontWeight: 600,
                    border: active
                      ? `1.5px solid ${ts ? ts.color : '#FF385C'}`
                      : '1.5px solid rgba(0,0,0,0.1)',
                    background: active
                      ? (ts ? ts.bg : 'rgba(255,56,92,0.08)')
                      : '#fff',
                    color: active
                      ? (ts ? ts.color : '#FF385C')
                      : '#666',
                    outline: 'none',
                    transition: 'all 0.18s ease',
                    '&:hover': { borderColor: ts ? ts.color : '#FF385C', color: ts ? ts.color : '#FF385C' },
                  }}
                >
                  {tag}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Blog grid */}
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography sx={{ fontSize: '1.1rem', color: '#aaa', fontFamily: "'Inter',sans-serif" }}>
              No posts match your search. Try a different vibe.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
            {filtered.map((blog) => {
              const img = images[blog.id] || '';
              const ts = TAG_COLORS[blog.tag] || { bg: '#F3F4F6', color: '#374151' };
              return (
                <Box
                  key={blog.id}
                  component={Link}
                  to={`/blog/${blog.slug}`}
                  sx={{
                    textDecoration: 'none',
                    display: 'flex', flexDirection: 'column',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    background: '#fff',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
                    '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 16px 40px rgba(0,0,0,0.14)' },
                    '&:hover .bl-img': { transform: 'scale(1.06)' },
                  }}
                >
                  {/* Card image */}
                  <Box sx={{ position: 'relative', height: 220, overflow: 'hidden', flexShrink: 0 }}>
                    {img ? (
                      <Box
                        className="bl-img"
                        component="img"
                        src={img}
                        alt={blog.city}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease', display: 'block' }}
                      />
                    ) : (
                      <Box className="bl-img" sx={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#1c1c2e,#2d1b3d)', transition: 'transform 0.5s ease' }} />
                    )}
                    <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 50%)' }} />
                    {/* Badge */}
                    <Box sx={{
                      position: 'absolute', top: 14, right: 14,
                      px: 1.2, py: 0.4, borderRadius: '50px',
                      backdropFilter: 'blur(12px)',
                      background: 'rgba(255,255,255,0.9)',
                      fontSize: '0.7rem', fontWeight: 700,
                      fontFamily: "'Inter',sans-serif", color: '#111',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
                    }}>
                      {blog.badge}
                    </Box>
                  </Box>

                  {/* Card content */}
                  <Box sx={{ p: '20px 22px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Chip label={blog.tag} size="small" sx={{ background: ts.bg, color: ts.color, fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, ml: 'auto' }}>
                        <PlaceRoundedIcon sx={{ fontSize: 12, color: '#bbb' }} />
                        <Typography sx={{ fontSize: '0.72rem', color: '#bbb', fontFamily: "'Inter',sans-serif" }}>
                          {blog.city}, {blog.country}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography sx={{
                      fontFamily: "'Inter',sans-serif",
                      fontWeight: 800, fontSize: '1rem',
                      color: '#111', lineHeight: 1.3,
                      letterSpacing: '-0.015em', mb: 1,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {blog.title}
                    </Typography>

                    <Typography sx={{
                      fontSize: '0.83rem', color: '#888',
                      fontFamily: "'Inter',sans-serif",
                      lineHeight: 1.65, mb: 2,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      flex: 1,
                    }}>
                      {blog.description}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                        <AccessTimeRoundedIcon sx={{ fontSize: 13, color: '#ccc' }} />
                        <Typography sx={{ fontSize: '0.72rem', color: '#bbb', fontFamily: "'Inter',sans-serif" }}>{blog.readTime}</Typography>
                      </Box>
                      <Typography sx={{
                        fontSize: '0.78rem', fontWeight: 700, color: '#FF385C',
                        fontFamily: "'Inter',sans-serif",
                      }}>
                        Read guide →
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* BOTTOM CTA BANNER */}
      {!isAuthenticated && (
        <Box sx={{
          background: 'linear-gradient(135deg,#0D0D14 0%,#1A0812 50%,#0D0D14 100%)',
          py: { xs: 8, md: 10 },
          px: { xs: 3, md: 6 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <Box sx={{ position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, borderRadius: '50%', background: 'rgba(255,56,92,0.1)', filter: 'blur(80px)', pointerEvents: 'none' }} />
          <Typography sx={{
            fontFamily: "'Playfair Display', serif",
            fontSize: { xs: '1.9rem', md: '3rem' },
            fontWeight: 800, color: '#fff',
            letterSpacing: '-0.03em', lineHeight: 1.1, mb: 1.5,
            position: 'relative', zIndex: 1,
          }}>
            Stop reading. <Box component="em" sx={{ color: '#FF385C' }}>Start traveling.</Box>
          </Typography>
          <Typography sx={{ fontSize: { xs: '1rem', md: '1.1rem' }, color: 'rgba(255,255,255,0.6)', mb: 4, position: 'relative', zIndex: 1 }}>
            Match your vibe, build your crew, and go.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <Button component={Link} to="/signup" variant="contained" size="large"
              sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: '1rem', px: 4.5, py: 1.6, borderRadius: '50px', textTransform: 'none', background: 'linear-gradient(135deg,#FF385C,#D91A50)', boxShadow: '0 8px 32px rgba(255,56,92,0.45)', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 40px rgba(255,56,92,0.6)' }, transition: 'all 0.2s' }}>
              Create free account →
            </Button>
            <Button component={Link} to="/signin" variant="outlined" size="large"
              sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: '1rem', px: 4, py: 1.6, borderRadius: '50px', textTransform: 'none', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', '&:hover': { borderColor: 'rgba(255,255,255,0.5)', color: '#fff', background: 'rgba(255,255,255,0.06)' } }}>
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

export default BlogsList;
