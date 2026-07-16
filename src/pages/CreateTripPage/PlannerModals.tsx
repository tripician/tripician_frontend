/**
 * Premium planner sheets for curating spots/foods and accommodation per stop.
 */
import React from 'react';
import {
  Box, Typography, Dialog, IconButton, InputBase, Button, LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ExploreIcon from '@mui/icons-material/Explore';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import HotelIcon from '@mui/icons-material/Hotel';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import NightsStayRoundedIcon from '@mui/icons-material/NightsStayRounded';
import type { PlannerDestination, PlannerSpot } from '../../store/plannerSlice';

const GOOGLE_LOGO = import.meta.env.VITE_GOOGLE_LOGO
  || 'https://developers.google.com/static/maps/documentation/images/google_on_white.png';

type QuickSuggestion = { name: string; placeId?: string };

const sheetPaper = (t: { palette: { mode: string } }) => ({
  borderRadius: '22px',
  overflow: 'hidden',
  background: t.palette.mode === 'dark' ? '#121416' : '#fff',
  boxShadow: '0 40px 100px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)',
  maxHeight: '88vh',
  display: 'flex',
  flexDirection: 'column' as const,
});

const CheckBox = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
  <Box
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    sx={{
      width: 20, height: 20, borderRadius: '6px', flexShrink: 0, cursor: 'pointer',
      border: `2px solid ${checked ? '#16a34a' : 'rgba(0,0,0,0.18)'}`,
      bgcolor: checked ? '#16a34a' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .15s',
    }}
  >
    {checked && (
      <Box component='svg' viewBox='0 0 12 12' sx={{ width: 10, height: 10 }}>
        <path fill='#fff' d='M1.5 6l3 3 6-6' strokeWidth={1.5} />
      </Box>
    )}
  </Box>
);

/*  Discover (spots & foods)  */

export interface DiscoverSheetProps {
  open: boolean;
  onClose: () => void;
  destination?: PlannerDestination;
  tab: 'spots' | 'foods';
  onTabChange: (tab: 'spots' | 'foods') => void;
  spotSearch: string;
  onSpotSearchChange: (v: string) => void;
  spotSearchLoading: boolean;
  spotPredictions: any[];
  nearbySpots: QuickSuggestion[];
  nearbyLoading: boolean;
  recommendedFoods: string[];
  onAddSpotFromPrediction: (p: any) => void;
  onQuickAddSpot: (item: QuickSuggestion) => void;
  onQuickAddFood: (name: string) => void;
  onToggleSpot: (spotId: string) => void;
  onRemoveSpot: (spotId: string) => void;
  onToggleFood: (foodId: string) => void;
  onRemoveFood: (foodId: string) => void;
  readOnly?: boolean;
}

