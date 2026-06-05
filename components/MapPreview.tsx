'use client';

import { useEffect, useRef } from 'react';
import type { Coordinates } from '@/lib/types';

interface Props {
  coords: Coordinates;
  zoom?: number;
  height?: number;
}

// Mini mapa działki oparta na Leaflet.js.
// Używamy dynamicznego importu leaflet wewnątrz useEffect, aby uniknąć
// problemów z SSR (Leaflet wymaga obiektu window).
export default function MapPreview({ coords, zoom = 16, height = 240 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import('leaflet').Map | null = null;
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current).setView([coords.lat, coords.lng], zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
      L.marker([coords.lat, coords.lng]).addTo(map);
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [coords.lat, coords.lng, zoom]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border border-gray-100"
      style={{ height }}
    />
  );
}
