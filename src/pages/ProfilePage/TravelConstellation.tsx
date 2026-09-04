import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { apiServices } from '../../services/APIs/apiServices';
import { countryCodeFromName, flagSvgUrl } from '../../utils/countryFlags';
import SectionHeader from '../../components/ui/SectionHeader';

export type TravelTier = 'locked' | 'unlocked' | 'gold';

export interface TravelCountry {
  name: string;
  tier: TravelTier;
  firstAt: string | null;
  /**
   * False only on your own map, the one case where unpublished trips are
   * included. "Planned for next year" and "went, never published" are both
   * locked, and they need different words.
   */
  published?: boolean;
}

export interface TravelMap {
  countries: TravelCountry[];
  legs: string[][];
}

interface TravelConstellationProps {
  userId: number;
  /** Shown in the empty state, which differs for your own profile. */
  isOwner?: boolean;
}

/**
 * Somebody's countries, in the order they reached them.
 *
 * ## Why this is not a map
 *
 * There are no country coordinates anywhere in this codebase, and none are
 * invented here. Nodes are laid out CHRONOLOGICALLY and the lines between them
 * are the traveller's actual sequence of moves, so the shape on screen is a
 * journey rather than a geography we would be guessing at. Placing dots at
 * plausible-looking positions would imply a precision the data does not have.
 *
 * ## Why the tiers matter more than the picture
 *
 * A country you typed into a plan costs nothing, so it stays locked. One on a
 * trip that has ended is unlocked. One that somebody OTHER than the traveller
 * can attest to, because another member was there, a story was published, or
 * Tripician reviewed it, is gold. Only the last is beyond the reach of a person
 * filling in a form, which is the whole reason it gets its own colour.
 *
 * This deliberately does not unlock by geolocation. A browser coordinate is set
 * from the DevTools Sensors panel in three clicks, so a mark earned that way
 * would look more authoritative than the evidence above while being worth less.
 */
