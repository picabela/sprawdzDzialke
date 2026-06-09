// GIOŚ — Główny Inspektorat Ochrony Środowiska
// Oficjalny polski indeks jakości powietrza. Darmowe, bez klucza.
// https://api.gios.gov.pl/pjp-api/v1/rest

import { distanceM } from '../geo-utils';

export interface GiosAirQuality {
  stationName: string;
  city: string;
  distanceKm: number;
  indexValue?: number;       // 0 (bardzo dobry) … 5 (bardzo zły)
  indexCategory?: string;    // np. "Bardzo dobry", "Umiarkowany"
  calculatedAt?: string;
}

interface GiosStation {
  id: number;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

// Cache listy stacji (zmienia się rzadko) — trzymamy w pamięci procesu
let stationsCache: { stations: GiosStation[]; fetchedAt: number } | null = null;
const STATIONS_TTL = 24 * 60 * 60 * 1000; // 24h

async function getStations(): Promise<GiosStation[]> {
  if (stationsCache && Date.now() - stationsCache.fetchedAt < STATIONS_TTL) {
    return stationsCache.stations;
  }

  const res = await fetch('https://api.gios.gov.pl/pjp-api/v1/rest/station/findAll?size=500', {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return stationsCache?.stations || [];

  const data = await res.json();
  const list = data?.['Lista stacji pomiarowych'] || [];

  const stations: GiosStation[] = [];
  for (const s of list) {
    const lat = parseFloat(s['WGS84 φ N']);
    const lng = parseFloat(s['WGS84 λ E']);
    if (isNaN(lat) || isNaN(lng)) continue;
    stations.push({
      id: s['Identyfikator stacji'],
      name: s['Nazwa stacji'] || '',
      city: s['Nazwa miasta'] || s['Gmina'] || '',
      lat,
      lng,
    });
  }

  stationsCache = { stations, fetchedAt: Date.now() };
  return stations;
}

export async function getGiosAirQuality(lat: number, lng: number): Promise<GiosAirQuality | null> {
  try {
    const stations = await getStations();
    if (stations.length === 0) return null;

    // Najbliższa stacja
    let nearest = stations[0];
    let minDist = Infinity;
    for (const s of stations) {
      const d = distanceM(lat, lng, s.lat, s.lng);
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    }

    // Stacja dalej niż 30 km — dane mało reprezentatywne
    if (minDist > 30000) return null;

    const result: GiosAirQuality = {
      stationName: nearest.name,
      city: nearest.city,
      distanceKm: Math.round(minDist / 100) / 10,
    };

    // Oficjalny indeks jakości powietrza dla stacji
    const idxRes = await fetch(
      `https://api.gios.gov.pl/pjp-api/v1/rest/aqindex/getIndex/${nearest.id}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (idxRes.ok) {
      const idxData = await idxRes.json();
      const aq = idxData?.AqIndex;
      if (aq) {
        result.indexValue = aq['Wartość indeksu'];
        result.indexCategory = aq['Nazwa kategorii indeksu'];
        result.calculatedAt = aq['Data wykonania obliczeń indeksu'];
      }
    }

    return result;
  } catch {
    return null;
  }
}
