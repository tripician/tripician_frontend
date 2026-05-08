import React, { useState } from 'react';
import { Box, Typography, Container, Button, TextField } from '@mui/material';
import { Link } from 'react-router-dom';
import InfoPageShell from './InfoPageShell';
import ContactMailRoundedIcon from '@mui/icons-material/ContactMailRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';

const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email, and message before sending.');
      return;
    }
    const subjectLine = form.subject.trim()
      ? `[Tripician] ${form.subject.trim()}`
      : '[Tripician] Support Request';
    const body = `Name: ${form.name.trim()}\nEmail: ${form.email.trim()}\n\n${form.message.trim()}`;
    window.location.href = `mailto:support@tripician.com?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <InfoPageShell>
      {/* Hero */}
      <Box sx={{ background: 'linear-gradient(135deg,#FFF5F6 0%,#FFFAFA 100%)', borderBottom: '1px solid rgba(0,0,0,0.06)', px: { xs: 3, md: 8 }, py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg,#FF385C,#D91A50)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(255,56,92,0.3)' }}>
              <ContactMailRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF385C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Contact Us</Typography>
          </Box>
          <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '2.8rem' }, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.15, mb: 2 }}>
            We'd love to hear from you.
          </Typography>
          <Typography sx={{ fontSize: '1.05rem', color: '#666', lineHeight: 1.75 }}>
            Fill in the form and we'll open your email app ready to send — or email us directly at{' '}
            <Box component="a" href="mailto:support@tripician.com" sx={{ color: '#FF385C', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>support@tripician.com</Box>.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 280px' }, gap: 3, alignItems: 'flex-start' }}>
          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ background: '#fff', borderRadius: '16px', p: { xs: 3, md: 4 }, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 20px rgba(0,0,0,0.05)' }}
          >
            <Typography sx={{ fontWeight: 700, color: '#111', mb: 3, fontSize: '1.05rem' }}>Send us a message</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                label="Your name"
                name="name"
                value={form.name}
                onChange={handleChange}
                size="small"
                fullWidth
                required
                sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#FF385C' }, '& label.Mui-focused': { color: '#FF385C' } }}
              />
              <TextField
                label="Your email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                size="small"
                fullWidth
                required
                sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#FF385C' }, '& label.Mui-focused': { color: '#FF385C' } }}
              />
            </Box>
            <TextField
              label="Subject (optional)"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              size="small"
              fullWidth
              sx={{ mb: 2, '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#FF385C' }, '& label.Mui-focused': { color: '#FF385C' } }}
            />
            <TextField
              label="Your message"
              name="message"
              value={form.message}
              onChange={handleChange}
              multiline
              rows={6}
              fullWidth
              required
              sx={{ mb: 2, '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#FF385C' }, '& label.Mui-focused': { color: '#FF385C' } }}
            />
            {error && (
              <Typography sx={{ color: '#DC2626', fontSize: '0.82rem', mb: 2 }}>{error}</Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              endIcon={<SendRoundedIcon />}
              fullWidth
              sx={{ borderRadius: '50px', fontWeight: 700, textTransform: 'none', py: 1.4, background: 'linear-gradient(135deg,#FF385C,#D91A50)', boxShadow: '0 4px 16px rgba(255,56,92,0.35)', '&:hover': { boxShadow: '0 6px 24px rgba(255,56,92,0.5)' } }}
            >
              Open in Email App
            </Button>
            <Typography sx={{ mt: 1.5, fontSize: '0.77rem', color: '#999', textAlign: 'center' }}>
              Clicking above will open your default email app with the message pre-filled.
            </Typography>
          </Box>

          {/* Info sidebar */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ background: '#fff', borderRadius: '14px', p: 3, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <EmailRoundedIcon sx={{ color: '#FF385C', fontSize: 22 }} />
                <Typography sx={{ fontWeight: 700, color: '#111', fontSize: '0.92rem' }}>Direct Email</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.87rem', color: '#555', mb: 1.5, lineHeight: 1.7 }}>Email us directly at:</Typography>
              <Box
                component="a"
                href="mailto:support@tripician.com"
                sx={{ display: 'block', fontSize: '0.88rem', color: '#FF385C', fontWeight: 700, wordBreak: 'break-all', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                support@tripician.com
              </Box>
            </Box>

            <Box sx={{ background: '#fff', borderRadius: '14px', p: 3, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <AccessTimeRoundedIcon sx={{ color: '#FF385C', fontSize: 22 }} />
                <Typography sx={{ fontWeight: 700, color: '#111', fontSize: '0.92rem' }}>Response Time</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.87rem', color: '#555', lineHeight: 1.7 }}>
                We typically respond within <strong>1–2 business days</strong>. For urgent issues, include "URGENT" in your subject line.
              </Typography>
            </Box>

            <Box sx={{ background: '#FFF5F6', borderRadius: '14px', p: 3, border: '1px solid rgba(255,56,92,0.1)' }}>
              <Typography sx={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.7 }}>
                For data access, correction, or deletion requests, include <strong>"Privacy Request"</strong> in your subject line.{' '}
                <Box component={Link} to="/privacy-policy" sx={{ color: '#FF385C', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Read our Privacy Policy →
                </Box>
              </Typography>
            </Box>
          </Box>
        </Box>

        <Typography sx={{ textAlign: 'center', color: '#bbb', fontSize: '0.77rem', mt: 6 }}>
          Tripician © {new Date().getFullYear()} ·{' '}
          <Box component={Link} to="/privacy-policy" sx={{ color: '#bbb', textDecoration: 'none', '&:hover': { color: '#FF385C' } }}>Privacy</Box>{' '}·{' '}
          <Box component={Link} to="/terms-and-conditions" sx={{ color: '#bbb', textDecoration: 'none', '&:hover': { color: '#FF385C' } }}>Terms</Box>
        </Typography>
      </Container>
    </InfoPageShell>
  );
};

export default ContactPage;