const TravelConstellation: React.FC<TravelConstellationProps> = ({ userId, isOwner }) => {
  const theme = useTheme();
  /*
   * The row width is chosen, not scaled to. Letting one fixed row count shrink
   * to fit a phone drops the labels to about six pixels, which is a picture of
   * a constellation rather than one you can read.
   *
   * Measured from the card, not from viewport breakpoints. Once the identity
   * rail takes 340px out of the page, a 1200px viewport leaves about 844px here
   * and the old lg setting of nine per row needed 828 - right by four pixels,
   * which is not a design. The element knows its own width; ask it.
   */
  /*
   * A callback ref, not useRef plus an effect on mount.
   *
   * The card does not exist on the first render: this component returns null
   * until the map arrives. A mount effect therefore looked at a null ref, never
   * ran again once the card appeared, and left the layout stuck on the
   * three-per-row fallback at every width. A callback ref fires when the node
   * actually attaches, which is the moment there is something to measure.
   */
  const [cardWidth, setCardWidth] = React.useState(0);
  const observer = React.useRef<ResizeObserver | null>(null);
  const cardRef = React.useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof ResizeObserver === 'undefined') return;
    // contentRect is the inner box, which is exactly what the svg gets.
    const ro = new ResizeObserver(([entry]) => setCardWidth(entry.contentRect.width));
    ro.observe(node);
    observer.current = ro;
  }, []);
  React.useEffect(() => () => observer.current?.disconnect(), []);

  const [map, setMap] = React.useState<TravelMap | null>(null);
  const [hovered, setHovered] = React.useState<string | null>(null);

  // Matched on the request's own id rather than a cleanup flag: an effect that
  // is torn down and re-invoked would otherwise discard its own reply.
  React.useEffect(() => {
    if (!Number.isFinite(userId) || userId <= 0) return;
    let wanted = userId;
    void apiServices.getTravelMap(userId)
      .then((resp) => { if (wanted === userId) setMap(resp.data); })
      .catch(() => { if (wanted === userId) setMap({ countries: [], legs: [] }); });
    return () => { wanted = -1; };
  }, [userId]);

  const tone = React.useMemo(() => ({
    locked: theme.palette.text.disabled,
    unlocked: theme.palette.text.primary,
    gold: theme.palette.primary.main,
  }), [theme]);

  if (!map) return null;

  const countries = map.countries ?? [];

  // A stranger with no trips already gets told so by the empty trips grid below.
  // Saying it twice makes the page look broken rather than new.
  if (countries.length === 0 && !isOwner) return null;

  if (countries.length === 0) {
    return (
      <Box>
        <SectionHeader title="Travel history" />
        <Box
          sx={{
            borderRadius: '16px',
            border: `1px dashed ${theme.custom.surface.border}`,
            px: 3, py: 4, textAlign: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {isOwner
              ? 'Your travel history starts with your first published trip. Plan one and it appears here.'
              : 'No published trips yet.'}
          </Typography>
        </Box>
      </Box>
    );
  }

  const confirmed = countries.filter((c) => c.tier === 'gold').length;
  const visited = countries.filter((c) => c.tier !== 'locked').length;
  // Only ever non-zero on your own map. The endpoint gives strangers published
  // trips only, so for them every country is published by construction.
  const unpublished = countries.filter((c) => c.published === false).length;

  /*
   * A serpentine layout rather than one long line.
   *
   * A single row runs off the side of a phone by about the fifth country, and a
   * circle puts the earliest and latest journeys next to each other, which reads
   * as a loop nobody travelled. Wrapping in rows that alternate direction keeps
   * the sequence continuous and readable at any width.
   */
  const STEP_X = 92;
  const STEP_Y = 78;
  const PAD = 46;

  // Before the observer reports, assume the narrow case: too few per row is a
  // reflow, too many is a first paint with unreadable labels.
  const fits = cardWidth > 0 ? Math.floor((cardWidth - PAD * 2) / STEP_X) + 1 : 3;
  const PER_ROW = Math.max(3, Math.min(9, fits));

  const positions = countries.map((c, i) => {
    const row = Math.floor(i / PER_ROW);
    const col = i % PER_ROW;
    const leftToRight = row % 2 === 0;
    return {
      country: c,
      x: PAD + (leftToRight ? col : PER_ROW - 1 - col) * STEP_X,
      y: PAD + row * STEP_Y,
    };
  });

  const byName = new Map(positions.map((p) => [p.country.name.toLowerCase(), p]));
  const width = PAD * 2 + (Math.min(countries.length, PER_ROW) - 1) * STEP_X;
  const height = PAD * 2 + (Math.ceil(countries.length / PER_ROW) - 1) * STEP_Y;

  // Only legs whose both ends are on screen. A leg to a country that never made
  // the list would be a line into nowhere.
  const legs = (map.legs ?? [])
    .map(([from, to]) => ({ a: byName.get(from?.toLowerCase()), b: byName.get(to?.toLowerCase()) }))
    .filter((l): l is { a: NonNullable<typeof l.a>; b: NonNullable<typeof l.b> } => Boolean(l.a && l.b));

  const isLit = (name: string) =>
    hovered !== null && (hovered === name
      || legs.some(({ a, b }) =>
        (a.country.name === hovered && b.country.name === name)
        || (b.country.name === hovered && a.country.name === name)));

  return (
    <Box>
      <SectionHeader
        title="Travel history"
        // Counted, not rounded up, and it has to reconcile with the figures in
        // the identity rail. Those count your private trips too, so when this
        // map includes them the total leads and the published share follows;
        // otherwise the reader sees 44 countries beside "none travelled yet".
        subtitle={unpublished > 0
          ? [
              `${countries.length} ${countries.length === 1 ? 'country' : 'countries'}`,
              `${countries.length - unpublished} published`,
              confirmed > 0 ? `${confirmed} confirmed by someone else` : null,
            ].filter(Boolean).join(' · ')
          : visited === 0
            ? `${countries.length} ${countries.length === 1 ? 'country' : 'countries'} planned, none travelled yet`
            : `${visited} ${visited === 1 ? 'country' : 'countries'} travelled${confirmed > 0 ? `, ${confirmed} confirmed by someone else` : ''}`}
      />
      <Box
        ref={cardRef}
        sx={{
          borderRadius: '16px',
          border: `1px solid ${theme.custom.surface.border}`,
          bgcolor: 'background.paper',
          p: { xs: 1.5, sm: 2 },
          overflowX: 'auto',
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ maxWidth: width, display: 'block', margin: '0 auto', overflow: 'visible' }}
          role="img"
          aria-label={`${countries.length} countries, in the order they were reached`}
        >
          {legs.map(({ a, b }, i) => {
            const lit = hovered !== null
              && (a.country.name === hovered || b.country.name === hovered);
            return (
              <motion.line
                key={`${a.country.name}-${b.country.name}-${i}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={lit ? tone.gold : theme.custom.surface.border}
                strokeWidth={lit ? 1.8 : 1}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.7, delay: Math.min(i * 0.04, 0.8), ease: 'easeOut' }}
              />
            );
          })}

          {positions.map(({ country, x, y }, i) => {
            const code = countryCodeFromName(country.name);
            const flag = code ? flagSvgUrl(code) : undefined;
            const active = hovered === country.name || isLit(country.name);
            const colour = tone[country.tier] ?? tone.locked;

            return (
              <motion.g
                key={country.name}
                onMouseEnter={() => setHovered(country.name)}
                onMouseLeave={() => setHovered(null)}
                // Scale from the node, not from the corner of the canvas.
                style={{ cursor: 'default', transformOrigin: `${x}px ${y}px` }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: active ? 1.14 : 1 }}
                transition={{
                  opacity: { duration: 0.35, delay: Math.min(i * 0.05, 1) },
                  scale: { type: 'spring', stiffness: 320, damping: 22 },
                }}
              >
                {country.tier === 'gold' && (
                  <circle cx={x} cy={y} r={22} fill={tone.gold} opacity={active ? 0.16 : 0.08} />
                )}

                {/* Paper behind the flag, so a translucent or part-white flag
                    sits on a known ground rather than on whatever is behind. */}
                <circle cx={x} cy={y} r={16} fill={theme.palette.background.paper} />

                {/* The flag IS the node. These are authored as circles, so there
                    is nothing to crop and no clip path to apply: the disc is the
                    whole flag rather than the middle third of a rectangle. */}
                {flag && (
                  <image
                    href={flag} x={x - 16} y={y - 16} width={32} height={32}
                    // A locked country is a place you have not been. Draining the
                    // colour says that faster than any label, and it reads now
                    // that the whole disc is flag instead of a 22x16 sliver.
                    opacity={country.tier === 'locked' ? 0.4 : 1}
                    style={{ filter: country.tier === 'locked' ? 'grayscale(1)' : undefined }}
                  />
                )}

                {/* Japan and Nauru are almost entirely white and would dissolve
                    into a white card without an edge of their own. Drawn under
                    the tier ring so it never competes with it. */}
                <circle
                  cx={x} cy={y} r={16}
                  fill="none"
                  stroke={theme.custom.surface.border}
                  strokeWidth={1}
                />

                <circle
                  cx={x} cy={y} r={16}
                  fill="none"
                  stroke={colour}
                  strokeWidth={country.tier === 'locked' ? 1.2 : 2}
                  strokeDasharray={country.tier === 'locked' ? '3 3' : undefined}
                />
                <text
                  x={x} y={y + 31}
                  textAnchor="middle"
                  style={{
                    fontSize: 10,
                    fontWeight: active ? 700 : 500,
                    fill: country.tier === 'locked' ? theme.palette.text.disabled : theme.palette.text.secondary,
                    fontFamily: theme.typography.fontFamily,
                  }}
                >
                  {country.name.length > 12 ? `${country.name.slice(0, 11)}...` : country.name}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </Box>

      {/* A colour that means "somebody else can attest to this" has to say so
          somewhere, or it is decoration. */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.25, px: 0.5 }}>
        {([
          ['gold', 'Confirmed by someone else'],
          ['unlocked', 'Trip finished'],
          // Locked covers two things on your own map: not published, and not yet
          // taken. A stranger only ever sees the second, so only they get told
          // the second on its own.
          ['locked', unpublished > 0 ? 'Not published, or not yet taken' : 'Planned, not yet taken'],
        ] as Array<[TravelTier, string]>).map(([tier, label]) => (
          <Box key={tier} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
            <Box
              sx={{
                width: 9, height: 9, borderRadius: '50%',
                border: `1.5px solid ${tone[tier]}`,
                bgcolor: tier === 'gold' ? tone.gold : 'transparent',
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>{label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default TravelConstellation;
