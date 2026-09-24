import React from 'react';
import { ensurePlacesReady } from '../../services/placeVerification';
import { toPickedPlace, type PickedPlace } from './pickedPlace';

export interface PlacePrediction {
  placeId: string;
  main: string;
  secondary?: string;
  types: string[];
}

interface Options {
  /** Coordinates to search around, so "Tiger Hill" finds the one at this stop rather than the one across the world. */
  bias?: { lat?: number; lng?: number; radiusM?: number };
  /** Google autocomplete types, such as ['(cities)'] or ['geocode']. */
  types?: string[];
  /** Prediction types to hide, such as street addresses in a "where to" search. */
  exclude?: string[];
  limit?: number;
}

const DETAIL_FIELDS = ['place_id', 'name', 'geometry', 'address_components', 'types', 'photos'];

const googlePlaces = (): any => (window as any).google?.maps?.places ?? null;

/** Google place search as state: type a query, get predictions, pick one to get a PickedPlace. */
export function usePlacesAutocomplete({ types, exclude, limit = 6, bias }: Options = {}) {
  const [query, setQuery] = React.useState('');
  const [predictions, setPredictions] = React.useState<PlacePrediction[]>([]);
  const [loading, setLoading] = React.useState(false);
  // null while the script loads; false when there is no key or it is blocked.
  const [available, setAvailable] = React.useState<boolean | null>(() => (googlePlaces() ? true : null));
  // One billing session per search: it starts with the first keystroke and ends with the details call.
  const tokenRef = React.useRef<any>(null);
  const typesKey = (types ?? []).join(',');
  const excludeKey = (exclude ?? []).join(',');

  React.useEffect(() => {
    let live = true;
    void ensurePlacesReady().then((ok) => { if (live) setAvailable(ok); });
    return () => { live = false; };
  }, []);

  /* Biasing needs maps core, not just the places library, so a missing LatLng falls back to an unbiased search. */
  const biasLat = bias?.lat;
  const biasLng = bias?.lng;
  const biasRadius = bias?.radiusM ?? 30000;
  const around = React.useCallback(() => {
    if (biasLat == null || biasLng == null) return {};
    try {
      const LatLng = (window as any).google?.maps?.LatLng;
      if (!LatLng) return {};
      return { location: new LatLng(biasLat, biasLng), radius: biasRadius };
    } catch {
      return {};
    }
  }, [biasLat, biasLng, biasRadius]);

  React.useEffect(() => {
    const q = query.trim();
    const places = googlePlaces();
    if (!q || !available || !places) { setPredictions([]); setLoading(false); return; }
    let live = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      try {
        if (!tokenRef.current) tokenRef.current = new places.AutocompleteSessionToken();
        const service = new places.AutocompleteService();
        service.getPlacePredictions(
          { input: q, sessionToken: tokenRef.current, ...(typesKey ? { types: typesKey.split(',') } : {}), ...around() },
          (res: any[] | null, status: string) => {
            if (!live) return;
            setLoading(false);
            if (status !== 'OK' || !Array.isArray(res)) { setPredictions([]); return; }
            const hidden = excludeKey ? excludeKey.split(',') : [];
            setPredictions(res
              .filter((p) => !hidden.some((t) => p.types?.includes(t)))
              .slice(0, limit)
              .map((p) => ({
                placeId: p.place_id,
                main: p.structured_formatting?.main_text || p.description,
                secondary: p.structured_formatting?.secondary_text || undefined,
                types: Array.isArray(p.types) ? p.types : [],
              })));
          },
        );
      } catch {
        if (live) { setLoading(false); setPredictions([]); }
      }
    }, 250);
    return () => { live = false; window.clearTimeout(timer); };
  }, [query, available, typesKey, excludeKey, limit, around]);

  const pick = React.useCallback((p: PlacePrediction): Promise<PickedPlace> => {
    const fallback = { placeId: p.placeId, name: p.main, detail: p.secondary, types: p.types };
    const places = googlePlaces();
    if (!places) return Promise.resolve(toPickedPlace(null, fallback));
    return new Promise((resolve) => {
      try {
        const service = new places.PlacesService(document.createElement('div'));
        service.getDetails(
          { placeId: p.placeId, fields: DETAIL_FIELDS, sessionToken: tokenRef.current ?? undefined },
          (place: unknown, status: string) => {
            tokenRef.current = null;
            resolve(toPickedPlace(status === 'OK' ? place : null, fallback));
          },
        );
      } catch {
        tokenRef.current = null;
        resolve(toPickedPlace(null, fallback));
      }
    });
  }, []);

  const reset = React.useCallback(() => { setQuery(''); setPredictions([]); }, []);

  return { query, setQuery, predictions, loading, available, pick, reset };
}
