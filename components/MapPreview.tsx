'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from '@/lib/types';

interface Props {
  coords: Coordinates;
  zoom?: number;
  height?: number;
  label?: string;
}

// Mini mapa lokalizacji oparta na Leaflet.js + kafelki OpenStreetMap.
// Leaflet importujemy dynamicznie wewnątrz useEffect (wymaga obiektu window,
// więc nie może działać po stronie serwera). Znacznik rysujemy jako divIcon
// (SVG), dzięki czemu nie zależymy od domyślnych obrazków Leaflet, które
// psują się w bundlerach.
export default function MapPreview({ coords, zoom = 15, height = 280, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import('leaflet').Map | null = null;
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, {
        center: [coords.lat, coords.lng],
        zoom,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const pin = L.divIcon({
        className: 'sd-pin',
        html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.7 0 1 6.7 1 15c0 10.5 13.2 25.5 13.8 26.1.6.7 1.8.7 2.4 0C18.8 40.5 31 25.5 31 15 31 6.7 24.3 0 16 0z" fill="#059669"/>
          <circle cx="16" cy="15" r="6" fill="#fff"/>
        </svg>`,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
      });
      L.marker([coords.lat, coords.lng], { icon: pin }).addTo(map);

      // Leaflet czasem liczy rozmiar zanim kontener dostanie wymiary
      setTimeout(() => map?.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [coords.lat, coords.lng, zoom]);

  return (
    <div className="border border-neutral-200 bg-white">
      <div ref={containerRef} style={{ height }} className="w-full" />
      {label && (
        <div className="px-4 py-3 border-t border-neutral-200 text-xs text-neutral-500">
          📍 {label}
        </div>
      )}
    </div>
  );
}
