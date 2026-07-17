import React, { useEffect, useRef, useState } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

export interface TravelMapProps {
  visited?: string[];
  planned?: string[];
  upcoming?: string[];
  autoRotate?: boolean;
  rotationSpeedDegPerSec?: number;
  disableAttribution?: boolean;
  persistUserControl?: boolean;
}

const highlightColors = {
  visited: "#0B5F89",
  planned: "#2B89C7",
  upcoming: "#FBBF24",
};

const TravelMap: React.FC<TravelMapProps> = ({
  visited = [],
  planned = [],
  upcoming = [],
  autoRotate = true,
  rotationSpeedDegPerSec = 3,
  disableAttribution = true,
  persistUserControl = true,
}) => {
  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rotateTimer = useRef<number | null>(null);
  const userInteractedRef = useRef<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const createLayer = (id: string, codes: string[], color: string) => ({
    id,
    type: "fill" as const,
    source: "country-borders",
    "source-layer": "country_boundaries",
    filter: ["in", "iso_3166_1_alpha_3", ...codes],
    paint: {
      "fill-color": color,
      "fill-opacity": 0.75,
    },
  });

  const startRotation = (map: Map) => {
    if (!autoRotate || userInteractedRef.current) return;

    stopRotation();

    const interval = 30;
    const degPerTick = (rotationSpeedDegPerSec * interval) / 1000;

    rotateTimer.current = window.setInterval(() => {
      const center = map.getCenter();
      const newLng = center.lng + degPerTick;
      map.easeTo({
        center: [newLng, center.lat],
        duration: interval,
        easing: (t) => t,
      });
    }, interval);
  };

  const stopRotation = () => {
    if (rotateTimer.current) {
      clearInterval(rotateTimer.current);
      rotateTimer.current = null;
    }
  };

  // ------------------ INITIALIZE MAP ------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapboxgl.accessToken) {
      setMapError("Map is not configured (missing Mapbox token).");
      return;
    }

    let map: Map;
    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        projection: "globe",
        center: [0, 20],
        zoom: 1,
        minZoom: 1,
        maxZoom: 1,
        pitch: 5,
        antialias: true,
        attributionControl: !disableAttribution,
        scrollZoom: false,
        doubleClickZoom: false,
      });
    } catch (err) {
      console.error("[TravelMap] failed to initialise", err);
      setMapError("Map could not be loaded.");
      return;
    }

    mapRef.current = map;
    map.on("error", (e) => {
      console.error("[TravelMap] mapbox error", e?.error ?? e);
      setMapError("Map could not be loaded.");
    });

    const markInteraction = () => {
      userInteractedRef.current = true;
      stopRotation();
    };

    map.on("dragstart", markInteraction);
    map.on("zoomstart", markInteraction);
    map.on("rotatestart", markInteraction);
    map.on("pitchstart", markInteraction);

    if (!persistUserControl) {
      map.on("dragend", () => startRotation(map));
      map.on("zoomend", () => startRotation(map));
      map.on("rotateend", () => startRotation(map));
      map.on("pitchend", () => startRotation(map));
    }

    map.on("style.load", () => {
      // Remove default sky
      try {
        map.getStyle().layers?.forEach((l: any) => {
          if (l.type === "sky") map.removeLayer(l.id);
        });
      } catch {}

      // ---- REALISTIC EARTH COLORS -----

      // Ocean depth
      map.setPaintProperty("water", "fill-color", [
        "interpolate",
        ["linear"],
        ["zoom"],
        0, "#a3d5ff", // shallow
        5, "#1a4e8c", // deep
      ]);

      // Land base
      if (map.getLayer("land")) {
        map.setPaintProperty("land", "background-color", "#C7E9B0");
      }

      // Terrain / Mountains
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.terrain-rgb",
        });
      }

      if (!map.getLayer("hillshade")) {
        map.addLayer(
          {
            id: "hillshade",
            type: "hillshade",
            source: "mapbox-dem",
            paint: {
              "hillshade-shadow-color": "#7a674f",
              "hillshade-highlight-color": "#dcd7c6",
              "hillshade-exaggeration": 0.6,
            },
          },
          "water"
        );
      }

      // Landcover classes for realistic terrain
      if (map.getLayer("landcover")) {
        map.setPaintProperty("landcover", "fill-color", [
          "match",
          ["get", "class"],
          "forest", "#1f5a20",
          "grass", "#6caf50",
          "scrub", "#a8a878",
          "tundra", "#cccccc",
          "desert", "#e4d96f",
          "wetland", "#2a7f7f",
          "ice", "#ffffff",       // snow / ice
          "glacier", "#ffffff",   // glacier peaks
          "#c7e9b0"               // default land
        ]);
      }

      // Transparent fog
      map.setFog({
        "horizon-blend": 0.0,
        color: "rgba(0,0,0,0)",
        "space-color": "rgba(0,0,0,0)",
        "star-intensity": 0,
      });

      // Remove padding
      map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });

      // Country borders
      if (!map.getSource("country-borders")) {
        map.addSource("country-borders", {
          type: "vector",
          url: "mapbox://mapbox.country-boundaries-v1",
        });
      }

      // Highlight layers
      if (visited.length)
        map.addLayer(createLayer("visited-layer", visited, highlightColors.visited));
      if (planned.length)
        map.addLayer(createLayer("planned-layer", planned, highlightColors.planned));
      if (upcoming.length)
        map.addLayer(createLayer("upcoming-layer", upcoming, highlightColors.upcoming));

      startRotation(map);
    });

    return () => {
      stopRotation();
      map.remove();
    };
  }, []);

  // ----- KEEP THE GLOBE CENTERED & FULLY VISIBLE -----
  // The map canvas is a centered square sized to the SMALLER wrapper dimension,
  // so the globe always fits the container instead of overflowing it.
  // (The old version forced the wrapper square-by-width: in a wide, short
  // container the globe's centre ended up hundreds of px below the visible
  // area, a blank white box.)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = mapContainerRef.current;
    if (!wrapper || !inner) return;

    const fit = () => {
      const rect = wrapper.getBoundingClientRect();
      const side = Math.max(120, Math.min(rect.width, rect.height));
      inner.style.width = `${side}px`;
      inner.style.height = `${side}px`;
      mapRef.current?.resize();
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrapper);

    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 0,
        overflow: "hidden",
        background: "transparent",
      }}
    >
      {/* Fix positioning & transparency */}
      <style>
        {`
          .mapboxgl-canvas, .mapboxgl-map {
            background: transparent !important;
            top: 0 !important;
            transform: translateY(0) !important;
          }
          ${disableAttribution ? `.mapboxgl-ctrl-bottom-right, .mapboxgl-ctrl-logo { display: none !important; }` : ""}
        `}
      </style>

      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%",
          flexShrink: 0,
          background: "transparent",
        }}
      />

      {mapError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.03)",
            color: "rgba(0,0,0,0.4)",
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
            textAlign: "center",
            padding: 16,
          }}
        >
          {mapError}
        </div>
      )}
    </div>
  );
};

export default TravelMap;
