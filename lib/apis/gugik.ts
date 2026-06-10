// ULDK — Usługa Lokalizacji Działek Ewidencyjnych (GUGiK).
// Zwraca dane działki ewidencyjnej (numer, obręb, gmina, powiat, województwo)
// oraz jej geometrię. Obsługujemy dwa scenariusze:
//   - wyszukanie działki pod współrzędnymi (klik na mapie / geokodowanie),
//   - wyszukanie po pełnym identyfikatorze działki (TERYT), z policzeniem
//     środka i powierzchni z geometrii — to pozwala raportować po numerze działki.

export interface ParcelData {
  parcelId: string; // np. "141201_1.0001.1234/5"
  voivodeship: string;
  county: string;
  commune: string;
  region: string; // obręb ewidencyjny
  parcelNumber: string;
  geomWkt?: string;
  areaM2?: number; // powierzchnia z geometrii
  centroid?: { lat: number; lng: number };
}

// Parsuje pierwszy pierścień z WKT POLYGON/MULTIPOLYGON (SRID=4326)
function parseRing(wkt: string): { lat: number; lng: number }[] {
  const m = wkt.match(/\(\(([^()]+)\)/);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((pair) => {
      const [lng, lat] = pair.trim().split(/\s+/).map(Number);
      return { lat, lng };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

function centroidOf(ring: { lat: number; lng: number }[]): { lat: number; lng: number } | undefined {
  if (ring.length === 0) return undefined;
  const lat = ring.reduce((s, p) => s + p.lat, 0) / ring.length;
  const lng = ring.reduce((s, p) => s + p.lng, 0) / ring.length;
  return { lat, lng };
}

// Powierzchnia pierścienia w m² (wzór trapezowy w lokalnym odwzorowaniu)
function areaOf(ring: { lat: number; lng: number }[]): number | undefined {
  if (ring.length < 3) return undefined;
  const lat0 = (ring.reduce((s, p) => s + p.lat, 0) / ring.length) * (Math.PI / 180);
  const mPerDegLat = 110574;
  const mPerDegLng = 111320 * Math.cos(lat0);
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const ax = a.lng * mPerDegLng;
    const ay = a.lat * mPerDegLat;
    const bx = b.lng * mPerDegLng;
    const by = b.lat * mPerDegLat;
    area += ax * by - bx * ay;
  }
  return Math.round(Math.abs(area) / 2);
}

function parseUldkLine(line: string): ParcelData | null {
  // result=parcel,region,commune,county,voivodeship,geom_wkt
  const parts = line.split('|');
  if (parts.length < 5) return null;
  const data: ParcelData = {
    parcelId: parts[0],
    region: parts[1],
    commune: parts[2],
    county: parts[3],
    voivodeship: parts[4],
    parcelNumber: parts[0]?.split('.').pop() || parts[0],
  };
  const wkt = parts[5];
  if (wkt && wkt.includes('POLYGON')) {
    data.geomWkt = wkt;
    const ring = parseRing(wkt);
    data.centroid = centroidOf(ring);
    data.areaM2 = areaOf(ring);
  }
  return data;
}

// Działka pod współrzędnymi WGS84 (lat/lng). WAŻNE: ULDK oczekuje xy=lng,lat,SRID.
export async function getParcelByCoords(lat: number, lng: number): Promise<ParcelData | null> {
  const url = `https://uldk.gugik.gov.pl/?request=GetParcelByXY&xy=${lng},${lat},4326&result=parcel,region,commune,county,voivodeship,geom_wkt&srid=4326`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines[0] !== '0') return null;
    return parseUldkLine(lines[1] || '');
  } catch {
    return null;
  }
}

// Działka po pełnym identyfikatorze (np. "141201_1.0001.1234/5").
// Zwraca też środek geometrii — używany jako punkt raportu przy wyszukiwaniu
// po numerze działki.
export async function getParcelById(parcelId: string): Promise<ParcelData | null> {
  const url = `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${encodeURIComponent(parcelId)}&result=parcel,region,commune,county,voivodeship,geom_wkt&srid=4326`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines[0] !== '0') return null;
    return parseUldkLine(lines[1] || '');
  } catch {
    return null;
  }
}
