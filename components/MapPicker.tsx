'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from '@/lib/types';
import Icon from './Icon';

interface Props {
  value: Coordinates | null;
  onChange: (coords: Coordinates) => void;
  height?: number;
}

interface Suggestion {
  label: string;
  lat: number;
  lng: number;
}

const PIN_SVG = `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 0C7.7 0 1 6.7 1 15c0 10.5 13.2 25.5 13.8 26.1.6.7 1.8.7 2.4 0C18.8 40.5 31 25.5 31 15 31 6.7 24.3 0 16 0z" fill="#059669"/>
  <circle cx="16" cy="15" r="6" fill="#fff"/>
</svg>`;

// Mapa do ZAZNACZANIA punktu raportu klikiem, z wyszukiwarką do szybkiego
// dolotu w okolicę (zamiast przewijania całej Polski). Leaflet ładowany
// dynamicznie (wymaga window).
export default function MapPicker({ value, onChange, height = 360 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // wyszukiwarka nad mapą
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSug, setShowSug] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSug(true);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const placeMarker = (lat: number, lng: number) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const pin = L.divIcon({
        className: 'sd-pin',
        html: PIN_SVG,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
      });
      markerRef.current = L.marker([lat, lng], { icon: pin }).addTo(map);
    }
  };

  const flyToSuggestion = (s: Suggestion) => {
    setQuery(s.label);
    setShowSug(false);
    const map = mapRef.current;
    if (!map) return;
    map.setView([s.lat, s.lng], 17);
    placeMarker(s.lat, s.lng);
    onChangeRef.current({ lat: s.lat, lng: s.lng });
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;

      const start = value || { lat: 52.0693, lng: 19.4803 }; // środek Polski
      const map = L.map(containerRef.current, {
        center: [start.lat, start.lng],
        zoom: value ? 16 : 6,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      if (value) placeMarker(value.lat, value.lng);

      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        placeMarker(lat, lng);
        onChangeRef.current({ lat, lng });
      });

      setTimeout(() => map.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      markerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="border border-neutral-700">
      {/* Wyszukiwarka — przybliża mapę do okolicy */}
      <div className="relative bg-neutral-900 border-b border-neutral-700">
        <div className="flex items-center">
          <span className="pl-4 text-neutral-500">
            <Icon name="search" size={16} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length && setShowSug(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && suggestions.length > 0) flyToSuggestion(suggestions[0]);
            }}
            placeholder="Znajdź okolicę, np. Polna, Poznań — potem doprecyzuj klikiem"
            className="flex-1 px-3 py-3 text-sm outline-none bg-transparent text-white placeholder-neutral-500"
            autoComplete="off"
          />
        </div>
        {showSug && suggestions.length > 0 && (
          <ul className="absolute z-[1000] left-0 right-0 top-full bg-neutral-900 border border-neutral-700 max-h-60 overflow-auto">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  onClick={() => flyToSuggestion(s)}
                  className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-neutral-800 border-b border-neutral-800 last:border-0"
                >
                  <span className="text-neutral-500 mt-0.5">
                    <Icon name="pin" size={14} />
                  </span>
                  <span className="text-sm text-neutral-200 leading-snug">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={containerRef} style={{ height }} className="w-full" />
      <div className="px-4 py-2.5 bg-neutral-900 border-t border-neutral-700 text-xs text-neutral-400">
        {value
          ? `Wybrany punkt: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : 'Wyszukaj okolicę powyżej albo kliknij na mapie, aby wskazać miejsce'}
      </div>
    </div>
  );
}
