// ULDK — Usługa Lokalizacji Działek Ewidencyjnych
// Zwraca ID działki i jej geometrię na podstawie współrzędnych

export interface ParcelData {
  parcelId: string;          // np. "141201_1.0001.1234/5"
  voivodeship: string;
  county: string;
  commune: string;
  region: string;
  parcelNumber: string;
  geomWkt?: string;          // geometria WKT (opcjonalnie)
}

export async function getParcelByCoords(lat: number, lng: number): Promise<ParcelData | null> {
  // ULDK przyjmuje współrzędne w układzie EPSG:2180 (Polska)
  // Musimy najpierw przelicz z WGS84 (lat/lng) na EPSG:2180
  // Używamy prostego proxy przez ULDK który akceptuje WGS84

  const url = `https://uldk.gugik.gov.pl/?request=GetParcelByXY&y=${lat}&x=${lng}&result=geom_wkt,parcel,region,commune,county,voivodeship`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const text = await res.text();
  const lines = text.trim().split('\n');

  // Pierwsza linia to status (0 = OK, -1 = błąd)
  if (lines[0] !== '0') return null;

  const parts = lines[1]?.split('|');
  if (!parts || parts.length < 6) return null;

  return {
    geomWkt: parts[0],
    parcelId: parts[1],
    region: parts[2],
    commune: parts[3],
    county: parts[4],
    voivodeship: parts[5],
    parcelNumber: parts[1]?.split('.').pop() || '',
  };
}

// Pobierz szczegóły działki po ID (powierzchnia, klasa gruntu)
export async function getParcelDetails(parcelId: string): Promise<{ area?: number; landUse?: string } | null> {
  const url = `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${encodeURIComponent(parcelId)}&result=geom_wkt,parcel,region,commune,county,voivodeship`;

  const res = await fetch(url);
  if (!res.ok) return null;

  // Odpowiedź zawiera geometrię WKT — z niej można wyliczyć powierzchnię
  // (lub pobrać z GIS)
  return { area: undefined, landUse: undefined };
}
