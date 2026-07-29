import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, IconButton, Tooltip, CircularProgress, Typography, useTheme } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { PlannerDestination } from '../../store/plannerSlice';
import { isUsableCoord, routeBounds, sliceLine, type LngLat } from '../../utils/geo';
import { subscribeStopHover } from '../../utils/stopHoverBus';
import { fetchLeg, type LegRoute } from '../../services/APIs/directions/directionsService';
import { makeStopMarker, setStopMarkerActive, setStopMarkerIndex } from '../../components/map/stopMarker';
import { BRAND } from '../../theme';

const DEFAULT_CENTER: [number, number] = [20, 20]; // [lng, lat] - world overview
const DEFAULT_ZOOM = 1.6;

/**
 * Mapbox Standard, configured per theme rather than swapped for a different
 * style URL. `lightPreset` relights the same basemap, which keeps every source
 * and layer alive - where `setStyle` destroys them and forces a full re-install.
 */
const MAP_STYLE = 'mapbox://styles/mapbox/standard';

/**
 * Basemap configuration, per theme.
 *
 * `show3dObjects: false` is deliberate and not a downgrade: Standard only draws
 * 3D buildings from around zoom 15, and a camera fitted to a multi-stop trip
 * sits at zoom 6-8. Leaving it on would download extra tile data and spend GPU
 * on geometry nobody ever sees. What actually reads as depth at trip zoom is the
 * globe and its atmosphere, which cost nothing.
 *
 * `faded` + no POI labels because the route line is the subject of this map. At
 * Standard's default label density a magenta line competes with every restaurant
 * pin in the city it passes through.
 */
const basemapConfig = (isLight: boolean) => ({
  lightPreset: isLight ? 'day' : 'dusk',
  show3dObjects: false,
  theme: 'faded',
  showPointOfInterestLabels: false,
  showTransitLabels: false,
});

const SRC_ROUTE = 'tp-route';
const LYR_CASING = 'tp-route-casing';
const LYR_ROAD = 'tp-route-road';
const LYR_AIR = 'tp-route-air';
const LYR_LABEL = 'tp-route-label';

/** A leg ready to draw: geometry plus what it is. */
interface DrawnLeg extends LegRoute {
  key: string;
}

const legKey = (a: PlannerDestination, b: PlannerDestination) => `${a.id}>${b.id}`;

/**
 * Distance only - deliberately not duration.
 *
 * `feasibility.ts`'s `transitEstimate()` already shows the user a door-to-door
 * time for every leg, including airport overhead and a road detour factor.
 * Directions returns *driving* time for right now, on a trip that may be months
 * away. Rendering both would put two different times for the same leg on the
 * same screen with no explanation of the difference, and a user who spots that
 * trusts neither number. Distance is a fact about the road network and is
 * strictly better than the haversine estimate, so that is what gets shown.
 */
function legLabel(leg: LegRoute): string {
  if (leg.distanceKm == null) return '';
  return leg.distanceKm >= 10
    ? `${Math.round(leg.distanceKm)} km`
    : `${leg.distanceKm.toFixed(1)} km`;
}

interface MapPanelProps { widthFraction?: number }

