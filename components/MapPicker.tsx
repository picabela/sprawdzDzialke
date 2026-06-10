'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from '@/lib/types';

interface Props {
  value: Coordinates | null;
  onChange: (coords: Coordinates) => void;
  height?: number;
}

// Mapa do ZAZNACZANIA punktu raportu klikiem. Leaflet ładowany dynamicznie
// (wymaga window). Marker przenosi się tam, gdzie klikniesz.
export default function MapPicker({ value, onChange, height = 360 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let map: import('leaflet').Map | null = null;
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      const start = value || { lat: 52.0693, lng: 19.4803 }; // środek Polski
      map = L.map(containerRef.current, {
        center: [start.lat, start.lng],
        zoom: value ? 16 : 6,
        scrollWheelZoom: true,
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

      if (value) {
        markerRef.current = L.marker([value.lat, value.lng], { icon: pin }).addTo(map);
      }

      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else if (map) {
          markerRef.current = L.marker([lat, lng], { icon: pin }).addTo(map);
        }
        onChangeRef.current({ lat, lng });
      });

      setTimeout(() => map?.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      markerRef.current = null;
      if (map) map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="border border-neutral-700">
      <div ref={containerRef} style={{ height }} className="w-full" />
      <div className="px-4 py-2.5 bg-neutral-900 border-t border-neutral-700 text-xs text-neutral-400">
        {value
          ? `Wybrany punkt: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : 'Kliknij na mapie, aby wskazać miejsce do sprawdzenia'}
      </div>
    </div>
  );
}
