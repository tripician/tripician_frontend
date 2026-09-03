/**
 * Which notifications reach you by email.
 *
 * ## What this replaced
 *
 * Six switches: Email Updates, Community Posts, Blog Comments, Newsletter, Push
 * Notifications and Travel Reminders. Every one of them was dead. Their table is
 * written and read by this screen and by nothing else in the product, so no send
 * path ever consulted them, and one of them offered a weekly newsletter that has
 * never existed. Turning them off protected nobody from anything.
 *
 * ## What is here instead
 *
 * Only the types that actually send mail, so every switch governs something. The
 * server decides that list rather than this file, because a switch here and a
 * send rule there would drift and the screen would start lying again.
 *
 * The old settings row is left in the database untouched. Nothing reads it, so
 * removing it would be a migration that buys nothing.
 */

import React from 'react';
import {
  Alert, Box, Card, CardContent, CircularProgress, Divider, Switch, Typography,
} from '@mui/material';
import { apiServices } from '../../services/APIs/apiServices';

interface Preference {
  type: number;
  name: string;
  email: boolean;
}

/**
 * Server-side enum names to something a person recognises.
 *
 * Keyed on the name rather than the number so a reordered enum cannot silently
 * relabel somebody's settings. An unknown name falls back to the raw one, which
 * is ugly on screen and therefore gets noticed and fixed.
 */
const COPY: Record<string, { title: string; description: string }> = {
  JoinRequested: {
    title: 'Someone asks to join your trip',
    description: 'You are the only person who can approve it, and they may be waiting on an answer to book flights.',
  },
  JoinApproved: {
    title: 'Your request to join was approved',
    description: 'You are on the trip.',
  },
  JoinDeclined: {
    title: 'Your request to join was declined',
    description: 'Sent so you are not left checking.',
  },
  StoryInvite: {
    title: 'Someone asks you to co-write a story',
    description: 'You cannot edit it until you accept, so nothing else would tell you.',
  },
  Announcement: {
    title: 'An announcement on a trip you are on',
    description: 'Operational notices from the organiser. Members only.',
  },
};

const NotificationsSettings: React.FC = () => {
  const [prefs, setPrefs] = React.useState<Preference[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    let active = true;
    void apiServices.getNotificationPreferences()
      .then((resp) => { if (active) setPrefs(Array.isArray(resp.data) ? resp.data : []); })
      .catch(() => { if (active) setError('Could not load your notification settings.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const toggle = async (pref: Preference) => {
    const next = !pref.email;
    // Optimistic, then rolled back on failure. A switch that does not move until
    // a round trip finishes feels broken on a slow connection.
    setPrefs((prev) => prev.map((p) => (p.type === pref.type ? { ...p, email: next } : p)));
    setSaving((prev) => new Set(prev).add(pref.type));
    try {
      await apiServices.setNotificationPreference(pref.type, next);
    } catch {
      setPrefs((prev) => prev.map((p) => (p.type === pref.type ? { ...p, email: !next } : p)));
      setError('That change did not save.');
    } finally {
      setSaving((prev) => { const s = new Set(prev); s.delete(pref.type); return s; });
    }
  };

  return (
    <Box sx={{ maxWidth: '100%' }}>
      <Card
        sx={{
          borderRadius: '16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary', letterSpacing: '-0.01em' }}>
            Email
          </Typography>
          {/* Says what the list is FOR, so the absence of a switch for likes and
              follows reads as a decision rather than an oversight. */}
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 3 }}>
            Tripician only emails you when somebody is waiting on you, or you are waiting on them.
            Everything else stays in the app.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Typography variant="body2" color="text.secondary">Loading...</Typography>
          ) : prefs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nothing to set here yet.
            </Typography>
          ) : (
            prefs.map((pref, i) => {
              const copy = COPY[pref.name] ?? { title: pref.name, description: '' };
              return (
                <React.Fragment key={pref.type}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, mr: 2, minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 500, color: 'text.primary', mb: 0.5, fontSize: '0.95rem' }}
                      >
                        {copy.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.4 }}
                      >
                        {copy.description}
                      </Typography>
                    </Box>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <Switch
                        checked={pref.email}
                        onChange={() => void toggle(pref)}
                        disabled={saving.has(pref.type)}
                        inputProps={{ 'aria-label': copy.title }}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'primary.main' },
                          '& .MuiSwitch-track': { backgroundColor: 'action.hover' },
                        }}
                      />
                      {saving.has(pref.type) && (
                        <CircularProgress
                          size={22}
                          sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-11px', ml: '-11px' }}
                        />
                      )}
                    </Box>
                  </Box>
                  {i < prefs.length - 1 && <Divider sx={{ my: 2.5, borderColor: 'divider' }} />}
                </React.Fragment>
              );
            })
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default NotificationsSettings;