export const DiscoverSheet: React.FC<DiscoverSheetProps> = ({
  open, onClose, destination: pd, tab, onTabChange,
  spotSearch, onSpotSearchChange, spotSearchLoading, spotPredictions,
  nearbySpots, nearbyLoading, recommendedFoods,
  onAddSpotFromPrediction, onQuickAddSpot, onQuickAddFood,
  onToggleSpot, onRemoveSpot, onToggleFood, onRemoveFood, readOnly,
}) => {
  const spots = pd?.spots || [];
  const foods = pd?.foods || [];
  const planTitle = (pd as PlannerDestination & { title?: string })?.title?.trim();
  const displayTitle = planTitle || pd?.name || 'This stop';
  const suggestions: QuickSuggestion[] = tab === 'spots'
    ? (nearbySpots.length > 0 ? nearbySpots : [{ name: 'Old Town' }, { name: 'Viewpoint' }, { name: 'Local market' }])
    : recommendedFoods.map(name => ({ name }));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm' PaperProps={{ sx: sheetPaper }}>
      {/* Hero */}
      <Box sx={{ position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
        {pd?.photoUrl && (
          <Box
            component='img' src={pd.photoUrl} alt=''
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(28px)', transform: 'scale(1.15)', opacity: 0.45 }}
          />
        )}
        <Box sx={{
          position: 'relative', px: 2.5, pt: 2.5, pb: 2,
          background: (t) => t.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(18,20,22,0.92) 0%, rgba(18,20,22,0.98) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, #fff 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            {pd?.photoUrl && (
              <Box
                component='img' src={pd.photoUrl} alt={pd.name}
                sx={{ width: 52, height: 52, borderRadius: '14px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
              />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FF385C', mb: 0.4 }}>
                Curate your day
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2, letterSpacing: '-0.35px' }}>
                {displayTitle}
              </Typography>
              {planTitle && pd?.name && (
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.35, display: 'flex', alignItems: 'center', gap: 0.35 }}>
                  <LocationOnIcon sx={{ fontSize: 13, color: '#FF385C' }} /> {pd.name}
                </Typography>
              )}
            </Box>
            <IconButton size='small' onClick={onClose} sx={{ mt: -0.5, color: 'text.disabled' }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box sx={(t) => ({
            display: 'inline-flex', mt: 1.75, p: 0.4, borderRadius: '12px',
            bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          })}>
            {(['spots', 'foods'] as const).map(tkey => (
              <Box
                key={tkey}
                onClick={() => onTabChange(tkey)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.65, borderRadius: '10px', cursor: 'pointer',
                  bgcolor: tab === tkey ? '#fff' : 'transparent',
                  boxShadow: tab === tkey ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all .18s',
                }}
              >
                {tkey === 'spots' ? <ExploreIcon sx={{ fontSize: 15, color: tab === tkey ? '#FF385C' : 'text.disabled' }} />
                  : <RestaurantRoundedIcon sx={{ fontSize: 15, color: tab === tkey ? '#FF385C' : 'text.disabled' }} />}
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tab === tkey ? 'text.primary' : 'text.secondary' }}>
                  {tkey === 'spots' ? `Places (${spots.length})` : `Food (${foods.length})`}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {tab === 'spots' && !readOnly && (
        <Box sx={{ px: 2.5, py: 1.5, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ position: 'relative' }}>
            <InputBase
              value={spotSearch}
              onChange={e => onSpotSearchChange(e.target.value)}
              placeholder={`Search places in ${pd?.name || 'this area'}…`}
              fullWidth
              startAdornment={<SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.disabled' }} />}
              sx={(t) => ({
                fontSize: 14, py: 1, px: 1.5, borderRadius: '14px',
                bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                '&:focus-within': { borderColor: 'rgba(255,56,92,0.4)', boxShadow: '0 0 0 3px rgba(255,56,92,0.08)' },
              })}
            />
            {spotSearchLoading && <LinearProgress sx={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 2, borderRadius: 1 }} />}
          </Box>
          {spotPredictions.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {spotPredictions.slice(0, 4).map(p => (
                <Box
                  key={p.place_id}
                  onClick={() => onAddSpotFromPrediction(p)}
                  sx={(t) => ({
                    px: 1.25, py: 0.85, borderRadius: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    '&:hover': { bgcolor: 'rgba(255,56,92,0.06)', borderColor: 'rgba(255,56,92,0.25)' },
                  })}
                >
                  {p.description?.split(',')[0] || p.description}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {!readOnly && (
        <Box sx={{ px: 2.5, py: 1.25, flexShrink: 0 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.75 }}>
            {tab === 'spots' ? `Suggested near ${pd?.name || 'you'}` : 'Local flavours'}
          </Typography>
          {tab === 'spots' && nearbyLoading && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5 }}>Finding ideas…</Typography>
          )}
          <Box sx={{ display: 'flex', gap: 0.6, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { height: 0 } }}>
            {suggestions.map(s => (
              <Box
                key={s.name + (s.placeId || '')}
                onClick={() => tab === 'spots' ? onQuickAddSpot(s) : onQuickAddFood(s.name)}
                sx={(t) => ({
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.4,
                  px: 1.1, py: 0.55, borderRadius: '20px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff',
                  border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  transition: 'all .14s',
                  '&:hover': { borderColor: 'rgba(255,56,92,0.35)', color: '#FF385C', transform: 'translateY(-1px)' },
                })}
              >
                <AddRoundedIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                {s.name}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Curated list */}
      <Box sx={{
        flex: 1, overflowY: 'auto', px: 2.5, py: 1,
        minHeight: 160,
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { borderRadius: 2, bgcolor: 'rgba(0,0,0,0.12)' },
      }}>
        {tab === 'spots' && spots.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <ExploreIcon sx={{ fontSize: 36, color: 'text.disabled', opacity: 0.35, mb: 1 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>Your list is empty</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
              Search above or tap a suggestion to build your {pd?.name || 'day'} itinerary.
            </Typography>
          </Box>
        )}
        {tab === 'spots' && spots.map((s: PlannerSpot) => (
          <Box
            key={s.id}
            sx={(t) => ({
              display: 'flex', alignItems: 'center', gap: 1.25, py: 1, px: 0.25,
              borderBottom: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              '&:last-child': { borderBottom: 'none' },
            })}
          >
            {s.photoUrl ? (
              <Box component='img' src={s.photoUrl} alt='' sx={{ width: 44, height: 44, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <Box sx={{ width: 44, height: 44, borderRadius: '10px', flexShrink: 0, bgcolor: 'rgba(255,56,92,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ExploreIcon sx={{ fontSize: 20, color: '#FF385C', opacity: 0.5 }} />
              </Box>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontSize: 14, fontWeight: 600, lineHeight: 1.3,
                textDecoration: s.checked ? 'line-through' : 'none',
                color: s.checked ? 'text.disabled' : 'text.primary',
              }}>
                {s.name}
              </Typography>
              {s.description && (
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {s.description}
                </Typography>
              )}
            </Box>
            {!readOnly && (
              <>
                <CheckBox checked={!!s.checked} onClick={() => onToggleSpot(s.id)} />
                <IconButton size='small' onClick={() => onRemoveSpot(s.id)} sx={{ color: 'text.disabled', '&:hover': { color: '#ef4444' } }}>
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </>
            )}
          </Box>
        ))}

        {tab === 'foods' && foods.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <RestaurantRoundedIcon sx={{ fontSize: 36, color: 'text.disabled', opacity: 0.35, mb: 1 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>What do you want to eat?</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>Add dishes you don&apos;t want to miss.</Typography>
          </Box>
        )}
        {tab === 'foods' && foods.map((f: { id: string; name: string; checked?: boolean }) => (
          <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
            <RestaurantRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', opacity: 0.6 }} />
            <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 500, textDecoration: f.checked ? 'line-through' : 'none' }}>{f.name}</Typography>
            {!readOnly && (
              <>
                <CheckBox checked={!!f.checked} onClick={() => onToggleFood(f.id)} />
                <IconButton size='small' onClick={() => onRemoveFood(f.id)}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton>
              </>
            )}
          </Box>
        ))}
      </Box>

      <Box sx={(t) => ({
        flexShrink: 0, px: 2.5, py: 2, borderTop: `1px solid ${t.palette.divider}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
      })}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.55 }}>
          <Box component='img' alt='Google' src={GOOGLE_LOGO} sx={{ height: 12 }} />
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Places powered by Google</Typography>
        </Box>
        <Button
          variant='contained'
          onClick={onClose}
          sx={{
            borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: 13, px: 3,
            background: 'linear-gradient(135deg,#FF385C,#E31C5F)', boxShadow: '0 4px 20px rgba(255,56,92,0.3)',
            '&:hover': { background: 'linear-gradient(135deg,#e02d50,#c91855)' },
          }}
        >
          Done · {tab === 'spots' ? `${spots.length} places` : `${foods.length} items`}
        </Button>
      </Box>
    </Dialog>
  );
};

/*  Stay sheet  */

export interface StaySheetProps {
  open: boolean;
  onClose: () => void;
  destination?: PlannerDestination;
  stays: Array<{ id: string; name?: string; reference?: string }>;
  stayNotes: string;
  onAddProperty: () => void;
  onUpdateProperty: (stayId: string, patch: { name?: string; reference?: string }) => void;
  onDeleteProperty: (stayId: string) => void;
  onStayNotesChange: (notes: string) => void;
  readOnly?: boolean;
}

export const StaySheet: React.FC<StaySheetProps> = ({
  open, onClose, destination: d, stays, stayNotes,
  onAddProperty, onUpdateProperty, onDeleteProperty, onStayNotesChange, readOnly,
}) => {
  const planTitle = (d as PlannerDestination & { title?: string })?.title?.trim();
  const nights = d?.nights ?? 1;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='xs' PaperProps={{ sx: sheetPaper }}>
      <Box sx={{ position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
        {d?.photoUrl && (
          <Box component='img' src={d.photoUrl} alt='' sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(24px)', transform: 'scale(1.1)', opacity: 0.4 }} />
        )}
        <Box sx={{
          position: 'relative', px: 2.5, pt: 2.5, pb: 2,
          background: (t) => t.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(18,20,22,0.95) 0%, rgba(18,20,22,1) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, #fff 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}>
              <HotelIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6366f1' }}>
                Rest & recharge
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 17, lineHeight: 1.2, letterSpacing: '-0.3px' }}>
                {planTitle || d?.name || 'Stay'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <NightsStayRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {nights} night{nights !== 1 ? 's' : ''}{d?.name ? ` · ${d.name}` : ''}
                </Typography>
              </Box>
            </Box>
            <IconButton size='small' onClick={onClose}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {stays.length === 0 && (
          <Box sx={(t) => ({
            textAlign: 'center', py: 3.5, px: 2, borderRadius: '16px',
            border: `1px dashed ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
            bgcolor: t.palette.mode === 'dark' ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)',
          })}>
            <HotelIcon sx={{ fontSize: 32, color: '#6366f1', opacity: 0.5, mb: 1 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>Where are you staying?</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
              Hotel, hostel, Airbnb - add booking details so everything lives in one plan.
            </Typography>
          </Box>
        )}

        {stays.map(prop => (
          <Box
            key={prop.id}
            sx={(t) => ({
              p: 1.5, borderRadius: '14px',
              border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
              bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafbfc',
            })}
          >
            <InputBase
              disabled={readOnly}
              value={prop.name || ''}
              onChange={e => onUpdateProperty(prop.id, { name: e.target.value })}
              placeholder='Property name'
              sx={{ fontSize: 14, fontWeight: 700, width: '100%', mb: 0.75, letterSpacing: '-0.2px' }}
            />
            <InputBase
              disabled={readOnly}
              value={prop.reference || ''}
              onChange={e => onUpdateProperty(prop.id, { reference: e.target.value })}
              placeholder='Booking ref, link, or address'
              sx={{ fontSize: 12.5, width: '100%', color: 'text.secondary' }}
            />
            {!readOnly && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                <IconButton size='small' onClick={() => onDeleteProperty(prop.id)} sx={{ color: 'text.disabled', '&:hover': { color: '#ef4444' } }}>
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            )}
          </Box>
        ))}

        {!readOnly && (
          <Box
            onClick={onAddProperty}
            sx={(t) => ({
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
              py: 1.25, borderRadius: '14px', cursor: 'pointer',
              border: `1.5px dashed ${t.palette.mode === 'dark' ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.3)'}`,
              color: '#6366f1', fontWeight: 600, fontSize: 13,
              transition: 'all .15s',
              '&:hover': { bgcolor: 'rgba(99,102,241,0.06)', borderColor: '#6366f1' },
            })}
          >
            <AddRoundedIcon sx={{ fontSize: 18 }} />
            Add another property
          </Box>
        )}

        <Box sx={{ mt: 0.5 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.75 }}>
            Check-in & extras
          </Typography>
          <InputBase
            disabled={readOnly}
            multiline
            minRows={3}
            value={stayNotes}
            onChange={e => onStayNotesChange(e.target.value)}
            placeholder='Door codes, late check-in, parking, host contact…'
            sx={(t) => ({
              width: '100%', fontSize: 13, lineHeight: 1.55, p: 1.25, borderRadius: '12px',
              bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc',
              border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
            })}
          />
        </Box>
      </Box>

      <Box sx={{ flexShrink: 0, px: 2.5, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          fullWidth
          variant='contained'
          onClick={onClose}
          sx={{
            borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: 14, py: 1.1,
            background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
            boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
            '&:hover': { background: 'linear-gradient(135deg,#5558e8,#4338ca)' },
          }}
        >
          {stays.length > 0 ? `Save · ${stays.length} propert${stays.length !== 1 ? 'ies' : 'y'}` : 'Save stay details'}
        </Button>
      </Box>
    </Dialog>
  );
};
