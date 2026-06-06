import React from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppShell } from '../AppShellContext';

interface QuickStartStripProps {
  userName?: string;
  hasTrips: boolean;
  onVibeChange?: (vibe: string | null) => void;
}

const QuickStartStrip: React.FC<QuickStartStripProps> = () => {
  const navigate = useNavigate();
  const { openCreateTrip } = useAppShell();

  return (
    <Box sx={{ mb: 4, p: { xs: '28px 24px', md: '36px 40px' }, borderRadius: '20px', position: 'relative', overflow: 'hidden',
                  background: 'linear-gradient(135deg, #0D0D14 0%, #130A1A 55%, #0D0D14 100%)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.18)',
                }}>
                  {/* Ambient glow */}
                  <Box sx={{ position: 'absolute', top: '-40%', left: '-5%', width: '50%', height: '200%', background: 'radial-gradient(ellipse, rgba(255,56,92,0.14) 0%, transparent 65%)', pointerEvents: 'none' }} />
                  <Box sx={{ position: 'absolute', bottom: '-30%', right: '-5%', width: '45%', height: '160%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
    
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    {/* Eyebrow */}
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: '50px', background: 'rgba(255,56,92,0.14)', border: '1px solid rgba(255,56,92,0.28)', mb: 2 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#FF385C', boxShadow: '0 0 8px rgba(255,56,92,0.7)' }} />
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,56,92,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Inter',sans-serif" }}>
                        Your next adventure
                      </Typography>
                    </Box>
    
                    {/* Headline */}
                    <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: { xs: '1.65rem', md: '2.2rem' }, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', mb: 0.75 }}>
                      Travel with people<br />who <Box component="em" sx={{ color: '#FF385C', fontStyle: 'italic' }}>get you.</Box>
                    </Typography>
                    <Typography sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter',sans-serif", mb: 3, lineHeight: 1.6, maxWidth: 480 }}>
                      Plan trips around your vibe. Find your crew. Go somewhere that actually feels like you.
                    </Typography>
    
                    {/* CTAs */}
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      <Box component="button" onClick={openCreateTrip}
                        sx={{ px: 2.8, py: 1.1, borderRadius: '50px', cursor: 'pointer', fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '0.86rem', border: 'none', background: 'linear-gradient(135deg,#FF385C,#D91A50)', color: '#fff', boxShadow: '0 4px 18px rgba(255,56,92,0.38)', transition: 'all 0.2s', outline: 'none', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 28px rgba(255,56,92,0.52)' } }}>
                        Create your first trip
                      </Box>
                      <Box component="button" onClick={() => navigate('/community')}
                        sx={{ px: 2.8, py: 1.1, borderRadius: '50px', cursor: 'pointer', fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: '0.86rem', border: '1.5px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(255,255,255,0.7)', transition: 'all 0.2s', outline: 'none', '&:hover': { borderColor: 'rgba(255,255,255,0.4)', color: '#fff', background: 'rgba(255,255,255,0.06)' } }}>
                        Explore trips
                      </Box>
                    </Box>
                  </Box>
                </Box>
  );
};

export default QuickStartStrip;