const MapPanel: React.FC<MapPanelProps> = () => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const destinations = useSelector((s: RootState) => s.planner.destinations);
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const styleLoadedRef = useRef(false);
  const destinationsRef = useRef(destinations);
  destinationsRef.current = destinations;

  /** Last drawn legs, so a style reload can repaint without refetching. */
  const legsRef = useRef<DrawnLeg[]>([]);
  /** Coordinate signature of the last camera fit - see fitIfChanged. */
  const fittedRef = useRef('');
  /** Set when a fit was skipped because the container had no size yet. */
  const pendingFitRef = useRef(false);
  /** Guards async work against an unmounted map. */
  const aliveRef = useRef(true);
  const rafRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // ── Route rendering ─────────────────────────────────────────────────────

  /**
   * Creates the route source and layers.
   *
   * Called on `load` AND on `style.load`: changing the basemap tears down every
   * source and layer the app added, so this has to be re-runnable and idempotent.
   *
   * Every layer names a `slot`. Mapbox Standard does not expose its internal
   * layer ids, so `addLayer(layer, beforeId)` is silently ignored and the layer
   * lands above everything - including place labels, which the route would then
   * paint over. `middle` puts lines above roads but under labels and buildings;
   * `top` puts the distance text above POIs but under place names.
   */
  const installRouteLayers = useCallback((map: mapboxgl.Map) => {
    if (!map.getSource(SRC_ROUTE)) {
      map.addSource(SRC_ROUTE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    const line = (id: string, paint: mapboxgl.LinePaint, filter: unknown[]) => {
      if (map.getLayer(id)) return;
      map.addLayer({
        id,
        type: 'line',
        source: SRC_ROUTE,
        slot: 'middle',
        filter: filter as never,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint,
      } as mapboxgl.AnyLayer);
    };

    // Casing first: a wide, low-opacity line beneath the route. Standard
    // cartography - it separates the route from whatever it crosses, so the
    // line stays readable over motorways, water and dense city fill alike.
    line(LYR_CASING, {
      'line-color': isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,14,0.85)',
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 6, 12, 10],
    }, ['!=', ['get', 'kind'], '__none__']);

    line(LYR_ROAD, {
      'line-color': BRAND.coral,
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2.5, 12, 4.5],
    }, ['==', ['get', 'kind'], 'road']);

    // Dashed, and slightly translucent: this leg is an approximation of a flight
    // path, not a surveyed route, and it should not claim otherwise.
    line(LYR_AIR, {
      'line-color': BRAND.coral,
      'line-opacity': 0.85,
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2, 12, 3.5],
      'line-dasharray': [1.5, 1.5],
    }, ['==', ['get', 'kind'], 'arc']);

    if (!map.getLayer(LYR_LABEL)) {
      map.addLayer({
        id: LYR_LABEL,
        type: 'symbol',
        source: SRC_ROUTE,
        slot: 'top',
        filter: ['!=', ['get', 'label'], ''],
        layout: {
          'symbol-placement': 'line-center',
          'text-field': ['get', 'label'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': 11,
          'text-allow-overlap': false,
// Keeps the text clear of the line it annotates.
          'text-offset': [0, -0.9],
        },
        paint: {
          'text-color': isLight ? '#1C1C21' : '#F5F5F7',
          'text-halo-color': isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,14,0.9)',
          'text-halo-width': 1.5,
        },
      } as mapboxgl.AnyLayer);
    }
  }, [isLight]);

  /** Paints `legsRef` into the source, optionally truncated for the draw-on. */
  const paintRoute = useCallback((progress = 1) => {
    const map = mapRef.current;
    const src = map?.getSource(SRC_ROUTE) as mapboxgl.GeoJSONSource | undefined;
    if (!map || !src) return;

    const legs = legsRef.current;
    // Progress runs across the whole route, so legs reveal in travel order
    // rather than all at once - the line reads as a journey being traced.
    const total = legs.length;
    const features = legs.map((leg, i) => {
      const legStart = i / total;
      const legEnd = (i + 1) / total;
      let coords: LngLat[] = leg.coords;
      if (progress <= legStart) coords = [];
      else if (progress < legEnd) {
        coords = sliceLine(leg.coords, (progress - legStart) / (legEnd - legStart));
      }
      return {
        type: 'Feature' as const,
        // Labels only once the leg is fully drawn, so text does not flicker in.
        properties: {
          kind: leg.kind,
          label: progress >= legEnd ? legLabel(leg) : '',
        },
        geometry: { type: 'LineString' as const, coordinates: coords.length >= 2 ? coords : [] },
      };
    });

    src.setData({ type: 'FeatureCollection', features });
  }, []);

  /**
   * Animates the route in by advancing a cut point along it.
   *
   * `line-gradient` is the usual trick for this, but it requires
   * `lineMetrics: true` and cannot coexist with `line-dasharray` - which the
   * flight arcs need. Slicing the geometry works for solid and dashed alike.
   */
  const animateRoute = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || legsRef.current.length === 0) { paintRoute(1); return; }

    const DURATION = 900;
    const start = performance.now();
    const step = (now: number) => {
      if (!aliveRef.current) return;
      const t = Math.min(1, (now - start) / DURATION);
      paintRoute(t < 1 ? 1 - (1 - t) ** 3 : 1); // easeOutCubic
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [paintRoute]);

  /**
   * Resolves geometry for each consecutive pair of mappable stops.
   *
   * Stops without usable coordinates break the chain rather than being bridged
   * over: joining stop 1 to stop 3 because 2 failed to geocode would draw a leg
   * the traveller is not taking.
   */
  const rebuildRoute = useCallback(async (dests: PlannerDestination[]) => {
    const legs: DrawnLeg[] = [];
    const requests: Promise<void>[] = [];

    for (let i = 0; i < dests.length - 1; i++) {
      const a = dests[i];
      const b = dests[i + 1];
      if (!isUsableCoord(a.lat, a.lng) || !isUsableCoord(b.lat, b.lng)) continue;

      const from = { lat: a.lat!, lng: a.lng! };
      const to = { lat: b.lat!, lng: b.lng! };
      // A stop's `transport` is the mode used to DEPART it for the next stop.
      const mode = a.transport ?? '';
      const key = legKey(a, b);
      const slot = legs.length;
      legs.push({ key, coords: [], distanceKm: null, durationMin: null, kind: 'arc', mode });

      requests.push(
        fetchLeg(from, to, mode, token).then((route) => {
          legs[slot] = { ...route, key };
        }),
      );
    }

    await Promise.all(requests);
    if (!aliveRef.current) return;

    legsRef.current = legs.filter((l) => l.coords.length >= 2);
    animateRoute();
  }, [token, animateRoute]);

  // ── Markers + camera ────────────────────────────────────────────────────

  const syncMarkers = useCallback((dests: PlannerDestination[]) => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    // `!= null` used to be the test here, which admits 0 - so a stop whose
    // geocode failed and stored (0,0) was rendered at Null Island and then
    // dragged the camera across two hemispheres to fit it.
    // The number on a marker must be the stop's position in the itinerary, not
    // its position among the mappable stops. Numbering off the filtered list
    // meant that if stop 2 failed to geocode, stop 3's marker read "2" - forever
    // out of step with the card rail and the drawer legend, which both number by
    // array index.
    const withCoords = dests
      .map((d, index) => ({ d, index }))
      .filter(({ d }) => isUsableCoord(d.lat, d.lng));

    const liveIds = new Set(withCoords.map(({ d }) => d.id));
    Object.keys(markersRef.current).forEach((id) => {
      if (!liveIds.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; }
    });

    withCoords.forEach(({ d, index }) => {
      const existing = markersRef.current[d.id];
      if (existing) {
        existing.setLngLat([d.lng!, d.lat!]);
        // Mutates one text node. The old code reassigned innerHTML on every
        // sync, which would wipe the hover state on any unrelated edit.
        setStopMarkerIndex(existing.getElement(), index);
      } else {
        const el = makeStopMarker({ index });
        el.dataset.stopId = d.id;
        markersRef.current[d.id] = new mapboxgl.Marker({ element: el })
          .setLngLat([d.lng!, d.lat!])
          .addTo(map);
      }
    });

    fitIfChanged(withCoords.map(({ d }) => d));
  }, []);

  /**
   * Fits the camera only when the set of coordinates actually changes.
   *
   * This used to run on every `destinations` identity change, so renaming a stop
   * or editing a note yanked the camera back from wherever the user had panned.
   */
  const fitIfChanged = (withCoords: PlannerDestination[]) => {
    const map = mapRef.current;
    if (!map) return;

    const signature = withCoords.map((d) => `${d.lng!.toFixed(3)},${d.lat!.toFixed(3)}`).join('|');
    if (signature === fittedRef.current) return;

    // The side rail hides its map with `display: none` and the drawer keeps a
    // hidden copy mounted, so this can run against a 0x0 canvas - which yields a
    // nonsense zoom. Defer until the ResizeObserver reports real dimensions.
    const el = map.getContainer();
    if (el.clientHeight < 40 || el.clientWidth < 40) { pendingFitRef.current = true; return; }

    fittedRef.current = signature;
    pendingFitRef.current = false;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 0 : 900;

    if (withCoords.length > 1) {
      const box = routeBounds(withCoords.map((d) => [d.lng!, d.lat!] as LngLat));
      if (!box) return;
      // Padding is clamped: on a narrow side rail a fixed 70px can exceed half
      // the container and mapbox then computes a garbage zoom.
      const pad = Math.max(24, Math.min(70, Math.floor(Math.min(el.clientWidth, el.clientHeight) / 5)));
      map.fitBounds([[box[0], box[1]], [box[2], box[3]]], { padding: pad, maxZoom: 11, duration });
    } else if (withCoords.length === 1) {
      const center: [number, number] = [withCoords[0].lng!, withCoords[0].lat!];
      if (reduced) map.jumpTo({ center, zoom: 8 });
      else map.flyTo({ center, zoom: 8, duration });
    }
  };

  // ── Map lifecycle ───────────────────────────────────────────────────────

  useEffect(() => {
    aliveRef.current = true;
    if (!token) { setLoading(false); setError('VITE_MAPBOX_TOKEN is not set.'); return; }
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      // Globe keeps a long-haul trip honest: a Dubai-to-Tokyo arc bows over the
      // pole the way the flight does. fitBounds pulls regional trips in close
      // enough that the projection stops mattering.
      projection: { name: 'globe' },
      attributionControl: false,
      config: { basemap: basemapConfig(isLight) },
    });

    const onStyleReady = () => {
      styleLoadedRef.current = true;
      installRouteLayers(map);
      syncMarkers(destinationsRef.current);
      // Repaint from cache: a style reload wipes the source but not our legs.
      paintRoute(1);
    };

    map.on('load', () => {
      setLoading(false);
      setMapReady(true);
      onStyleReady();
    });
    map.on('style.load', onStyleReady);

    mapRef.current = map;

    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
      // The panel was hidden when the camera last wanted to move; now that it
      // has real dimensions, run the fit that was deferred.
      if (pendingFitRef.current && styleLoadedRef.current) {
        fittedRef.current = '';
        syncMarkers(destinationsRef.current);
      }
    });
    ro.observe(containerRef.current);

    return () => {
      aliveRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /**
   * Theme change relights the basemap in place.
   *
   * `setConfigProperty` rather than `setStyle`: it swaps the lighting without
   * destroying the route source and layers, so there is nothing to reinstall and
   * no flash of an empty map.
   */
  useEffect(() => {
    const map = mapRef.current;
    // setConfigProperty throws if the style has not loaded; the initial config
    // passed to the constructor already covers that case.
    if (!map || !styleLoadedRef.current) return;
    Object.entries(basemapConfig(isLight)).forEach(([k, v]) => {
      map.setConfigProperty('basemap', k, v);
    });
    installRouteLayers(map);
  }, [isLight, installRouteLayers]);

  useEffect(() => {
    if (!mapReady) return;
    syncMarkers(destinations);
    void rebuildRoute(destinations);
  }, [destinations, mapReady, syncMarkers, rebuildRoute]);

  /**
   * Hover-sync with the stop cards.
   *
   * A window event rather than props: the cards live in DestinationCardsPanel,
   * a different subtree, and routing this through TripPlanner would mean
   * threading state through a 3,600-line component for a hover effect. The
   * codebase already uses this pattern for `tripician:route-updated`.
   */
  useEffect(() => subscribeStopHover(({ id, source }) => {
    // Ignore our own echo, or the two sides ping-pong forever.
    if (source === 'map') return;
    Object.entries(markersRef.current).forEach(([stopId, marker]) => {
      setStopMarkerActive(marker.getElement(), stopId === id);
    });
    // Deliberately no camera movement: the cards are a scrolling list, and
    // panning the map as the pointer crosses rows turns it into a slot machine.
  }), []);

  const centerOnFirst = useCallback(() => {
    const first = destinations.find((d) => isUsableCoord(d.lat, d.lng));
    if (mapRef.current && first) {
      mapRef.current.flyTo({ center: [first.lng!, first.lat!], zoom: 8, duration: 600 });
    }
  }, [destinations]);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Inline style, NOT sx: mapbox-gl.css sets `.mapboxgl-map { position: relative }`
          which ties with the emotion class on specificity, whichever stylesheet loads
          later wins, and with lazy chunks that's a coin flip (it collapsed the panel to
          0 height in production). Inline styles beat both, deterministically. */}
      <Box ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {loading && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', zIndex: 10 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {!loading && error && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 3, textAlign: 'center', bgcolor: 'background.default', zIndex: 10 }}>
          <Typography variant="body2" fontWeight={600}>Map could not be loaded</Typography>
          <Typography variant="caption" color="text.secondary">{error}</Typography>
        </Box>
      )}

      {!loading && !error && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 1, zIndex: 5 }}>
          <Tooltip title="Centre on first destination" placement="left">
            <IconButton size="small" onClick={centerOnFirst}
              sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}>
              <MyLocationIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default MapPanel;
