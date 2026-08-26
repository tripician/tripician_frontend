import React from 'react';
import { Box, Typography, LinearProgress, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  IconLuggage, IconShirt, IconId, IconDroplet, IconPlug, IconFirstAidKit,
  IconMountain, IconConfetti, IconCircle, IconCircleCheckFilled,
} from '@tabler/icons-react';
import { BRAND } from '../../../theme';
import SectionShell from './SectionShell';

interface PackingItem { key: string; name: string; qty: number; checked: boolean }
interface PackingCategory { name: string; items: PackingItem[] }

function categoryIcon(name: string) {
  const n = name.toLowerCase();
  if (/cloth|wear|outfit/.test(n)) return IconShirt;
  if (/essential|document|paper|id\b/.test(n)) return IconId;
  if (/toilet|hygiene|bath|cosmetic/.test(n)) return IconDroplet;
  if (/electronic|tech|gadget|charger|device/.test(n)) return IconPlug;
  if (/med|first aid|health/.test(n)) return IconFirstAidKit;
  if (/trek|hike|outdoor|camp|gear|adventure/.test(n)) return IconMountain;
  return IconLuggage;
}

function normalisePacking(rawTrip: any): PackingCategory[] {
  const packing = rawTrip?.packing ?? rawTrip?.Packing;
  const categories: any[] = Array.isArray(packing?.categories) ? packing.categories : [];
  return categories
    .map((c: any) => {
      const catName = typeof c?.name === 'string' ? c.name : 'Packing';
      return {
        name: catName,
        items: (Array.isArray(c?.items) ? c.items : [])
          .filter((i: any) => i?.name)
          .map((i: any) => ({
            key: String(i.id ?? `${catName}:${i.name}`),
            name: String(i.name),
            qty: Math.max(1, Number(i.qty) || 1),
            checked: i.checked === true,
          })),
      };
    })
    .filter((c) => c.items.length > 0);
}

interface PackingSectionProps { tripId: string; rawTrip: any }

const PackingSection: React.FC<PackingSectionProps> = ({ tripId, rawTrip }) => {
  const theme = useTheme();
  const border = theme.custom.surface.border;
  const packing = React.useMemo(() => normalisePacking(rawTrip), [rawTrip]);

  // Ticks stay on this device; the planner holds the master list.
  const storageKey = `tripPackingView:${tripId}`;
  const [ticks, setTicks] = React.useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(`tripPackingView:${tripId}`) || '{}'); }
    catch { return {}; }
  });
  const isPacked = React.useCallback(
    (item: PackingItem) => ticks[item.key] ?? item.checked,
    [ticks],
  );
  const togglePacked = (item: PackingItem) => {
    setTicks((prev) => {
      const next = { ...prev, [item.key]: !(prev[item.key] ?? item.checked) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const total = packing.reduce((a, c) => a + c.items.length, 0);
  const done = packing.reduce((a, c) => a + c.items.filter(isPacked).length, 0);
  const allPacked = total > 0 && done === total;

  if (packing.length === 0) {
    return (
      <SectionShell
        icon={<IconLuggage size={20} style={{ color: BRAND.coral }} />}
        title="The packing list"
        membersOnly
        empty="Nothing on the list yet. Build it in the planner and it shows up here for everyone travelling."
      />
    );
  }

  return (
    <SectionShell
      icon={<IconLuggage size={20} style={{ color: BRAND.coral }} />}
      title="The packing list"
      membersOnly
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, maxWidth: 460 }}>
        {allPacked ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#16a34a' }}>
            <IconConfetti size={17} />
            <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
              All packed, go catch that flight.
            </Typography>
          </Box>
        ) : (
          <>
            <LinearProgress
              variant="determinate"
              value={total ? (done / total) * 100 : 0}
              sx={{ flex: 1, height: 7, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: 'primary.main' } }}
            />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {done} of {total} packed
            </Typography>
          </>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(3, minmax(0,1fr))' }, gap: 2 }}>
        {packing.map((cat, ci) => {
          const CatIcon = categoryIcon(cat.name);
          const catDone = cat.items.filter(isPacked).length;
          const catComplete = catDone === cat.items.length;
          return (
            <Box key={ci} sx={{
              borderRadius: '16px',
              border: `1px solid ${catComplete ? 'rgba(22,163,74,0.35)' : border}`,
              bgcolor: 'background.paper',
              p: 2,
              transition: 'border-color .2s',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <Box sx={{
                  width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: catComplete ? 'rgba(22,163,74,0.10)' : alpha(BRAND.coral, 0.08),
                  color: catComplete ? '#16a34a' : BRAND.coral,
                }}>
                  <CatIcon size={16} />
                </Box>
                <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: 'text.primary', flex: 1, minWidth: 0 }}>
                  {cat.name}
                </Typography>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: catComplete ? '#16a34a' : 'text.disabled' }}>
                  {catDone}/{cat.items.length}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={cat.items.length ? (catDone / cat.items.length) * 100 : 0}
                sx={{ height: 3, borderRadius: 2, mb: 1.5, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: catComplete ? '#16a34a' : BRAND.coral } }}
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {cat.items.map((item) => {
                  const packed = isPacked(item);
                  return (
                    <Box
                      key={item.key}
                      component="button"
                      type="button"
                      onClick={() => togglePacked(item)}
                      aria-pressed={packed}
                      sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.6,
                        border: `1px solid ${packed ? alpha(BRAND.coral, 0.35) : border}`,
                        bgcolor: packed ? alpha(BRAND.coral, 0.06) : 'transparent',
                        color: packed ? 'text.disabled' : 'text.secondary',
                        borderRadius: '50px', px: 1.1, py: 0.5, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                        textDecoration: packed ? 'line-through' : 'none',
                        transition: 'all .15s',
                        '&:hover': { borderColor: alpha(BRAND.coral, 0.5) },
                      }}
                    >
                      {packed
                        ? <IconCircleCheckFilled size={15} style={{ color: 'primary.main', flexShrink: 0 }} />
                        : <IconCircle size={15} style={{ opacity: 0.45, flexShrink: 0 }} />}
                      {item.qty > 1 ? `${item.name} x ${item.qty}` : item.name}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
      <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 1.5 }}>
        Ticks here stay on this device, perfect for packing day. The planner keeps the master list.
      </Typography>
    </SectionShell>
  );
};

export default PackingSection;
